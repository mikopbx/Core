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
          params.sort = 'id';
          params.order = 'DESC';
          return params;
        },
        dataSrc: function dataSrc(json) {
          // API returns PBXApiResult with nested structure:
          // {result: true, data: {data: [...], pagination: {...}}}
          if (json.result && json.data) {
            var restData = json.data.data || [];
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCIkc2VhcmNoQ0RSSW5wdXQiLCIkcGFnZUxlbmd0aFNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImhhc0NEUlJlY29yZHMiLCIkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiaW5pdGlhbGl6ZSIsImZldGNoTGF0ZXN0Q0RSRGF0ZSIsImluaXRpYWxpemVEYXRhVGFibGVBbmRIYW5kbGVycyIsInNlYXJjaERlYm91bmNlVGltZXIiLCJvbiIsImUiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0Iiwia2V5Q29kZSIsInZhbCIsImxlbmd0aCIsInRleHQiLCJhcHBseUZpbHRlciIsInNlYXJjaCIsInNlcnZlclNpZGUiLCJwcm9jZXNzaW5nIiwiY29sdW1ucyIsImRhdGEiLCJvcmRlcmFibGUiLCJjb2x1bW5EZWZzIiwiZGVmYXVsdENvbnRlbnQiLCJ0YXJnZXRzIiwiYWpheCIsInVybCIsInR5cGUiLCJkIiwicGFyYW1zIiwiaXNMaW5rZWRJZFNlYXJjaCIsImRhdGVSYW5nZVBpY2tlciIsInN0YXJ0RGF0ZSIsImVuZERhdGUiLCJpc1ZhbGlkIiwiZGF0ZUZyb20iLCJmb3JtYXQiLCJkYXRlVG8iLCJlbmRPZiIsInNlYXJjaEtleXdvcmQiLCJ2YWx1ZSIsInRyaW0iLCJrZXl3b3JkIiwic3RhcnRzV2l0aCIsInNyY19udW0iLCJzdWJzdHJpbmciLCJkc3RfbnVtIiwiZGlkIiwibGlua2VkaWQiLCJsaW1pdCIsIm9mZnNldCIsInN0YXJ0Iiwic29ydCIsIm9yZGVyIiwiZGF0YVNyYyIsImpzb24iLCJyZXN1bHQiLCJyZXN0RGF0YSIsInBhZ2luYXRpb24iLCJyZWNvcmRzVG90YWwiLCJ0b3RhbCIsInJlY29yZHNGaWx0ZXJlZCIsInRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZSIsImJlZm9yZVNlbmQiLCJ4aHIiLCJUb2tlbk1hbmFnZXIiLCJhY2Nlc3NUb2tlbiIsInNldFJlcXVlc3RIZWFkZXIiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJwYWdlTGVuZ3RoIiwiZ2V0UGFnZUxlbmd0aCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJlbXB0eVRhYmxlIiwiZ2V0RW1wdHlUYWJsZU1lc3NhZ2UiLCJ6ZXJvUmVjb3JkcyIsImNyZWF0ZWRSb3ciLCJyb3ciLCJEVF9Sb3dDbGFzcyIsImluZGV4T2YiLCJlcSIsImh0bWwiLCJhZGRDbGFzcyIsImFjdGlvbnNIdG1sIiwiaWRzIiwiRFRfUm93SWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZHJfRGVsZXRlUmVjb3JkIiwiZHJhd0NhbGxiYWNrIiwiRXh0ZW5zaW9uc0FQSSIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsInRvZ2dsZVBhZ2luYXRpb25Db250cm9scyIsIm9yZGVyaW5nIiwiRGF0YVRhYmxlIiwibWluQ2hhcmFjdGVycyIsInNlYXJjaE9uRm9jdXMiLCJzZWFyY2hGaWVsZHMiLCJzaG93Tm9SZXN1bHRzIiwic291cmNlIiwidGl0bGUiLCJjZHJfU2VhcmNoQnlTb3VyY2VOdW1iZXIiLCJjZHJfU2VhcmNoQnlEZXN0TnVtYmVyIiwiY2RyX1NlYXJjaEJ5RElEIiwiY2RyX1NlYXJjaEJ5TGlua2VkSUQiLCJjZHJfU2VhcmNoQnlDdXN0b21QaHJhc2UiLCJvblNlbGVjdCIsInJlc3BvbnNlIiwiZm9jdXMiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImxvY2FsU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJzZXRJdGVtIiwicGFnZSIsImxlbiIsImRyYXciLCJldmVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJjbG9zZXN0IiwicmVtb3ZlQ2xhc3MiLCJwcmV2ZW50RGVmYXVsdCIsImN1cnJlbnRUYXJnZXQiLCJhdHRyIiwidW5kZWZpbmVkIiwiZ2xvYmFsUm9vdFVybCIsImVuY29kZVVSSUNvbXBvbmVudCIsIndpbmRvdyIsIm9wZW4iLCJ0ciIsInRhcmdldCIsImNoaWxkIiwiaXNTaG93biIsImhpZGUiLCJzaG93UmVjb3JkcyIsInNob3ciLCJmaW5kIiwiZWFjaCIsImluZGV4IiwicGxheWVyUm93IiwiaWQiLCJDRFJQbGF5ZXIiLCIkYnV0dG9uIiwicmVjb3JkSWQiLCJkZWxldGVSZWNvcmQiLCJDZHJBUEkiLCJkZWxldGVSZWNvcmRpbmciLCJyZWxvYWQiLCJlcnJvck1zZyIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJjZHJfRGVsZXRlRmFpbGVkIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJpbmZvIiwicGFnZXMiLCJ0YWJsZSIsImNvbnRhaW5lciIsImdldE1ldGFkYXRhIiwiaGFzUmVjb3JkcyIsImVhcmxpZXN0RGF0ZSIsIm1vbWVudCIsImxhdGVzdERhdGUiLCJpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IiLCJzaG93RW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiY2RyX0ZpbHRlcmVkRW1wdHlUaXRsZSIsImNkcl9GaWx0ZXJlZEVtcHR5RGVzY3JpcHRpb24iLCJtYXAiLCJncm91cCIsImJpbGxzZWMiLCJ0b3RhbEJpbGxzZWMiLCJ0aW1lRm9ybWF0IiwidGltaW5nIiwidXRjIiwiZm9ybWF0dGVkRGF0ZSIsInJlY29yZGluZ3MiLCJyZWNvcmRzIiwiZmlsdGVyIiwiciIsInJlY29yZGluZ2ZpbGUiLCJwbGF5YmFja191cmwiLCJkb3dubG9hZF91cmwiLCJoYXNSZWNvcmRpbmdzIiwiaXNBbnN3ZXJlZCIsImRpc3Bvc2l0aW9uIiwiZHRSb3dDbGFzcyIsIm5lZ2F0aXZlQ2xhc3MiLCJ2ZXJib3NlX2NhbGxfaWQiLCJqb2luIiwiaHRtbFBsYXllciIsImZvckVhY2giLCJyZWNvcmQiLCJpIiwicGxheWJhY2tVcmwiLCJkb3dubG9hZFVybCIsInBhcnNlSW50Iiwicm93SGVpZ2h0IiwiZmlyc3QiLCJvdXRlckhlaWdodCIsIndpbmRvd0hlaWdodCIsImlubmVySGVpZ2h0IiwiaGVhZGVyRm9vdGVySGVpZ2h0IiwiTWF0aCIsIm1heCIsImZsb29yIiwib3B0aW9ucyIsInJhbmdlcyIsImNhbF9Ub2RheSIsImNhbF9ZZXN0ZXJkYXkiLCJzdWJ0cmFjdCIsImNhbF9MYXN0V2VlayIsImNhbF9MYXN0MzBEYXlzIiwiY2FsX1RoaXNNb250aCIsInN0YXJ0T2YiLCJjYWxfTGFzdE1vbnRoIiwiYWx3YXlzU2hvd0NhbGVuZGFycyIsImF1dG9VcGRhdGVJbnB1dCIsImxpbmtlZENhbGVuZGFycyIsIm1heERhdGUiLCJsb2NhbGUiLCJzZXBhcmF0b3IiLCJhcHBseUxhYmVsIiwiY2FsX0FwcGx5QnRuIiwiY2FuY2VsTGFiZWwiLCJjYWxfQ2FuY2VsQnRuIiwiZnJvbUxhYmVsIiwiY2FsX2Zyb20iLCJ0b0xhYmVsIiwiY2FsX3RvIiwiY3VzdG9tUmFuZ2VMYWJlbCIsImNhbF9DdXN0b21QZXJpb2QiLCJkYXlzT2ZXZWVrIiwiY2FsZW5kYXJUZXh0IiwiZGF5cyIsIm1vbnRoTmFtZXMiLCJtb250aHMiLCJmaXJzdERheSIsImRhdGVyYW5nZXBpY2tlciIsImNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdCIsImVuZCIsImxhYmVsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsaUJBQWlCLEdBQUc7QUFDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFQyxDQUFDLENBQUMsWUFBRCxDQUxVOztBQU90QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxlQUFELENBWE07O0FBYXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGtCQUFrQixFQUFFRixDQUFDLENBQUMsc0JBQUQsQ0FqQkM7O0FBbUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxlQUFlLEVBQUVILENBQUMsQ0FBQyxtQkFBRCxDQXZCSTs7QUF5QnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLG1CQUFtQixFQUFFSixDQUFDLENBQUMscUJBQUQsQ0E3QkE7O0FBK0J0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxTQUFTLEVBQUUsRUFuQ1c7O0FBcUN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsRUF6Q2E7O0FBMkN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsSUEvQ087O0FBaUR0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSx5QkFBeUIsRUFBRVIsQ0FBQyxDQUFDLGlDQUFELENBckROOztBQXVEdEI7QUFDSjtBQUNBO0FBQ0lTLEVBQUFBLFVBMURzQix3QkEwRFQ7QUFDVDtBQUNBO0FBQ0FYLElBQUFBLGlCQUFpQixDQUFDWSxrQkFBbEI7QUFDSCxHQTlEcUI7O0FBZ0V0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSw4QkFwRXNCLDRDQW9FVztBQUM3QjtBQUNBLFFBQUlDLG1CQUFtQixHQUFHLElBQTFCO0FBRUFkLElBQUFBLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ1ksRUFBaEMsQ0FBbUMsT0FBbkMsRUFBNEMsVUFBQ0MsQ0FBRCxFQUFPO0FBQy9DO0FBQ0FDLE1BQUFBLFlBQVksQ0FBQ0gsbUJBQUQsQ0FBWixDQUYrQyxDQUkvQzs7QUFDQUEsTUFBQUEsbUJBQW1CLEdBQUdJLFVBQVUsQ0FBQyxZQUFNO0FBQ25DLFlBQUlGLENBQUMsQ0FBQ0csT0FBRixLQUFjLEVBQWQsSUFDR0gsQ0FBQyxDQUFDRyxPQUFGLEtBQWMsQ0FEakIsSUFFR25CLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ2lCLEdBQWhDLEdBQXNDQyxNQUF0QyxLQUFpRCxDQUZ4RCxFQUUyRDtBQUN2RDtBQUNBLGNBQU1DLElBQUksR0FBR3RCLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ2lCLEdBQWhDLEVBQWI7QUFDQXBCLFVBQUFBLGlCQUFpQixDQUFDdUIsV0FBbEIsQ0FBOEJELElBQTlCO0FBQ0g7QUFDSixPQVIrQixFQVE3QixHQVI2QixDQUFoQyxDQUwrQyxDQWF0QztBQUNaLEtBZEQ7QUFnQkF0QixJQUFBQSxpQkFBaUIsQ0FBQ0MsU0FBbEIsQ0FBNEJNLFNBQTVCLENBQXNDO0FBQ2xDaUIsTUFBQUEsTUFBTSxFQUFFO0FBQ0pBLFFBQUFBLE1BQU0sRUFBRXhCLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ2lCLEdBQWhDO0FBREosT0FEMEI7QUFJbENLLE1BQUFBLFVBQVUsRUFBRSxJQUpzQjtBQUtsQ0MsTUFBQUEsVUFBVSxFQUFFLElBTHNCO0FBTWxDQyxNQUFBQSxPQUFPLEVBQUUsQ0FDTDtBQUFFQyxRQUFBQSxJQUFJLEVBQUUsSUFBUjtBQUFjQyxRQUFBQSxTQUFTLEVBQUU7QUFBekIsT0FESyxFQUM4QjtBQUNuQztBQUFFRCxRQUFBQSxJQUFJLEVBQUU7QUFBUixPQUZLLEVBRThCO0FBQ25DO0FBQUVBLFFBQUFBLElBQUksRUFBRTtBQUFSLE9BSEssRUFHOEI7QUFDbkM7QUFBRUEsUUFBQUEsSUFBSSxFQUFFO0FBQVIsT0FKSyxFQUk4QjtBQUNuQztBQUFFQSxRQUFBQSxJQUFJLEVBQUU7QUFBUixPQUxLLEVBSzhCO0FBQ25DO0FBQUVBLFFBQUFBLElBQUksRUFBRSxJQUFSO0FBQWNDLFFBQUFBLFNBQVMsRUFBRTtBQUF6QixPQU5LLENBTThCO0FBTjlCLE9BTnlCO0FBY2xDQyxNQUFBQSxVQUFVLEVBQUUsQ0FDUjtBQUFFQyxRQUFBQSxjQUFjLEVBQUUsR0FBbEI7QUFBd0JDLFFBQUFBLE9BQU8sRUFBRTtBQUFqQyxPQURRLENBZHNCO0FBaUJsQ0MsTUFBQUEsSUFBSSxFQUFFO0FBQ0ZDLFFBQUFBLEdBQUcsRUFBRSxxQkFESDtBQUVGQyxRQUFBQSxJQUFJLEVBQUUsS0FGSjtBQUVZO0FBQ2RQLFFBQUFBLElBQUksRUFBRSxjQUFTUSxDQUFULEVBQVk7QUFDZCxjQUFNQyxNQUFNLEdBQUcsRUFBZjtBQUNBLGNBQUlDLGdCQUFnQixHQUFHLEtBQXZCLENBRmMsQ0FJZDs7QUFDQSxjQUFNQyxlQUFlLEdBQUd2QyxpQkFBaUIsQ0FBQ0ksa0JBQWxCLENBQXFDd0IsSUFBckMsQ0FBMEMsaUJBQTFDLENBQXhCOztBQUNBLGNBQUlXLGVBQUosRUFBcUI7QUFDakIsZ0JBQU1DLFNBQVMsR0FBR0QsZUFBZSxDQUFDQyxTQUFsQztBQUNBLGdCQUFNQyxPQUFPLEdBQUdGLGVBQWUsQ0FBQ0UsT0FBaEM7O0FBRUEsZ0JBQUlELFNBQVMsSUFBSUEsU0FBUyxDQUFDRSxPQUFWLEVBQWIsSUFBb0NELE9BQXBDLElBQStDQSxPQUFPLENBQUNDLE9BQVIsRUFBbkQsRUFBc0U7QUFDbEVMLGNBQUFBLE1BQU0sQ0FBQ00sUUFBUCxHQUFrQkgsU0FBUyxDQUFDSSxNQUFWLENBQWlCLFlBQWpCLENBQWxCO0FBQ0FQLGNBQUFBLE1BQU0sQ0FBQ1EsTUFBUCxHQUFnQkosT0FBTyxDQUFDSyxLQUFSLENBQWMsS0FBZCxFQUFxQkYsTUFBckIsQ0FBNEIscUJBQTVCLENBQWhCO0FBQ0g7QUFDSixXQWRhLENBZ0JkOzs7QUFDQSxjQUFNRyxhQUFhLEdBQUdYLENBQUMsQ0FBQ1osTUFBRixDQUFTd0IsS0FBVCxJQUFrQixFQUF4Qzs7QUFFQSxjQUFJRCxhQUFhLENBQUNFLElBQWQsRUFBSixFQUEwQjtBQUN0QixnQkFBTUMsT0FBTyxHQUFHSCxhQUFhLENBQUNFLElBQWQsRUFBaEIsQ0FEc0IsQ0FHdEI7O0FBQ0EsZ0JBQUlDLE9BQU8sQ0FBQ0MsVUFBUixDQUFtQixNQUFuQixDQUFKLEVBQWdDO0FBQzVCO0FBQ0FkLGNBQUFBLE1BQU0sQ0FBQ2UsT0FBUCxHQUFpQkYsT0FBTyxDQUFDRyxTQUFSLENBQWtCLENBQWxCLEVBQXFCSixJQUFyQixFQUFqQjtBQUNILGFBSEQsTUFHTyxJQUFJQyxPQUFPLENBQUNDLFVBQVIsQ0FBbUIsTUFBbkIsQ0FBSixFQUFnQztBQUNuQztBQUNBZCxjQUFBQSxNQUFNLENBQUNpQixPQUFQLEdBQWlCSixPQUFPLENBQUNHLFNBQVIsQ0FBa0IsQ0FBbEIsRUFBcUJKLElBQXJCLEVBQWpCO0FBQ0gsYUFITSxNQUdBLElBQUlDLE9BQU8sQ0FBQ0MsVUFBUixDQUFtQixNQUFuQixDQUFKLEVBQWdDO0FBQ25DO0FBQ0FkLGNBQUFBLE1BQU0sQ0FBQ2tCLEdBQVAsR0FBYUwsT0FBTyxDQUFDRyxTQUFSLENBQWtCLENBQWxCLEVBQXFCSixJQUFyQixFQUFiO0FBQ0gsYUFITSxNQUdBLElBQUlDLE9BQU8sQ0FBQ0MsVUFBUixDQUFtQixXQUFuQixDQUFKLEVBQXFDO0FBQ3hDO0FBQ0FkLGNBQUFBLE1BQU0sQ0FBQ21CLFFBQVAsR0FBa0JOLE9BQU8sQ0FBQ0csU0FBUixDQUFrQixDQUFsQixFQUFxQkosSUFBckIsRUFBbEI7QUFDQVgsY0FBQUEsZ0JBQWdCLEdBQUcsSUFBbkIsQ0FId0MsQ0FJeEM7O0FBQ0EscUJBQU9ELE1BQU0sQ0FBQ00sUUFBZDtBQUNBLHFCQUFPTixNQUFNLENBQUNRLE1BQWQ7QUFDSCxhQVBNLE1BT0E7QUFDSDtBQUNBO0FBQ0FSLGNBQUFBLE1BQU0sQ0FBQ2IsTUFBUCxHQUFnQjBCLE9BQWhCO0FBQ0g7QUFDSixXQTVDYSxDQThDZDs7O0FBQ0FiLFVBQUFBLE1BQU0sQ0FBQ29CLEtBQVAsR0FBZXJCLENBQUMsQ0FBQ2YsTUFBakI7QUFDQWdCLFVBQUFBLE1BQU0sQ0FBQ3FCLE1BQVAsR0FBZ0J0QixDQUFDLENBQUN1QixLQUFsQjtBQUNBdEIsVUFBQUEsTUFBTSxDQUFDdUIsSUFBUCxHQUFjLElBQWQ7QUFDQXZCLFVBQUFBLE1BQU0sQ0FBQ3dCLEtBQVAsR0FBZSxNQUFmO0FBRUEsaUJBQU94QixNQUFQO0FBQ0gsU0F4REM7QUF5REZ5QixRQUFBQSxPQUFPLEVBQUUsaUJBQVNDLElBQVQsRUFBZTtBQUNwQjtBQUNBO0FBQ0EsY0FBSUEsSUFBSSxDQUFDQyxNQUFMLElBQWVELElBQUksQ0FBQ25DLElBQXhCLEVBQThCO0FBQzFCLGdCQUFNcUMsUUFBUSxHQUFHRixJQUFJLENBQUNuQyxJQUFMLENBQVVBLElBQVYsSUFBa0IsRUFBbkM7QUFDQSxnQkFBTXNDLFVBQVUsR0FBR0gsSUFBSSxDQUFDbkMsSUFBTCxDQUFVc0MsVUFBVixJQUF3QixFQUEzQyxDQUYwQixDQUkxQjs7QUFDQUgsWUFBQUEsSUFBSSxDQUFDSSxZQUFMLEdBQW9CRCxVQUFVLENBQUNFLEtBQVgsSUFBb0IsQ0FBeEM7QUFDQUwsWUFBQUEsSUFBSSxDQUFDTSxlQUFMLEdBQXVCSCxVQUFVLENBQUNFLEtBQVgsSUFBb0IsQ0FBM0MsQ0FOMEIsQ0FRMUI7O0FBQ0EsbUJBQU9wRSxpQkFBaUIsQ0FBQ3NFLHdCQUFsQixDQUEyQ0wsUUFBM0MsQ0FBUDtBQUNIOztBQUNELGlCQUFPLEVBQVA7QUFDSCxTQXhFQztBQXlFRk0sUUFBQUEsVUFBVSxFQUFFLG9CQUFTQyxHQUFULEVBQWM7QUFDdEI7QUFDQSxjQUFJLE9BQU9DLFlBQVAsS0FBd0IsV0FBeEIsSUFBdUNBLFlBQVksQ0FBQ0MsV0FBeEQsRUFBcUU7QUFDakVGLFlBQUFBLEdBQUcsQ0FBQ0csZ0JBQUosQ0FBcUIsZUFBckIsbUJBQWdERixZQUFZLENBQUNDLFdBQTdEO0FBQ0g7QUFDSjtBQTlFQyxPQWpCNEI7QUFpR2xDRSxNQUFBQSxNQUFNLEVBQUUsSUFqRzBCO0FBa0dsQztBQUNBQyxNQUFBQSxJQUFJLEVBQUUsTUFuRzRCO0FBb0dsQ0MsTUFBQUEsV0FBVyxFQUFFLElBcEdxQjtBQXFHbENDLE1BQUFBLFVBQVUsRUFBRS9FLGlCQUFpQixDQUFDZ0YsYUFBbEIsRUFyR3NCO0FBc0dsQ0MsTUFBQUEsUUFBUSxrQ0FDREMsb0JBQW9CLENBQUNDLHFCQURwQjtBQUVKQyxRQUFBQSxVQUFVLEVBQUVwRixpQkFBaUIsQ0FBQ3FGLG9CQUFsQixFQUZSO0FBR0pDLFFBQUFBLFdBQVcsRUFBRXRGLGlCQUFpQixDQUFDcUYsb0JBQWxCO0FBSFQsUUF0RzBCOztBQTRHbEM7QUFDWjtBQUNBO0FBQ0E7QUFDQTtBQUNZRSxNQUFBQSxVQWpIa0Msc0JBaUh2QkMsR0FqSHVCLEVBaUhsQjVELElBakhrQixFQWlIWjtBQUNsQixZQUFJQSxJQUFJLENBQUM2RCxXQUFMLENBQWlCQyxPQUFqQixDQUF5QixVQUF6QixLQUF3QyxDQUE1QyxFQUErQztBQUMzQ3hGLFVBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU9zRixHQUFQLENBQUQsQ0FBYUcsRUFBYixDQUFnQixDQUFoQixFQUFtQkMsSUFBbkIsQ0FBd0IsaUNBQXhCO0FBQ0gsU0FGRCxNQUVPO0FBQ0gxRixVQUFBQSxDQUFDLENBQUMsSUFBRCxFQUFPc0YsR0FBUCxDQUFELENBQWFHLEVBQWIsQ0FBZ0IsQ0FBaEIsRUFBbUJDLElBQW5CLENBQXdCLEVBQXhCO0FBQ0g7O0FBQ0QxRixRQUFBQSxDQUFDLENBQUMsSUFBRCxFQUFPc0YsR0FBUCxDQUFELENBQWFHLEVBQWIsQ0FBZ0IsQ0FBaEIsRUFBbUJDLElBQW5CLENBQXdCaEUsSUFBSSxDQUFDLENBQUQsQ0FBNUI7QUFDQTFCLFFBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU9zRixHQUFQLENBQUQsQ0FBYUcsRUFBYixDQUFnQixDQUFoQixFQUNLQyxJQURMLENBQ1VoRSxJQUFJLENBQUMsQ0FBRCxDQURkLEVBRUtpRSxRQUZMLENBRWMsYUFGZDtBQUdBM0YsUUFBQUEsQ0FBQyxDQUFDLElBQUQsRUFBT3NGLEdBQVAsQ0FBRCxDQUFhRyxFQUFiLENBQWdCLENBQWhCLEVBQ0tDLElBREwsQ0FDVWhFLElBQUksQ0FBQyxDQUFELENBRGQsRUFFS2lFLFFBRkwsQ0FFYyxhQUZkLEVBVmtCLENBY2xCOztBQUNBM0YsUUFBQUEsQ0FBQyxDQUFDLElBQUQsRUFBT3NGLEdBQVAsQ0FBRCxDQUFhRyxFQUFiLENBQWdCLENBQWhCLEVBQW1CQyxJQUFuQixDQUF3QmhFLElBQUksQ0FBQyxDQUFELENBQTVCLEVBQWlDaUUsUUFBakMsQ0FBMEMsZUFBMUMsRUFma0IsQ0FpQmxCOztBQUNBLFlBQUlDLFdBQVcsR0FBRyxFQUFsQixDQWxCa0IsQ0FvQmxCOztBQUNBLFlBQUlsRSxJQUFJLENBQUNtRSxHQUFMLEtBQWEsRUFBakIsRUFBcUI7QUFDakJELFVBQUFBLFdBQVcsNEJBQW9CbEUsSUFBSSxDQUFDbUUsR0FBekIsZ0dBQVg7QUFDSCxTQXZCaUIsQ0F5QmxCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBRCxRQUFBQSxXQUFXLGtJQUMwQmxFLElBQUksQ0FBQ29FLFFBRC9CLG1FQUV3QkMsZUFBZSxDQUFDQyxnQkFBaEIsSUFBb0MsZUFGNUQsd0lBQVg7QUFNQWhHLFFBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU9zRixHQUFQLENBQUQsQ0FBYUcsRUFBYixDQUFnQixDQUFoQixFQUFtQkMsSUFBbkIsQ0FBd0JFLFdBQXhCLEVBQXFDRCxRQUFyQyxDQUE4QyxlQUE5QztBQUNILE9BdEppQzs7QUF3SmxDO0FBQ1o7QUFDQTtBQUNZTSxNQUFBQSxZQTNKa0MsMEJBMkpuQjtBQUNYQyxRQUFBQSxhQUFhLENBQUNDLHFCQUFkLENBQW9DLGFBQXBDO0FBQ0FyRyxRQUFBQSxpQkFBaUIsQ0FBQ3NHLHdCQUFsQjtBQUNILE9BOUppQztBQStKbENDLE1BQUFBLFFBQVEsRUFBRTtBQS9Kd0IsS0FBdEM7QUFpS0F2RyxJQUFBQSxpQkFBaUIsQ0FBQ08sU0FBbEIsR0FBOEJQLGlCQUFpQixDQUFDQyxTQUFsQixDQUE0QnVHLFNBQTVCLEVBQTlCLENBckw2QixDQXVMN0I7O0FBQ0F4RyxJQUFBQSxpQkFBaUIsQ0FBQ0ssZUFBbEIsQ0FBa0NtQixNQUFsQyxDQUF5QztBQUNyQ2lGLE1BQUFBLGFBQWEsRUFBRSxDQURzQjtBQUVyQ0MsTUFBQUEsYUFBYSxFQUFFLEtBRnNCO0FBR3JDQyxNQUFBQSxZQUFZLEVBQUUsQ0FBQyxPQUFELENBSHVCO0FBSXJDQyxNQUFBQSxhQUFhLEVBQUUsS0FKc0I7QUFLckNDLE1BQUFBLE1BQU0sRUFBRSxDQUNKO0FBQUVDLFFBQUFBLEtBQUssRUFBRWIsZUFBZSxDQUFDYyx3QkFBekI7QUFBbUQvRCxRQUFBQSxLQUFLLEVBQUU7QUFBMUQsT0FESSxFQUVKO0FBQUU4RCxRQUFBQSxLQUFLLEVBQUViLGVBQWUsQ0FBQ2Usc0JBQXpCO0FBQWlEaEUsUUFBQUEsS0FBSyxFQUFFO0FBQXhELE9BRkksRUFHSjtBQUFFOEQsUUFBQUEsS0FBSyxFQUFFYixlQUFlLENBQUNnQixlQUF6QjtBQUEwQ2pFLFFBQUFBLEtBQUssRUFBRTtBQUFqRCxPQUhJLEVBSUo7QUFBRThELFFBQUFBLEtBQUssRUFBRWIsZUFBZSxDQUFDaUIsb0JBQXpCO0FBQStDbEUsUUFBQUEsS0FBSyxFQUFFO0FBQXRELE9BSkksRUFLSjtBQUFFOEQsUUFBQUEsS0FBSyxFQUFFYixlQUFlLENBQUNrQix3QkFBekI7QUFBbURuRSxRQUFBQSxLQUFLLEVBQUU7QUFBMUQsT0FMSSxDQUw2QjtBQVlyQ29FLE1BQUFBLFFBQVEsRUFBRSxrQkFBU3BELE1BQVQsRUFBaUJxRCxRQUFqQixFQUEyQjtBQUNqQ3JILFFBQUFBLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ2lCLEdBQWhDLENBQW9DNEMsTUFBTSxDQUFDaEIsS0FBM0M7QUFDQWhELFFBQUFBLGlCQUFpQixDQUFDSyxlQUFsQixDQUFrQ21CLE1BQWxDLENBQXlDLGNBQXpDO0FBQ0EsZUFBTyxLQUFQO0FBQ0g7QUFoQm9DLEtBQXpDLEVBeEw2QixDQTJNN0I7O0FBQ0F0QixJQUFBQSxDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCYSxFQUFsQixDQUFxQixPQUFyQixFQUE4QixZQUFXO0FBQ3JDZixNQUFBQSxpQkFBaUIsQ0FBQ0csYUFBbEIsQ0FBZ0NtSCxLQUFoQztBQUNBdEgsTUFBQUEsaUJBQWlCLENBQUNLLGVBQWxCLENBQWtDbUIsTUFBbEMsQ0FBeUMsT0FBekM7QUFDSCxLQUhELEVBNU02QixDQWlON0I7O0FBQ0F4QixJQUFBQSxpQkFBaUIsQ0FBQ00sbUJBQWxCLENBQXNDaUgsUUFBdEMsQ0FBK0M7QUFDM0NDLE1BQUFBLFFBRDJDLG9CQUNsQ3pDLFVBRGtDLEVBQ3RCO0FBQ2pCLFlBQUlBLFVBQVUsS0FBSyxNQUFuQixFQUEyQjtBQUN2QkEsVUFBQUEsVUFBVSxHQUFHL0UsaUJBQWlCLENBQUN5SCxtQkFBbEIsRUFBYjtBQUNBQyxVQUFBQSxZQUFZLENBQUNDLFVBQWIsQ0FBd0Isb0JBQXhCO0FBQ0gsU0FIRCxNQUdPO0FBQ0hELFVBQUFBLFlBQVksQ0FBQ0UsT0FBYixDQUFxQixvQkFBckIsRUFBMkM3QyxVQUEzQztBQUNIOztBQUNEL0UsUUFBQUEsaUJBQWlCLENBQUNPLFNBQWxCLENBQTRCc0gsSUFBNUIsQ0FBaUNDLEdBQWpDLENBQXFDL0MsVUFBckMsRUFBaURnRCxJQUFqRDtBQUNIO0FBVDBDLEtBQS9DO0FBV0EvSCxJQUFBQSxpQkFBaUIsQ0FBQ00sbUJBQWxCLENBQXNDUyxFQUF0QyxDQUF5QyxPQUF6QyxFQUFrRCxVQUFTaUgsS0FBVCxFQUFnQjtBQUM5REEsTUFBQUEsS0FBSyxDQUFDQyxlQUFOLEdBRDhELENBQ3JDO0FBQzVCLEtBRkQsRUE3TjZCLENBaU83Qjs7QUFDQSxRQUFNQyxlQUFlLEdBQUdSLFlBQVksQ0FBQ1MsT0FBYixDQUFxQixvQkFBckIsQ0FBeEI7O0FBQ0EsUUFBSUQsZUFBSixFQUFxQjtBQUNqQmxJLE1BQUFBLGlCQUFpQixDQUFDTSxtQkFBbEIsQ0FBc0NpSCxRQUF0QyxDQUErQyxXQUEvQyxFQUE0RFcsZUFBNUQ7QUFDSDs7QUFFRGxJLElBQUFBLGlCQUFpQixDQUFDTyxTQUFsQixDQUE0QlEsRUFBNUIsQ0FBK0IsTUFBL0IsRUFBdUMsWUFBTTtBQUN6Q2YsTUFBQUEsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDaUksT0FBaEMsQ0FBd0MsS0FBeEMsRUFBK0NDLFdBQS9DLENBQTJELFNBQTNEO0FBQ0gsS0FGRCxFQXZPNkIsQ0EyTzdCO0FBQ0E7O0FBQ0FySSxJQUFBQSxpQkFBaUIsQ0FBQ0MsU0FBbEIsQ0FBNEJjLEVBQTVCLENBQStCLE9BQS9CLEVBQXdDLFlBQXhDLEVBQXNELFVBQUNDLENBQUQsRUFBTztBQUN6REEsTUFBQUEsQ0FBQyxDQUFDc0gsY0FBRjtBQUNBdEgsTUFBQUEsQ0FBQyxDQUFDaUgsZUFBRixHQUZ5RCxDQUVwQzs7QUFFckIsVUFBTWxDLEdBQUcsR0FBRzdGLENBQUMsQ0FBQ2MsQ0FBQyxDQUFDdUgsYUFBSCxDQUFELENBQW1CQyxJQUFuQixDQUF3QixVQUF4QixDQUFaOztBQUNBLFVBQUl6QyxHQUFHLEtBQUswQyxTQUFSLElBQXFCMUMsR0FBRyxLQUFLLEVBQWpDLEVBQXFDO0FBQ2pDO0FBQ0E7QUFDQSxZQUFNN0QsR0FBRyxhQUFNd0csYUFBTiw2Q0FBc0RDLGtCQUFrQixDQUFDNUMsR0FBRCxDQUF4RSw2QkFBVDtBQUNBNkMsUUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVkzRyxHQUFaLEVBQWlCLFFBQWpCO0FBQ0g7QUFDSixLQVhELEVBN082QixDQTBQN0I7QUFDQTs7QUFDQWxDLElBQUFBLGlCQUFpQixDQUFDQyxTQUFsQixDQUE0QmMsRUFBNUIsQ0FBK0IsT0FBL0IsRUFBd0MsNEJBQXhDLEVBQXNFLFVBQUNDLENBQUQsRUFBTztBQUN6RSxVQUFNOEgsRUFBRSxHQUFHNUksQ0FBQyxDQUFDYyxDQUFDLENBQUMrSCxNQUFILENBQUQsQ0FBWVgsT0FBWixDQUFvQixJQUFwQixDQUFYO0FBQ0EsVUFBTTVDLEdBQUcsR0FBR3hGLGlCQUFpQixDQUFDTyxTQUFsQixDQUE0QmlGLEdBQTVCLENBQWdDc0QsRUFBaEMsQ0FBWjs7QUFFQSxVQUFJdEQsR0FBRyxDQUFDd0QsS0FBSixDQUFVQyxPQUFWLEVBQUosRUFBeUI7QUFDckI7QUFDQXpELFFBQUFBLEdBQUcsQ0FBQ3dELEtBQUosQ0FBVUUsSUFBVjtBQUNBSixRQUFBQSxFQUFFLENBQUNULFdBQUgsQ0FBZSxPQUFmO0FBQ0gsT0FKRCxNQUlPO0FBQ0g7QUFDQTdDLFFBQUFBLEdBQUcsQ0FBQ3dELEtBQUosQ0FBVWhKLGlCQUFpQixDQUFDbUosV0FBbEIsQ0FBOEIzRCxHQUFHLENBQUM1RCxJQUFKLEVBQTlCLENBQVYsRUFBcUR3SCxJQUFyRDtBQUNBTixRQUFBQSxFQUFFLENBQUNqRCxRQUFILENBQVksT0FBWjtBQUNBTCxRQUFBQSxHQUFHLENBQUN3RCxLQUFKLEdBQVlLLElBQVosQ0FBaUIsb0JBQWpCLEVBQXVDQyxJQUF2QyxDQUE0QyxVQUFDQyxLQUFELEVBQVFDLFNBQVIsRUFBc0I7QUFDOUQsY0FBTUMsRUFBRSxHQUFHdkosQ0FBQyxDQUFDc0osU0FBRCxDQUFELENBQWFoQixJQUFiLENBQWtCLElBQWxCLENBQVg7QUFDQSxpQkFBTyxJQUFJa0IsU0FBSixDQUFjRCxFQUFkLENBQVA7QUFDSCxTQUhEO0FBSUFyRCxRQUFBQSxhQUFhLENBQUNDLHFCQUFkLENBQW9DLGFBQXBDO0FBQ0g7QUFDSixLQWxCRCxFQTVQNkIsQ0FnUjdCO0FBQ0E7QUFDQTs7QUFDQXJHLElBQUFBLGlCQUFpQixDQUFDQyxTQUFsQixDQUE0QmMsRUFBNUIsQ0FBK0IsT0FBL0IsRUFBd0Msd0NBQXhDLEVBQWtGLFVBQUNDLENBQUQsRUFBTztBQUNyRkEsTUFBQUEsQ0FBQyxDQUFDc0gsY0FBRjtBQUNBdEgsTUFBQUEsQ0FBQyxDQUFDaUgsZUFBRixHQUZxRixDQUVoRTs7QUFFckIsVUFBTTBCLE9BQU8sR0FBR3pKLENBQUMsQ0FBQ2MsQ0FBQyxDQUFDdUgsYUFBSCxDQUFqQjtBQUNBLFVBQU1xQixRQUFRLEdBQUdELE9BQU8sQ0FBQ25CLElBQVIsQ0FBYSxnQkFBYixDQUFqQjs7QUFFQSxVQUFJLENBQUNvQixRQUFMLEVBQWU7QUFDWDtBQUNILE9BVG9GLENBV3JGOzs7QUFDQUQsTUFBQUEsT0FBTyxDQUFDOUQsUUFBUixDQUFpQixrQkFBakIsRUFacUYsQ0FjckY7O0FBQ0E3RixNQUFBQSxpQkFBaUIsQ0FBQzZKLFlBQWxCLENBQStCRCxRQUEvQixFQUF5Q0QsT0FBekM7QUFDSCxLQWhCRDtBQWlCSCxHQXhXcUI7O0FBMFd0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsWUFoWHNCLHdCQWdYVEQsUUFoWFMsRUFnWENELE9BaFhELEVBZ1hVO0FBQzVCO0FBQ0E7QUFDQUcsSUFBQUEsTUFBTSxDQUFDRCxZQUFQLENBQW9CRCxRQUFwQixFQUE4QjtBQUFFRyxNQUFBQSxlQUFlLEVBQUU7QUFBbkIsS0FBOUIsRUFBeUQsVUFBQzFDLFFBQUQsRUFBYztBQUNuRXNDLE1BQUFBLE9BQU8sQ0FBQ3RCLFdBQVIsQ0FBb0Isa0JBQXBCOztBQUVBLFVBQUloQixRQUFRLElBQUlBLFFBQVEsQ0FBQ3JELE1BQVQsS0FBb0IsSUFBcEMsRUFBMEM7QUFDdEM7QUFDQTtBQUNBaEUsUUFBQUEsaUJBQWlCLENBQUNPLFNBQWxCLENBQTRCMEIsSUFBNUIsQ0FBaUMrSCxNQUFqQyxDQUF3QyxJQUF4QyxFQUE4QyxLQUE5QztBQUNILE9BSkQsTUFJTztBQUFBOztBQUNIO0FBQ0EsWUFBTUMsUUFBUSxHQUFHLENBQUE1QyxRQUFRLFNBQVIsSUFBQUEsUUFBUSxXQUFSLGtDQUFBQSxRQUFRLENBQUU2QyxRQUFWLG1HQUFvQkMsS0FBcEIsZ0ZBQTRCLENBQTVCLE1BQ0RsRSxlQUFlLENBQUNtRSxnQkFEZixJQUVELHlCQUZoQjtBQUdBQyxRQUFBQSxXQUFXLENBQUNDLFNBQVosQ0FBc0JMLFFBQXRCO0FBQ0g7QUFDSixLQWREO0FBZUgsR0FsWXFCOztBQW9ZdEI7QUFDSjtBQUNBO0FBQ0kzRCxFQUFBQSx3QkF2WXNCLHNDQXVZSztBQUN2QixRQUFNaUUsSUFBSSxHQUFHdkssaUJBQWlCLENBQUNPLFNBQWxCLENBQTRCc0gsSUFBNUIsQ0FBaUMwQyxJQUFqQyxFQUFiOztBQUNBLFFBQUlBLElBQUksQ0FBQ0MsS0FBTCxJQUFjLENBQWxCLEVBQXFCO0FBQ2pCdEssTUFBQUEsQ0FBQyxDQUFDRixpQkFBaUIsQ0FBQ08sU0FBbEIsQ0FBNEJrSyxLQUE1QixHQUFvQ0MsU0FBcEMsRUFBRCxDQUFELENBQW1EckIsSUFBbkQsQ0FBd0Qsc0JBQXhELEVBQWdGSCxJQUFoRjtBQUNILEtBRkQsTUFFTztBQUNIaEosTUFBQUEsQ0FBQyxDQUFDRixpQkFBaUIsQ0FBQ08sU0FBbEIsQ0FBNEJrSyxLQUE1QixHQUFvQ0MsU0FBcEMsRUFBRCxDQUFELENBQW1EckIsSUFBbkQsQ0FBd0Qsc0JBQXhELEVBQWdGRCxJQUFoRjtBQUNIO0FBQ0osR0E5WXFCOztBQWdadEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJeEksRUFBQUEsa0JBclpzQixnQ0FxWkQ7QUFDakJrSixJQUFBQSxNQUFNLENBQUNhLFdBQVAsQ0FBbUI7QUFBRWxILE1BQUFBLEtBQUssRUFBRTtBQUFULEtBQW5CLEVBQW1DLFVBQUM3QixJQUFELEVBQVU7QUFDekMsVUFBSUEsSUFBSSxJQUFJQSxJQUFJLENBQUNnSixVQUFqQixFQUE2QjtBQUN6QjtBQUNBLFlBQU1DLFlBQVksR0FBR0MsTUFBTSxDQUFDbEosSUFBSSxDQUFDaUosWUFBTixDQUEzQjtBQUNBLFlBQU1FLFVBQVUsR0FBR0QsTUFBTSxDQUFDbEosSUFBSSxDQUFDbUosVUFBTixDQUF6QjtBQUVBL0ssUUFBQUEsaUJBQWlCLENBQUNTLGFBQWxCLEdBQWtDLElBQWxDO0FBQ0FULFFBQUFBLGlCQUFpQixDQUFDZ0wsMkJBQWxCLENBQThDSCxZQUE5QyxFQUE0REUsVUFBNUQsRUFOeUIsQ0FRekI7QUFDQTs7QUFDQS9LLFFBQUFBLGlCQUFpQixDQUFDYSw4QkFBbEI7QUFDSCxPQVhELE1BV087QUFDSDtBQUNBYixRQUFBQSxpQkFBaUIsQ0FBQ1MsYUFBbEIsR0FBa0MsS0FBbEM7QUFDQVQsUUFBQUEsaUJBQWlCLENBQUNpTCw0QkFBbEIsR0FIRyxDQUlIO0FBQ0g7QUFDSixLQWxCRDtBQW1CSCxHQXphcUI7O0FBMmF0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJNUYsRUFBQUEsb0JBL2FzQixrQ0ErYUM7QUFDbkI7QUFDQSxRQUFJLENBQUNyRixpQkFBaUIsQ0FBQ1MsYUFBdkIsRUFBc0M7QUFDbEMsYUFBTyxFQUFQO0FBQ0gsS0FKa0IsQ0FNbkI7OztBQUNBLGtMQUlVd0YsZUFBZSxDQUFDaUYsc0JBSjFCLG9JQVFjakYsZUFBZSxDQUFDa0YsNEJBUjlCO0FBWUgsR0FsY3FCOztBQW9jdEI7QUFDSjtBQUNBO0FBQ0lGLEVBQUFBLDRCQXZjc0IsMENBdWNTO0FBQzNCO0FBQ0FqTCxJQUFBQSxpQkFBaUIsQ0FBQ0MsU0FBbEIsQ0FBNEJpSixJQUE1QixHQUYyQixDQUkzQjs7QUFDQWhKLElBQUFBLENBQUMsQ0FBQyxzQkFBRCxDQUFELENBQTBCa0ksT0FBMUIsQ0FBa0MsU0FBbEMsRUFBNkNjLElBQTdDLEdBTDJCLENBTzNCOztBQUNBbEosSUFBQUEsaUJBQWlCLENBQUNVLHlCQUFsQixDQUE0QzBJLElBQTVDO0FBQ0gsR0FoZHFCOztBQWtkdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJOUUsRUFBQUEsd0JBdmRzQixvQ0F1ZEdMLFFBdmRILEVBdWRhO0FBQy9CLFdBQU9BLFFBQVEsQ0FBQ21ILEdBQVQsQ0FBYSxVQUFBQyxLQUFLLEVBQUk7QUFDekI7QUFDQSxVQUFNQyxPQUFPLEdBQUdELEtBQUssQ0FBQ0UsWUFBTixJQUFzQixDQUF0QztBQUNBLFVBQU1DLFVBQVUsR0FBSUYsT0FBTyxHQUFHLElBQVgsR0FBbUIsT0FBbkIsR0FBNkIsVUFBaEQ7QUFDQSxVQUFNRyxNQUFNLEdBQUdILE9BQU8sR0FBRyxDQUFWLEdBQWNSLE1BQU0sQ0FBQ1ksR0FBUCxDQUFXSixPQUFPLEdBQUcsSUFBckIsRUFBMkIxSSxNQUEzQixDQUFrQzRJLFVBQWxDLENBQWQsR0FBOEQsRUFBN0UsQ0FKeUIsQ0FNekI7O0FBQ0EsVUFBTUcsYUFBYSxHQUFHYixNQUFNLENBQUNPLEtBQUssQ0FBQzFILEtBQVAsQ0FBTixDQUFvQmYsTUFBcEIsQ0FBMkIscUJBQTNCLENBQXRCLENBUHlCLENBU3pCOztBQUNBLFVBQU1nSixVQUFVLEdBQUcsQ0FBQ1AsS0FBSyxDQUFDUSxPQUFOLElBQWlCLEVBQWxCLEVBQ2RDLE1BRGMsQ0FDUCxVQUFBQyxDQUFDO0FBQUEsZUFBSUEsQ0FBQyxDQUFDQyxhQUFGLElBQW1CRCxDQUFDLENBQUNDLGFBQUYsQ0FBZ0IzSyxNQUFoQixHQUF5QixDQUFoRDtBQUFBLE9BRE0sRUFFZCtKLEdBRmMsQ0FFVixVQUFBVyxDQUFDO0FBQUEsZUFBSztBQUNQdEMsVUFBQUEsRUFBRSxFQUFFc0MsQ0FBQyxDQUFDdEMsRUFEQztBQUVQckcsVUFBQUEsT0FBTyxFQUFFMkksQ0FBQyxDQUFDM0ksT0FGSjtBQUdQRSxVQUFBQSxPQUFPLEVBQUV5SSxDQUFDLENBQUN6SSxPQUhKO0FBSVAwSSxVQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQ0MsYUFKVjtBQUtQQyxVQUFBQSxZQUFZLEVBQUVGLENBQUMsQ0FBQ0UsWUFMVDtBQUt5QjtBQUNoQ0MsVUFBQUEsWUFBWSxFQUFFSCxDQUFDLENBQUNHLFlBTlQsQ0FNeUI7O0FBTnpCLFNBQUw7QUFBQSxPQUZTLENBQW5CLENBVnlCLENBcUJ6Qjs7QUFDQSxVQUFNQyxhQUFhLEdBQUdQLFVBQVUsQ0FBQ3ZLLE1BQVgsR0FBb0IsQ0FBMUM7QUFDQSxVQUFNK0ssVUFBVSxHQUFHZixLQUFLLENBQUNnQixXQUFOLEtBQXNCLFVBQXpDO0FBQ0EsVUFBTUMsVUFBVSxHQUFHSCxhQUFhLEdBQUcsVUFBSCxHQUFnQixJQUFoRDtBQUNBLFVBQU1JLGFBQWEsR0FBR0gsVUFBVSxHQUFHLEVBQUgsR0FBUSxXQUF4QyxDQXpCeUIsQ0EyQnpCOztBQUNBLFVBQU1yRyxHQUFHLEdBQUcsQ0FBQ3NGLEtBQUssQ0FBQ1EsT0FBTixJQUFpQixFQUFsQixFQUNQVCxHQURPLENBQ0gsVUFBQVcsQ0FBQztBQUFBLGVBQUlBLENBQUMsQ0FBQ1MsZUFBTjtBQUFBLE9BREUsRUFFUFYsTUFGTyxDQUVBLFVBQUFyQyxFQUFFO0FBQUEsZUFBSUEsRUFBRSxJQUFJQSxFQUFFLENBQUNwSSxNQUFILEdBQVksQ0FBdEI7QUFBQSxPQUZGLEVBR1BvTCxJQUhPLENBR0YsR0FIRSxDQUFaLENBNUJ5QixDQWlDekI7QUFDQTs7QUFDQSxVQUFNakgsR0FBRyxHQUFHLENBQ1JtRyxhQURRLEVBQ29CO0FBQzVCTixNQUFBQSxLQUFLLENBQUNqSSxPQUZFLEVBRW9CO0FBQzVCaUksTUFBQUEsS0FBSyxDQUFDL0gsT0FBTixJQUFpQitILEtBQUssQ0FBQzlILEdBSGYsRUFHb0I7QUFDNUJrSSxNQUFBQSxNQUpRLEVBSW9CO0FBQzVCRyxNQUFBQSxVQUxRLEVBS29CO0FBQzVCUCxNQUFBQSxLQUFLLENBQUNnQixXQU5FLENBTW9CO0FBTnBCLE9BQVosQ0FuQ3lCLENBNEN6Qjs7QUFDQTdHLE1BQUFBLEdBQUcsQ0FBQ1EsUUFBSixHQUFlcUYsS0FBSyxDQUFDN0gsUUFBckI7QUFDQWdDLE1BQUFBLEdBQUcsQ0FBQ0MsV0FBSixHQUFrQjZHLFVBQVUsR0FBR0MsYUFBL0I7QUFDQS9HLE1BQUFBLEdBQUcsQ0FBQ08sR0FBSixHQUFVQSxHQUFWLENBL0N5QixDQStDVjs7QUFFZixhQUFPUCxHQUFQO0FBQ0gsS0FsRE0sQ0FBUDtBQW1ESCxHQTNnQnFCOztBQTZnQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTJELEVBQUFBLFdBbGhCc0IsdUJBa2hCVnZILElBbGhCVSxFQWtoQko7QUFDZCxRQUFJOEssVUFBVSxHQUFHLHVEQUFqQjtBQUNBOUssSUFBQUEsSUFBSSxDQUFDLENBQUQsQ0FBSixDQUFRK0ssT0FBUixDQUFnQixVQUFDQyxNQUFELEVBQVNDLENBQVQsRUFBZTtBQUMzQixVQUFJQSxDQUFDLEdBQUcsQ0FBUixFQUFXO0FBQ1BILFFBQUFBLFVBQVUsSUFBSSxvQkFBZDtBQUNBQSxRQUFBQSxVQUFVLElBQUksb0JBQWQ7QUFDSDs7QUFDRCxVQUFJRSxNQUFNLENBQUNaLGFBQVAsS0FBeUJ2RCxTQUF6QixJQUNHbUUsTUFBTSxDQUFDWixhQUFQLEtBQXlCLElBRDVCLElBRUdZLE1BQU0sQ0FBQ1osYUFBUCxDQUFxQjNLLE1BQXJCLEtBQWdDLENBRnZDLEVBRTBDO0FBRXRDcUwsUUFBQUEsVUFBVSxnRUFFbUJFLE1BQU0sQ0FBQ25ELEVBRjFCLDZMQU13Qm1ELE1BQU0sQ0FBQ25ELEVBTi9CLGdJQVMwQm1ELE1BQU0sQ0FBQ25ELEVBVGpDLHVRQWVnQ21ELE1BQU0sQ0FBQ3hKLE9BZnZDLHVLQWlCK0J3SixNQUFNLENBQUN0SixPQWpCdEMsd0JBQVY7QUFtQkgsT0F2QkQsTUF1Qk87QUFDSDtBQUNBO0FBQ0E7QUFDQSxZQUFNd0osV0FBVyxHQUFHRixNQUFNLENBQUNYLFlBQVAsSUFBdUIsRUFBM0M7QUFDQSxZQUFNYyxXQUFXLEdBQUdILE1BQU0sQ0FBQ1YsWUFBUCxJQUF1QixFQUEzQztBQUVBUSxRQUFBQSxVQUFVLHVEQUVVRSxNQUFNLENBQUNuRCxFQUZqQiw2TEFNd0JtRCxNQUFNLENBQUNuRCxFQU4vQixzQkFNMkNxRCxXQU4zQyx1SEFTMEJGLE1BQU0sQ0FBQ25ELEVBVGpDLHVMQWFxQnNELFdBYnJCLDZGQWVnQ0gsTUFBTSxDQUFDeEosT0FmdkMsdUtBaUIrQndKLE1BQU0sQ0FBQ3RKLE9BakJ0Qyx3QkFBVjtBQW1CSDtBQUNKLEtBdkREO0FBd0RBb0osSUFBQUEsVUFBVSxJQUFJLGtCQUFkO0FBQ0EsV0FBT0EsVUFBUDtBQUNILEdBOWtCcUI7O0FBZ2xCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSTFILEVBQUFBLGFBcGxCc0IsMkJBb2xCTjtBQUNaO0FBQ0EsUUFBTWtELGVBQWUsR0FBR1IsWUFBWSxDQUFDUyxPQUFiLENBQXFCLG9CQUFyQixDQUF4QjtBQUNBLFdBQU9ELGVBQWUsR0FBRzhFLFFBQVEsQ0FBQzlFLGVBQUQsRUFBa0IsRUFBbEIsQ0FBWCxHQUFtQ2xJLGlCQUFpQixDQUFDeUgsbUJBQWxCLEVBQXpEO0FBQ0gsR0F4bEJxQjs7QUEwbEJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQSxFQUFBQSxtQkE5bEJzQixpQ0E4bEJBO0FBQ2xCO0FBQ0EsUUFBSXdGLFNBQVMsR0FBR2pOLGlCQUFpQixDQUFDQyxTQUFsQixDQUE0Qm9KLElBQTVCLENBQWlDLFlBQWpDLEVBQStDNkQsS0FBL0MsR0FBdURDLFdBQXZELEVBQWhCLENBRmtCLENBSWxCOztBQUNBLFFBQU1DLFlBQVksR0FBR3hFLE1BQU0sQ0FBQ3lFLFdBQTVCO0FBQ0EsUUFBTUMsa0JBQWtCLEdBQUcsR0FBM0IsQ0FOa0IsQ0FNYztBQUVoQzs7QUFDQSxXQUFPQyxJQUFJLENBQUNDLEdBQUwsQ0FBU0QsSUFBSSxDQUFDRSxLQUFMLENBQVcsQ0FBQ0wsWUFBWSxHQUFHRSxrQkFBaEIsSUFBc0NMLFNBQWpELENBQVQsRUFBc0UsQ0FBdEUsQ0FBUDtBQUNILEdBeG1CcUI7O0FBeW1CdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJakMsRUFBQUEsMkJBOW1Cc0IseUNBOG1Cd0M7QUFBQTs7QUFBQSxRQUFsQ3hJLFNBQWtDLHVFQUF0QixJQUFzQjtBQUFBLFFBQWhCQyxPQUFnQix1RUFBTixJQUFNO0FBQzFELFFBQU1pTCxPQUFPLEdBQUcsRUFBaEI7QUFFQUEsSUFBQUEsT0FBTyxDQUFDQyxNQUFSLDJEQUNLMUgsZUFBZSxDQUFDMkgsU0FEckIsRUFDaUMsQ0FBQzlDLE1BQU0sRUFBUCxFQUFXQSxNQUFNLEVBQWpCLENBRGpDLG9DQUVLN0UsZUFBZSxDQUFDNEgsYUFGckIsRUFFcUMsQ0FBQy9DLE1BQU0sR0FBR2dELFFBQVQsQ0FBa0IsQ0FBbEIsRUFBcUIsTUFBckIsQ0FBRCxFQUErQmhELE1BQU0sR0FBR2dELFFBQVQsQ0FBa0IsQ0FBbEIsRUFBcUIsTUFBckIsQ0FBL0IsQ0FGckMsb0NBR0s3SCxlQUFlLENBQUM4SCxZQUhyQixFQUdvQyxDQUFDakQsTUFBTSxHQUFHZ0QsUUFBVCxDQUFrQixDQUFsQixFQUFxQixNQUFyQixDQUFELEVBQStCaEQsTUFBTSxFQUFyQyxDQUhwQyxvQ0FJSzdFLGVBQWUsQ0FBQytILGNBSnJCLEVBSXNDLENBQUNsRCxNQUFNLEdBQUdnRCxRQUFULENBQWtCLEVBQWxCLEVBQXNCLE1BQXRCLENBQUQsRUFBZ0NoRCxNQUFNLEVBQXRDLENBSnRDLG9DQUtLN0UsZUFBZSxDQUFDZ0ksYUFMckIsRUFLcUMsQ0FBQ25ELE1BQU0sR0FBR29ELE9BQVQsQ0FBaUIsT0FBakIsQ0FBRCxFQUE0QnBELE1BQU0sR0FBR2hJLEtBQVQsQ0FBZSxPQUFmLENBQTVCLENBTHJDLG9DQU1LbUQsZUFBZSxDQUFDa0ksYUFOckIsRUFNcUMsQ0FBQ3JELE1BQU0sR0FBR2dELFFBQVQsQ0FBa0IsQ0FBbEIsRUFBcUIsT0FBckIsRUFBOEJJLE9BQTlCLENBQXNDLE9BQXRDLENBQUQsRUFBaURwRCxNQUFNLEdBQUdnRCxRQUFULENBQWtCLENBQWxCLEVBQXFCLE9BQXJCLEVBQThCaEwsS0FBOUIsQ0FBb0MsT0FBcEMsQ0FBakQsQ0FOckM7QUFRQTRLLElBQUFBLE9BQU8sQ0FBQ1UsbUJBQVIsR0FBOEIsSUFBOUI7QUFDQVYsSUFBQUEsT0FBTyxDQUFDVyxlQUFSLEdBQTBCLElBQTFCO0FBQ0FYLElBQUFBLE9BQU8sQ0FBQ1ksZUFBUixHQUEwQixJQUExQjtBQUNBWixJQUFBQSxPQUFPLENBQUNhLE9BQVIsR0FBa0J6RCxNQUFNLEVBQXhCO0FBQ0E0QyxJQUFBQSxPQUFPLENBQUNjLE1BQVIsR0FBaUI7QUFDYjVMLE1BQUFBLE1BQU0sRUFBRSxZQURLO0FBRWI2TCxNQUFBQSxTQUFTLEVBQUUsS0FGRTtBQUdiQyxNQUFBQSxVQUFVLEVBQUV6SSxlQUFlLENBQUMwSSxZQUhmO0FBSWJDLE1BQUFBLFdBQVcsRUFBRTNJLGVBQWUsQ0FBQzRJLGFBSmhCO0FBS2JDLE1BQUFBLFNBQVMsRUFBRTdJLGVBQWUsQ0FBQzhJLFFBTGQ7QUFNYkMsTUFBQUEsT0FBTyxFQUFFL0ksZUFBZSxDQUFDZ0osTUFOWjtBQU9iQyxNQUFBQSxnQkFBZ0IsRUFBRWpKLGVBQWUsQ0FBQ2tKLGdCQVByQjtBQVFiQyxNQUFBQSxVQUFVLEVBQUVsSyxvQkFBb0IsQ0FBQ21LLFlBQXJCLENBQWtDQyxJQVJqQztBQVNiQyxNQUFBQSxVQUFVLEVBQUVySyxvQkFBb0IsQ0FBQ21LLFlBQXJCLENBQWtDRyxNQVRqQztBQVViQyxNQUFBQSxRQUFRLEVBQUU7QUFWRyxLQUFqQixDQWYwRCxDQTRCMUQ7QUFDQTs7QUFDQSxRQUFJak4sU0FBUyxJQUFJQyxPQUFqQixFQUEwQjtBQUN0QmlMLE1BQUFBLE9BQU8sQ0FBQ2xMLFNBQVIsR0FBb0JzSSxNQUFNLENBQUN0SSxTQUFELENBQU4sQ0FBa0IwTCxPQUFsQixDQUEwQixLQUExQixDQUFwQjtBQUNBUixNQUFBQSxPQUFPLENBQUNqTCxPQUFSLEdBQWtCcUksTUFBTSxDQUFDckksT0FBRCxDQUFOLENBQWdCSyxLQUFoQixDQUFzQixLQUF0QixDQUFsQjtBQUNILEtBSEQsTUFHTztBQUNIO0FBQ0E0SyxNQUFBQSxPQUFPLENBQUNsTCxTQUFSLEdBQW9Cc0ksTUFBTSxFQUExQjtBQUNBNEMsTUFBQUEsT0FBTyxDQUFDakwsT0FBUixHQUFrQnFJLE1BQU0sRUFBeEI7QUFDSDs7QUFFRDlLLElBQUFBLGlCQUFpQixDQUFDSSxrQkFBbEIsQ0FBcUNzUCxlQUFyQyxDQUNJaEMsT0FESixFQUVJMU4saUJBQWlCLENBQUMyUCwyQkFGdEIsRUF2QzBELENBNEMxRDtBQUNBO0FBQ0gsR0E1cEJxQjs7QUErcEJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUEsRUFBQUEsMkJBcnFCc0IsdUNBcXFCTWhNLEtBcnFCTixFQXFxQmFpTSxHQXJxQmIsRUFxcUJrQkMsS0FycUJsQixFQXFxQnlCO0FBQzNDO0FBQ0E3UCxJQUFBQSxpQkFBaUIsQ0FBQ3VCLFdBQWxCLENBQThCdkIsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDaUIsR0FBaEMsRUFBOUI7QUFDSCxHQXhxQnFCOztBQTBxQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFdBOXFCc0IsdUJBOHFCVkQsSUE5cUJVLEVBOHFCSjtBQUNkdEIsSUFBQUEsaUJBQWlCLENBQUNPLFNBQWxCLENBQTRCaUIsTUFBNUIsQ0FBbUNGLElBQW5DLEVBQXlDeUcsSUFBekM7QUFDQS9ILElBQUFBLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ2lJLE9BQWhDLENBQXdDLEtBQXhDLEVBQStDdkMsUUFBL0MsQ0FBd0QsU0FBeEQ7QUFDSDtBQWpyQnFCLENBQTFCO0FBb3JCQTtBQUNBO0FBQ0E7O0FBQ0EzRixDQUFDLENBQUM0UCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCL1AsRUFBQUEsaUJBQWlCLENBQUNXLFVBQWxCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRXh0ZW5zaW9uc0FQSSwgbW9tZW50LCBnbG9iYWxUcmFuc2xhdGUsIENEUlBsYXllciwgQ2RyQVBJLCBVc2VyTWVzc2FnZSwgQUNMSGVscGVyICovXG5cbi8qKlxuICogY2FsbERldGFpbFJlY29yZHMgbW9kdWxlLlxuICogQG1vZHVsZSBjYWxsRGV0YWlsUmVjb3Jkc1xuICovXG5jb25zdCBjYWxsRGV0YWlsUmVjb3JkcyA9IHtcbiAgICAvKipcbiAgICAgKiBUaGUgY2FsbCBkZXRhaWwgcmVjb3JkcyB0YWJsZSBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNkclRhYmxlOiAkKCcjY2RyLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbHNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkYXRlUmFuZ2VTZWxlY3RvcjogJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBzZWFyY2ggQ0RSIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VhcmNoQ0RSSW5wdXQ6ICQoJyNzZWFyY2gtY2RyLWlucHV0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGFnZSBsZW5ndGggc2VsZWN0b3IuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcGFnZUxlbmd0aFNlbGVjdG9yOiAkKCcjcGFnZS1sZW5ndGgtc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQW4gYXJyYXkgb2YgcGxheWVycy5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgcGxheWVyczogW10sXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgaWYgQ0RSIGRhdGFiYXNlIGhhcyBhbnkgcmVjb3Jkc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGhhc0NEUlJlY29yZHM6IHRydWUsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZW1wdHkgZGF0YWJhc2UgcGxhY2Vob2xkZXIgZWxlbWVudFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVtcHR5RGF0YWJhc2VQbGFjZWhvbGRlcjogJCgnI2Nkci1lbXB0eS1kYXRhYmFzZS1wbGFjZWhvbGRlcicpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGNhbGwgZGV0YWlsIHJlY29yZHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gRmV0Y2ggbWV0YWRhdGEgZmlyc3QsIHRoZW4gaW5pdGlhbGl6ZSBEYXRhVGFibGUgd2l0aCBwcm9wZXIgZGF0ZSByYW5nZVxuICAgICAgICAvLyBXSFk6IFByZXZlbnRzIGRvdWJsZSByZXF1ZXN0IG9uIHBhZ2UgbG9hZFxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5mZXRjaExhdGVzdENEUkRhdGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEYXRhVGFibGUgYW5kIGV2ZW50IGhhbmRsZXJzXG4gICAgICogQ2FsbGVkIGFmdGVyIG1ldGFkYXRhIGlzIHJlY2VpdmVkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZUFuZEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRlYm91bmNlIHRpbWVyIHZhcmlhYmxlXG4gICAgICAgIGxldCBzZWFyY2hEZWJvdW5jZVRpbWVyID0gbnVsbDtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lciBpZiB0aGUgdXNlciBpcyBzdGlsbCB0eXBpbmdcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzZWFyY2hEZWJvdW5jZVRpbWVyKTtcblxuICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIGZvciBkZWxheWVkIGV4ZWN1dGlvblxuICAgICAgICAgICAgc2VhcmNoRGVib3VuY2VUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzXG4gICAgICAgICAgICAgICAgICAgIHx8IGUua2V5Q29kZSA9PT0gOFxuICAgICAgICAgICAgICAgICAgICB8fCBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHBhc3MgdGhlIHNlYXJjaCBrZXl3b3JkLCBkYXRlcyBhcmUgaGFuZGxlZCBzZXBhcmF0ZWx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MDApOyAvLyA1MDBtcyBkZWxheSBiZWZvcmUgZXhlY3V0aW5nIHRoZSBzZWFyY2hcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmRhdGFUYWJsZSh7XG4gICAgICAgICAgICBzZWFyY2g6IHtcbiAgICAgICAgICAgICAgICBzZWFyY2g6IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAgeyBkYXRhOiBudWxsLCBvcmRlcmFibGU6IGZhbHNlIH0sICAvLyAwOiBleHBhbmQgaWNvbiBjb2x1bW5cbiAgICAgICAgICAgICAgICB7IGRhdGE6IDAgfSwgICAgICAgICAgICAgICAgICAgICAgIC8vIDE6IGRhdGUgKGFycmF5IGluZGV4IDApXG4gICAgICAgICAgICAgICAgeyBkYXRhOiAxIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAyOiBzcmNfbnVtIChhcnJheSBpbmRleCAxKVxuICAgICAgICAgICAgICAgIHsgZGF0YTogMiB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMzogZHN0X251bSAoYXJyYXkgaW5kZXggMilcbiAgICAgICAgICAgICAgICB7IGRhdGE6IDMgfSwgICAgICAgICAgICAgICAgICAgICAgIC8vIDQ6IGR1cmF0aW9uIChhcnJheSBpbmRleCAzKVxuICAgICAgICAgICAgICAgIHsgZGF0YTogbnVsbCwgb3JkZXJhYmxlOiBmYWxzZSB9ICAgLy8gNTogZGVsZXRlIGJ1dHRvbiBjb2x1bW5cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAgICAgICAgeyBkZWZhdWx0Q29udGVudDogXCItXCIsICB0YXJnZXRzOiBcIl9hbGxcIn0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9jZHInLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdHRVQnLCAgLy8gUkVTVCBBUEkgdXNlcyBHRVQgZm9yIGxpc3QgcmV0cmlldmFsXG4gICAgICAgICAgICAgICAgZGF0YTogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGlzTGlua2VkSWRTZWFyY2ggPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyAxLiBBbHdheXMgZ2V0IGRhdGVzIGZyb20gZGF0ZSByYW5nZSBzZWxlY3RvciB1c2luZyBkYXRlcmFuZ2VwaWNrZXIgQVBJXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVSYW5nZVBpY2tlciA9IGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRhKCdkYXRlcmFuZ2VwaWNrZXInKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGVSYW5nZVBpY2tlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhcnREYXRlID0gZGF0ZVJhbmdlUGlja2VyLnN0YXJ0RGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuZERhdGUgPSBkYXRlUmFuZ2VQaWNrZXIuZW5kRGF0ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXJ0RGF0ZSAmJiBzdGFydERhdGUuaXNWYWxpZCgpICYmIGVuZERhdGUgJiYgZW5kRGF0ZS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZGF0ZUZyb20gPSBzdGFydERhdGUuZm9ybWF0KCdZWVlZLU1NLUREJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRhdGVUbyA9IGVuZERhdGUuZW5kT2YoJ2RheScpLmZvcm1hdCgnWVlZWS1NTS1ERCBISDptbTpzcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gMi4gUHJvY2VzcyBzZWFyY2gga2V5d29yZCBmcm9tIHNlYXJjaCBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hLZXl3b3JkID0gZC5zZWFyY2gudmFsdWUgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlYXJjaEtleXdvcmQudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXl3b3JkID0gc2VhcmNoS2V5d29yZC50cmltKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHNlYXJjaCBwcmVmaXhlczogc3JjOiwgZHN0OiwgZGlkOiwgbGlua2VkaWQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdzcmM6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgc291cmNlIG51bWJlciBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnNyY19udW0gPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnZHN0OicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IGRlc3RpbmF0aW9uIG51bWJlciBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRzdF9udW0gPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnZGlkOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IERJRCBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRpZCA9IGtleXdvcmQuc3Vic3RyaW5nKDQpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdsaW5rZWRpZDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBsaW5rZWRpZCAtIGlnbm9yZSBkYXRlIHJhbmdlIGZvciBsaW5rZWRpZCBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMubGlua2VkaWQgPSBrZXl3b3JkLnN1YnN0cmluZyg5KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNMaW5rZWRJZFNlYXJjaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRhdGUgcGFyYW1zIGZvciBsaW5rZWRpZCBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcGFyYW1zLmRhdGVGcm9tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBwYXJhbXMuZGF0ZVRvO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGdWxsLXRleHQgc2VhcmNoOiBzZWFyY2ggaW4gc3JjX251bSwgZHN0X251bSwgYW5kIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlciBleHBlY3RzIHNlYXJjaCB3aXRob3V0IHByZWZpeCB0byBmaW5kIG51bWJlciBhbnl3aGVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zZWFyY2ggPSBrZXl3b3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUkVTVCBBUEkgcGFnaW5hdGlvbiBwYXJhbWV0ZXJzXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5saW1pdCA9IGQubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMub2Zmc2V0ID0gZC5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnNvcnQgPSAnaWQnO1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMub3JkZXIgPSAnREVTQyc7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRhdGFTcmM6IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQVBJIHJldHVybnMgUEJYQXBpUmVzdWx0IHdpdGggbmVzdGVkIHN0cnVjdHVyZTpcbiAgICAgICAgICAgICAgICAgICAgLy8ge3Jlc3VsdDogdHJ1ZSwgZGF0YToge2RhdGE6IFsuLi5dLCBwYWdpbmF0aW9uOiB7Li4ufX19XG4gICAgICAgICAgICAgICAgICAgIGlmIChqc29uLnJlc3VsdCAmJiBqc29uLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3REYXRhID0ganNvbi5kYXRhLmRhdGEgfHwgW107XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYWdpbmF0aW9uID0ganNvbi5kYXRhLnBhZ2luYXRpb24gfHwge307XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBEYXRhVGFibGVzIHBhZ2luYXRpb24gcHJvcGVydGllc1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbi5yZWNvcmRzVG90YWwgPSBwYWdpbmF0aW9uLnRvdGFsIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uLnJlY29yZHNGaWx0ZXJlZCA9IHBhZ2luYXRpb24udG90YWwgfHwgMDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJhbnNmb3JtIFJFU1QgcmVjb3JkcyB0byBEYXRhVGFibGUgcm93c1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxEZXRhaWxSZWNvcmRzLnRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZShyZXN0RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYmVmb3JlU2VuZDogZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBCZWFyZXIgdG9rZW4gZm9yIEFQSSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQXV0aG9yaXphdGlvbicsIGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxuICAgICAgICAgICAgLy9zY3JvbGxZOiAkKHdpbmRvdykuaGVpZ2h0KCkgLSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub2Zmc2V0KCkudG9wLTE1MCxcbiAgICAgICAgICAgIHNEb206ICdydGlwJyxcbiAgICAgICAgICAgIGRlZmVyUmVuZGVyOiB0cnVlLFxuICAgICAgICAgICAgcGFnZUxlbmd0aDogY2FsbERldGFpbFJlY29yZHMuZ2V0UGFnZUxlbmd0aCgpLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IHtcbiAgICAgICAgICAgICAgICAuLi5TZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICAgICAgZW1wdHlUYWJsZTogY2FsbERldGFpbFJlY29yZHMuZ2V0RW1wdHlUYWJsZU1lc3NhZ2UoKSxcbiAgICAgICAgICAgICAgICB6ZXJvUmVjb3JkczogY2FsbERldGFpbFJlY29yZHMuZ2V0RW1wdHlUYWJsZU1lc3NhZ2UoKVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIHRoZSBDRFIgcm93LlxuICAgICAgICAgICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5EVF9Sb3dDbGFzcy5pbmRleE9mKFwiZGV0YWlsZWRcIikgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnPGkgY2xhc3M9XCJpY29uIGNhcmV0IGRvd25cIj48L2k+Jyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMSkuaHRtbChkYXRhWzBdKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMilcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoZGF0YVsxXSlcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgzKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChkYXRhWzJdKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBEdXJhdGlvbiBjb2x1bW4gKG5vIGljb25zKVxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSg0KS5odG1sKGRhdGFbM10pLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBMYXN0IGNvbHVtbjogbG9nIGljb24gKyBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgbGV0IGFjdGlvbnNIdG1sID0gJyc7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgbG9nIGljb24gaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb25zSHRtbCArPSBgPGkgZGF0YS1pZHM9XCIke2RhdGEuaWRzfVwiIGNsYXNzPVwiZmlsZSBhbHRlcm5hdGUgb3V0bGluZSBpY29uXCIgc3R5bGU9XCJjdXJzb3I6IHBvaW50ZXI7IG1hcmdpbi1yaWdodDogOHB4O1wiPjwvaT5gO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEFkZCBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBVc2UgdHdvLXN0ZXBzLWRlbGV0ZSBtZWNoYW5pc20gdG8gcHJldmVudCBhY2NpZGVudGFsIGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgLy8gRmlyc3QgY2xpY2sgY2hhbmdlcyB0cmFzaCBpY29uIHRvIGNsb3NlIGljb24sIHNlY29uZCBjbGljayBkZWxldGVzXG4gICAgICAgICAgICAgICAgLy8gTm90ZTogQUNMIGNoZWNrIGlzIGRvbmUgc2VydmVyLXNpZGUgaW4gVm9sdCB0ZW1wbGF0ZSAoY29sdW1uIGlzIGhpZGRlbiBpZiBubyBwZXJtaXNzaW9uKVxuICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlIGRhdGEuRFRfUm93SWQgd2hpY2ggY29udGFpbnMgbGlua2VkaWQgZm9yIGdyb3VwZWQgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIGFjdGlvbnNIdG1sICs9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidHdvLXN0ZXBzLWRlbGV0ZSBkZWxldGUtcmVjb3JkIHBvcHVwZWRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXJlY29yZC1pZD1cIiR7ZGF0YS5EVF9Sb3dJZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5jZHJfRGVsZXRlUmVjb3JkIHx8ICdEZWxldGUgcmVjb3JkJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiIHN0eWxlPVwibWFyZ2luOiAwO1wiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPmA7XG5cbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoNSkuaHRtbChhY3Rpb25zSHRtbCkuYWRkQ2xhc3MoJ3JpZ2h0IGFsaWduZWQnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRHJhdyBldmVudCAtIGZpcmVkIG9uY2UgdGhlIHRhYmxlIGhhcyBjb21wbGV0ZWQgYSBkcmF3LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMudG9nZ2xlUGFnaW5hdGlvbkNvbnRyb2xzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLkRhdGFUYWJsZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIFNlYXJjaCBjb21wb25lbnQgQUZURVIgRGF0YVRhYmxlIGlzIGNyZWF0ZWRcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHNlYXJjaENEUklucHV0LnNlYXJjaCh7XG4gICAgICAgICAgICBtaW5DaGFyYWN0ZXJzOiAwLFxuICAgICAgICAgICAgc2VhcmNoT25Gb2N1czogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hGaWVsZHM6IFsndGl0bGUnXSxcbiAgICAgICAgICAgIHNob3dOb1Jlc3VsdHM6IGZhbHNlLFxuICAgICAgICAgICAgc291cmNlOiBbXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciwgdmFsdWU6ICdzcmM6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlEZXN0TnVtYmVyLCB2YWx1ZTogJ2RzdDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeURJRCwgdmFsdWU6ICdkaWQ6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlMaW5rZWRJRCwgdmFsdWU6ICdsaW5rZWRpZDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSwgdmFsdWU6ICcnIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb25TZWxlY3Q6IGZ1bmN0aW9uKHJlc3VsdCwgcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbChyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goJ2hpZGUgcmVzdWx0cycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHNlYXJjaCB3aGVuIHlvdSBjbGljayBvbiB0aGUgaWNvblxuICAgICAgICAkKCcjc2VhcmNoLWljb24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guZm9jdXMoKTtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goJ3F1ZXJ5Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIHRvIHNhdmUgdGhlIHVzZXIncyBwYWdlIGxlbmd0aCBzZWxlY3Rpb24gYW5kIHVwZGF0ZSB0aGUgdGFibGVcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZShwYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2VMZW5ndGggPT09ICdhdXRvJykge1xuICAgICAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoID0gY2FsbERldGFpbFJlY29yZHMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcsIHBhZ2VMZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRwYWdlTGVuZ3RoU2VsZWN0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHRoZSBldmVudCBmcm9tIGJ1YmJsaW5nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB0aGUgc2VsZWN0IGlucHV0IHZhbHVlIHRvIHRoZSBzYXZlZCB2YWx1ZSBpZiBpdCBleGlzdHNcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBzYXZlZFBhZ2VMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgZm9yIGNsaWNraW5nIG9uIGljb24gd2l0aCBkYXRhLWlkcyAob3BlbiBpbiBuZXcgd2luZG93KVxuICAgICAgICAvLyBXSFk6IENsaWNraW5nIG9uIGljb24gc2hvdWxkIG9wZW4gU3lzdGVtIERpYWdub3N0aWMgaW4gbmV3IHdpbmRvdyB0byB2aWV3IHZlcmJvc2UgbG9nc1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ1tkYXRhLWlkc10nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTsgLy8gUHJldmVudCByb3cgdG9nZ2xlXG5cbiAgICAgICAgICAgIGNvbnN0IGlkcyA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLWlkcycpO1xuICAgICAgICAgICAgaWYgKGlkcyAhPT0gdW5kZWZpbmVkICYmIGlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBXSFk6IEZvcm1hdCBhcyBxdWVyeSBwYXJhbSArIGhhc2g6ID9maWx0ZXI9Li4uI2ZpbGU9Li4uXG4gICAgICAgICAgICAgICAgLy8gT3BlbiBpbiBuZXcgd2luZG93IHRvIGFsbG93IHZpZXdpbmcgbG9ncyB3aGlsZSBrZWVwaW5nIENEUiB0YWJsZSB2aXNpYmxlXG4gICAgICAgICAgICAgICAgY29uc3QgdXJsID0gYCR7Z2xvYmFsUm9vdFVybH1zeXN0ZW0tZGlhZ25vc3RpYy9pbmRleC8/ZmlsdGVyPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGlkcyl9I2ZpbGU9YXN0ZXJpc2slMkZ2ZXJib3NlYDtcbiAgICAgICAgICAgICAgICB3aW5kb3cub3Blbih1cmwsICdfYmxhbmsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIGZvciBvcGVuaW5nIGFuZCBjbG9zaW5nIGRldGFpbHNcbiAgICAgICAgLy8gV0hZOiBPbmx5IGV4cGFuZC9jb2xsYXBzZSBvbiBmaXJzdCBjb2x1bW4gKGNhcmV0IGljb24pIGNsaWNrLCBub3Qgb24gYWN0aW9uIGljb25zXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAndHIuZGV0YWlsZWQgdGQ6Zmlyc3QtY2hpbGQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHIgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnJvdyh0cik7XG5cbiAgICAgICAgICAgIGlmIChyb3cuY2hpbGQuaXNTaG93bigpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyByb3cgaXMgYWxyZWFkeSBvcGVuIC0gY2xvc2UgaXRcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIHRyLnJlbW92ZUNsYXNzKCdzaG93bicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBPcGVuIHRoaXMgcm93XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkKGNhbGxEZXRhaWxSZWNvcmRzLnNob3dSZWNvcmRzKHJvdy5kYXRhKCkpKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgdHIuYWRkQ2xhc3MoJ3Nob3duJyk7XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkKCkuZmluZCgnLmRldGFpbC1yZWNvcmQtcm93JykuZWFjaCgoaW5kZXgsIHBsYXllclJvdykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZCA9ICQocGxheWVyUm93KS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IENEUlBsYXllcihpZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBzZWNvbmQgY2xpY2sgb24gZGVsZXRlIGJ1dHRvbiAoYWZ0ZXIgdHdvLXN0ZXBzLWRlbGV0ZSBjaGFuZ2VzIGljb24gdG8gY2xvc2UpXG4gICAgICAgIC8vIFdIWTogVHdvLXN0ZXBzLWRlbGV0ZSBtZWNoYW5pc20gcHJldmVudHMgYWNjaWRlbnRhbCBkZWxldGlvblxuICAgICAgICAvLyBGaXJzdCBjbGljazogdHJhc2gg4oaSIGNsb3NlIChieSBkZWxldGUtc29tZXRoaW5nLmpzKSwgU2Vjb25kIGNsaWNrOiBleGVjdXRlIGRlbGV0aW9uXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAnYS5kZWxldGUtcmVjb3JkOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTsgLy8gUHJldmVudCByb3cgZXhwYW5zaW9uXG5cbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9ICRidXR0b24uYXR0cignZGF0YS1yZWNvcmQtaWQnKTtcblxuICAgICAgICAgICAgaWYgKCFyZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkIGxvYWRpbmcnKTtcblxuICAgICAgICAgICAgLy8gQWx3YXlzIGRlbGV0ZSB3aXRoIHJlY29yZGluZ3MgYW5kIGxpbmtlZCByZWNvcmRzXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kZWxldGVSZWNvcmQocmVjb3JkSWQsICRidXR0b24pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIENEUiByZWNvcmQgdmlhIFJFU1QgQVBJXG4gICAgICogV0hZOiBEZWxldGVzIGJ5IGxpbmtlZGlkIC0gYXV0b21hdGljYWxseSByZW1vdmVzIGVudGlyZSBjb252ZXJzYXRpb24gd2l0aCBhbGwgbGlua2VkIHJlY29yZHNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBDRFIgbGlua2VkaWQgKGxpa2UgXCJtaWtvcGJ4LTE3NjA3ODQ3OTMuNDYyN1wiKVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkYnV0dG9uIC0gQnV0dG9uIGVsZW1lbnQgdG8gdXBkYXRlIHN0YXRlXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkKHJlY29yZElkLCAkYnV0dG9uKSB7XG4gICAgICAgIC8vIEFsd2F5cyBkZWxldGUgd2l0aCByZWNvcmRpbmcgZmlsZXNcbiAgICAgICAgLy8gV0hZOiBsaW5rZWRpZCBhdXRvbWF0aWNhbGx5IGRlbGV0ZXMgYWxsIGxpbmtlZCByZWNvcmRzIChubyBkZWxldGVMaW5rZWQgcGFyYW1ldGVyIG5lZWRlZClcbiAgICAgICAgQ2RyQVBJLmRlbGV0ZVJlY29yZChyZWNvcmRJZCwgeyBkZWxldGVSZWNvcmRpbmc6IHRydWUgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAvLyBTaWxlbnRseSByZWxvYWQgdGhlIERhdGFUYWJsZSB0byByZWZsZWN0IGNoYW5nZXNcbiAgICAgICAgICAgICAgICAvLyBXSFk6IFZpc3VhbCBmZWVkYmFjayAoZGlzYXBwZWFyaW5nIHJvdykgaXMgZW5vdWdoLCBubyBuZWVkIGZvciBzdWNjZXNzIHRvYXN0XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLmFqYXgucmVsb2FkKG51bGwsIGZhbHNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlIG9ubHkgb24gZmFpbHVyZVxuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTXNnID0gcmVzcG9uc2U/Lm1lc3NhZ2VzPy5lcnJvcj8uWzBdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jZHJfRGVsZXRlRmFpbGVkIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gZGVsZXRlIHJlY29yZCc7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTXNnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIHBhZ2luYXRpb24gY29udHJvbHMgdmlzaWJpbGl0eSBiYXNlZCBvbiBkYXRhIHNpemVcbiAgICAgKi9cbiAgICB0b2dnbGVQYWdpbmF0aW9uQ29udHJvbHMoKSB7XG4gICAgICAgIGNvbnN0IGluZm8gPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZS5pbmZvKCk7XG4gICAgICAgIGlmIChpbmZvLnBhZ2VzIDw9IDEpIHtcbiAgICAgICAgICAgICQoY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnRhYmxlKCkuY29udGFpbmVyKCkpLmZpbmQoJy5kYXRhVGFibGVzX3BhZ2luYXRlJykuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJChjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUudGFibGUoKS5jb250YWluZXIoKSkuZmluZCgnLmRhdGFUYWJsZXNfcGFnaW5hdGUnKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyBDRFIgbWV0YWRhdGEgKGRhdGUgcmFuZ2UpIHVzaW5nIENkckFQSVxuICAgICAqIFdIWTogTGlnaHR3ZWlnaHQgcmVxdWVzdCByZXR1cm5zIG9ubHkgbWV0YWRhdGEgKGRhdGVzKSwgbm90IGZ1bGwgQ0RSIHJlY29yZHNcbiAgICAgKiBBdm9pZHMgZG91YmxlIHJlcXVlc3Qgb24gcGFnZSBsb2FkXG4gICAgICovXG4gICAgZmV0Y2hMYXRlc3RDRFJEYXRlKCkge1xuICAgICAgICBDZHJBUEkuZ2V0TWV0YWRhdGEoeyBsaW1pdDogMTAwIH0sIChkYXRhKSA9PiB7XG4gICAgICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLmhhc1JlY29yZHMpIHtcbiAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IGRhdGUgc3RyaW5ncyB0byBtb21lbnQgb2JqZWN0c1xuICAgICAgICAgICAgICAgIGNvbnN0IGVhcmxpZXN0RGF0ZSA9IG1vbWVudChkYXRhLmVhcmxpZXN0RGF0ZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgbGF0ZXN0RGF0ZSA9IG1vbWVudChkYXRhLmxhdGVzdERhdGUpO1xuXG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3JkcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKGVhcmxpZXN0RGF0ZSwgbGF0ZXN0RGF0ZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIERhdGFUYWJsZSBvbmx5IGlmIHdlIGhhdmUgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogRGF0YVRhYmxlIG5lZWRzIGRhdGUgcmFuZ2UgdG8gYmUgc2V0IGZpcnN0XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZURhdGFUYWJsZUFuZEhhbmRsZXJzKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5vIHJlY29yZHMgaW4gZGF0YWJhc2UgYXQgYWxsIG9yIEFQSSBlcnJvclxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmhhc0NEUlJlY29yZHMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5zaG93RW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyKCk7XG4gICAgICAgICAgICAgICAgLy8gRG9uJ3QgaW5pdGlhbGl6ZSBEYXRhVGFibGUgYXQgYWxsIC0ganVzdCBzaG93IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGEgc3R5bGVkIGVtcHR5IHRhYmxlIG1lc3NhZ2VcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIG1lc3NhZ2UgZm9yIGVtcHR5IHRhYmxlXG4gICAgICovXG4gICAgZ2V0RW1wdHlUYWJsZU1lc3NhZ2UoKSB7XG4gICAgICAgIC8vIElmIGRhdGFiYXNlIGlzIGVtcHR5LCB3ZSBkb24ndCBzaG93IHRoaXMgbWVzc2FnZSBpbiB0YWJsZVxuICAgICAgICBpZiAoIWNhbGxEZXRhaWxSZWNvcmRzLmhhc0NEUlJlY29yZHMpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBmaWx0ZXJlZCBlbXB0eSBzdGF0ZSBtZXNzYWdlXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBwbGFjZWhvbGRlciBzZWdtZW50XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaWNvbiBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInNlYXJjaCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9GaWx0ZXJlZEVtcHR5VGl0bGV9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpbmxpbmVcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dFwiPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5jZHJfRmlsdGVyZWRFbXB0eURlc2NyaXB0aW9ufVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PmA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93cyB0aGUgZW1wdHkgZGF0YWJhc2UgcGxhY2Vob2xkZXIgYW5kIGhpZGVzIHRoZSB0YWJsZVxuICAgICAqL1xuICAgIHNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIoKSB7XG4gICAgICAgIC8vIEhpZGUgdGhlIHRhYmxlIGl0c2VsZiAoRGF0YVRhYmxlIHdvbid0IGJlIGluaXRpYWxpemVkKVxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuaGlkZSgpO1xuXG4gICAgICAgIC8vIEhpZGUgc2VhcmNoIGFuZCBkYXRlIGNvbnRyb2xzXG4gICAgICAgICQoJyNkYXRlLXJhbmdlLXNlbGVjdG9yJykuY2xvc2VzdCgnLnVpLnJvdycpLmhpZGUoKTtcblxuICAgICAgICAvLyBTaG93IHBsYWNlaG9sZGVyXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRlbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIuc2hvdygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2Zvcm0gUkVTVCBBUEkgZ3JvdXBlZCByZWNvcmRzIHRvIERhdGFUYWJsZSByb3cgZm9ybWF0XG4gICAgICogQHBhcmFtIHtBcnJheX0gcmVzdERhdGEgLSBBcnJheSBvZiBncm91cGVkIENEUiByZWNvcmRzIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIERhdGFUYWJsZSByb3dzXG4gICAgICovXG4gICAgdHJhbnNmb3JtUmVzdFRvRGF0YVRhYmxlKHJlc3REYXRhKSB7XG4gICAgICAgIHJldHVybiByZXN0RGF0YS5tYXAoZ3JvdXAgPT4ge1xuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIHRpbWluZyBkaXNwbGF5XG4gICAgICAgICAgICBjb25zdCBiaWxsc2VjID0gZ3JvdXAudG90YWxCaWxsc2VjIHx8IDA7XG4gICAgICAgICAgICBjb25zdCB0aW1lRm9ybWF0ID0gKGJpbGxzZWMgPCAzNjAwKSA/ICdtbTpzcycgOiAnSEg6bW06c3MnO1xuICAgICAgICAgICAgY29uc3QgdGltaW5nID0gYmlsbHNlYyA+IDAgPyBtb21lbnQudXRjKGJpbGxzZWMgKiAxMDAwKS5mb3JtYXQodGltZUZvcm1hdCkgOiAnJztcblxuICAgICAgICAgICAgLy8gRm9ybWF0IHN0YXJ0IGRhdGVcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZERhdGUgPSBtb21lbnQoZ3JvdXAuc3RhcnQpLmZvcm1hdCgnREQtTU0tWVlZWSBISDptbTpzcycpO1xuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IHJlY29yZGluZyByZWNvcmRzIC0gZmlsdGVyIG9ubHkgcmVjb3JkcyB3aXRoIGFjdHVhbCByZWNvcmRpbmcgZmlsZXNcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZGluZ3MgPSAoZ3JvdXAucmVjb3JkcyB8fCBbXSlcbiAgICAgICAgICAgICAgICAuZmlsdGVyKHIgPT4gci5yZWNvcmRpbmdmaWxlICYmIHIucmVjb3JkaW5nZmlsZS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgIC5tYXAociA9PiAoe1xuICAgICAgICAgICAgICAgICAgICBpZDogci5pZCxcbiAgICAgICAgICAgICAgICAgICAgc3JjX251bTogci5zcmNfbnVtLFxuICAgICAgICAgICAgICAgICAgICBkc3RfbnVtOiByLmRzdF9udW0sXG4gICAgICAgICAgICAgICAgICAgIHJlY29yZGluZ2ZpbGU6IHIucmVjb3JkaW5nZmlsZSxcbiAgICAgICAgICAgICAgICAgICAgcGxheWJhY2tfdXJsOiByLnBsYXliYWNrX3VybCwgICAvLyBUb2tlbi1iYXNlZCBVUkwgZm9yIHBsYXliYWNrXG4gICAgICAgICAgICAgICAgICAgIGRvd25sb2FkX3VybDogci5kb3dubG9hZF91cmwgICAgLy8gVG9rZW4tYmFzZWQgVVJMIGZvciBkb3dubG9hZFxuICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIENTUyBjbGFzc1xuICAgICAgICAgICAgY29uc3QgaGFzUmVjb3JkaW5ncyA9IHJlY29yZGluZ3MubGVuZ3RoID4gMDtcbiAgICAgICAgICAgIGNvbnN0IGlzQW5zd2VyZWQgPSBncm91cC5kaXNwb3NpdGlvbiA9PT0gJ0FOU1dFUkVEJztcbiAgICAgICAgICAgIGNvbnN0IGR0Um93Q2xhc3MgPSBoYXNSZWNvcmRpbmdzID8gJ2RldGFpbGVkJyA6ICd1aSc7XG4gICAgICAgICAgICBjb25zdCBuZWdhdGl2ZUNsYXNzID0gaXNBbnN3ZXJlZCA/ICcnIDogJyBuZWdhdGl2ZSc7XG5cbiAgICAgICAgICAgIC8vIENvbGxlY3QgdmVyYm9zZSBjYWxsIElEc1xuICAgICAgICAgICAgY29uc3QgaWRzID0gKGdyb3VwLnJlY29yZHMgfHwgW10pXG4gICAgICAgICAgICAgICAgLm1hcChyID0+IHIudmVyYm9zZV9jYWxsX2lkKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoaWQgPT4gaWQgJiYgaWQubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICAuam9pbignJicpO1xuXG4gICAgICAgICAgICAvLyBSZXR1cm4gRGF0YVRhYmxlIHJvdyBmb3JtYXRcbiAgICAgICAgICAgIC8vIERhdGFUYWJsZXMgbmVlZHMgYm90aCBhcnJheSBpbmRpY2VzIEFORCBzcGVjaWFsIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IFtcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWREYXRlLCAgICAgICAgICAgICAgLy8gMDogZGF0ZVxuICAgICAgICAgICAgICAgIGdyb3VwLnNyY19udW0sICAgICAgICAgICAgICAvLyAxOiBzb3VyY2UgbnVtYmVyXG4gICAgICAgICAgICAgICAgZ3JvdXAuZHN0X251bSB8fCBncm91cC5kaWQsIC8vIDI6IGRlc3RpbmF0aW9uIG51bWJlciBvciBESURcbiAgICAgICAgICAgICAgICB0aW1pbmcsICAgICAgICAgICAgICAgICAgICAgLy8gMzogZHVyYXRpb25cbiAgICAgICAgICAgICAgICByZWNvcmRpbmdzLCAgICAgICAgICAgICAgICAgLy8gNDogcmVjb3JkaW5nIHJlY29yZHMgYXJyYXlcbiAgICAgICAgICAgICAgICBncm91cC5kaXNwb3NpdGlvbiAgICAgICAgICAgLy8gNTogZGlzcG9zaXRpb25cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIC8vIEFkZCBEYXRhVGFibGVzIHNwZWNpYWwgcHJvcGVydGllc1xuICAgICAgICAgICAgcm93LkRUX1Jvd0lkID0gZ3JvdXAubGlua2VkaWQ7XG4gICAgICAgICAgICByb3cuRFRfUm93Q2xhc3MgPSBkdFJvd0NsYXNzICsgbmVnYXRpdmVDbGFzcztcbiAgICAgICAgICAgIHJvdy5pZHMgPSBpZHM7IC8vIFN0b3JlIHJhdyBJRHMgd2l0aG91dCBlbmNvZGluZyAtIGVuY29kaW5nIHdpbGwgYmUgYXBwbGllZCB3aGVuIGJ1aWxkaW5nIFVSTFxuXG4gICAgICAgICAgICByZXR1cm4gcm93O1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYSBzZXQgb2YgY2FsbCByZWNvcmRzIHdoZW4gYSByb3cgaXMgY2xpY2tlZC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjYWxsIHJlY29yZHMuXG4gICAgICovXG4gICAgc2hvd1JlY29yZHMoZGF0YSkge1xuICAgICAgICBsZXQgaHRtbFBsYXllciA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGJhc2ljIHRhYmxlIGNkci1wbGF5ZXJcIj48dGJvZHk+JztcbiAgICAgICAgZGF0YVs0XS5mb3JFYWNoKChyZWNvcmQsIGkpID0+IHtcbiAgICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSAnPHRkPjx0cj48L3RyPjwvdGQ+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IG51bGxcbiAgICAgICAgICAgICAgICB8fCByZWNvcmQucmVjb3JkaW5nZmlsZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gYFxuXG48dHIgY2xhc3M9XCJkZXRhaWwtcmVjb3JkLXJvdyBkaXNhYmxlZFwiIGlkPVwiJHtyZWNvcmQuaWR9XCI+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGUgcmlnaHQgYWxpZ25lZFwiPlxuICAgXHRcdDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuXHQgICBcdDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke3JlY29yZC5pZH1cIiBzcmM9XCJcIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxpIGNsYXNzPVwidWkgaWNvbiBkb3dubG9hZFwiIGRhdGEtdmFsdWU9XCJcIj48L2k+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLnNyY19udW19PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGUgY2VudGVyIGFsaWduZWRcIj48aSBjbGFzcz1cImljb24gZXhjaGFuZ2VcIj48L2k+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwibGVmdCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLmRzdF9udW19PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0b2tlbi1iYXNlZCBVUkxzIGluc3RlYWQgb2YgZGlyZWN0IGZpbGUgcGF0aHNcbiAgICAgICAgICAgICAgICAvLyBXSFk6IFNlY3VyaXR5IC0gaGlkZXMgYWN0dWFsIGZpbGUgcGF0aHMgZnJvbSB1c2VyXG4gICAgICAgICAgICAgICAgLy8gVHdvIHNlcGFyYXRlIGVuZHBvaW50czogOnBsYXliYWNrIChpbmxpbmUpIGFuZCA6ZG93bmxvYWQgKGZpbGUpXG4gICAgICAgICAgICAgICAgY29uc3QgcGxheWJhY2tVcmwgPSByZWNvcmQucGxheWJhY2tfdXJsIHx8ICcnO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRvd25sb2FkVXJsID0gcmVjb3JkLmRvd25sb2FkX3VybCB8fCAnJztcblxuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gYFxuXG48dHIgY2xhc3M9XCJkZXRhaWwtcmVjb3JkLXJvd1wiIGlkPVwiJHtyZWNvcmQuaWR9XCI+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGUgcmlnaHQgYWxpZ25lZFwiPlxuICAgXHRcdDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuXHQgICBcdDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke3JlY29yZC5pZH1cIiBzcmM9XCIke3BsYXliYWNrVXJsfVwiPjwvYXVkaW8+XG5cdDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwiZml2ZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiIGRhdGEtdmFsdWU9XCIke3JlY29yZC5pZH1cIj48L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPlxuICAgIFx0PGkgY2xhc3M9XCJ1aSBpY29uIGRvd25sb2FkXCIgZGF0YS12YWx1ZT1cIiR7ZG93bmxvYWRVcmx9XCI+PC9pPlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5zcmNfbnVtfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5kc3RfbnVtfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaHRtbFBsYXllciArPSAnPC90Ym9keT48L3RhYmxlPic7XG4gICAgICAgIHJldHVybiBodG1sUGxheWVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBwYWdlIGxlbmd0aCBmb3IgRGF0YVRhYmxlLCBjb25zaWRlcmluZyB1c2VyJ3Mgc2F2ZWQgcHJlZmVyZW5jZVxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0UGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3Mgc2F2ZWQgdmFsdWUgb3IgdXNlIHRoZSBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgdmFsdWUgaWYgbm9uZSBleGlzdHNcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICByZXR1cm4gc2F2ZWRQYWdlTGVuZ3RoID8gcGFyc2VJbnQoc2F2ZWRQYWdlTGVuZ3RoLCAxMCkgOiBjYWxsRGV0YWlsUmVjb3Jkcy5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIG51bWJlciBvZiByb3dzIHRoYXQgY2FuIGZpdCBvbiBhIHBhZ2UgYmFzZWQgb24gdGhlIGN1cnJlbnQgd2luZG93IGhlaWdodC5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZmluZCgndGJvZHkgPiB0cicpLmZpcnN0KCkub3V0ZXJIZWlnaHQoKTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDQwMDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDUpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IuXG4gICAgICogQHBhcmFtIHttb21lbnR9IHN0YXJ0RGF0ZSAtIE9wdGlvbmFsIGVhcmxpZXN0IHJlY29yZCBkYXRlIGZyb20gbGFzdCAxMDAgcmVjb3Jkc1xuICAgICAqIEBwYXJhbSB7bW9tZW50fSBlbmREYXRlIC0gT3B0aW9uYWwgbGF0ZXN0IHJlY29yZCBkYXRlIGZyb20gbGFzdCAxMDAgcmVjb3Jkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcihzdGFydERhdGUgPSBudWxsLCBlbmREYXRlID0gbnVsbCkge1xuICAgICAgICBjb25zdCBvcHRpb25zID0ge307XG5cbiAgICAgICAgb3B0aW9ucy5yYW5nZXMgPSB7XG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9Ub2RheV06IFttb21lbnQoKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfWWVzdGVyZGF5XTogW21vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyksIG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdFdlZWtdOiBbbW9tZW50KCkuc3VidHJhY3QoNiwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdDMwRGF5c106IFttb21lbnQoKS5zdWJ0cmFjdCgyOSwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVGhpc01vbnRoXTogW21vbWVudCgpLnN0YXJ0T2YoJ21vbnRoJyksIG1vbWVudCgpLmVuZE9mKCdtb250aCcpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RNb250aF06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgIH07XG4gICAgICAgIG9wdGlvbnMuYWx3YXlzU2hvd0NhbGVuZGFycyA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMuYXV0b1VwZGF0ZUlucHV0ID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5saW5rZWRDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLm1heERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgb3B0aW9ucy5sb2NhbGUgPSB7XG4gICAgICAgICAgICBmb3JtYXQ6ICdERC9NTS9ZWVlZJyxcbiAgICAgICAgICAgIHNlcGFyYXRvcjogJyAtICcsXG4gICAgICAgICAgICBhcHBseUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0FwcGx5QnRuLFxuICAgICAgICAgICAgY2FuY2VsTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQ2FuY2VsQnRuLFxuICAgICAgICAgICAgZnJvbUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX2Zyb20sXG4gICAgICAgICAgICB0b0xhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX3RvLFxuICAgICAgICAgICAgY3VzdG9tUmFuZ2VMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9DdXN0b21QZXJpb2QsXG4gICAgICAgICAgICBkYXlzT2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQuZGF5cyxcbiAgICAgICAgICAgIG1vbnRoTmFtZXM6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5tb250aHMsXG4gICAgICAgICAgICBmaXJzdERheTogMSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGRhdGUgcmFuZ2UgZnJvbSBsYXN0IDEwMCByZWNvcmRzLCB1c2UgaXRcbiAgICAgICAgLy8gV0hZOiBQcm92aWRlcyBtZWFuaW5nZnVsIGNvbnRleHQgLSB1c2VyIHNlZXMgcGVyaW9kIGNvdmVyaW5nIHJlY2VudCBjYWxsc1xuICAgICAgICBpZiAoc3RhcnREYXRlICYmIGVuZERhdGUpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KHN0YXJ0RGF0ZSkuc3RhcnRPZignZGF5Jyk7XG4gICAgICAgICAgICBvcHRpb25zLmVuZERhdGUgPSBtb21lbnQoZW5kRGF0ZSkuZW5kT2YoJ2RheScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gdG9kYXkgaWYgbm8gcmVjb3Jkc1xuICAgICAgICAgICAgb3B0aW9ucy5zdGFydERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIG9wdGlvbnMuZW5kRGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGVyYW5nZXBpY2tlcihcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QsXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gTm90ZTogRG9uJ3QgY2FsbCBhcHBseUZpbHRlciBoZXJlIC0gRGF0YVRhYmxlIGlzIG5vdCBpbml0aWFsaXplZCB5ZXRcbiAgICAgICAgLy8gRGF0YVRhYmxlIHdpbGwgbG9hZCBkYXRhIGF1dG9tYXRpY2FsbHkgYWZ0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIHNlbGVjdCBldmVudC5cbiAgICAgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IHN0YXJ0IC0gVGhlIHN0YXJ0IGRhdGUuXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBlbmQgLSBUaGUgZW5kIGRhdGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGxhYmVsIC0gVGhlIGxhYmVsLlxuICAgICAqL1xuICAgIGNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdChzdGFydCwgZW5kLCBsYWJlbCkge1xuICAgICAgICAvLyBPbmx5IHBhc3Mgc2VhcmNoIGtleXdvcmQsIGRhdGVzIGFyZSByZWFkIGRpcmVjdGx5IGZyb20gZGF0ZSByYW5nZSBzZWxlY3RvclxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcihjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgZmlsdGVyIHRvIHRoZSBkYXRhIHRhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIGZpbHRlciB0ZXh0LlxuICAgICAqL1xuICAgIGFwcGx5RmlsdGVyKHRleHQpIHtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBDRFIgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19