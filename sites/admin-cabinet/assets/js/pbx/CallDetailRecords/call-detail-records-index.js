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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCIkc2VhcmNoQ0RSSW5wdXQiLCIkcGFnZUxlbmd0aFNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImhhc0NEUlJlY29yZHMiLCIkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiaW5pdGlhbGl6ZSIsImZldGNoTGF0ZXN0Q0RSRGF0ZSIsImluaXRpYWxpemVEYXRhVGFibGVBbmRIYW5kbGVycyIsInNlYXJjaERlYm91bmNlVGltZXIiLCJvbiIsImUiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0Iiwia2V5Q29kZSIsInZhbCIsImxlbmd0aCIsInRleHQiLCJhcHBseUZpbHRlciIsInNlYXJjaCIsInNlcnZlclNpZGUiLCJwcm9jZXNzaW5nIiwiY29sdW1ucyIsImRhdGEiLCJvcmRlcmFibGUiLCJjb2x1bW5EZWZzIiwiZGVmYXVsdENvbnRlbnQiLCJ0YXJnZXRzIiwiYWpheCIsInVybCIsInR5cGUiLCJkIiwicGFyYW1zIiwiaXNMaW5rZWRJZFNlYXJjaCIsImRhdGVSYW5nZVBpY2tlciIsInN0YXJ0RGF0ZSIsImVuZERhdGUiLCJpc1ZhbGlkIiwiZGF0ZUZyb20iLCJmb3JtYXQiLCJkYXRlVG8iLCJlbmRPZiIsInNlYXJjaEtleXdvcmQiLCJ2YWx1ZSIsInRyaW0iLCJrZXl3b3JkIiwic3RhcnRzV2l0aCIsInNyY19udW0iLCJzdWJzdHJpbmciLCJkc3RfbnVtIiwiZGlkIiwibGlua2VkaWQiLCJsaW1pdCIsIm9mZnNldCIsInN0YXJ0Iiwic29ydCIsIm9yZGVyIiwiZ3JvdXBlZCIsImRhdGFTcmMiLCJqc29uIiwicmVzdWx0IiwicmVzdERhdGEiLCJyZWNvcmRzIiwicGFnaW5hdGlvbiIsInJlY29yZHNUb3RhbCIsInRvdGFsIiwicmVjb3Jkc0ZpbHRlcmVkIiwidHJhbnNmb3JtUmVzdFRvRGF0YVRhYmxlIiwiYmVmb3JlU2VuZCIsInhociIsIlRva2VuTWFuYWdlciIsImFjY2Vzc1Rva2VuIiwic2V0UmVxdWVzdEhlYWRlciIsInBhZ2luZyIsInNEb20iLCJkZWZlclJlbmRlciIsInBhZ2VMZW5ndGgiLCJnZXRQYWdlTGVuZ3RoIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImVtcHR5VGFibGUiLCJnZXRFbXB0eVRhYmxlTWVzc2FnZSIsInplcm9SZWNvcmRzIiwiY3JlYXRlZFJvdyIsInJvdyIsIkRUX1Jvd0NsYXNzIiwiaW5kZXhPZiIsImVxIiwiaHRtbCIsImFkZENsYXNzIiwiYWN0aW9uc0h0bWwiLCJpZHMiLCJEVF9Sb3dJZCIsImdsb2JhbFRyYW5zbGF0ZSIsImNkcl9EZWxldGVSZWNvcmQiLCJkcmF3Q2FsbGJhY2siLCJFeHRlbnNpb25zQVBJIiwidXBkYXRlUGhvbmVzUmVwcmVzZW50IiwidG9nZ2xlUGFnaW5hdGlvbkNvbnRyb2xzIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJtaW5DaGFyYWN0ZXJzIiwic2VhcmNoT25Gb2N1cyIsInNlYXJjaEZpZWxkcyIsInNob3dOb1Jlc3VsdHMiLCJzb3VyY2UiLCJ0aXRsZSIsImNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciIsImNkcl9TZWFyY2hCeURlc3ROdW1iZXIiLCJjZHJfU2VhcmNoQnlESUQiLCJjZHJfU2VhcmNoQnlMaW5rZWRJRCIsImNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzcG9uc2UiLCJmb2N1cyIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibG9jYWxTdG9yYWdlIiwicmVtb3ZlSXRlbSIsInNldEl0ZW0iLCJwYWdlIiwibGVuIiwiZHJhdyIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwic2F2ZWRQYWdlTGVuZ3RoIiwiZ2V0SXRlbSIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInByZXZlbnREZWZhdWx0IiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmRlZmluZWQiLCJnbG9iYWxSb290VXJsIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwid2luZG93Iiwib3BlbiIsInRyIiwidGFyZ2V0IiwiY2hpbGQiLCJpc1Nob3duIiwiaGlkZSIsInNob3dSZWNvcmRzIiwic2hvdyIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJwbGF5ZXJSb3ciLCJpZCIsIkNEUlBsYXllciIsIiRidXR0b24iLCJyZWNvcmRJZCIsImRlbGV0ZVJlY29yZCIsIkNkckFQSSIsImRlbGV0ZVJlY29yZGluZyIsInJlbG9hZCIsImVycm9yTXNnIiwibWVzc2FnZXMiLCJlcnJvciIsImNkcl9EZWxldGVGYWlsZWQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImluZm8iLCJwYWdlcyIsInRhYmxlIiwiY29udGFpbmVyIiwiZ2V0TWV0YWRhdGEiLCJoYXNSZWNvcmRzIiwiZWFybGllc3REYXRlIiwibW9tZW50IiwibGF0ZXN0RGF0ZSIsImluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvciIsInNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIiLCJjZHJfRmlsdGVyZWRFbXB0eVRpdGxlIiwiY2RyX0ZpbHRlcmVkRW1wdHlEZXNjcmlwdGlvbiIsIm1hcCIsImdyb3VwIiwiYmlsbHNlYyIsInRvdGFsQmlsbHNlYyIsInRpbWVGb3JtYXQiLCJ0aW1pbmciLCJ1dGMiLCJmb3JtYXR0ZWREYXRlIiwicmVjb3JkaW5ncyIsImZpbHRlciIsInIiLCJyZWNvcmRpbmdmaWxlIiwicGxheWJhY2tfdXJsIiwiZG93bmxvYWRfdXJsIiwiaGFzUmVjb3JkaW5ncyIsImlzQW5zd2VyZWQiLCJkaXNwb3NpdGlvbiIsImR0Um93Q2xhc3MiLCJuZWdhdGl2ZUNsYXNzIiwidmVyYm9zZV9jYWxsX2lkIiwiam9pbiIsImh0bWxQbGF5ZXIiLCJmb3JFYWNoIiwicmVjb3JkIiwiaSIsInBsYXliYWNrVXJsIiwiZG93bmxvYWRVcmwiLCJwYXJzZUludCIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIk1hdGgiLCJtYXgiLCJmbG9vciIsIm9wdGlvbnMiLCJyYW5nZXMiLCJjYWxfVG9kYXkiLCJjYWxfWWVzdGVyZGF5Iiwic3VidHJhY3QiLCJjYWxfTGFzdFdlZWsiLCJjYWxfTGFzdDMwRGF5cyIsImNhbF9UaGlzTW9udGgiLCJzdGFydE9mIiwiY2FsX0xhc3RNb250aCIsImFsd2F5c1Nob3dDYWxlbmRhcnMiLCJhdXRvVXBkYXRlSW5wdXQiLCJsaW5rZWRDYWxlbmRhcnMiLCJtYXhEYXRlIiwibG9jYWxlIiwic2VwYXJhdG9yIiwiYXBwbHlMYWJlbCIsImNhbF9BcHBseUJ0biIsImNhbmNlbExhYmVsIiwiY2FsX0NhbmNlbEJ0biIsImZyb21MYWJlbCIsImNhbF9mcm9tIiwidG9MYWJlbCIsImNhbF90byIsImN1c3RvbVJhbmdlTGFiZWwiLCJjYWxfQ3VzdG9tUGVyaW9kIiwiZGF5c09mV2VlayIsImNhbGVuZGFyVGV4dCIsImRheXMiLCJtb250aE5hbWVzIiwibW9udGhzIiwiZmlyc3REYXkiLCJkYXRlcmFuZ2VwaWNrZXIiLCJjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QiLCJlbmQiLCJsYWJlbCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGlCQUFpQixHQUFHO0FBQ3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRUMsQ0FBQyxDQUFDLFlBQUQsQ0FMVTs7QUFPdEI7QUFD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Q0FBQ0csYUFBbEIsQ0FBZ0NtSSxPQUFoQyxDQUF3QyxLQUF4QyxFQUErQ3ZDLFFBQS9DLENBQXdELFNBQXhEO0FBQ0g7QUF0ckJxQixDQUExQjtBQXlyQkE7QUFDQTtBQUNBOztBQUNBN0YsQ0FBQyxDQUFDNlAsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmhRLEVBQUFBLGlCQUFpQixDQUFDVyxVQUFsQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEV4dGVuc2lvbnNBUEksIG1vbWVudCwgZ2xvYmFsVHJhbnNsYXRlLCBDRFJQbGF5ZXIsIENkckFQSSwgVXNlck1lc3NhZ2UsIEFDTEhlbHBlciAqL1xuXG4vKipcbiAqIGNhbGxEZXRhaWxSZWNvcmRzIG1vZHVsZS5cbiAqIEBtb2R1bGUgY2FsbERldGFpbFJlY29yZHNcbiAqL1xuY29uc3QgY2FsbERldGFpbFJlY29yZHMgPSB7XG4gICAgLyoqXG4gICAgICogVGhlIGNhbGwgZGV0YWlsIHJlY29yZHMgdGFibGUgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjZHJUYWJsZTogJCgnI2Nkci10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRnbG9iYWxTZWFyY2g6ICQoJyNnbG9iYWxzZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGF0ZVJhbmdlU2VsZWN0b3I6ICQoJyNkYXRlLXJhbmdlLXNlbGVjdG9yJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgc2VhcmNoIENEUiBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlYXJjaENEUklucHV0OiAkKCcjc2VhcmNoLWNkci1pbnB1dCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBhZ2VMZW5ndGhTZWxlY3RvcjogJCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdGFibGUgb2JqZWN0LlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEFuIGFycmF5IG9mIHBsYXllcnMuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHBsYXllcnM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIENEUiBkYXRhYmFzZSBoYXMgYW55IHJlY29yZHNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBoYXNDRFJSZWNvcmRzOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGVtcHR5IGRhdGFiYXNlIHBsYWNlaG9sZGVyIGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlbXB0eURhdGFiYXNlUGxhY2Vob2xkZXI6ICQoJyNjZHItZW1wdHktZGF0YWJhc2UtcGxhY2Vob2xkZXInKSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjYWxsIGRldGFpbCByZWNvcmRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEZldGNoIG1ldGFkYXRhIGZpcnN0LCB0aGVuIGluaXRpYWxpemUgRGF0YVRhYmxlIHdpdGggcHJvcGVyIGRhdGUgcmFuZ2VcbiAgICAgICAgLy8gV0hZOiBQcmV2ZW50cyBkb3VibGUgcmVxdWVzdCBvbiBwYWdlIGxvYWRcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZmV0Y2hMYXRlc3RDRFJEYXRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRGF0YVRhYmxlIGFuZCBldmVudCBoYW5kbGVyc1xuICAgICAqIENhbGxlZCBhZnRlciBtZXRhZGF0YSBpcyByZWNlaXZlZFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGVBbmRIYW5kbGVycygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJvdW5jZSB0aW1lciB2YXJpYWJsZVxuICAgICAgICBsZXQgc2VhcmNoRGVib3VuY2VUaW1lciA9IG51bGw7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5vbigna2V5dXAnLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgdGltZXIgaWYgdGhlIHVzZXIgaXMgc3RpbGwgdHlwaW5nXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoc2VhcmNoRGVib3VuY2VUaW1lcik7XG5cbiAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciBmb3IgZGVsYXllZCBleGVjdXRpb25cbiAgICAgICAgICAgIHNlYXJjaERlYm91bmNlVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxM1xuICAgICAgICAgICAgICAgICAgICB8fCBlLmtleUNvZGUgPT09IDhcbiAgICAgICAgICAgICAgICAgICAgfHwgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBwYXNzIHRoZSBzZWFyY2gga2V5d29yZCwgZGF0ZXMgYXJlIGhhbmRsZWQgc2VwYXJhdGVseVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIodGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVsYXkgYmVmb3JlIGV4ZWN1dGluZyB0aGUgc2VhcmNoXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5kYXRhVGFibGUoe1xuICAgICAgICAgICAgc2VhcmNoOiB7XG4gICAgICAgICAgICAgICAgc2VhcmNoOiBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiB0cnVlLFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHsgZGF0YTogbnVsbCwgb3JkZXJhYmxlOiBmYWxzZSB9LCAgLy8gMDogZXhwYW5kIGljb24gY29sdW1uXG4gICAgICAgICAgICAgICAgeyBkYXRhOiAwIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAxOiBkYXRlIChhcnJheSBpbmRleCAwKVxuICAgICAgICAgICAgICAgIHsgZGF0YTogMSB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMjogc3JjX251bSAoYXJyYXkgaW5kZXggMSlcbiAgICAgICAgICAgICAgICB7IGRhdGE6IDIgfSwgICAgICAgICAgICAgICAgICAgICAgIC8vIDM6IGRzdF9udW0gKGFycmF5IGluZGV4IDIpXG4gICAgICAgICAgICAgICAgeyBkYXRhOiAzIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyA0OiBkdXJhdGlvbiAoYXJyYXkgaW5kZXggMylcbiAgICAgICAgICAgICAgICB7IGRhdGE6IG51bGwsIG9yZGVyYWJsZTogZmFsc2UgfSAgIC8vIDU6IGRlbGV0ZSBidXR0b24gY29sdW1uXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgICAgICAgIHsgZGVmYXVsdENvbnRlbnQ6IFwiLVwiLCAgdGFyZ2V0czogXCJfYWxsXCJ9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvY2RyJyxcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJywgIC8vIFJFU1QgQVBJIHVzZXMgR0VUIGZvciBsaXN0IHJldHJpZXZhbFxuICAgICAgICAgICAgICAgIGRhdGE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICAgICAgICAgIGxldCBpc0xpbmtlZElkU2VhcmNoID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gMS4gQWx3YXlzIGdldCBkYXRlcyBmcm9tIGRhdGUgcmFuZ2Ugc2VsZWN0b3IgdXNpbmcgZGF0ZXJhbmdlcGlja2VyIEFQSVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlUmFuZ2VQaWNrZXIgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IuZGF0YSgnZGF0ZXJhbmdlcGlja2VyJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRlUmFuZ2VQaWNrZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0RGF0ZSA9IGRhdGVSYW5nZVBpY2tlci5zdGFydERhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmREYXRlID0gZGF0ZVJhbmdlUGlja2VyLmVuZERhdGU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGFydERhdGUgJiYgc3RhcnREYXRlLmlzVmFsaWQoKSAmJiBlbmREYXRlICYmIGVuZERhdGUuaXNWYWxpZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRhdGVGcm9tID0gc3RhcnREYXRlLmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kYXRlVG8gPSBlbmREYXRlLmVuZE9mKCdkYXknKS5mb3JtYXQoJ1lZWVktTU0tREQgSEg6bW06c3MnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIDIuIFByb2Nlc3Mgc2VhcmNoIGtleXdvcmQgZnJvbSBzZWFyY2ggaW5wdXQgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VhcmNoS2V5d29yZCA9IGQuc2VhcmNoLnZhbHVlIHx8ICcnO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWFyY2hLZXl3b3JkLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qga2V5d29yZCA9IHNlYXJjaEtleXdvcmQudHJpbSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQYXJzZSBzZWFyY2ggcHJlZml4ZXM6IHNyYzosIGRzdDosIGRpZDosIGxpbmtlZGlkOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnc3JjOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IHNvdXJjZSBudW1iZXIgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zcmNfbnVtID0ga2V5d29yZC5zdWJzdHJpbmcoNCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXl3b3JkLnN0YXJ0c1dpdGgoJ2RzdDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBkZXN0aW5hdGlvbiBudW1iZXIgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kc3RfbnVtID0ga2V5d29yZC5zdWJzdHJpbmcoNCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXl3b3JkLnN0YXJ0c1dpdGgoJ2RpZDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBESUQgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kaWQgPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnbGlua2VkaWQ6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgbGlua2VkaWQgLSBpZ25vcmUgZGF0ZSByYW5nZSBmb3IgbGlua2VkaWQgc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmxpbmtlZGlkID0ga2V5d29yZC5zdWJzdHJpbmcoOSkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzTGlua2VkSWRTZWFyY2ggPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkYXRlIHBhcmFtcyBmb3IgbGlua2VkaWQgc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHBhcmFtcy5kYXRlRnJvbTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcGFyYW1zLmRhdGVUbztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRnVsbC10ZXh0IHNlYXJjaDogc2VhcmNoIGluIHNyY19udW0sIGRzdF9udW0sIGFuZCBESURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IFVzZXIgZXhwZWN0cyBzZWFyY2ggd2l0aG91dCBwcmVmaXggdG8gZmluZCBudW1iZXIgYW55d2hlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuc2VhcmNoID0ga2V5d29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJFU1QgQVBJIHBhZ2luYXRpb24gcGFyYW1ldGVyc1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMubGltaXQgPSBkLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm9mZnNldCA9IGQuc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zb3J0ID0gJ3N0YXJ0JzsgIC8vIFNvcnQgYnkgY2FsbCBzdGFydCB0aW1lIGZvciBjaHJvbm9sb2dpY2FsIG9yZGVyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vcmRlciA9ICdERVNDJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IFdlYlVJIGFsd2F5cyBuZWVkcyBncm91cGVkIHJlY29yZHMgKGJ5IGxpbmtlZGlkKSBmb3IgcHJvcGVyIGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgLy8gQmFja2VuZCBkZWZhdWx0cyB0byBncm91cGVkPXRydWUsIGJ1dCBleHBsaWNpdCBpcyBiZXR0ZXIgdGhhbiBpbXBsaWNpdFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZ3JvdXBlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRhdGFTcmM6IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQVBJIHJldHVybnMgUEJYQXBpUmVzdWx0IHN0cnVjdHVyZTpcbiAgICAgICAgICAgICAgICAgICAgLy8ge3Jlc3VsdDogdHJ1ZSwgZGF0YToge3JlY29yZHM6IFsuLi5dLCBwYWdpbmF0aW9uOiB7Li4ufX19XG4gICAgICAgICAgICAgICAgICAgIGlmIChqc29uLnJlc3VsdCAmJiBqc29uLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgcmVjb3JkcyBhbmQgcGFnaW5hdGlvbiBmcm9tIG5lc3RlZCBkYXRhIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdERhdGEgPSBqc29uLmRhdGEucmVjb3JkcyB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2luYXRpb24gPSBqc29uLmRhdGEucGFnaW5hdGlvbiB8fCB7fTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IERhdGFUYWJsZXMgcGFnaW5hdGlvbiBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uLnJlY29yZHNUb3RhbCA9IHBhZ2luYXRpb24udG90YWwgfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb24ucmVjb3Jkc0ZpbHRlcmVkID0gcGFnaW5hdGlvbi50b3RhbCB8fCAwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmFuc2Zvcm0gUkVTVCByZWNvcmRzIHRvIERhdGFUYWJsZSByb3dzXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbERldGFpbFJlY29yZHMudHJhbnNmb3JtUmVzdFRvRGF0YVRhYmxlKHJlc3REYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBiZWZvcmVTZW5kOiBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIEJlYXJlciB0b2tlbiBmb3IgQVBJIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICAvL3Njcm9sbFk6ICQod2luZG93KS5oZWlnaHQoKSAtIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vZmZzZXQoKS50b3AtMTUwLFxuICAgICAgICAgICAgc0RvbTogJ3J0aXAnLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRQYWdlTGVuZ3RoKCksXG4gICAgICAgICAgICBsYW5ndWFnZToge1xuICAgICAgICAgICAgICAgIC4uLlNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgICAgICBlbXB0eVRhYmxlOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRFbXB0eVRhYmxlTWVzc2FnZSgpLFxuICAgICAgICAgICAgICAgIHplcm9SZWNvcmRzOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRFbXB0eVRhYmxlTWVzc2FnZSgpXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgdGhlIENEUiByb3cuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSByb3cgLSBUaGUgcm93IGVsZW1lbnQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjcmVhdGVkUm93KHJvdywgZGF0YSkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLkRUX1Jvd0NsYXNzLmluZGV4T2YoXCJkZXRhaWxlZFwiKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCc8aSBjbGFzcz1cImljb24gY2FyZXQgZG93blwiPjwvaT4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgxKS5odG1sKGRhdGFbMF0pO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgyKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChkYXRhWzFdKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDMpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGRhdGFbMl0pXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnbmVlZC11cGRhdGUnKTtcblxuICAgICAgICAgICAgICAgIC8vIER1cmF0aW9uIGNvbHVtbiAobm8gaWNvbnMpXG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDQpLmh0bWwoZGF0YVszXSkuYWRkQ2xhc3MoJ3JpZ2h0IGFsaWduZWQnKTtcblxuICAgICAgICAgICAgICAgIC8vIExhc3QgY29sdW1uOiBsb2cgaWNvbiArIGRlbGV0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBsZXQgYWN0aW9uc0h0bWwgPSAnJztcblxuICAgICAgICAgICAgICAgIC8vIEFkZCBsb2cgaWNvbiBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5pZHMgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbnNIdG1sICs9IGA8aSBkYXRhLWlkcz1cIiR7ZGF0YS5pZHN9XCIgY2xhc3M9XCJmaWxlIGFsdGVybmF0ZSBvdXRsaW5lIGljb25cIiBzdHlsZT1cImN1cnNvcjogcG9pbnRlcjsgbWFyZ2luLXJpZ2h0OiA4cHg7XCI+PC9pPmA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGRlbGV0ZSBidXR0b25cbiAgICAgICAgICAgICAgICAvLyBXSFk6IFVzZSB0d28tc3RlcHMtZGVsZXRlIG1lY2hhbmlzbSB0byBwcmV2ZW50IGFjY2lkZW50YWwgZGVsZXRpb25cbiAgICAgICAgICAgICAgICAvLyBGaXJzdCBjbGljayBjaGFuZ2VzIHRyYXNoIGljb24gdG8gY2xvc2UgaWNvbiwgc2Vjb25kIGNsaWNrIGRlbGV0ZXNcbiAgICAgICAgICAgICAgICAvLyBOb3RlOiBBQ0wgY2hlY2sgaXMgZG9uZSBzZXJ2ZXItc2lkZSBpbiBWb2x0IHRlbXBsYXRlIChjb2x1bW4gaXMgaGlkZGVuIGlmIG5vIHBlcm1pc3Npb24pXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBVc2UgZGF0YS5EVF9Sb3dJZCB3aGljaCBjb250YWlucyBsaW5rZWRpZCBmb3IgZ3JvdXBlZCByZWNvcmRzXG4gICAgICAgICAgICAgICAgYWN0aW9uc0h0bWwgKz0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ0d28tc3RlcHMtZGVsZXRlIGRlbGV0ZS1yZWNvcmQgcG9wdXBlZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcmVjb3JkLWlkPVwiJHtkYXRhLkRUX1Jvd0lkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9EZWxldGVSZWNvcmQgfHwgJ0RlbGV0ZSByZWNvcmQnfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCIgc3R5bGU9XCJtYXJnaW46IDA7XCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+YDtcblxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSg1KS5odG1sKGFjdGlvbnNIdG1sKS5hZGRDbGFzcygncmlnaHQgYWxpZ25lZCcpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEcmF3IGV2ZW50IC0gZmlyZWQgb25jZSB0aGUgdGFibGUgaGFzIGNvbXBsZXRlZCBhIGRyYXcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLnVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy50b2dnbGVQYWdpbmF0aW9uQ29udHJvbHMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvcmRlcmluZzogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgU2VhcmNoIGNvbXBvbmVudCBBRlRFUiBEYXRhVGFibGUgaXMgY3JlYXRlZFxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kc2VhcmNoQ0RSSW5wdXQuc2VhcmNoKHtcbiAgICAgICAgICAgIG1pbkNoYXJhY3RlcnM6IDAsXG4gICAgICAgICAgICBzZWFyY2hPbkZvY3VzOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaEZpZWxkczogWyd0aXRsZSddLFxuICAgICAgICAgICAgc2hvd05vUmVzdWx0czogZmFsc2UsXG4gICAgICAgICAgICBzb3VyY2U6IFtcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5U291cmNlTnVtYmVyLCB2YWx1ZTogJ3NyYzonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeURlc3ROdW1iZXIsIHZhbHVlOiAnZHN0OicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5RElELCB2YWx1ZTogJ2RpZDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeUxpbmtlZElELCB2YWx1ZTogJ2xpbmtlZGlkOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5Q3VzdG9tUGhyYXNlLCB2YWx1ZTogJycgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvblNlbGVjdDogZnVuY3Rpb24ocmVzdWx0LCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKHJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHNlYXJjaENEUklucHV0LnNlYXJjaCgnaGlkZSByZXN1bHRzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTdGFydCB0aGUgc2VhcmNoIHdoZW4geW91IGNsaWNrIG9uIHRoZSBpY29uXG4gICAgICAgICQoJyNzZWFyY2gtaWNvbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5mb2N1cygpO1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHNlYXJjaENEUklucHV0LnNlYXJjaCgncXVlcnknKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgdG8gc2F2ZSB0aGUgdXNlcidzIHBhZ2UgbGVuZ3RoIHNlbGVjdGlvbiBhbmQgdXBkYXRlIHRoZSB0YWJsZVxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKHBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUxlbmd0aCA9PT0gJ2F1dG8nKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGggPSBjYWxsRGV0YWlsUmVjb3Jkcy5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJywgcGFnZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlLmxlbihwYWdlTGVuZ3RoKS5kcmF3KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgdGhlIGV2ZW50IGZyb20gYnViYmxpbmdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBzZWxlY3QgaW5wdXQgdmFsdWUgdG8gdGhlIHNhdmVkIHZhbHVlIGlmIGl0IGV4aXN0c1xuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIGlmIChzYXZlZFBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oJ3NldCB2YWx1ZScsIHNhdmVkUGFnZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3IgY2xpY2tpbmcgb24gaWNvbiB3aXRoIGRhdGEtaWRzIChvcGVuIGluIG5ldyB3aW5kb3cpXG4gICAgICAgIC8vIFdIWTogQ2xpY2tpbmcgb24gaWNvbiBzaG91bGQgb3BlbiBTeXN0ZW0gRGlhZ25vc3RpYyBpbiBuZXcgd2luZG93IHRvIHZpZXcgdmVyYm9zZSBsb2dzXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAnW2RhdGEtaWRzXScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHJvdyB0b2dnbGVcblxuICAgICAgICAgICAgY29uc3QgaWRzID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtaWRzJyk7XG4gICAgICAgICAgICBpZiAoaWRzICE9PSB1bmRlZmluZWQgJiYgaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFdIWTogRm9ybWF0IGFzIHF1ZXJ5IHBhcmFtICsgaGFzaDogP2ZpbHRlcj0uLi4jZmlsZT0uLi5cbiAgICAgICAgICAgICAgICAvLyBPcGVuIGluIG5ldyB3aW5kb3cgdG8gYWxsb3cgdmlld2luZyBsb2dzIHdoaWxlIGtlZXBpbmcgQ0RSIHRhYmxlIHZpc2libGVcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBgJHtnbG9iYWxSb290VXJsfXN5c3RlbS1kaWFnbm9zdGljL2luZGV4Lz9maWx0ZXI9JHtlbmNvZGVVUklDb21wb25lbnQoaWRzKX0jZmlsZT1hc3RlcmlzayUyRnZlcmJvc2VgO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5vcGVuKHVybCwgJ19ibGFuaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgZm9yIG9wZW5pbmcgYW5kIGNsb3NpbmcgZGV0YWlsc1xuICAgICAgICAvLyBXSFk6IE9ubHkgZXhwYW5kL2NvbGxhcHNlIG9uIGZpcnN0IGNvbHVtbiAoY2FyZXQgaWNvbikgY2xpY2ssIG5vdCBvbiBhY3Rpb24gaWNvbnNcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICd0ci5kZXRhaWxlZCB0ZDpmaXJzdC1jaGlsZCcsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ciA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucm93KHRyKTtcblxuICAgICAgICAgICAgaWYgKHJvdy5jaGlsZC5pc1Nob3duKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIHJvdyBpcyBhbHJlYWR5IG9wZW4gLSBjbG9zZSBpdFxuICAgICAgICAgICAgICAgIHJvdy5jaGlsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgdHIucmVtb3ZlQ2xhc3MoJ3Nob3duJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE9wZW4gdGhpcyByb3dcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoY2FsbERldGFpbFJlY29yZHMuc2hvd1JlY29yZHMocm93LmRhdGEoKSkpLnNob3coKTtcbiAgICAgICAgICAgICAgICB0ci5hZGRDbGFzcygnc2hvd24nKTtcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoKS5maW5kKCcuZGV0YWlsLXJlY29yZC1yb3cnKS5lYWNoKChpbmRleCwgcGxheWVyUm93KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gJChwbGF5ZXJSb3cpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ0RSUGxheWVyKGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLnVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHNlY29uZCBjbGljayBvbiBkZWxldGUgYnV0dG9uIChhZnRlciB0d28tc3RlcHMtZGVsZXRlIGNoYW5nZXMgaWNvbiB0byBjbG9zZSlcbiAgICAgICAgLy8gV0hZOiBUd28tc3RlcHMtZGVsZXRlIG1lY2hhbmlzbSBwcmV2ZW50cyBhY2NpZGVudGFsIGRlbGV0aW9uXG4gICAgICAgIC8vIEZpcnN0IGNsaWNrOiB0cmFzaCDihpIgY2xvc2UgKGJ5IGRlbGV0ZS1zb21ldGhpbmcuanMpLCBTZWNvbmQgY2xpY2s6IGV4ZWN1dGUgZGVsZXRpb25cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICdhLmRlbGV0ZS1yZWNvcmQ6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHJvdyBleHBhbnNpb25cblxuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXJlY29yZC1pZCcpO1xuXG4gICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBZGQgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQgbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBBbHdheXMgZGVsZXRlIHdpdGggcmVjb3JkaW5ncyBhbmQgbGlua2VkIHJlY29yZHNcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRlbGV0ZVJlY29yZChyZWNvcmRJZCwgJGJ1dHRvbik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgQ0RSIHJlY29yZCB2aWEgUkVTVCBBUElcbiAgICAgKiBXSFk6IERlbGV0ZXMgYnkgbGlua2VkaWQgLSBhdXRvbWF0aWNhbGx5IHJlbW92ZXMgZW50aXJlIGNvbnZlcnNhdGlvbiB3aXRoIGFsbCBsaW5rZWQgcmVjb3Jkc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIENEUiBsaW5rZWRpZCAobGlrZSBcIm1pa29wYngtMTc2MDc4NDc5My40NjI3XCIpXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRidXR0b24gLSBCdXR0b24gZWxlbWVudCB0byB1cGRhdGUgc3RhdGVcbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQocmVjb3JkSWQsICRidXR0b24pIHtcbiAgICAgICAgLy8gQWx3YXlzIGRlbGV0ZSB3aXRoIHJlY29yZGluZyBmaWxlc1xuICAgICAgICAvLyBXSFk6IGxpbmtlZGlkIGF1dG9tYXRpY2FsbHkgZGVsZXRlcyBhbGwgbGlua2VkIHJlY29yZHMgKG5vIGRlbGV0ZUxpbmtlZCBwYXJhbWV0ZXIgbmVlZGVkKVxuICAgICAgICBDZHJBUEkuZGVsZXRlUmVjb3JkKHJlY29yZElkLCB7IGRlbGV0ZVJlY29yZGluZzogdHJ1ZSB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIFNpbGVudGx5IHJlbG9hZCB0aGUgRGF0YVRhYmxlIHRvIHJlZmxlY3QgY2hhbmdlc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogVmlzdWFsIGZlZWRiYWNrIChkaXNhcHBlYXJpbmcgcm93KSBpcyBlbm91Z2gsIG5vIG5lZWQgZm9yIHN1Y2Nlc3MgdG9hc3RcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuYWpheC5yZWxvYWQobnVsbCwgZmFsc2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2Ugb25seSBvbiBmYWlsdXJlXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNc2cgPSByZXNwb25zZT8ubWVzc2FnZXM/LmVycm9yPy5bMF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNkcl9EZWxldGVGYWlsZWQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBkZWxldGUgcmVjb3JkJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNc2cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgcGFnaW5hdGlvbiBjb250cm9scyB2aXNpYmlsaXR5IGJhc2VkIG9uIGRhdGEgc2l6ZVxuICAgICAqL1xuICAgIHRvZ2dsZVBhZ2luYXRpb25Db250cm9scygpIHtcbiAgICAgICAgY29uc3QgaW5mbyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlLmluZm8oKTtcbiAgICAgICAgaWYgKGluZm8ucGFnZXMgPD0gMSkge1xuICAgICAgICAgICAgJChjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUudGFibGUoKS5jb250YWluZXIoKSkuZmluZCgnLmRhdGFUYWJsZXNfcGFnaW5hdGUnKS5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS50YWJsZSgpLmNvbnRhaW5lcigpKS5maW5kKCcuZGF0YVRhYmxlc19wYWdpbmF0ZScpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIENEUiBtZXRhZGF0YSAoZGF0ZSByYW5nZSkgdXNpbmcgQ2RyQVBJXG4gICAgICogV0hZOiBMaWdodHdlaWdodCByZXF1ZXN0IHJldHVybnMgb25seSBtZXRhZGF0YSAoZGF0ZXMpLCBub3QgZnVsbCBDRFIgcmVjb3Jkc1xuICAgICAqIEF2b2lkcyBkb3VibGUgcmVxdWVzdCBvbiBwYWdlIGxvYWRcbiAgICAgKi9cbiAgICBmZXRjaExhdGVzdENEUkRhdGUoKSB7XG4gICAgICAgIENkckFQSS5nZXRNZXRhZGF0YSh7IGxpbWl0OiAxMDAgfSwgKGRhdGEpID0+IHtcbiAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEuaGFzUmVjb3Jkcykge1xuICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgZGF0ZSBzdHJpbmdzIHRvIG1vbWVudCBvYmplY3RzXG4gICAgICAgICAgICAgICAgY29uc3QgZWFybGllc3REYXRlID0gbW9tZW50KGRhdGEuZWFybGllc3REYXRlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBsYXRlc3REYXRlID0gbW9tZW50KGRhdGEubGF0ZXN0RGF0ZSk7XG5cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5oYXNDRFJSZWNvcmRzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IoZWFybGllc3REYXRlLCBsYXRlc3REYXRlKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgRGF0YVRhYmxlIG9ubHkgaWYgd2UgaGF2ZSByZWNvcmRzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBEYXRhVGFibGUgbmVlZHMgZGF0ZSByYW5nZSB0byBiZSBzZXQgZmlyc3RcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTm8gcmVjb3JkcyBpbiBkYXRhYmFzZSBhdCBhbGwgb3IgQVBJIGVycm9yXG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3JkcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIoKTtcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBpbml0aWFsaXplIERhdGFUYWJsZSBhdCBhbGwgLSBqdXN0IHNob3cgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgYSBzdHlsZWQgZW1wdHkgdGFibGUgbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgbWVzc2FnZSBmb3IgZW1wdHkgdGFibGVcbiAgICAgKi9cbiAgICBnZXRFbXB0eVRhYmxlTWVzc2FnZSgpIHtcbiAgICAgICAgLy8gSWYgZGF0YWJhc2UgaXMgZW1wdHksIHdlIGRvbid0IHNob3cgdGhpcyBtZXNzYWdlIGluIHRhYmxlXG4gICAgICAgIGlmICghY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3Jkcykge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGZpbHRlcmVkIGVtcHR5IHN0YXRlIG1lc3NhZ2VcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBsYWNlaG9sZGVyIHNlZ21lbnRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpY29uIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic2VhcmNoIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0ZpbHRlcmVkRW1wdHlUaXRsZX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlubGluZVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0XCI+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9GaWx0ZXJlZEVtcHR5RGVzY3JpcHRpb259XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+YDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3dzIHRoZSBlbXB0eSBkYXRhYmFzZSBwbGFjZWhvbGRlciBhbmQgaGlkZXMgdGhlIHRhYmxlXG4gICAgICovXG4gICAgc2hvd0VtcHR5RGF0YWJhc2VQbGFjZWhvbGRlcigpIHtcbiAgICAgICAgLy8gSGlkZSB0aGUgdGFibGUgaXRzZWxmIChEYXRhVGFibGUgd29uJ3QgYmUgaW5pdGlhbGl6ZWQpXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5oaWRlKCk7XG5cbiAgICAgICAgLy8gSGlkZSBzZWFyY2ggYW5kIGRhdGUgY29udHJvbHNcbiAgICAgICAgJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKS5jbG9zZXN0KCcudWkucm93JykuaGlkZSgpO1xuXG4gICAgICAgIC8vIFNob3cgcGxhY2Vob2xkZXJcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGVtcHR5RGF0YWJhc2VQbGFjZWhvbGRlci5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRyYW5zZm9ybSBSRVNUIEFQSSBncm91cGVkIHJlY29yZHMgdG8gRGF0YVRhYmxlIHJvdyBmb3JtYXRcbiAgICAgKiBAcGFyYW0ge0FycmF5fSByZXN0RGF0YSAtIEFycmF5IG9mIGdyb3VwZWQgQ0RSIHJlY29yZHMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgRGF0YVRhYmxlIHJvd3NcbiAgICAgKi9cbiAgICB0cmFuc2Zvcm1SZXN0VG9EYXRhVGFibGUocmVzdERhdGEpIHtcbiAgICAgICAgcmV0dXJuIHJlc3REYXRhLm1hcChncm91cCA9PiB7XG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgdGltaW5nIGRpc3BsYXlcbiAgICAgICAgICAgIGNvbnN0IGJpbGxzZWMgPSBncm91cC50b3RhbEJpbGxzZWMgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVGb3JtYXQgPSAoYmlsbHNlYyA8IDM2MDApID8gJ21tOnNzJyA6ICdISDptbTpzcyc7XG4gICAgICAgICAgICBjb25zdCB0aW1pbmcgPSBiaWxsc2VjID4gMCA/IG1vbWVudC51dGMoYmlsbHNlYyAqIDEwMDApLmZvcm1hdCh0aW1lRm9ybWF0KSA6ICcnO1xuXG4gICAgICAgICAgICAvLyBGb3JtYXQgc3RhcnQgZGF0ZVxuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkRGF0ZSA9IG1vbWVudChncm91cC5zdGFydCkuZm9ybWF0KCdERC1NTS1ZWVlZIEhIOm1tOnNzJyk7XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgcmVjb3JkaW5nIHJlY29yZHMgLSBmaWx0ZXIgb25seSByZWNvcmRzIHdpdGggYWN0dWFsIHJlY29yZGluZyBmaWxlc1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkaW5ncyA9IChncm91cC5yZWNvcmRzIHx8IFtdKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIociA9PiByLnJlY29yZGluZ2ZpbGUgJiYgci5yZWNvcmRpbmdmaWxlLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgLm1hcChyID0+ICh7XG4gICAgICAgICAgICAgICAgICAgIGlkOiByLmlkLFxuICAgICAgICAgICAgICAgICAgICBzcmNfbnVtOiByLnNyY19udW0sXG4gICAgICAgICAgICAgICAgICAgIGRzdF9udW06IHIuZHN0X251bSxcbiAgICAgICAgICAgICAgICAgICAgcmVjb3JkaW5nZmlsZTogci5yZWNvcmRpbmdmaWxlLFxuICAgICAgICAgICAgICAgICAgICBwbGF5YmFja191cmw6IHIucGxheWJhY2tfdXJsLCAgIC8vIFRva2VuLWJhc2VkIFVSTCBmb3IgcGxheWJhY2tcbiAgICAgICAgICAgICAgICAgICAgZG93bmxvYWRfdXJsOiByLmRvd25sb2FkX3VybCAgICAvLyBUb2tlbi1iYXNlZCBVUkwgZm9yIGRvd25sb2FkXG4gICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgQ1NTIGNsYXNzXG4gICAgICAgICAgICBjb25zdCBoYXNSZWNvcmRpbmdzID0gcmVjb3JkaW5ncy5sZW5ndGggPiAwO1xuICAgICAgICAgICAgY29uc3QgaXNBbnN3ZXJlZCA9IGdyb3VwLmRpc3Bvc2l0aW9uID09PSAnQU5TV0VSRUQnO1xuICAgICAgICAgICAgY29uc3QgZHRSb3dDbGFzcyA9IGhhc1JlY29yZGluZ3MgPyAnZGV0YWlsZWQnIDogJ3VpJztcbiAgICAgICAgICAgIGNvbnN0IG5lZ2F0aXZlQ2xhc3MgPSBpc0Fuc3dlcmVkID8gJycgOiAnIG5lZ2F0aXZlJztcblxuICAgICAgICAgICAgLy8gQ29sbGVjdCB2ZXJib3NlIGNhbGwgSURzXG4gICAgICAgICAgICBjb25zdCBpZHMgPSAoZ3JvdXAucmVjb3JkcyB8fCBbXSlcbiAgICAgICAgICAgICAgICAubWFwKHIgPT4gci52ZXJib3NlX2NhbGxfaWQpXG4gICAgICAgICAgICAgICAgLmZpbHRlcihpZCA9PiBpZCAmJiBpZC5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgIC5qb2luKCcmJyk7XG5cbiAgICAgICAgICAgIC8vIFJldHVybiBEYXRhVGFibGUgcm93IGZvcm1hdFxuICAgICAgICAgICAgLy8gRGF0YVRhYmxlcyBuZWVkcyBib3RoIGFycmF5IGluZGljZXMgQU5EIHNwZWNpYWwgcHJvcGVydGllc1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gW1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZERhdGUsICAgICAgICAgICAgICAvLyAwOiBkYXRlXG4gICAgICAgICAgICAgICAgZ3JvdXAuc3JjX251bSwgICAgICAgICAgICAgIC8vIDE6IHNvdXJjZSBudW1iZXJcbiAgICAgICAgICAgICAgICBncm91cC5kc3RfbnVtIHx8IGdyb3VwLmRpZCwgLy8gMjogZGVzdGluYXRpb24gbnVtYmVyIG9yIERJRFxuICAgICAgICAgICAgICAgIHRpbWluZywgICAgICAgICAgICAgICAgICAgICAvLyAzOiBkdXJhdGlvblxuICAgICAgICAgICAgICAgIHJlY29yZGluZ3MsICAgICAgICAgICAgICAgICAvLyA0OiByZWNvcmRpbmcgcmVjb3JkcyBhcnJheVxuICAgICAgICAgICAgICAgIGdyb3VwLmRpc3Bvc2l0aW9uICAgICAgICAgICAvLyA1OiBkaXNwb3NpdGlvblxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgLy8gQWRkIERhdGFUYWJsZXMgc3BlY2lhbCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICByb3cuRFRfUm93SWQgPSBncm91cC5saW5rZWRpZDtcbiAgICAgICAgICAgIHJvdy5EVF9Sb3dDbGFzcyA9IGR0Um93Q2xhc3MgKyBuZWdhdGl2ZUNsYXNzO1xuICAgICAgICAgICAgcm93LmlkcyA9IGlkczsgLy8gU3RvcmUgcmF3IElEcyB3aXRob3V0IGVuY29kaW5nIC0gZW5jb2Rpbmcgd2lsbCBiZSBhcHBsaWVkIHdoZW4gYnVpbGRpbmcgVVJMXG5cbiAgICAgICAgICAgIHJldHVybiByb3c7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhIHNldCBvZiBjYWxsIHJlY29yZHMgd2hlbiBhIHJvdyBpcyBjbGlja2VkLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNhbGwgcmVjb3Jkcy5cbiAgICAgKi9cbiAgICBzaG93UmVjb3JkcyhkYXRhKSB7XG4gICAgICAgIGxldCBodG1sUGxheWVyID0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgYmFzaWMgdGFibGUgY2RyLXBsYXllclwiPjx0Ym9keT4nO1xuICAgICAgICBkYXRhWzRdLmZvckVhY2goKHJlY29yZCwgaSkgPT4ge1xuICAgICAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSAnPHRkPjx0cj48L3RyPjwvdGQ+JztcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlY29yZC5yZWNvcmRpbmdmaWxlID09PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICB8fCByZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gbnVsbFxuICAgICAgICAgICAgICAgIHx8IHJlY29yZC5yZWNvcmRpbmdmaWxlLmxlbmd0aCA9PT0gMCkge1xuXG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93IGRpc2FibGVkXCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIlwiPjwvYXVkaW8+XG5cdDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwiZml2ZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiIGRhdGEtdmFsdWU9XCIke3JlY29yZC5pZH1cIj48L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPlxuICAgIFx0PGkgY2xhc3M9XCJ1aSBpY29uIGRvd25sb2FkXCIgZGF0YS12YWx1ZT1cIlwiPjwvaT5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHRva2VuLWJhc2VkIFVSTHMgaW5zdGVhZCBvZiBkaXJlY3QgZmlsZSBwYXRoc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogU2VjdXJpdHkgLSBoaWRlcyBhY3R1YWwgZmlsZSBwYXRocyBmcm9tIHVzZXJcbiAgICAgICAgICAgICAgICAvLyBUd28gc2VwYXJhdGUgZW5kcG9pbnRzOiA6cGxheWJhY2sgKGlubGluZSkgYW5kIDpkb3dubG9hZCAoZmlsZSlcbiAgICAgICAgICAgICAgICBjb25zdCBwbGF5YmFja1VybCA9IHJlY29yZC5wbGF5YmFja191cmwgfHwgJyc7XG4gICAgICAgICAgICAgICAgY29uc3QgZG93bmxvYWRVcmwgPSByZWNvcmQuZG93bmxvYWRfdXJsIHx8ICcnO1xuXG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93XCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIiR7cGxheWJhY2tVcmx9XCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiJHtkb3dubG9hZFVybH1cIj48L2k+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLnNyY19udW19PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGUgY2VudGVyIGFsaWduZWRcIj48aSBjbGFzcz1cImljb24gZXhjaGFuZ2VcIj48L2k+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwibGVmdCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLmRzdF9udW19PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBodG1sUGxheWVyICs9ICc8L3Rib2R5PjwvdGFibGU+JztcbiAgICAgICAgcmV0dXJuIGh0bWxQbGF5ZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHBhZ2UgbGVuZ3RoIGZvciBEYXRhVGFibGUsIGNvbnNpZGVyaW5nIHVzZXIncyBzYXZlZCBwcmVmZXJlbmNlXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyBzYXZlZCB2YWx1ZSBvciB1c2UgdGhlIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCB2YWx1ZSBpZiBub25lIGV4aXN0c1xuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIHJldHVybiBzYXZlZFBhZ2VMZW5ndGggPyBwYXJzZUludChzYXZlZFBhZ2VMZW5ndGgsIDEwKSA6IGNhbGxEZXRhaWxSZWNvcmRzLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIHJvd3MgdGhhdCBjYW4gZml0IG9uIGEgcGFnZSBiYXNlZCBvbiB0aGUgY3VycmVudCB3aW5kb3cgaGVpZ2h0LlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5maW5kKCd0Ym9keSA+IHRyJykuZmlyc3QoKS5vdXRlckhlaWdodCgpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aW5kb3cgaGVpZ2h0IGFuZCBhdmFpbGFibGUgc3BhY2UgZm9yIHRhYmxlXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgY29uc3QgaGVhZGVyRm9vdGVySGVpZ2h0ID0gNDAwOyAvLyBFc3RpbWF0ZSBoZWlnaHQgZm9yIGhlYWRlciwgZm9vdGVyLCBhbmQgb3RoZXIgZWxlbWVudHNcblxuICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHBhZ2UgbGVuZ3RoXG4gICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBoZWFkZXJGb290ZXJIZWlnaHQpIC8gcm93SGVpZ2h0KSwgNSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZGF0ZSByYW5nZSBzZWxlY3Rvci5cbiAgICAgKiBAcGFyYW0ge21vbWVudH0gc3RhcnREYXRlIC0gT3B0aW9uYWwgZWFybGllc3QgcmVjb3JkIGRhdGUgZnJvbSBsYXN0IDEwMCByZWNvcmRzXG4gICAgICogQHBhcmFtIHttb21lbnR9IGVuZERhdGUgLSBPcHRpb25hbCBsYXRlc3QgcmVjb3JkIGRhdGUgZnJvbSBsYXN0IDEwMCByZWNvcmRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKHN0YXJ0RGF0ZSA9IG51bGwsIGVuZERhdGUgPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7fTtcblxuICAgICAgICBvcHRpb25zLnJhbmdlcyA9IHtcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1RvZGF5XTogW21vbWVudCgpLCBtb21lbnQoKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9ZZXN0ZXJkYXldOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ2RheXMnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ2RheXMnKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9MYXN0V2Vla106IFttb21lbnQoKS5zdWJ0cmFjdCg2LCAnZGF5cycpLCBtb21lbnQoKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9MYXN0MzBEYXlzXTogW21vbWVudCgpLnN1YnRyYWN0KDI5LCAnZGF5cycpLCBtb21lbnQoKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9UaGlzTW9udGhdOiBbbW9tZW50KCkuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuZW5kT2YoJ21vbnRoJyldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdE1vbnRoXTogW21vbWVudCgpLnN1YnRyYWN0KDEsICdtb250aCcpLnN0YXJ0T2YoJ21vbnRoJyksIG1vbWVudCgpLnN1YnRyYWN0KDEsICdtb250aCcpLmVuZE9mKCdtb250aCcpXSxcbiAgICAgICAgfTtcbiAgICAgICAgb3B0aW9ucy5hbHdheXNTaG93Q2FsZW5kYXJzID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5hdXRvVXBkYXRlSW5wdXQgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmxpbmtlZENhbGVuZGFycyA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMubWF4RGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICBvcHRpb25zLmxvY2FsZSA9IHtcbiAgICAgICAgICAgIGZvcm1hdDogJ0REL01NL1lZWVknLFxuICAgICAgICAgICAgc2VwYXJhdG9yOiAnIC0gJyxcbiAgICAgICAgICAgIGFwcGx5TGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQXBwbHlCdG4sXG4gICAgICAgICAgICBjYW5jZWxMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9DYW5jZWxCdG4sXG4gICAgICAgICAgICBmcm9tTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfZnJvbSxcbiAgICAgICAgICAgIHRvTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfdG8sXG4gICAgICAgICAgICBjdXN0b21SYW5nZUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0N1c3RvbVBlcmlvZCxcbiAgICAgICAgICAgIGRheXNPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5kYXlzLFxuICAgICAgICAgICAgbW9udGhOYW1lczogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0Lm1vbnRocyxcbiAgICAgICAgICAgIGZpcnN0RGF5OiAxLFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIElmIHdlIGhhdmUgZGF0ZSByYW5nZSBmcm9tIGxhc3QgMTAwIHJlY29yZHMsIHVzZSBpdFxuICAgICAgICAvLyBXSFk6IFByb3ZpZGVzIG1lYW5pbmdmdWwgY29udGV4dCAtIHVzZXIgc2VlcyBwZXJpb2QgY292ZXJpbmcgcmVjZW50IGNhbGxzXG4gICAgICAgIGlmIChzdGFydERhdGUgJiYgZW5kRGF0ZSkge1xuICAgICAgICAgICAgb3B0aW9ucy5zdGFydERhdGUgPSBtb21lbnQoc3RhcnREYXRlKS5zdGFydE9mKCdkYXknKTtcbiAgICAgICAgICAgIG9wdGlvbnMuZW5kRGF0ZSA9IG1vbWVudChlbmREYXRlKS5lbmRPZignZGF5Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byB0b2RheSBpZiBubyByZWNvcmRzXG4gICAgICAgICAgICBvcHRpb25zLnN0YXJ0RGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgb3B0aW9ucy5lbmREYXRlID0gbW9tZW50KCk7XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IuZGF0ZXJhbmdlcGlja2VyKFxuICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdCxcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBOb3RlOiBEb24ndCBjYWxsIGFwcGx5RmlsdGVyIGhlcmUgLSBEYXRhVGFibGUgaXMgbm90IGluaXRpYWxpemVkIHlldFxuICAgICAgICAvLyBEYXRhVGFibGUgd2lsbCBsb2FkIGRhdGEgYXV0b21hdGljYWxseSBhZnRlciBpbml0aWFsaXphdGlvblxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3Igc2VsZWN0IGV2ZW50LlxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gc3RhcnQgLSBUaGUgc3RhcnQgZGF0ZS5cbiAgICAgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IGVuZCAtIFRoZSBlbmQgZGF0ZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFiZWwgLSBUaGUgbGFiZWwuXG4gICAgICovXG4gICAgY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0KHN0YXJ0LCBlbmQsIGxhYmVsKSB7XG4gICAgICAgIC8vIE9ubHkgcGFzcyBzZWFyY2gga2V5d29yZCwgZGF0ZXMgYXJlIHJlYWQgZGlyZWN0bHkgZnJvbSBkYXRlIHJhbmdlIHNlbGVjdG9yXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIHRoZSBmaWx0ZXIgdG8gdGhlIGRhdGEgdGFibGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUaGUgZmlsdGVyIHRleHQuXG4gICAgICovXG4gICAgYXBwbHlGaWx0ZXIodGV4dCkge1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIENEUiB0YWJsZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=