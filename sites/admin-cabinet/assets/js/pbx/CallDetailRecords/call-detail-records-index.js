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
          callDetailRecords.initializeDateRangeSelector(latestDate);
        } else {
          callDetailRecords.initializeDateRangeSelector();
        }
      },
      onError: function onError() {}
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCJkYXRhVGFibGUiLCJwbGF5ZXJzIiwiaW5pdGlhbGl6ZSIsImZldGNoTGF0ZXN0Q0RSRGF0ZSIsIm9uIiwiZSIsImtleUNvZGUiLCJ2YWwiLCJsZW5ndGgiLCJ0ZXh0IiwiYXBwbHlGaWx0ZXIiLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImNvbHVtbkRlZnMiLCJkZWZhdWx0Q29udGVudCIsInRhcmdldHMiLCJhamF4IiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInR5cGUiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJwYWdlTGVuZ3RoIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJlbXB0eVRhYmxlIiwiZ2V0RW1wdHlUYWJsZU1lc3NhZ2UiLCJ6ZXJvUmVjb3JkcyIsImNyZWF0ZWRSb3ciLCJyb3ciLCJkYXRhIiwiRFRfUm93Q2xhc3MiLCJpbmRleE9mIiwiZXEiLCJodG1sIiwiYWRkQ2xhc3MiLCJkdXJhdGlvbiIsImlkcyIsImRyYXdDYWxsYmFjayIsIkV4dGVuc2lvbnMiLCJ1cGRhdGVQaG9uZXNSZXByZXNlbnQiLCJ0b2dnbGVQYWdpbmF0aW9uQ29udHJvbHMiLCJvcmRlcmluZyIsIkRhdGFUYWJsZSIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInRhcmdldCIsImF0dHIiLCJ1bmRlZmluZWQiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInRyIiwiY2hpbGQiLCJpc1Nob3duIiwiaGlkZSIsInNob3dSZWNvcmRzIiwic2hvdyIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJwbGF5ZXJSb3ciLCJpZCIsIkNEUlBsYXllciIsImluZm8iLCJwYWdlIiwicGFnZXMiLCJ0YWJsZSIsImNvbnRhaW5lciIsImFwaSIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwic3VjY2VzcyIsImxhdGVzdERhdGUiLCJtb21lbnQiLCJpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IiLCJvbkVycm9yIiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2RyX05vUmVjb3Jkc0ZvdW5kIiwiY2RyX1RyeUNoYW5naW5nRGF0ZSIsImh0bWxQbGF5ZXIiLCJmb3JFYWNoIiwicmVjb3JkIiwiaSIsInJlY29yZGluZ2ZpbGUiLCJzcmNfbnVtIiwiZHN0X251bSIsInJlY29yZEZpbGVOYW1lIiwicmVwbGFjZSIsImVuY29kZVVSSUNvbXBvbmVudCIsInJlY29yZEZpbGVVcmkiLCJyb3dIZWlnaHQiLCJmaXJzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJvcHRpb25zIiwicmFuZ2VzIiwiY2FsX1RvZGF5IiwiY2FsX1llc3RlcmRheSIsInN1YnRyYWN0IiwiY2FsX0xhc3RXZWVrIiwiY2FsX0xhc3QzMERheXMiLCJjYWxfVGhpc01vbnRoIiwic3RhcnRPZiIsImVuZE9mIiwiY2FsX0xhc3RNb250aCIsImFsd2F5c1Nob3dDYWxlbmRhcnMiLCJhdXRvVXBkYXRlSW5wdXQiLCJsaW5rZWRDYWxlbmRhcnMiLCJtYXhEYXRlIiwibG9jYWxlIiwiZm9ybWF0Iiwic2VwYXJhdG9yIiwiYXBwbHlMYWJlbCIsImNhbF9BcHBseUJ0biIsImNhbmNlbExhYmVsIiwiY2FsX0NhbmNlbEJ0biIsImZyb21MYWJlbCIsImNhbF9mcm9tIiwidG9MYWJlbCIsImNhbF90byIsImN1c3RvbVJhbmdlTGFiZWwiLCJjYWxfQ3VzdG9tUGVyaW9kIiwiZGF5c09mV2VlayIsImNhbGVuZGFyVGV4dCIsImRheXMiLCJtb250aE5hbWVzIiwibW9udGhzIiwiZmlyc3REYXkiLCJzdGFydE9mTW9udGgiLCJlbmRPZk1vbnRoIiwiaXNTYW1lIiwic3RhcnREYXRlIiwiZW5kRGF0ZSIsImRhdGVyYW5nZXBpY2tlciIsImNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdCIsInN0YXJ0IiwiZW5kIiwibGFiZWwiLCJkcmF3IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsaUJBQWlCLEdBQUc7QUFDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFQyxDQUFDLENBQUMsWUFBRCxDQUxVOztBQU90QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxlQUFELENBWE07O0FBYXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGtCQUFrQixFQUFFRixDQUFDLENBQUMsc0JBQUQsQ0FqQkM7O0FBbUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxTQUFTLEVBQUUsRUF2Qlc7O0FBeUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsRUE3QmE7O0FBK0J0QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFsQ3NCLHdCQWtDVDtBQUNUUCxJQUFBQSxpQkFBaUIsQ0FBQ1Esa0JBQWxCO0FBRUFSLElBQUFBLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ00sRUFBaEMsQ0FBbUMsT0FBbkMsRUFBNEMsVUFBQ0MsQ0FBRCxFQUFPO0FBQy9DLFVBQUlBLENBQUMsQ0FBQ0MsT0FBRixLQUFjLEVBQWQsSUFDR0QsQ0FBQyxDQUFDQyxPQUFGLEtBQWMsQ0FEakIsSUFFR1gsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDUyxHQUFoQyxHQUFzQ0MsTUFB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QkE0VlZELElBNVZVLEVBNFZKO0FBQ2RkLElBQUFBLGlCQUFpQixDQUFDSyxTQUFsQixDQUE0QlcsTUFBNUIsQ0FBbUNGLElBQW5DLEVBQXlDMEksSUFBekM7QUFDQXhKLElBQUFBLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ2tELE9BQWhDLENBQXdDLEtBQXhDLEVBQStDVCxRQUEvQyxDQUF3RCxTQUF4RDtBQUNIO0FBL1ZxQixDQUExQjtBQWtXQTtBQUNBO0FBQ0E7O0FBQ0ExQyxDQUFDLENBQUN1SixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCMUosRUFBQUEsaUJBQWlCLENBQUNPLFVBQWxCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRXh0ZW5zaW9ucywgbW9tZW50LCBnbG9iYWxUcmFuc2xhdGUsIENEUlBsYXllciAqL1xuXG4vKipcbiAqIGNhbGxEZXRhaWxSZWNvcmRzIG1vZHVsZS5cbiAqIEBtb2R1bGUgY2FsbERldGFpbFJlY29yZHNcbiAqL1xuY29uc3QgY2FsbERldGFpbFJlY29yZHMgPSB7XG4gICAgLyoqXG4gICAgICogVGhlIGNhbGwgZGV0YWlsIHJlY29yZHMgdGFibGUgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjZHJUYWJsZTogJCgnI2Nkci10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRnbG9iYWxTZWFyY2g6ICQoJyNnbG9iYWxzZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGF0ZVJhbmdlU2VsZWN0b3I6ICQoJyNkYXRlLXJhbmdlLXNlbGVjdG9yJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQW4gYXJyYXkgb2YgcGxheWVycy5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgcGxheWVyczogW10sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgY2FsbCBkZXRhaWwgcmVjb3Jkcy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5mZXRjaExhdGVzdENEUkRhdGUoKTtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxM1xuICAgICAgICAgICAgICAgIHx8IGUua2V5Q29kZSA9PT0gOFxuICAgICAgICAgICAgICAgIHx8IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGAke2NhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci52YWwoKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWA7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIodGV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5kYXRhVGFibGUoe1xuICAgICAgICAgICAgc2VhcmNoOiB7XG4gICAgICAgICAgICAgICAgc2VhcmNoOiBgJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IudmFsKCl9ICR7Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKX1gLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiB0cnVlLFxuICAgICAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgICAgICAgIHsgZGVmYXVsdENvbnRlbnQ6IFwiLVwiLCAgdGFyZ2V0czogXCJfYWxsXCJ9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1kZXRhaWwtcmVjb3Jkcy9nZXROZXdSZWNvcmRzYCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnUE9TVCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxuICAgICAgICAgICAgLy9zY3JvbGxZOiAkKHdpbmRvdykuaGVpZ2h0KCkgLSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub2Zmc2V0KCkudG9wLTE1MCxcbiAgICAgICAgICAgIHNEb206ICdydGlwJyxcbiAgICAgICAgICAgIGRlZmVyUmVuZGVyOiB0cnVlLFxuICAgICAgICAgICAgcGFnZUxlbmd0aDogY2FsbERldGFpbFJlY29yZHMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IHtcbiAgICAgICAgICAgICAgICAuLi5TZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICAgICAgZW1wdHlUYWJsZTogY2FsbERldGFpbFJlY29yZHMuZ2V0RW1wdHlUYWJsZU1lc3NhZ2UoKSxcbiAgICAgICAgICAgICAgICB6ZXJvUmVjb3JkczogY2FsbERldGFpbFJlY29yZHMuZ2V0RW1wdHlUYWJsZU1lc3NhZ2UoKVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIHRoZSBDRFIgcm93LlxuICAgICAgICAgICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5EVF9Sb3dDbGFzcy5pbmRleE9mKFwiZGV0YWlsZWRcIikgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnPGkgY2xhc3M9XCJpY29uIGNhcmV0IGRvd25cIj48L2k+Jyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMSkuaHRtbChkYXRhWzBdKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMilcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoZGF0YVsxXSlcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgzKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChkYXRhWzJdKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG5cbiAgICAgICAgICAgICAgICBsZXQgZHVyYXRpb24gPSBkYXRhWzNdO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLmlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb24gKz0gJzxpIGRhdGEtaWRzPVwiJyArIGRhdGEuaWRzICsgJ1wiIGNsYXNzPVwiZmlsZSBhbHRlcm5hdGUgb3V0bGluZSBpY29uXCI+JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDQpLmh0bWwoZHVyYXRpb24pLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnRvZ2dsZVBhZ2luYXRpb25Db250cm9scygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9yZGVyaW5nOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZSA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5EYXRhVGFibGUoKTtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAndHIubmVnYXRpdmUnLCAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGlkcyA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtaWRzJyk7XG4gICAgICAgICAgICBpZiAoaWRzICE9PSB1bmRlZmluZWQgJiYgaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c3lzdGVtLWRpYWdub3N0aWMvaW5kZXgvP2ZpbGVuYW1lPWFzdGVyaXNrL3ZlcmJvc2UmZmlsdGVyPSR7aWRzfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3Igb3BlbmluZyBhbmQgY2xvc2luZyBkZXRhaWxzXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAndHIuZGV0YWlsZWQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGlkcyA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtaWRzJyk7XG4gICAgICAgICAgICBpZiAoaWRzICE9PSB1bmRlZmluZWQgJiYgaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c3lzdGVtLWRpYWdub3N0aWMvaW5kZXgvP2ZpbGVuYW1lPWFzdGVyaXNrL3ZlcmJvc2UmZmlsdGVyPSR7aWRzfWA7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdHIgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnJvdyh0cik7XG5cbiAgICAgICAgICAgIGlmIChyb3cuY2hpbGQuaXNTaG93bigpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyByb3cgaXMgYWxyZWFkeSBvcGVuIC0gY2xvc2UgaXRcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIHRyLnJlbW92ZUNsYXNzKCdzaG93bicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBPcGVuIHRoaXMgcm93XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkKGNhbGxEZXRhaWxSZWNvcmRzLnNob3dSZWNvcmRzKHJvdy5kYXRhKCkpKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgdHIuYWRkQ2xhc3MoJ3Nob3duJyk7XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkKCkuZmluZCgnLmRldGFpbC1yZWNvcmQtcm93JykuZWFjaCgoaW5kZXgsIHBsYXllclJvdykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZCA9ICQocGxheWVyUm93KS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IENEUlBsYXllcihpZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSBwYWdpbmF0aW9uIGNvbnRyb2xzIHZpc2liaWxpdHkgYmFzZWQgb24gZGF0YSBzaXplXG4gICAgICovXG4gICAgdG9nZ2xlUGFnaW5hdGlvbkNvbnRyb2xzKCkge1xuICAgICAgICBjb25zdCBpbmZvID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UuaW5mbygpO1xuICAgICAgICBpZiAoaW5mby5wYWdlcyA8PSAxKSB7XG4gICAgICAgICAgICAkKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS50YWJsZSgpLmNvbnRhaW5lcigpKS5maW5kKCcuZGF0YVRhYmxlc19wYWdpbmF0ZScpLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnRhYmxlKCkuY29udGFpbmVyKCkpLmZpbmQoJy5kYXRhVGFibGVzX3BhZ2luYXRlJykuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgdGhlIGxhdGVzdCBDRFIgZGF0ZSBmcm9tIHRoZSBzZXJ2ZXIgYW5kIHNldHMgdXAgZGF0ZSByYW5nZSBwaWNrZXJcbiAgICAgKi9cbiAgICBmZXRjaExhdGVzdENEUkRhdGUoKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1jYWxsLWRldGFpbC1yZWNvcmRzL2dldExhdGVzdFJlY29yZERhdGVgLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MgJiYgcmVzcG9uc2UubGF0ZXN0RGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsYXRlc3REYXRlID0gbW9tZW50KHJlc3BvbnNlLmxhdGVzdERhdGUpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IobGF0ZXN0RGF0ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBhIHN0eWxlZCBlbXB0eSB0YWJsZSBtZXNzYWdlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBtZXNzYWdlIGZvciBlbXB0eSB0YWJsZVxuICAgICAqL1xuICAgIGdldEVtcHR5VGFibGVNZXNzYWdlKCkge1xuICAgICAgICByZXR1cm4gYFxuICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcGxhY2Vob2xkZXIgc2VnbWVudFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGljb24gaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJwaG9uZSBzbGFzaCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9Ob1JlY29yZHNGb3VuZH1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj5cbiAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuY2RyX1RyeUNoYW5naW5nRGF0ZX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhIHNldCBvZiBjYWxsIHJlY29yZHMgd2hlbiBhIHJvdyBpcyBjbGlja2VkLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNhbGwgcmVjb3Jkcy5cbiAgICAgKi9cbiAgICBzaG93UmVjb3JkcyhkYXRhKSB7XG4gICAgICAgIGxldCBodG1sUGxheWVyID0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgYmFzaWMgdGFibGUgY2RyLXBsYXllclwiPjx0Ym9keT4nO1xuICAgICAgICBkYXRhWzRdLmZvckVhY2goKHJlY29yZCwgaSkgPT4ge1xuICAgICAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSAnPHRkPjx0cj48L3RyPjwvdGQ+JztcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlY29yZC5yZWNvcmRpbmdmaWxlID09PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICB8fCByZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gbnVsbFxuICAgICAgICAgICAgICAgIHx8IHJlY29yZC5yZWNvcmRpbmdmaWxlLmxlbmd0aCA9PT0gMCkge1xuXG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93IGRpc2FibGVkXCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIlwiPjwvYXVkaW8+XG5cdDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwiZml2ZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiIGRhdGEtdmFsdWU9XCIke3JlY29yZC5pZH1cIj48L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPlxuICAgIFx0PGkgY2xhc3M9XCJ1aSBpY29uIGRvd25sb2FkXCIgZGF0YS12YWx1ZT1cIlwiPjwvaT5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IHJlY29yZEZpbGVOYW1lID0gYENhbGxfcmVjb3JkX2JldHdlZW5fJHtyZWNvcmQuc3JjX251bX1fYW5kXyR7cmVjb3JkLmRzdF9udW19X2Zyb21fJHtkYXRhWzBdfWA7XG4gICAgICAgICAgICAgICAgcmVjb3JkRmlsZU5hbWUucmVwbGFjZSgvW15cXHdcXHMhP10vZywgJycpO1xuICAgICAgICAgICAgICAgIHJlY29yZEZpbGVOYW1lID0gZW5jb2RlVVJJQ29tcG9uZW50KHJlY29yZEZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRGaWxlVXJpID0gZW5jb2RlVVJJQ29tcG9uZW50KHJlY29yZC5yZWNvcmRpbmdmaWxlKTtcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3dcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiL3BieGNvcmUvYXBpL2Nkci92Mi9wbGF5YmFjaz92aWV3PSR7cmVjb3JkRmlsZVVyaX1cIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxpIGNsYXNzPVwidWkgaWNvbiBkb3dubG9hZFwiIGRhdGEtdmFsdWU9XCIvcGJ4Y29yZS9hcGkvY2RyL3YyL3BsYXliYWNrP3ZpZXc9JHtyZWNvcmRGaWxlVXJpfSZkb3dubG9hZD0xJmZpbGVuYW1lPSR7cmVjb3JkRmlsZU5hbWV9Lm1wM1wiPjwvaT5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGh0bWxQbGF5ZXIgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICByZXR1cm4gaHRtbFBsYXllcjtcbiAgICB9LFxuXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5maW5kKCd0Ym9keSA+IHRyJykuZmlyc3QoKS5vdXRlckhlaWdodCgpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aW5kb3cgaGVpZ2h0IGFuZCBhdmFpbGFibGUgc3BhY2UgZm9yIHRhYmxlXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgY29uc3QgaGVhZGVyRm9vdGVySGVpZ2h0ID0gNDAwOyAvLyBFc3RpbWF0ZSBoZWlnaHQgZm9yIGhlYWRlciwgZm9vdGVyLCBhbmQgb3RoZXIgZWxlbWVudHNcblxuICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHBhZ2UgbGVuZ3RoXG4gICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBoZWFkZXJGb290ZXJIZWlnaHQpIC8gcm93SGVpZ2h0KSwgNSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZGF0ZSByYW5nZSBzZWxlY3Rvci5cbiAgICAgKiBAcGFyYW0ge21vbWVudH0gbGF0ZXN0RGF0ZSAtIE9wdGlvbmFsIGxhdGVzdCByZWNvcmQgZGF0ZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcihsYXRlc3REYXRlID0gbnVsbCkge1xuICAgICAgICBjb25zdCBvcHRpb25zID0ge307XG5cbiAgICAgICAgb3B0aW9ucy5yYW5nZXMgPSB7XG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9Ub2RheV06IFttb21lbnQoKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfWWVzdGVyZGF5XTogW21vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyksIG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdFdlZWtdOiBbbW9tZW50KCkuc3VidHJhY3QoNiwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdDMwRGF5c106IFttb21lbnQoKS5zdWJ0cmFjdCgyOSwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVGhpc01vbnRoXTogW21vbWVudCgpLnN0YXJ0T2YoJ21vbnRoJyksIG1vbWVudCgpLmVuZE9mKCdtb250aCcpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RNb250aF06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgIH07XG4gICAgICAgIG9wdGlvbnMuYWx3YXlzU2hvd0NhbGVuZGFycyA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMuYXV0b1VwZGF0ZUlucHV0ID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5saW5rZWRDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLm1heERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgb3B0aW9ucy5sb2NhbGUgPSB7XG4gICAgICAgICAgICBmb3JtYXQ6ICdERC9NTS9ZWVlZJyxcbiAgICAgICAgICAgIHNlcGFyYXRvcjogJyAtICcsXG4gICAgICAgICAgICBhcHBseUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0FwcGx5QnRuLFxuICAgICAgICAgICAgY2FuY2VsTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQ2FuY2VsQnRuLFxuICAgICAgICAgICAgZnJvbUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX2Zyb20sXG4gICAgICAgICAgICB0b0xhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX3RvLFxuICAgICAgICAgICAgY3VzdG9tUmFuZ2VMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9DdXN0b21QZXJpb2QsXG4gICAgICAgICAgICBkYXlzT2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQuZGF5cyxcbiAgICAgICAgICAgIG1vbnRoTmFtZXM6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5tb250aHMsXG4gICAgICAgICAgICBmaXJzdERheTogMSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbGF0ZXN0IGRhdGUsIHVzZSB0aGF0IG1vbnRoIGZvciB0aGUgZGF0ZSByYW5nZVxuICAgICAgICBpZiAobGF0ZXN0RGF0ZSkge1xuICAgICAgICAgICAgLy8gU2V0IGRhdGUgcmFuZ2UgdG8gbWF0Y2ggdGhlIG1vbnRoIG9mIHRoZSBsYXRlc3QgcmVjb3JkXG4gICAgICAgICAgICBjb25zdCBzdGFydE9mTW9udGggPSBtb21lbnQobGF0ZXN0RGF0ZSkuc3RhcnRPZignZGF5Jyk7XG4gICAgICAgICAgICBjb25zdCBlbmRPZk1vbnRoID0gbW9tZW50KGxhdGVzdERhdGUpLmVuZE9mKCdkYXknKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWYgaXQncyB0aGUgY3VycmVudCBtb250aCwganVzdCB1c2UgdG9kYXkncyBkYXRlXG4gICAgICAgICAgICBpZiAobW9tZW50KCkuaXNTYW1lKGxhdGVzdERhdGUsICdkYXknKSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KCk7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5lbmREYXRlID0gbW9tZW50KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gc3RhcnRPZk1vbnRoO1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZW5kRGF0ZSA9IGVuZE9mTW9udGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHRpb25zLnN0YXJ0RGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgb3B0aW9ucy5lbmREYXRlID0gbW9tZW50KCk7XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IuZGF0ZXJhbmdlcGlja2VyKFxuICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdCxcbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEltbWVkaWF0ZWx5IGFwcGx5IHRoZSBmaWx0ZXIgd2l0aCB0aGUgbmV3IGRhdGUgcmFuZ2VcbiAgICAgICAgY29uc3QgdGV4dCA9IGAke29wdGlvbnMuc3RhcnREYXRlLmZvcm1hdCgnREQvTU0vWVlZWScpfSAke29wdGlvbnMuZW5kRGF0ZS5mb3JtYXQoJ0REL01NL1lZWVknKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWA7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKHRleHQpO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3Igc2VsZWN0IGV2ZW50LlxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gc3RhcnQgLSBUaGUgc3RhcnQgZGF0ZS5cbiAgICAgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IGVuZCAtIFRoZSBlbmQgZGF0ZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFiZWwgLSBUaGUgbGFiZWwuXG4gICAgICovXG4gICAgY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0KHN0YXJ0LCBlbmQsIGxhYmVsKSB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBgJHtzdGFydC5mb3JtYXQoJ0REL01NL1lZWVknKX0gJHtlbmQuZm9ybWF0KCdERC9NTS9ZWVlZJyl9ICR7Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKX1gO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgZmlsdGVyIHRvIHRoZSBkYXRhIHRhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIGZpbHRlciB0ZXh0LlxuICAgICAqL1xuICAgIGFwcGx5RmlsdGVyKHRleHQpIHtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBDRFIgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19