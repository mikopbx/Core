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
   * Fetches the latest CDR date from the server and sets up date range picker
   */
  fetchLatestCDRDate: function fetchLatestCDRDate() {
    $.ajax({
      url: "".concat(globalRootUrl, "call-detail-records/getLatestRecordDate"),
      type: 'GET',
      success: function success(response) {
        if (response.success && response.data.latest_date) {
          var latestDate = moment(response.data.latest_date);
          callDetailRecords.initializeDateRangeSelector(latestDate);
        } else {
          callDetailRecords.initializeDateRangeSelector();
        }
      },
      error: function error() {
        callDetailRecords.initializeDateRangeSelector();
      }
    });
  },

  /**
   * Gets a styled empty table message
   * @returns {string} HTML message for empty table
   */
  getEmptyTableMessage: function getEmptyTableMessage() {
    return "\n        <div class=\"ui placeholder segment\">\n            <div class=\"ui icon header\">\n                <i class=\"phone slash icon\"></i>\n                ".concat(globalTranslate.cdr_NoRecordsFound, "\n            </div>\n            <div class=\"ui divider\"></div>\n            <div>\n                ").concat(globalTranslate.cdr_TryChangingDate, "\n            </div>\n        </div>");
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
      var startOfMonth = moment(latestDate).startOf('month');
      var endOfMonth = moment(latestDate).endOf('month'); // If it's the current month, just use today's date

      if (moment().isSame(latestDate, 'month')) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCJkYXRhVGFibGUiLCJwbGF5ZXJzIiwiaW5pdGlhbGl6ZSIsImZldGNoTGF0ZXN0Q0RSRGF0ZSIsIm9uIiwiZSIsImtleUNvZGUiLCJ2YWwiLCJsZW5ndGgiLCJ0ZXh0IiwiYXBwbHlGaWx0ZXIiLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImNvbHVtbkRlZnMiLCJkZWZhdWx0Q29udGVudCIsInRhcmdldHMiLCJhamF4IiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInR5cGUiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJwYWdlTGVuZ3RoIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJlbXB0eVRhYmxlIiwiZ2V0RW1wdHlUYWJsZU1lc3NhZ2UiLCJ6ZXJvUmVjb3JkcyIsImNyZWF0ZWRSb3ciLCJyb3ciLCJkYXRhIiwiRFRfUm93Q2xhc3MiLCJpbmRleE9mIiwiZXEiLCJodG1sIiwiYWRkQ2xhc3MiLCJkdXJhdGlvbiIsImlkcyIsImRyYXdDYWxsYmFjayIsIkV4dGVuc2lvbnMiLCJ1cGRhdGVQaG9uZXNSZXByZXNlbnQiLCJvcmRlcmluZyIsIkRhdGFUYWJsZSIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInRhcmdldCIsImF0dHIiLCJ1bmRlZmluZWQiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInRyIiwiY2hpbGQiLCJpc1Nob3duIiwiaGlkZSIsInNob3dSZWNvcmRzIiwic2hvdyIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJwbGF5ZXJSb3ciLCJpZCIsIkNEUlBsYXllciIsInN1Y2Nlc3MiLCJyZXNwb25zZSIsImxhdGVzdF9kYXRlIiwibGF0ZXN0RGF0ZSIsIm1vbWVudCIsImluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvciIsImVycm9yIiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2RyX05vUmVjb3Jkc0ZvdW5kIiwiY2RyX1RyeUNoYW5naW5nRGF0ZSIsImh0bWxQbGF5ZXIiLCJmb3JFYWNoIiwicmVjb3JkIiwiaSIsInJlY29yZGluZ2ZpbGUiLCJzcmNfbnVtIiwiZHN0X251bSIsInJlY29yZEZpbGVOYW1lIiwicmVwbGFjZSIsImVuY29kZVVSSUNvbXBvbmVudCIsInJlY29yZEZpbGVVcmkiLCJyb3dIZWlnaHQiLCJmaXJzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJvcHRpb25zIiwicmFuZ2VzIiwiY2FsX1RvZGF5IiwiY2FsX1llc3RlcmRheSIsInN1YnRyYWN0IiwiY2FsX0xhc3RXZWVrIiwiY2FsX0xhc3QzMERheXMiLCJjYWxfVGhpc01vbnRoIiwic3RhcnRPZiIsImVuZE9mIiwiY2FsX0xhc3RNb250aCIsImFsd2F5c1Nob3dDYWxlbmRhcnMiLCJhdXRvVXBkYXRlSW5wdXQiLCJsaW5rZWRDYWxlbmRhcnMiLCJtYXhEYXRlIiwibG9jYWxlIiwiZm9ybWF0Iiwic2VwYXJhdG9yIiwiYXBwbHlMYWJlbCIsImNhbF9BcHBseUJ0biIsImNhbmNlbExhYmVsIiwiY2FsX0NhbmNlbEJ0biIsImZyb21MYWJlbCIsImNhbF9mcm9tIiwidG9MYWJlbCIsImNhbF90byIsImN1c3RvbVJhbmdlTGFiZWwiLCJjYWxfQ3VzdG9tUGVyaW9kIiwiZGF5c09mV2VlayIsImNhbGVuZGFyVGV4dCIsImRheXMiLCJtb250aE5hbWVzIiwibW9udGhzIiwiZmlyc3REYXkiLCJzdGFydE9mTW9udGgiLCJlbmRPZk1vbnRoIiwiaXNTYW1lIiwic3RhcnREYXRlIiwiZW5kRGF0ZSIsImRhdGVyYW5nZXBpY2tlciIsImNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdCIsInN0YXJ0IiwiZW5kIiwibGFiZWwiLCJkcmF3IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsaUJBQWlCLEdBQUc7QUFDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFQyxDQUFDLENBQUMsWUFBRCxDQUxVOztBQU90QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxlQUFELENBWE07O0FBYXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGtCQUFrQixFQUFFRixDQUFDLENBQUMsc0JBQUQsQ0FqQkM7O0FBbUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxTQUFTLEVBQUUsRUF2Qlc7O0FBeUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsRUE3QmE7O0FBK0J0QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFsQ3NCLHdCQWtDVDtBQUNUUCxJQUFBQSxpQkFBaUIsQ0FBQ1Esa0JBQWxCO0FBRUFSLElBQUFBLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ00sRUFBaEMsQ0FBbUMsT0FBbkMsRUFBNEMsVUFBQ0MsQ0FBRCxFQUFPO0FBQy9DLFVBQUlBLENBQUMsQ0FBQ0MsT0FBRixLQUFjLEVBQWQsSUFDR0QsQ0FBQyxDQUFDQyxPQUFGLEtBQWMsQ0FEakIsSUFFR1gsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDUyxHQUFoQyxHQUFzQ0MsTUFBdEMsS0FBaUQsQ0FGeEQsRUFFMkQ7QUFDdkQsWUFBTUMsSUFBSSxhQUFNZCxpQkFBaUIsQ0FBQ0ksa0JBQWxCLENBQXFDUSxHQUFy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QUFWO0FBQ0FaLElBQUFBLGlCQUFpQixDQUFDZSxXQUFsQixDQUE4QkQsSUFBOUI7QUFDSCxHQTlUcUI7O0FBaVV0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSStILEVBQUFBLDJCQXZVc0IsdUNBdVVNQyxLQXZVTixFQXVVYUMsR0F2VWIsRUF1VWtCQyxLQXZVbEIsRUF1VXlCO0FBQzNDLFFBQU1sSSxJQUFJLGFBQU1nSSxLQUFLLENBQUN6QixNQUFOLENBQWEsWUFBYixDQUFOLGNBQW9DMEIsR0FBRyxDQUFDMUIsTUFBSixDQUFXLFlBQVgsQ0FBcEMsY0FBZ0VySCxpQkFBaUIsQ0FBQ0csYUFBbEIsQ0FBZ0NTLEdBQWhDLEVBQWhFLENBQVY7QUFDQVosSUFBQUEsaUJBQWlCLENBQUNlLFdBQWxCLENBQThCRCxJQUE5QjtBQUNILEdBMVVxQjs7QUE0VXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFdBaFZzQix1QkFnVlZELElBaFZVLEVBZ1ZKO0FBQ2RkLElBQUFBLGlCQUFpQixDQUFDSyxTQUFsQixDQUE0QlcsTUFBNUIsQ0FBbUNGLElBQW5DLEVBQXlDbUksSUFBekM7QUFDQWpKLElBQUFBLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ2lELE9BQWhDLENBQXdDLEtBQXhDLEVBQStDUixRQUEvQyxDQUF3RCxTQUF4RDtBQUNIO0FBblZxQixDQUExQjtBQXNWQTtBQUNBO0FBQ0E7O0FBQ0ExQyxDQUFDLENBQUNnSixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCbkosRUFBQUEsaUJBQWlCLENBQUNPLFVBQWxCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRXh0ZW5zaW9ucywgbW9tZW50LCBnbG9iYWxUcmFuc2xhdGUsIENEUlBsYXllciAqL1xuXG4vKipcbiAqIGNhbGxEZXRhaWxSZWNvcmRzIG1vZHVsZS5cbiAqIEBtb2R1bGUgY2FsbERldGFpbFJlY29yZHNcbiAqL1xuY29uc3QgY2FsbERldGFpbFJlY29yZHMgPSB7XG4gICAgLyoqXG4gICAgICogVGhlIGNhbGwgZGV0YWlsIHJlY29yZHMgdGFibGUgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjZHJUYWJsZTogJCgnI2Nkci10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRnbG9iYWxTZWFyY2g6ICQoJyNnbG9iYWxzZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGF0ZVJhbmdlU2VsZWN0b3I6ICQoJyNkYXRlLXJhbmdlLXNlbGVjdG9yJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQW4gYXJyYXkgb2YgcGxheWVycy5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgcGxheWVyczogW10sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgY2FsbCBkZXRhaWwgcmVjb3Jkcy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5mZXRjaExhdGVzdENEUkRhdGUoKTtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxM1xuICAgICAgICAgICAgICAgIHx8IGUua2V5Q29kZSA9PT0gOFxuICAgICAgICAgICAgICAgIHx8IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGAke2NhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci52YWwoKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWA7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIodGV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5kYXRhVGFibGUoe1xuICAgICAgICAgICAgc2VhcmNoOiB7XG4gICAgICAgICAgICAgICAgc2VhcmNoOiBgJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IudmFsKCl9ICR7Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKX1gLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiB0cnVlLFxuICAgICAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgICAgICAgIHsgZGVmYXVsdENvbnRlbnQ6IFwiLVwiLCAgdGFyZ2V0czogXCJfYWxsXCJ9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1kZXRhaWwtcmVjb3Jkcy9nZXROZXdSZWNvcmRzYCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnUE9TVCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxuICAgICAgICAgICAgLy9zY3JvbGxZOiAkKHdpbmRvdykuaGVpZ2h0KCkgLSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub2Zmc2V0KCkudG9wLTE1MCxcbiAgICAgICAgICAgIHNEb206ICdydGlwJyxcbiAgICAgICAgICAgIGRlZmVyUmVuZGVyOiB0cnVlLFxuICAgICAgICAgICAgcGFnZUxlbmd0aDogY2FsbERldGFpbFJlY29yZHMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IHtcbiAgICAgICAgICAgICAgICAuLi5TZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICAgICAgZW1wdHlUYWJsZTogY2FsbERldGFpbFJlY29yZHMuZ2V0RW1wdHlUYWJsZU1lc3NhZ2UoKSxcbiAgICAgICAgICAgICAgICB6ZXJvUmVjb3JkczogY2FsbERldGFpbFJlY29yZHMuZ2V0RW1wdHlUYWJsZU1lc3NhZ2UoKVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIHRoZSBDRFIgcm93LlxuICAgICAgICAgICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5EVF9Sb3dDbGFzcy5pbmRleE9mKFwiZGV0YWlsZWRcIikgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnPGkgY2xhc3M9XCJpY29uIGNhcmV0IGRvd25cIj48L2k+Jyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMSkuaHRtbChkYXRhWzBdKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMilcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoZGF0YVsxXSlcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgzKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChkYXRhWzJdKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG5cbiAgICAgICAgICAgICAgICBsZXQgZHVyYXRpb24gPSBkYXRhWzNdO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLmlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb24gKz0gJzxpIGRhdGEtaWRzPVwiJyArIGRhdGEuaWRzICsgJ1wiIGNsYXNzPVwiZmlsZSBhbHRlcm5hdGUgb3V0bGluZSBpY29uXCI+JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDQpLmh0bWwoZHVyYXRpb24pLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9yZGVyaW5nOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZSA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5EYXRhVGFibGUoKTtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAndHIubmVnYXRpdmUnLCAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGlkcyA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtaWRzJyk7XG4gICAgICAgICAgICBpZiAoaWRzICE9PSB1bmRlZmluZWQgJiYgaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c3lzdGVtLWRpYWdub3N0aWMvaW5kZXgvP2ZpbGVuYW1lPWFzdGVyaXNrL3ZlcmJvc2UmZmlsdGVyPSR7aWRzfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3Igb3BlbmluZyBhbmQgY2xvc2luZyBkZXRhaWxzXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAndHIuZGV0YWlsZWQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGlkcyA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtaWRzJyk7XG4gICAgICAgICAgICBpZiAoaWRzICE9PSB1bmRlZmluZWQgJiYgaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c3lzdGVtLWRpYWdub3N0aWMvaW5kZXgvP2ZpbGVuYW1lPWFzdGVyaXNrL3ZlcmJvc2UmZmlsdGVyPSR7aWRzfWA7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdHIgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnJvdyh0cik7XG5cbiAgICAgICAgICAgIGlmIChyb3cuY2hpbGQuaXNTaG93bigpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyByb3cgaXMgYWxyZWFkeSBvcGVuIC0gY2xvc2UgaXRcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIHRyLnJlbW92ZUNsYXNzKCdzaG93bicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBPcGVuIHRoaXMgcm93XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkKGNhbGxEZXRhaWxSZWNvcmRzLnNob3dSZWNvcmRzKHJvdy5kYXRhKCkpKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgdHIuYWRkQ2xhc3MoJ3Nob3duJyk7XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkKCkuZmluZCgnLmRldGFpbC1yZWNvcmQtcm93JykuZWFjaCgoaW5kZXgsIHBsYXllclJvdykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZCA9ICQocGxheWVyUm93KS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IENEUlBsYXllcihpZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIHRoZSBsYXRlc3QgQ0RSIGRhdGUgZnJvbSB0aGUgc2VydmVyIGFuZCBzZXRzIHVwIGRhdGUgcmFuZ2UgcGlja2VyXG4gICAgICovXG4gICAgZmV0Y2hMYXRlc3RDRFJEYXRlKCkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWNhbGwtZGV0YWlsLXJlY29yZHMvZ2V0TGF0ZXN0UmVjb3JkRGF0ZWAsXG4gICAgICAgICAgICB0eXBlOiAnR0VUJyxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MgJiYgcmVzcG9uc2UuZGF0YS5sYXRlc3RfZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsYXRlc3REYXRlID0gbW9tZW50KHJlc3BvbnNlLmRhdGEubGF0ZXN0X2RhdGUpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IobGF0ZXN0RGF0ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgYSBzdHlsZWQgZW1wdHkgdGFibGUgbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgbWVzc2FnZSBmb3IgZW1wdHkgdGFibGVcbiAgICAgKi9cbiAgICBnZXRFbXB0eVRhYmxlTWVzc2FnZSgpIHtcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBsYWNlaG9sZGVyIHNlZ21lbnRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpY29uIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwicGhvbmUgc2xhc2ggaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5jZHJfTm9SZWNvcmRzRm91bmR9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+XG4gICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9UcnlDaGFuZ2luZ0RhdGV9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYSBzZXQgb2YgY2FsbCByZWNvcmRzIHdoZW4gYSByb3cgaXMgY2xpY2tlZC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjYWxsIHJlY29yZHMuXG4gICAgICovXG4gICAgc2hvd1JlY29yZHMoZGF0YSkge1xuICAgICAgICBsZXQgaHRtbFBsYXllciA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGJhc2ljIHRhYmxlIGNkci1wbGF5ZXJcIj48dGJvZHk+JztcbiAgICAgICAgZGF0YVs0XS5mb3JFYWNoKChyZWNvcmQsIGkpID0+IHtcbiAgICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSAnPHRkPjx0cj48L3RyPjwvdGQ+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IG51bGxcbiAgICAgICAgICAgICAgICB8fCByZWNvcmQucmVjb3JkaW5nZmlsZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gYFxuXG48dHIgY2xhc3M9XCJkZXRhaWwtcmVjb3JkLXJvdyBkaXNhYmxlZFwiIGlkPVwiJHtyZWNvcmQuaWR9XCI+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGUgcmlnaHQgYWxpZ25lZFwiPlxuICAgXHRcdDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuXHQgICBcdDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke3JlY29yZC5pZH1cIiBzcmM9XCJcIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxpIGNsYXNzPVwidWkgaWNvbiBkb3dubG9hZFwiIGRhdGEtdmFsdWU9XCJcIj48L2k+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLnNyY19udW19PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGUgY2VudGVyIGFsaWduZWRcIj48aSBjbGFzcz1cImljb24gZXhjaGFuZ2VcIj48L2k+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwibGVmdCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLmRzdF9udW19PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCByZWNvcmRGaWxlTmFtZSA9IGBDYWxsX3JlY29yZF9iZXR3ZWVuXyR7cmVjb3JkLnNyY19udW19X2FuZF8ke3JlY29yZC5kc3RfbnVtfV9mcm9tXyR7ZGF0YVswXX1gO1xuICAgICAgICAgICAgICAgIHJlY29yZEZpbGVOYW1lLnJlcGxhY2UoL1teXFx3XFxzIT9dL2csICcnKTtcbiAgICAgICAgICAgICAgICByZWNvcmRGaWxlTmFtZSA9IGVuY29kZVVSSUNvbXBvbmVudChyZWNvcmRGaWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkRmlsZVVyaSA9IGVuY29kZVVSSUNvbXBvbmVudChyZWNvcmQucmVjb3JkaW5nZmlsZSk7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93XCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIi9wYnhjb3JlL2FwaS9jZHIvdjIvcGxheWJhY2s/dmlldz0ke3JlY29yZEZpbGVVcml9XCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiL3BieGNvcmUvYXBpL2Nkci92Mi9wbGF5YmFjaz92aWV3PSR7cmVjb3JkRmlsZVVyaX0mZG93bmxvYWQ9MSZmaWxlbmFtZT0ke3JlY29yZEZpbGVOYW1lfS5tcDNcIj48L2k+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLnNyY19udW19PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGUgY2VudGVyIGFsaWduZWRcIj48aSBjbGFzcz1cImljb24gZXhjaGFuZ2VcIj48L2k+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwibGVmdCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLmRzdF9udW19PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBodG1sUGxheWVyICs9ICc8L3Rib2R5PjwvdGFibGU+JztcbiAgICAgICAgcmV0dXJuIGh0bWxQbGF5ZXI7XG4gICAgfSxcblxuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZmluZCgndGJvZHkgPiB0cicpLmZpcnN0KCkub3V0ZXJIZWlnaHQoKTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDQwMDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDUpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IuXG4gICAgICogQHBhcmFtIHttb21lbnR9IGxhdGVzdERhdGUgLSBPcHRpb25hbCBsYXRlc3QgcmVjb3JkIGRhdGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IobGF0ZXN0RGF0ZSA9IG51bGwpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHt9O1xuXG4gICAgICAgIG9wdGlvbnMucmFuZ2VzID0ge1xuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVG9kYXldOiBbbW9tZW50KCksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1llc3RlcmRheV06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RXZWVrXTogW21vbWVudCgpLnN1YnRyYWN0KDYsICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3QzMERheXNdOiBbbW9tZW50KCkuc3VidHJhY3QoMjksICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1RoaXNNb250aF06IFttb21lbnQoKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9MYXN0TW9udGhdOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuZW5kT2YoJ21vbnRoJyldLFxuICAgICAgICB9O1xuICAgICAgICBvcHRpb25zLmFsd2F5c1Nob3dDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmF1dG9VcGRhdGVJbnB1dCA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMubGlua2VkQ2FsZW5kYXJzID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5tYXhEYXRlID0gbW9tZW50KCk7XG4gICAgICAgIG9wdGlvbnMubG9jYWxlID0ge1xuICAgICAgICAgICAgZm9ybWF0OiAnREQvTU0vWVlZWScsXG4gICAgICAgICAgICBzZXBhcmF0b3I6ICcgLSAnLFxuICAgICAgICAgICAgYXBwbHlMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9BcHBseUJ0bixcbiAgICAgICAgICAgIGNhbmNlbExhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0NhbmNlbEJ0bixcbiAgICAgICAgICAgIGZyb21MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9mcm9tLFxuICAgICAgICAgICAgdG9MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF90byxcbiAgICAgICAgICAgIGN1c3RvbVJhbmdlTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQ3VzdG9tUGVyaW9kLFxuICAgICAgICAgICAgZGF5c09mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LmRheXMsXG4gICAgICAgICAgICBtb250aE5hbWVzOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQubW9udGhzLFxuICAgICAgICAgICAgZmlyc3REYXk6IDEsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGxhdGVzdCBkYXRlLCB1c2UgdGhhdCBtb250aCBmb3IgdGhlIGRhdGUgcmFuZ2VcbiAgICAgICAgaWYgKGxhdGVzdERhdGUpIHtcbiAgICAgICAgICAgIC8vIFNldCBkYXRlIHJhbmdlIHRvIG1hdGNoIHRoZSBtb250aCBvZiB0aGUgbGF0ZXN0IHJlY29yZFxuICAgICAgICAgICAgY29uc3Qgc3RhcnRPZk1vbnRoID0gbW9tZW50KGxhdGVzdERhdGUpLnN0YXJ0T2YoJ21vbnRoJyk7XG4gICAgICAgICAgICBjb25zdCBlbmRPZk1vbnRoID0gbW9tZW50KGxhdGVzdERhdGUpLmVuZE9mKCdtb250aCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiBpdCdzIHRoZSBjdXJyZW50IG1vbnRoLCBqdXN0IHVzZSB0b2RheSdzIGRhdGVcbiAgICAgICAgICAgIGlmIChtb21lbnQoKS5pc1NhbWUobGF0ZXN0RGF0ZSwgJ21vbnRoJykpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnN0YXJ0RGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZW5kRGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnN0YXJ0RGF0ZSA9IHN0YXJ0T2ZNb250aDtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmVuZERhdGUgPSBlbmRPZk1vbnRoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3B0aW9ucy5zdGFydERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIG9wdGlvbnMuZW5kRGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGVyYW5nZXBpY2tlcihcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QsXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbW1lZGlhdGVseSBhcHBseSB0aGUgZmlsdGVyIHdpdGggdGhlIG5ldyBkYXRlIHJhbmdlXG4gICAgICAgIGNvbnN0IHRleHQgPSBgJHtvcHRpb25zLnN0YXJ0RGF0ZS5mb3JtYXQoJ0REL01NL1lZWVknKX0gJHtvcHRpb25zLmVuZERhdGUuZm9ybWF0KCdERC9NTS9ZWVlZJyl9ICR7Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKX1gO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIHNlbGVjdCBldmVudC5cbiAgICAgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IHN0YXJ0IC0gVGhlIHN0YXJ0IGRhdGUuXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBlbmQgLSBUaGUgZW5kIGRhdGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGxhYmVsIC0gVGhlIGxhYmVsLlxuICAgICAqL1xuICAgIGNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdChzdGFydCwgZW5kLCBsYWJlbCkge1xuICAgICAgICBjb25zdCB0ZXh0ID0gYCR7c3RhcnQuZm9ybWF0KCdERC9NTS9ZWVlZJyl9ICR7ZW5kLmZvcm1hdCgnREQvTU0vWVlZWScpfSAke2NhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCl9YDtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIodGV4dCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIGZpbHRlciB0byB0aGUgZGF0YSB0YWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBmaWx0ZXIgdGV4dC5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5zZWFyY2godGV4dCkuZHJhdygpO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgQ0RSIHRhYmxlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==