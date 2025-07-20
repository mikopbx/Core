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

/* global globalRootUrl, SemanticLocalization, Extensions, moment, globalTranslate, CDRPlayer */

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
    callDetailRecords.fetchLatestCDRDate();
    callDetailRecords.$globalSearch.on('keyup', function (e) {
      if (e.keyCode === 13 || e.keyCode === 8 || callDetailRecords.$globalSearch.val().length === 0) {
        var text = "".concat(callDetailRecords.$dateRangeSelector.val(), " ").concat(callDetailRecords.$globalSearch.val());
        callDetailRecords.applyFilter(text);
      }
    });
    callDetailRecords.$cdrTable.dataTable({
      search: {
        search: "".concat(callDetailRecords.$dateRangeSelector.val(), " ").concat(callDetailRecords.$globalSearch.val())
      },
      serverSide: true,
      processing: true,
      columnDefs: [{
        defaultContent: "-",
        targets: "_all"
      }],
      ajax: {
        url: "".concat(globalRootUrl, "call-detail-records/getNewRecords"),
        type: 'POST'
      },
      paging: true,
      //scrollY: $(window).height() - callDetailRecords.$cdrTable.offset().top-150,
      sDom: 'rtip',
      deferRender: true,
      pageLength: callDetailRecords.calculatePageLength(),
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
        $('td', row).eq(3).html(data[2]).addClass('need-update');
        var duration = data[3];

        if (data.ids !== '') {
          duration += '<i data-ids="' + data.ids + '" class="file alternate outline icon">';
        }

        $('td', row).eq(4).html(duration).addClass('right aligned');
      },

      /**
       * Draw event - fired once the table has completed a draw.
       */
      drawCallback: function drawCallback() {
        Extensions.updatePhonesRepresent('need-update');
        callDetailRecords.togglePaginationControls();
      },
      ordering: false
    });
    callDetailRecords.dataTable = callDetailRecords.$cdrTable.DataTable();
    callDetailRecords.dataTable.on('draw', function () {
      callDetailRecords.$globalSearch.closest('div').removeClass('loading');
    });
    callDetailRecords.$cdrTable.on('click', 'tr.negative', function (e) {
      var ids = $(e.target).attr('data-ids');

      if (ids !== undefined && ids !== '') {
        window.location = "".concat(globalRootUrl, "system-diagnostic/index/?filename=asterisk/verbose&filter=").concat(ids);
      }
    }); // Add event listener for opening and closing details

    callDetailRecords.$cdrTable.on('click', 'tr.detailed', function (e) {
      var ids = $(e.target).attr('data-ids');

      if (ids !== undefined && ids !== '') {
        window.location = "".concat(globalRootUrl, "system-diagnostic/index/?filename=asterisk/verbose&filter=").concat(ids);
        return;
      }

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
        Extensions.updatePhonesRepresent('need-update');
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
   * Fetches the latest CDR date from the server and sets up date range picker
   */
  fetchLatestCDRDate: function fetchLatestCDRDate() {
    $.api({
      url: "".concat(globalRootUrl, "call-detail-records/getLatestRecordDate"),
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.success && response.latestDate) {
          var latestDate = moment(response.latestDate);
          callDetailRecords.hasCDRRecords = true;
          callDetailRecords.initializeDateRangeSelector(latestDate);
        } else {
          // No records in database at all
          callDetailRecords.hasCDRRecords = false;
          callDetailRecords.showEmptyDatabasePlaceholder();
          callDetailRecords.initializeDateRangeSelector();
        }
      },
      onError: function onError() {
        callDetailRecords.initializeDateRangeSelector();
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
    callDetailRecords.$cdrTable.closest('.dataTables_wrapper').hide();
    $('.dataTables_paginate').hide();
    $('#date-range-selector').closest('.ui.row').hide();
    callDetailRecords.$emptyDatabasePlaceholder.show();
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
        var recordFileName = "Call_record_between_".concat(record.src_num, "_and_").concat(record.dst_num, "_from_").concat(data[0]);
        recordFileName.replace(/[^\w\s!?]/g, '');
        recordFileName = encodeURIComponent(recordFileName);
        var recordFileUri = encodeURIComponent(record.recordingfile);
        htmlPlayer += "\n\n<tr class=\"detail-record-row\" id=\"".concat(record.id, "\">\n   \t<td class=\"one wide\"></td>\n   \t<td class=\"one wide right aligned\">\n   \t\t<i class=\"ui icon play\"></i>\n\t   \t<audio preload=\"metadata\" id=\"audio-player-").concat(record.id, "\" src=\"/pbxcore/api/cdr/v2/playback?view=").concat(recordFileUri, "\"></audio>\n\t</td>\n    <td class=\"five wide\">\n    \t<div class=\"ui range cdr-player\" data-value=\"").concat(record.id, "\"></div>\n    </td>\n    <td class=\"one wide\"><span class=\"cdr-duration\"></span></td>\n    <td class=\"one wide\">\n    \t<i class=\"ui icon download\" data-value=\"/pbxcore/api/cdr/v2/playback?view=").concat(recordFileUri, "&download=1&filename=").concat(recordFileName, ".mp3\"></i>\n    </td>\n    <td class=\"right aligned\"><span class=\"need-update\">").concat(record.src_num, "</span></td>\n    <td class=\"one wide center aligned\"><i class=\"icon exchange\"></i></td>\n   \t<td class=\"left aligned\"><span class=\"need-update\">").concat(record.dst_num, "</span></td>\n</tr>");
      }
    });
    htmlPlayer += '</tbody></table>';
    return htmlPlayer;
  },
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
   * @param {moment} latestDate - Optional latest record date
   */
  initializeDateRangeSelector: function initializeDateRangeSelector() {
    var _options$ranges;

    var latestDate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
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
    }; // If we have a latest date, use that month for the date range

    if (latestDate) {
      // Set date range to match the month of the latest record
      var startOfMonth = moment(latestDate).startOf('day');
      var endOfMonth = moment(latestDate).endOf('day'); // If it's the current month, just use today's date

      if (moment().isSame(latestDate, 'day')) {
        options.startDate = moment();
        options.endDate = moment();
      } else {
        options.startDate = startOfMonth;
        options.endDate = endOfMonth;
      }
    } else {
      options.startDate = moment();
      options.endDate = moment();
    }

    callDetailRecords.$dateRangeSelector.daterangepicker(options, callDetailRecords.cbDateRangeSelectorOnSelect); // Immediately apply the filter with the new date range

    var text = "".concat(options.startDate.format('DD/MM/YYYY'), " ").concat(options.endDate.format('DD/MM/YYYY'), " ").concat(callDetailRecords.$globalSearch.val());
    callDetailRecords.applyFilter(text);
  },

  /**
   * Handles the date range selector select event.
   * @param {moment.Moment} start - The start date.
   * @param {moment.Moment} end - The end date.
   * @param {string} label - The label.
   */
  cbDateRangeSelectorOnSelect: function cbDateRangeSelectorOnSelect(start, end, label) {
    var text = "".concat(start.format('DD/MM/YYYY'), " ").concat(end.format('DD/MM/YYYY'), " ").concat(callDetailRecords.$globalSearch.val());
    callDetailRecords.applyFilter(text);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCJkYXRhVGFibGUiLCJwbGF5ZXJzIiwiaGFzQ0RSUmVjb3JkcyIsIiRlbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIiLCJpbml0aWFsaXplIiwiZmV0Y2hMYXRlc3RDRFJEYXRlIiwib24iLCJlIiwia2V5Q29kZSIsInZhbCIsImxlbmd0aCIsInRleHQiLCJhcHBseUZpbHRlciIsInNlYXJjaCIsInNlcnZlclNpZGUiLCJwcm9jZXNzaW5nIiwiY29sdW1uRGVmcyIsImRlZmF1bHRDb250ZW50IiwidGFyZ2V0cyIsImFqYXgiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwidHlwZSIsInBhZ2luZyIsInNEb20iLCJkZWZlclJlbmRlciIsInBhZ2VMZW5ndGgiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImVtcHR5VGFibGUiLCJnZXRFbXB0eVRhYmxlTWVzc2FnZSIsInplcm9SZWNvcmRzIiwiY3JlYXRlZFJvdyIsInJvdyIsImRhdGEiLCJEVF9Sb3dDbGFzcyIsImluZGV4T2YiLCJlcSIsImh0bWwiLCJhZGRDbGFzcyIsImR1cmF0aW9uIiwiaWRzIiwiZHJhd0NhbGxiYWNrIiwiRXh0ZW5zaW9ucyIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsInRvZ2dsZVBhZ2luYXRpb25Db250cm9scyIsIm9yZGVyaW5nIiwiRGF0YVRhYmxlIiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwidGFyZ2V0IiwiYXR0ciIsInVuZGVmaW5lZCIsIndpbmRvdyIsImxvY2F0aW9uIiwidHIiLCJjaGlsZCIsImlzU2hvd24iLCJoaWRlIiwic2hvd1JlY29yZHMiLCJzaG93IiwiZmluZCIsImVhY2giLCJpbmRleCIsInBsYXllclJvdyIsImlkIiwiQ0RSUGxheWVyIiwiaW5mbyIsInBhZ2UiLCJwYWdlcyIsInRhYmxlIiwiY29udGFpbmVyIiwiYXBpIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwibGF0ZXN0RGF0ZSIsIm1vbWVudCIsImluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvciIsInNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIiLCJvbkVycm9yIiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2RyX0ZpbHRlcmVkRW1wdHlUaXRsZSIsImNkcl9GaWx0ZXJlZEVtcHR5RGVzY3JpcHRpb24iLCJodG1sUGxheWVyIiwiZm9yRWFjaCIsInJlY29yZCIsImkiLCJyZWNvcmRpbmdmaWxlIiwic3JjX251bSIsImRzdF9udW0iLCJyZWNvcmRGaWxlTmFtZSIsInJlcGxhY2UiLCJlbmNvZGVVUklDb21wb25lbnQiLCJyZWNvcmRGaWxlVXJpIiwicm93SGVpZ2h0IiwiZmlyc3QiLCJvdXRlckhlaWdodCIsIndpbmRvd0hlaWdodCIsImlubmVySGVpZ2h0IiwiaGVhZGVyRm9vdGVySGVpZ2h0IiwiTWF0aCIsIm1heCIsImZsb29yIiwib3B0aW9ucyIsInJhbmdlcyIsImNhbF9Ub2RheSIsImNhbF9ZZXN0ZXJkYXkiLCJzdWJ0cmFjdCIsImNhbF9MYXN0V2VlayIsImNhbF9MYXN0MzBEYXlzIiwiY2FsX1RoaXNNb250aCIsInN0YXJ0T2YiLCJlbmRPZiIsImNhbF9MYXN0TW9udGgiLCJhbHdheXNTaG93Q2FsZW5kYXJzIiwiYXV0b1VwZGF0ZUlucHV0IiwibGlua2VkQ2FsZW5kYXJzIiwibWF4RGF0ZSIsImxvY2FsZSIsImZvcm1hdCIsInNlcGFyYXRvciIsImFwcGx5TGFiZWwiLCJjYWxfQXBwbHlCdG4iLCJjYW5jZWxMYWJlbCIsImNhbF9DYW5jZWxCdG4iLCJmcm9tTGFiZWwiLCJjYWxfZnJvbSIsInRvTGFiZWwiLCJjYWxfdG8iLCJjdXN0b21SYW5nZUxhYmVsIiwiY2FsX0N1c3RvbVBlcmlvZCIsImRheXNPZldlZWsiLCJjYWxlbmRhclRleHQiLCJkYXlzIiwibW9udGhOYW1lcyIsIm1vbnRocyIsImZpcnN0RGF5Iiwic3RhcnRPZk1vbnRoIiwiZW5kT2ZNb250aCIsImlzU2FtZSIsInN0YXJ0RGF0ZSIsImVuZERhdGUiLCJkYXRlcmFuZ2VwaWNrZXIiLCJjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QiLCJzdGFydCIsImVuZCIsImxhYmVsIiwiZHJhdyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGlCQUFpQixHQUFHO0FBQ3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRUMsQ0FBQyxDQUFDLFlBQUQsQ0FMVTs7QUFPdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMsZUFBRCxDQVhNOztBQWF0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxrQkFBa0IsRUFBRUYsQ0FBQyxDQUFDLHNCQUFELENBakJDOztBQW1CdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsU0FBUyxFQUFFLEVBdkJXOztBQXlCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFLEVBN0JhOztBQStCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLElBbkNPOztBQXFDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEseUJBQXlCLEVBQUVOLENBQUMsQ0FBQyxpQ0FBRCxDQXpDTjs7QUEyQ3RCO0FBQ0o7QUFDQTtBQUNJTyxFQUFBQSxVQTlDc0Isd0JBOENUO0FBQ1RULElBQUFBLGlCQUFpQixD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eEMsRUFBK0NULFFBQS9DLENBQXdELFNBQXhEO0FBQ0g7QUFqWXFCLENBQTFCO0FBb1lBO0FBQ0E7QUFDQTs7QUFDQTVDLENBQUMsQ0FBQzBKLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEI3SixFQUFBQSxpQkFBaUIsQ0FBQ1MsVUFBbEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNlbWFudGljTG9jYWxpemF0aW9uLCBFeHRlbnNpb25zLCBtb21lbnQsIGdsb2JhbFRyYW5zbGF0ZSwgQ0RSUGxheWVyICovXG5cbi8qKlxuICogY2FsbERldGFpbFJlY29yZHMgbW9kdWxlLlxuICogQG1vZHVsZSBjYWxsRGV0YWlsUmVjb3Jkc1xuICovXG5jb25zdCBjYWxsRGV0YWlsUmVjb3JkcyA9IHtcbiAgICAvKipcbiAgICAgKiBUaGUgY2FsbCBkZXRhaWwgcmVjb3JkcyB0YWJsZSBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNkclRhYmxlOiAkKCcjY2RyLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbHNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkYXRlUmFuZ2VTZWxlY3RvcjogJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRhIHRhYmxlIG9iamVjdC5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGRhdGFUYWJsZToge30sXG5cbiAgICAvKipcbiAgICAgKiBBbiBhcnJheSBvZiBwbGF5ZXJzLlxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICBwbGF5ZXJzOiBbXSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgaWYgQ0RSIGRhdGFiYXNlIGhhcyBhbnkgcmVjb3Jkc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGhhc0NEUlJlY29yZHM6IHRydWUsXG4gICAgXG4gICAgLyoqXG4gICAgICogVGhlIGVtcHR5IGRhdGFiYXNlIHBsYWNlaG9sZGVyIGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlbXB0eURhdGFiYXNlUGxhY2Vob2xkZXI6ICQoJyNjZHItZW1wdHktZGF0YWJhc2UtcGxhY2Vob2xkZXInKSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjYWxsIGRldGFpbCByZWNvcmRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmZldGNoTGF0ZXN0Q0RSRGF0ZSgpO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzXG4gICAgICAgICAgICAgICAgfHwgZS5rZXlDb2RlID09PSA4XG4gICAgICAgICAgICAgICAgfHwgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gYCR7Y2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLnZhbCgpfSAke2NhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCl9YDtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmRhdGFUYWJsZSh7XG4gICAgICAgICAgICBzZWFyY2g6IHtcbiAgICAgICAgICAgICAgICBzZWFyY2g6IGAke2NhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci52YWwoKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAgICAgICAgeyBkZWZhdWx0Q29udGVudDogXCItXCIsICB0YXJnZXRzOiBcIl9hbGxcIn0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1jYWxsLWRldGFpbC1yZWNvcmRzL2dldE5ld1JlY29yZHNgLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICAvL3Njcm9sbFk6ICQod2luZG93KS5oZWlnaHQoKSAtIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vZmZzZXQoKS50b3AtMTUwLFxuICAgICAgICAgICAgc0RvbTogJ3J0aXAnLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBjYWxsRGV0YWlsUmVjb3Jkcy5jYWxjdWxhdGVQYWdlTGVuZ3RoKCksXG4gICAgICAgICAgICBsYW5ndWFnZToge1xuICAgICAgICAgICAgICAgIC4uLlNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgICAgICBlbXB0eVRhYmxlOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRFbXB0eVRhYmxlTWVzc2FnZSgpLFxuICAgICAgICAgICAgICAgIHplcm9SZWNvcmRzOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRFbXB0eVRhYmxlTWVzc2FnZSgpXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgdGhlIENEUiByb3cuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSByb3cgLSBUaGUgcm93IGVsZW1lbnQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjcmVhdGVkUm93KHJvdywgZGF0YSkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLkRUX1Jvd0NsYXNzLmluZGV4T2YoXCJkZXRhaWxlZFwiKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCc8aSBjbGFzcz1cImljb24gY2FyZXQgZG93blwiPjwvaT4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgxKS5odG1sKGRhdGFbMF0pO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgyKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChkYXRhWzFdKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDMpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGRhdGFbMl0pXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnbmVlZC11cGRhdGUnKTtcblxuICAgICAgICAgICAgICAgIGxldCBkdXJhdGlvbiA9IGRhdGFbM107XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiArPSAnPGkgZGF0YS1pZHM9XCInICsgZGF0YS5pZHMgKyAnXCIgY2xhc3M9XCJmaWxlIGFsdGVybmF0ZSBvdXRsaW5lIGljb25cIj4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoNCkuaHRtbChkdXJhdGlvbikuYWRkQ2xhc3MoJ3JpZ2h0IGFsaWduZWQnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRHJhdyBldmVudCAtIGZpcmVkIG9uY2UgdGhlIHRhYmxlIGhhcyBjb21wbGV0ZWQgYSBkcmF3LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMudG9nZ2xlUGFnaW5hdGlvbkNvbnRyb2xzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLkRhdGFUYWJsZSgpO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICd0ci5uZWdhdGl2ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgaWRzID0gJChlLnRhcmdldCkuYXR0cignZGF0YS1pZHMnKTtcbiAgICAgICAgICAgIGlmIChpZHMgIT09IHVuZGVmaW5lZCAmJiBpZHMgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zeXN0ZW0tZGlhZ25vc3RpYy9pbmRleC8/ZmlsZW5hbWU9YXN0ZXJpc2svdmVyYm9zZSZmaWx0ZXI9JHtpZHN9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIGZvciBvcGVuaW5nIGFuZCBjbG9zaW5nIGRldGFpbHNcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICd0ci5kZXRhaWxlZCcsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgaWRzID0gJChlLnRhcmdldCkuYXR0cignZGF0YS1pZHMnKTtcbiAgICAgICAgICAgIGlmIChpZHMgIT09IHVuZGVmaW5lZCAmJiBpZHMgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zeXN0ZW0tZGlhZ25vc3RpYy9pbmRleC8/ZmlsZW5hbWU9YXN0ZXJpc2svdmVyYm9zZSZmaWx0ZXI9JHtpZHN9YDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB0ciA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucm93KHRyKTtcblxuICAgICAgICAgICAgaWYgKHJvdy5jaGlsZC5pc1Nob3duKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIHJvdyBpcyBhbHJlYWR5IG9wZW4gLSBjbG9zZSBpdFxuICAgICAgICAgICAgICAgIHJvdy5jaGlsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgdHIucmVtb3ZlQ2xhc3MoJ3Nob3duJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE9wZW4gdGhpcyByb3dcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoY2FsbERldGFpbFJlY29yZHMuc2hvd1JlY29yZHMocm93LmRhdGEoKSkpLnNob3coKTtcbiAgICAgICAgICAgICAgICB0ci5hZGRDbGFzcygnc2hvd24nKTtcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoKS5maW5kKCcuZGV0YWlsLXJlY29yZC1yb3cnKS5lYWNoKChpbmRleCwgcGxheWVyUm93KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gJChwbGF5ZXJSb3cpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ0RSUGxheWVyKGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLnVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIHBhZ2luYXRpb24gY29udHJvbHMgdmlzaWJpbGl0eSBiYXNlZCBvbiBkYXRhIHNpemVcbiAgICAgKi9cbiAgICB0b2dnbGVQYWdpbmF0aW9uQ29udHJvbHMoKSB7XG4gICAgICAgIGNvbnN0IGluZm8gPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZS5pbmZvKCk7XG4gICAgICAgIGlmIChpbmZvLnBhZ2VzIDw9IDEpIHtcbiAgICAgICAgICAgICQoY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnRhYmxlKCkuY29udGFpbmVyKCkpLmZpbmQoJy5kYXRhVGFibGVzX3BhZ2luYXRlJykuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJChjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUudGFibGUoKS5jb250YWluZXIoKSkuZmluZCgnLmRhdGFUYWJsZXNfcGFnaW5hdGUnKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyB0aGUgbGF0ZXN0IENEUiBkYXRlIGZyb20gdGhlIHNlcnZlciBhbmQgc2V0cyB1cCBkYXRlIHJhbmdlIHBpY2tlclxuICAgICAqL1xuICAgIGZldGNoTGF0ZXN0Q0RSRGF0ZSgpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWNhbGwtZGV0YWlsLXJlY29yZHMvZ2V0TGF0ZXN0UmVjb3JkRGF0ZWAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3VjY2VzcyAmJiByZXNwb25zZS5sYXRlc3REYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxhdGVzdERhdGUgPSBtb21lbnQocmVzcG9uc2UubGF0ZXN0RGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmhhc0NEUlJlY29yZHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IobGF0ZXN0RGF0ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTm8gcmVjb3JkcyBpbiBkYXRhYmFzZSBhdCBhbGxcbiAgICAgICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3JkcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5zaG93RW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgYSBzdHlsZWQgZW1wdHkgdGFibGUgbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgbWVzc2FnZSBmb3IgZW1wdHkgdGFibGVcbiAgICAgKi9cbiAgICBnZXRFbXB0eVRhYmxlTWVzc2FnZSgpIHtcbiAgICAgICAgLy8gSWYgZGF0YWJhc2UgaXMgZW1wdHksIHdlIGRvbid0IHNob3cgdGhpcyBtZXNzYWdlIGluIHRhYmxlXG4gICAgICAgIGlmICghY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3Jkcykge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGZpbHRlcmVkIGVtcHR5IHN0YXRlIG1lc3NhZ2VcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBsYWNlaG9sZGVyIHNlZ21lbnRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpY29uIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic2VhcmNoIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0ZpbHRlcmVkRW1wdHlUaXRsZX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlubGluZVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0XCI+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9GaWx0ZXJlZEVtcHR5RGVzY3JpcHRpb259XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+YDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3dzIHRoZSBlbXB0eSBkYXRhYmFzZSBwbGFjZWhvbGRlciBhbmQgaGlkZXMgdGhlIHRhYmxlXG4gICAgICovXG4gICAgc2hvd0VtcHR5RGF0YWJhc2VQbGFjZWhvbGRlcigpIHtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmNsb3Nlc3QoJy5kYXRhVGFibGVzX3dyYXBwZXInKS5oaWRlKCk7XG4gICAgICAgICQoJy5kYXRhVGFibGVzX3BhZ2luYXRlJykuaGlkZSgpO1xuICAgICAgICAkKCcjZGF0ZS1yYW5nZS1zZWxlY3RvcicpLmNsb3Nlc3QoJy51aS5yb3cnKS5oaWRlKCk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRlbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIuc2hvdygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhIHNldCBvZiBjYWxsIHJlY29yZHMgd2hlbiBhIHJvdyBpcyBjbGlja2VkLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNhbGwgcmVjb3Jkcy5cbiAgICAgKi9cbiAgICBzaG93UmVjb3JkcyhkYXRhKSB7XG4gICAgICAgIGxldCBodG1sUGxheWVyID0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgYmFzaWMgdGFibGUgY2RyLXBsYXllclwiPjx0Ym9keT4nO1xuICAgICAgICBkYXRhWzRdLmZvckVhY2goKHJlY29yZCwgaSkgPT4ge1xuICAgICAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSAnPHRkPjx0cj48L3RyPjwvdGQ+JztcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlY29yZC5yZWNvcmRpbmdmaWxlID09PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICB8fCByZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gbnVsbFxuICAgICAgICAgICAgICAgIHx8IHJlY29yZC5yZWNvcmRpbmdmaWxlLmxlbmd0aCA9PT0gMCkge1xuXG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93IGRpc2FibGVkXCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIlwiPjwvYXVkaW8+XG5cdDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwiZml2ZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiIGRhdGEtdmFsdWU9XCIke3JlY29yZC5pZH1cIj48L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPlxuICAgIFx0PGkgY2xhc3M9XCJ1aSBpY29uIGRvd25sb2FkXCIgZGF0YS12YWx1ZT1cIlwiPjwvaT5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IHJlY29yZEZpbGVOYW1lID0gYENhbGxfcmVjb3JkX2JldHdlZW5fJHtyZWNvcmQuc3JjX251bX1fYW5kXyR7cmVjb3JkLmRzdF9udW19X2Zyb21fJHtkYXRhWzBdfWA7XG4gICAgICAgICAgICAgICAgcmVjb3JkRmlsZU5hbWUucmVwbGFjZSgvW15cXHdcXHMhP10vZywgJycpO1xuICAgICAgICAgICAgICAgIHJlY29yZEZpbGVOYW1lID0gZW5jb2RlVVJJQ29tcG9uZW50KHJlY29yZEZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRGaWxlVXJpID0gZW5jb2RlVVJJQ29tcG9uZW50KHJlY29yZC5yZWNvcmRpbmdmaWxlKTtcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3dcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiL3BieGNvcmUvYXBpL2Nkci92Mi9wbGF5YmFjaz92aWV3PSR7cmVjb3JkRmlsZVVyaX1cIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxpIGNsYXNzPVwidWkgaWNvbiBkb3dubG9hZFwiIGRhdGEtdmFsdWU9XCIvcGJ4Y29yZS9hcGkvY2RyL3YyL3BsYXliYWNrP3ZpZXc9JHtyZWNvcmRGaWxlVXJpfSZkb3dubG9hZD0xJmZpbGVuYW1lPSR7cmVjb3JkRmlsZU5hbWV9Lm1wM1wiPjwvaT5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGh0bWxQbGF5ZXIgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICByZXR1cm4gaHRtbFBsYXllcjtcbiAgICB9LFxuXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5maW5kKCd0Ym9keSA+IHRyJykuZmlyc3QoKS5vdXRlckhlaWdodCgpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aW5kb3cgaGVpZ2h0IGFuZCBhdmFpbGFibGUgc3BhY2UgZm9yIHRhYmxlXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgY29uc3QgaGVhZGVyRm9vdGVySGVpZ2h0ID0gNDAwOyAvLyBFc3RpbWF0ZSBoZWlnaHQgZm9yIGhlYWRlciwgZm9vdGVyLCBhbmQgb3RoZXIgZWxlbWVudHNcblxuICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHBhZ2UgbGVuZ3RoXG4gICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBoZWFkZXJGb290ZXJIZWlnaHQpIC8gcm93SGVpZ2h0KSwgNSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZGF0ZSByYW5nZSBzZWxlY3Rvci5cbiAgICAgKiBAcGFyYW0ge21vbWVudH0gbGF0ZXN0RGF0ZSAtIE9wdGlvbmFsIGxhdGVzdCByZWNvcmQgZGF0ZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcihsYXRlc3REYXRlID0gbnVsbCkge1xuICAgICAgICBjb25zdCBvcHRpb25zID0ge307XG5cbiAgICAgICAgb3B0aW9ucy5yYW5nZXMgPSB7XG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9Ub2RheV06IFttb21lbnQoKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfWWVzdGVyZGF5XTogW21vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyksIG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdFdlZWtdOiBbbW9tZW50KCkuc3VidHJhY3QoNiwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdDMwRGF5c106IFttb21lbnQoKS5zdWJ0cmFjdCgyOSwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVGhpc01vbnRoXTogW21vbWVudCgpLnN0YXJ0T2YoJ21vbnRoJyksIG1vbWVudCgpLmVuZE9mKCdtb250aCcpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RNb250aF06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgIH07XG4gICAgICAgIG9wdGlvbnMuYWx3YXlzU2hvd0NhbGVuZGFycyA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMuYXV0b1VwZGF0ZUlucHV0ID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5saW5rZWRDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLm1heERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgb3B0aW9ucy5sb2NhbGUgPSB7XG4gICAgICAgICAgICBmb3JtYXQ6ICdERC9NTS9ZWVlZJyxcbiAgICAgICAgICAgIHNlcGFyYXRvcjogJyAtICcsXG4gICAgICAgICAgICBhcHBseUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0FwcGx5QnRuLFxuICAgICAgICAgICAgY2FuY2VsTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQ2FuY2VsQnRuLFxuICAgICAgICAgICAgZnJvbUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX2Zyb20sXG4gICAgICAgICAgICB0b0xhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX3RvLFxuICAgICAgICAgICAgY3VzdG9tUmFuZ2VMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9DdXN0b21QZXJpb2QsXG4gICAgICAgICAgICBkYXlzT2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQuZGF5cyxcbiAgICAgICAgICAgIG1vbnRoTmFtZXM6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5tb250aHMsXG4gICAgICAgICAgICBmaXJzdERheTogMSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbGF0ZXN0IGRhdGUsIHVzZSB0aGF0IG1vbnRoIGZvciB0aGUgZGF0ZSByYW5nZVxuICAgICAgICBpZiAobGF0ZXN0RGF0ZSkge1xuICAgICAgICAgICAgLy8gU2V0IGRhdGUgcmFuZ2UgdG8gbWF0Y2ggdGhlIG1vbnRoIG9mIHRoZSBsYXRlc3QgcmVjb3JkXG4gICAgICAgICAgICBjb25zdCBzdGFydE9mTW9udGggPSBtb21lbnQobGF0ZXN0RGF0ZSkuc3RhcnRPZignZGF5Jyk7XG4gICAgICAgICAgICBjb25zdCBlbmRPZk1vbnRoID0gbW9tZW50KGxhdGVzdERhdGUpLmVuZE9mKCdkYXknKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWYgaXQncyB0aGUgY3VycmVudCBtb250aCwganVzdCB1c2UgdG9kYXkncyBkYXRlXG4gICAgICAgICAgICBpZiAobW9tZW50KCkuaXNTYW1lKGxhdGVzdERhdGUsICdkYXknKSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KCk7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5lbmREYXRlID0gbW9tZW50KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gc3RhcnRPZk1vbnRoO1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZW5kRGF0ZSA9IGVuZE9mTW9udGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHRpb25zLnN0YXJ0RGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgb3B0aW9ucy5lbmREYXRlID0gbW9tZW50KCk7XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IuZGF0ZXJhbmdlcGlja2VyKFxuICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdCxcbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEltbWVkaWF0ZWx5IGFwcGx5IHRoZSBmaWx0ZXIgd2l0aCB0aGUgbmV3IGRhdGUgcmFuZ2VcbiAgICAgICAgY29uc3QgdGV4dCA9IGAke29wdGlvbnMuc3RhcnREYXRlLmZvcm1hdCgnREQvTU0vWVlZWScpfSAke29wdGlvbnMuZW5kRGF0ZS5mb3JtYXQoJ0REL01NL1lZWVknKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWA7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKHRleHQpO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3Igc2VsZWN0IGV2ZW50LlxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gc3RhcnQgLSBUaGUgc3RhcnQgZGF0ZS5cbiAgICAgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IGVuZCAtIFRoZSBlbmQgZGF0ZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFiZWwgLSBUaGUgbGFiZWwuXG4gICAgICovXG4gICAgY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0KHN0YXJ0LCBlbmQsIGxhYmVsKSB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBgJHtzdGFydC5mb3JtYXQoJ0REL01NL1lZWVknKX0gJHtlbmQuZm9ybWF0KCdERC9NTS9ZWVlZJyl9ICR7Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKX1gO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgZmlsdGVyIHRvIHRoZSBkYXRhIHRhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIGZpbHRlciB0ZXh0LlxuICAgICAqL1xuICAgIGFwcGx5RmlsdGVyKHRleHQpIHtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBDRFIgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19