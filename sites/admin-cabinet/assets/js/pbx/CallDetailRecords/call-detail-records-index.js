"use strict";

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
    callDetailRecords.initializeDateRangeSelector();
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

      /**
       * Constructs the CDR row.
       * @param {HTMLElement} row - The row element.
       * @param {Array} data - The row data.
       */
      createdRow: function createdRow(row, data) {
        if (data.DT_RowClass === 'detailed') {
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
      language: SemanticLocalization.dataTableLocalisation,
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

    return Math.floor((windowHeight - headerFooterHeight) / rowHeight);
  },

  /**
   * Initializes the date range selector.
   */
  initializeDateRangeSelector: function initializeDateRangeSelector() {
    var _options$ranges;

    var options = {};
    options.ranges = (_options$ranges = {}, _defineProperty(_options$ranges, globalTranslate.сal_Today, [moment(), moment()]), _defineProperty(_options$ranges, globalTranslate.сal_Yesterday, [moment().subtract(1, 'days'), moment().subtract(1, 'days')]), _defineProperty(_options$ranges, globalTranslate.сal_LastWeek, [moment().subtract(6, 'days'), moment()]), _defineProperty(_options$ranges, globalTranslate.сal_Last30Days, [moment().subtract(29, 'days'), moment()]), _defineProperty(_options$ranges, globalTranslate.сal_ThisMonth, [moment().startOf('month'), moment().endOf('month')]), _defineProperty(_options$ranges, globalTranslate.сal_LastMonth, [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]), _options$ranges);
    options.alwaysShowCalendars = true;
    options.autoUpdateInput = true;
    options.linkedCalendars = true;
    options.maxDate = moment();
    options.locale = {
      format: 'DD/MM/YYYY',
      separator: ' - ',
      applyLabel: globalTranslate.сal_ApplyBtn,
      cancelLabel: globalTranslate.сal_CancelBtn,
      fromLabel: globalTranslate.сal_from,
      toLabel: globalTranslate.сal_to,
      customRangeLabel: globalTranslate.сal_CustomPeriod,
      daysOfWeek: SemanticLocalization.calendarText.days,
      monthNames: SemanticLocalization.calendarText.months,
      firstDay: 1
    };
    options.startDate = moment();
    options.endDate = moment();
    callDetailRecords.$dateRangeSelector.daterangepicker(options, callDetailRecords.cbDateRangeSelectorOnSelect);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCJkYXRhVGFibGUiLCJwbGF5ZXJzIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvciIsIm9uIiwiZSIsImtleUNvZGUiLCJ2YWwiLCJsZW5ndGgiLCJ0ZXh0IiwiYXBwbHlGaWx0ZXIiLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImNvbHVtbkRlZnMiLCJkZWZhdWx0Q29udGVudCIsInRhcmdldHMiLCJhamF4IiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInR5cGUiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJwYWdlTGVuZ3RoIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImNyZWF0ZWRSb3ciLCJyb3ciLCJkYXRhIiwiRFRfUm93Q2xhc3MiLCJlcSIsImh0bWwiLCJhZGRDbGFzcyIsImR1cmF0aW9uIiwiaWRzIiwiZHJhd0NhbGxiYWNrIiwiRXh0ZW5zaW9ucyIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJvcmRlcmluZyIsIkRhdGFUYWJsZSIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInRhcmdldCIsImF0dHIiLCJ1bmRlZmluZWQiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInRyIiwiY2hpbGQiLCJpc1Nob3duIiwiaGlkZSIsInNob3dSZWNvcmRzIiwic2hvdyIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJwbGF5ZXJSb3ciLCJpZCIsIkNEUlBsYXllciIsImh0bWxQbGF5ZXIiLCJmb3JFYWNoIiwicmVjb3JkIiwiaSIsInJlY29yZGluZ2ZpbGUiLCJzcmNfbnVtIiwiZHN0X251bSIsInJlY29yZEZpbGVOYW1lIiwicmVwbGFjZSIsImVuY29kZVVSSUNvbXBvbmVudCIsInJlY29yZEZpbGVVcmkiLCJyb3dIZWlnaHQiLCJmaXJzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJNYXRoIiwiZmxvb3IiLCJvcHRpb25zIiwicmFuZ2VzIiwiZ2xvYmFsVHJhbnNsYXRlIiwi0YFhbF9Ub2RheSIsIm1vbWVudCIsItGBYWxfWWVzdGVyZGF5Iiwic3VidHJhY3QiLCLRgWFsX0xhc3RXZWVrIiwi0YFhbF9MYXN0MzBEYXlzIiwi0YFhbF9UaGlzTW9udGgiLCJzdGFydE9mIiwiZW5kT2YiLCLRgWFsX0xhc3RNb250aCIsImFsd2F5c1Nob3dDYWxlbmRhcnMiLCJhdXRvVXBkYXRlSW5wdXQiLCJsaW5rZWRDYWxlbmRhcnMiLCJtYXhEYXRlIiwibG9jYWxlIiwiZm9ybWF0Iiwic2VwYXJhdG9yIiwiYXBwbHlMYWJlbCIsItGBYWxfQXBwbHlCdG4iLCJjYW5jZWxMYWJlbCIsItGBYWxfQ2FuY2VsQnRuIiwiZnJvbUxhYmVsIiwi0YFhbF9mcm9tIiwidG9MYWJlbCIsItGBYWxfdG8iLCJjdXN0b21SYW5nZUxhYmVsIiwi0YFhbF9DdXN0b21QZXJpb2QiLCJkYXlzT2ZXZWVrIiwiY2FsZW5kYXJUZXh0IiwiZGF5cyIsIm1vbnRoTmFtZXMiLCJtb250aHMiLCJmaXJzdERheSIsInN0YXJ0RGF0ZSIsImVuZERhdGUiLCJkYXRlcmFuZ2VwaWNrZXIiLCJjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QiLCJzdGFydCIsImVuZCIsImxhYmVsIiwiZHJhdyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsaUJBQWlCLEdBQUc7QUFDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFQyxDQUFDLENBQUMsWUFBRCxDQUxVOztBQU90QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxlQUFELENBWE07O0FBYXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGtCQUFrQixFQUFFRixDQUFDLENBQUMsc0JBQUQsQ0FqQkM7O0FBbUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxTQUFTLEVBQUUsRUF2Qlc7O0FBeUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsRUE3QmE7O0FBK0J0QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFsQ3NCLHdCQWtDVDtBQUNUUCxJQUFBQSxpQkFBaUIsQ0FBQ1EsMkJBQWxCO0FBRUFSLElBQUFBLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ00sRUFBaEMsQ0FBbUMsT0FBbkMsRUFBNEMsVUFBQ0MsQ0FBRCxFQUFPO0FBQy9DLFVBQUlBLENBQUMsQ0FBQ0MsT0FBRixLQUFjLEVBQWQsSUFDR0QsQ0FBQyxDQUFDQyxPQUFGLEtBQWMsQ0FEakIsSUFFR1gsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDUyxHQUFoQyxHQUFzQ0MsTUFBdEMsS0FBaUQsQ0FGeEQsRUFFMkQ7QUFDdkQsWUFBTUMsSUFBSSxhQUFNZCxpQkFBaUIsQ0FBQ0ksa0JBQWxCLENBQXFDUSxHQUFyQyxFQUFOLGNBQW9EWixpQkFBaUIsQ0FBQ0csYUFBbEIsQ0FBZ0NTLEdBQWhDLEVBQXBELENBQVY7QUFDQVosUUFBQUEsaUJBQWlCLENBQUNlLFdBQWxCLENBQThCRCxJQUE5QjtBQUNIO0FBQ0osS0FQRDtBQVNBZCxJQUFBQSxpQkFBaUIsQ0FBQ0MsU0FBbEIsQ0FBNEJJLFNBQTVCLENBQXNDO0FBQ2xDVyxNQUFBQSxNQUFNLEVBQUU7QUFDSkEsUUFBQUEsTUFBTSxZQUFLaEIsaUJBQWlCLENBQUNJLGtCQUFsQixDQUFxQ1EsR0FBckMsRUFBTCxjQUFtRFosaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDUyxHQUFoQyxFQUFuRDtBQURGLE9BRDBCO0FBSWxDSyxNQUFBQSxVQUFVLEVBQUUsSUFKc0I7QUFLbENDLE1BQUFBLFVBQVUsRUFBRSxJQUxzQjtBQU1sQ0MsTUFBQUEsVUFBVSxFQUFFLENBQ1I7QUFBRUMsUUFBQUEsY0FBYyxFQUFFLEdBQWxCO0FBQXdCQyxRQUFBQSxPQUFPLEVBQUU7QUFBakMsT0FEUSxDQU5zQjtBQVNsQ0MsTUFBQUEsSUFBSSxFQUFFO0FBQ0ZDLFFBQUFBLEdBQUcsWUFBS0MsYUFBTCxzQ0FERDtBQUVGQyxRQUFBQSxJQUFJLEVBQUU7QUFGSixPQVQ0QjtBQWFsQ0MsTUFBQUEsTUFBTSxFQUFFLElBYjBCO0FBY2xDO0FBQ0FDLE1BQUFBLElBQUksRUFBRSxNQWY0QjtBQWdCbENDLE1BQUFBLFdBQVcsRUFBRSxJQWhCcUI7QUFpQmxDQyxNQUFBQSxVQUFVLEVBQUU3QixpQkFBaUIsQ0FBQzhCLG1CQUFsQixFQWpCc0I7O0FBbUJsQztBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ1lDLE1BQUFBLFVBeEJrQyxzQkF3QnZCQyxHQXhCdUIsRUF3QmxCQyxJQXhCa0IsRUF3Qlo7QUFDbEIsWUFBSUEsSUFBSSxDQUFDQyxXQUFMLEtBQXFCLFVBQXpCLEVBQXFDO0FBQ2pDaEMsVUFBQUEsQ0FBQyxDQUFDLElBQUQsRUFBTzhCLEdBQVAsQ0FBRCxDQUFhRyxFQUFiLENBQWdCLENBQWhCLEVBQW1CQyxJQUFuQixDQUF3QixpQ0FBeEI7QUFDSCxTQUZELE1BRU87QUFDSGxDLFVBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU84QixHQUFQLENBQUQsQ0FBYUcsRUFBYixDQUFnQixDQUFoQixFQUFtQkMsSUFBbkIsQ0FBd0IsRUFBeEI7QUFDSDs7QUFDRGxDLFFBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU84QixHQUFQLENBQUQsQ0FBYUcsRUFBYixDQUFnQixDQUFoQixFQUFtQkMsSUFBbkIsQ0FBd0JILElBQUksQ0FBQyxDQUFELENBQTVCO0FBQ0EvQixRQUFBQSxDQUFDLENBQUMsSUFBRCxFQUFPOEIsR0FBUCxDQUFELENBQWFHLEVBQWIsQ0FBZ0IsQ0FBaEIsRUFDS0MsSUFETCxDQUNVSCxJQUFJLENBQUMsQ0FBRCxDQURkLEVBRUtJLFFBRkwsQ0FFYyxhQUZkO0FBR0FuQyxRQUFBQSxDQUFDLENBQUMsSUFBRCxFQUFPOEIsR0FBUCxDQUFELENBQWFHLEVBQWIsQ0FBZ0IsQ0FBaEIsRUFDS0MsSUFETCxDQUNVSCxJQUFJLENBQUMsQ0FBRCxDQURkLEVBRUtJLFFBRkwsQ0FFYyxhQUZkO0FBSUEsWUFBSUMsUUFBUSxHQUFHTCxJQUFJLENBQUMsQ0FBRCxDQUFuQjs7QUFDQSxZQUFJQSxJQUFJLENBQUNNLEdBQUwsS0FBYSxFQUFqQixFQUFxQjtBQUNqQkQsVUFBQUEsUUFBUSxJQUFJLGtCQUFrQkwsSUFBSSxDQUFDTSxHQUF2QixHQUE2Qix3Q0FBekM7QUFDSDs7QUFDRHJDLFFBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU84QixHQUFQLENBQUQsQ0FBYUcsRUFBYixDQUFnQixDQUFoQixFQUFtQkMsSUFBbkIsQ0FBd0JFLFFBQXhCLEVBQWtDRCxRQUFsQyxDQUEyQyxlQUEzQztBQUNILE9BM0NpQzs7QUE2Q2xDO0FBQ1o7QUFDQTtBQUNZRyxNQUFBQSxZQWhEa0MsMEJBZ0RuQjtBQUNYQyxRQUFBQSxVQUFVLENBQUNDLHFCQUFYLENBQWlDLGFBQWpDO0FBQ0gsT0FsRGlDO0FBbURsQ0MsTUFBQUEsUUFBUSxFQUFFQyxvQkFBb0IsQ0FBQ0MscUJBbkRHO0FBb0RsQ0MsTUFBQUEsUUFBUSxFQUFFO0FBcER3QixLQUF0QztBQXNEQTlDLElBQUFBLGlCQUFpQixDQUFDSyxTQUFsQixHQUE4QkwsaUJBQWlCLENBQUNDLFNBQWxCLENBQTRCOEMsU0FBNUIsRUFBOUI7QUFFQS9DLElBQUFBLGlCQUFpQixDQUFDSyxTQUFsQixDQUE0QkksRUFBNUIsQ0FBK0IsTUFBL0IsRUFBdUMsWUFBTTtBQUN6Q1QsTUFBQUEsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDNkMsT0FBaEMsQ0FBd0MsS0FBeEMsRUFBK0NDLFdBQS9DLENBQTJELFNBQTNEO0FBQ0gsS0FGRDtBQUlBakQsSUFBQUEsaUJBQWlCLENBQUNDLFNBQWxCLENBQTRCUSxFQUE1QixDQUErQixPQUEvQixFQUF3QyxhQUF4QyxFQUF1RCxVQUFDQyxDQUFELEVBQU87QUFDMUQsVUFBSTZCLEdBQUcsR0FBR3JDLENBQUMsQ0FBQ1EsQ0FBQyxDQUFDd0MsTUFBSCxDQUFELENBQVlDLElBQVosQ0FBaUIsVUFBakIsQ0FBVjs7QUFDQSxVQUFJWixHQUFHLEtBQUthLFNBQVIsSUFBcUJiLEdBQUcsS0FBSyxFQUFqQyxFQUFxQztBQUNqQ2MsUUFBQUEsTUFBTSxDQUFDQyxRQUFQLGFBQXFCOUIsYUFBckIsdUVBQStGZSxHQUEvRjtBQUNIO0FBQ0osS0FMRCxFQXhFUyxDQStFVDs7QUFDQXZDLElBQUFBLGlCQUFpQixDQUFDQyxTQUFsQixDQUE0QlEsRUFBNUIsQ0FBK0IsT0FBL0IsRUFBd0MsYUFBeEMsRUFBdUQsVUFBQ0MsQ0FBRCxFQUFPO0FBQzFELFVBQUk2QixHQUFHLEdBQUdyQyxDQUFDLENBQUNRLENBQUMsQ0FBQ3dDLE1BQUgsQ0FBRCxDQUFZQyxJQUFaLENBQWlCLFVBQWpCLENBQVY7O0FBQ0EsVUFBSVosR0FBRyxLQUFLYSxTQUFSLElBQXFCYixHQUFHLEtBQUssRUFBakMsRUFBcUM7QUFDakNjLFFBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQjlCLGFBQXJCLHVFQUErRmUsR0FBL0Y7QUFDQTtBQUNIOztBQUNELFVBQU1nQixFQUFFLEdBQUdyRCxDQUFDLENBQUNRLENBQUMsQ0FBQ3dDLE1BQUgsQ0FBRCxDQUFZRixPQUFaLENBQW9CLElBQXBCLENBQVg7QUFDQSxVQUFNaEIsR0FBRyxHQUFHaEMsaUJBQWlCLENBQUNLLFNBQWxCLENBQTRCMkIsR0FBNUIsQ0FBZ0N1QixFQUFoQyxDQUFaOztBQUVBLFVBQUl2QixHQUFHLENBQUN3QixLQUFKLENBQVVDLE9BQVYsRUFBSixFQUF5QjtBQUNyQjtBQUNBekIsUUFBQUEsR0FBRyxDQUFDd0IsS0FBSixDQUFVRSxJQUFWO0FBQ0FILFFBQUFBLEVBQUUsQ0FBQ04sV0FBSCxDQUFlLE9BQWY7QUFDSCxPQUpELE1BSU87QUFDSDtBQUNBakIsUUFBQUEsR0FBRyxDQUFDd0IsS0FBSixDQUFVeEQsaUJBQWlCLENBQUMyRCxXQUFsQixDQUE4QjNCLEdBQUcsQ0FBQ0MsSUFBSixFQUE5QixDQUFWLEVBQXFEMkIsSUFBckQ7QUFDQUwsUUFBQUEsRUFBRSxDQUFDbEIsUUFBSCxDQUFZLE9BQVo7QUFDQUwsUUFBQUEsR0FBRyxDQUFDd0IsS0FBSixHQUFZSyxJQUFaLENBQWlCLG9CQUFqQixFQUF1Q0MsSUFBdkMsQ0FBNEMsVUFBQ0MsS0FBRCxFQUFRQyxTQUFSLEVBQXNCO0FBQzlELGNBQU1DLEVBQUUsR0FBRy9ELENBQUMsQ0FBQzhELFNBQUQsQ0FBRCxDQUFhYixJQUFiLENBQWtCLElBQWxCLENBQVg7QUFDQSxpQkFBTyxJQUFJZSxTQUFKLENBQWNELEVBQWQsQ0FBUDtBQUNILFNBSEQ7QUFJQXhCLFFBQUFBLFVBQVUsQ0FBQ0MscUJBQVgsQ0FBaUMsYUFBakM7QUFDSDtBQUNKLEtBdkJEO0FBd0JILEdBMUlxQjs7QUE0SXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWlCLEVBQUFBLFdBakpzQix1QkFpSlYxQixJQWpKVSxFQWlKSjtBQUNkLFFBQUlrQyxVQUFVLEdBQUcsdURBQWpCO0FBQ0FsQyxJQUFBQSxJQUFJLENBQUMsQ0FBRCxDQUFKLENBQVFtQyxPQUFSLENBQWdCLFVBQUNDLE1BQUQsRUFBU0MsQ0FBVCxFQUFlO0FBQzNCLFVBQUlBLENBQUMsR0FBRyxDQUFSLEVBQVc7QUFDUEgsUUFBQUEsVUFBVSxJQUFJLG9CQUFkO0FBQ0FBLFFBQUFBLFVBQVUsSUFBSSxvQkFBZDtBQUNIOztBQUNELFVBQUlFLE1BQU0sQ0FBQ0UsYUFBUCxLQUF5Qm5CLFNBQXpCLElBQ0dpQixNQUFNLENBQUNFLGFBQVAsS0FBeUIsSUFENUIsSUFFR0YsTUFBTSxDQUFDRSxhQUFQLENBQXFCMUQsTUFBckIsS0FBZ0MsQ0FGdkMsRUFFMEM7QUFFdENzRCxRQUFBQSxVQUFVLGdFQUVtQkUsTUFBTSxDQUFDSixFQUYxQiw2TEFNd0JJLE1BQU0sQ0FBQ0osRUFOL0IsZ0lBUzBCSSxNQUFNLENBQUNKLEVBVGpDLHVRQWVnQ0ksTUFBTSxDQUFDRyxPQWZ2Qyx1S0FpQitCSCxNQUFNLENBQUNJLE9BakJ0Qyx3QkFBVjtBQW1CSCxPQXZCRCxNQXVCTztBQUNILFlBQUlDLGNBQWMsaUNBQTBCTCxNQUFNLENBQUNHLE9BQWpDLGtCQUFnREgsTUFBTSxDQUFDSSxPQUF2RCxtQkFBdUV4QyxJQUFJLENBQUMsQ0FBRCxDQUEzRSxDQUFsQjtBQUNBeUMsUUFBQUEsY0FBYyxDQUFDQyxPQUFmLENBQXVCLFlBQXZCLEVBQXFDLEVBQXJDO0FBQ0FELFFBQUFBLGNBQWMsR0FBR0Usa0JBQWtCLENBQUNGLGNBQUQsQ0FBbkM7QUFDQSxZQUFNRyxhQUFhLEdBQUdELGtCQUFrQixDQUFDUCxNQUFNLENBQUNFLGFBQVIsQ0FBeEM7QUFDQUosUUFBQUEsVUFBVSx1REFFVUUsTUFBTSxDQUFDSixFQUZqQiw2TEFNd0JJLE1BQU0sQ0FBQ0osRUFOL0Isd0RBTTZFWSxhQU43RSx1SEFTMEJSLE1BQU0sQ0FBQ0osRUFUakMseU5BYXVEWSxhQWJ2RCxrQ0FhNEZILGNBYjVGLGlHQWVnQ0wsTUFBTSxDQUFDRyxPQWZ2Qyx1S0FpQitCSCxNQUFNLENBQUNJLE9BakJ0Qyx3QkFBVjtBQW1CSDtBQUNKLEtBckREO0FBc0RBTixJQUFBQSxVQUFVLElBQUksa0JBQWQ7QUFDQSxXQUFPQSxVQUFQO0FBQ0gsR0EzTXFCO0FBNk10QnJDLEVBQUFBLG1CQTdNc0IsaUNBNk1BO0FBQ2xCO0FBQ0EsUUFBSWdELFNBQVMsR0FBRzlFLGlCQUFpQixDQUFDQyxTQUFsQixDQUE0QjRELElBQTVCLENBQWlDLFlBQWpDLEVBQStDa0IsS0FBL0MsR0FBdURDLFdBQXZELEVBQWhCLENBRmtCLENBSWxCOztBQUNBLFFBQU1DLFlBQVksR0FBRzVCLE1BQU0sQ0FBQzZCLFdBQTVCO0FBQ0EsUUFBTUMsa0JBQWtCLEdBQUcsR0FBM0IsQ0FOa0IsQ0FNYztBQUVoQzs7QUFDQSxXQUFPQyxJQUFJLENBQUNDLEtBQUwsQ0FBVyxDQUFDSixZQUFZLEdBQUdFLGtCQUFoQixJQUFzQ0wsU0FBakQsQ0FBUDtBQUNILEdBdk5xQjs7QUF3TnRCO0FBQ0o7QUFDQTtBQUNJdEUsRUFBQUEsMkJBM05zQix5Q0EyTlE7QUFBQTs7QUFDMUIsUUFBTThFLE9BQU8sR0FBRyxFQUFoQjtBQUVBQSxJQUFBQSxPQUFPLENBQUNDLE1BQVIsMkRBQ0tDLGVBQWUsQ0FBQ0MsU0FEckIsRUFDaUMsQ0FBQ0MsTUFBTSxFQUFQLEVBQVdBLE1BQU0sRUFBakIsQ0FEakMsb0NBRUtGLGVBQWUsQ0FBQ0csYUFGckIsRUFFcUMsQ0FBQ0QsTUFBTSxHQUFHRSxRQUFULENBQWtCLENBQWxCLEVBQXFCLE1BQXJCLENBQUQsRUFBK0JGLE1BQU0sR0FBR0UsUUFBVCxDQUFrQixDQUFsQixFQUFxQixNQUFyQixDQUEvQixDQUZyQyxvQ0FHS0osZUFBZSxDQUFDSyxZQUhyQixFQUdvQyxDQUFDSCxNQUFNLEdBQUdFLFFBQVQsQ0FBa0IsQ0FBbEIsRUFBcUIsTUFBckIsQ0FBRCxFQUErQkYsTUFBTSxFQUFyQyxDQUhwQyxvQ0FJS0YsZUFBZSxDQUFDTSxjQUpyQixFQUlzQyxDQUFDSixNQUFNLEdBQUdFLFFBQVQsQ0FBa0IsRUFBbEIsRUFBc0IsTUFBdEIsQ0FBRCxFQUFnQ0YsTUFBTSxFQUF0QyxDQUp0QyxvQ0FLS0YsZUFBZSxDQUFDTyxhQUxyQixFQUtxQyxDQUFDTCxNQUFNLEdBQUdNLE9BQVQsQ0FBaUIsT0FBakIsQ0FBRCxFQUE0Qk4sTUFBTSxHQUFHTyxLQUFULENBQWUsT0FBZixDQUE1QixDQUxyQyxvQ0FNS1QsZUFBZSxDQUFDVSxhQU5yQixFQU1xQyxDQUFDUixNQUFNLEdBQUdFLFFBQVQsQ0FBa0IsQ0FBbEIsRUFBcUIsT0FBckIsRUFBOEJJLE9BQTlCLENBQXNDLE9BQXRDLENBQUQsRUFBaUROLE1BQU0sR0FBR0UsUUFBVCxDQUFrQixDQUFsQixFQUFxQixPQUFyQixFQUE4QkssS0FBOUIsQ0FBb0MsT0FBcEMsQ0FBakQsQ0FOckM7QUFRQVgsSUFBQUEsT0FBTyxDQUFDYSxtQkFBUixHQUE4QixJQUE5QjtBQUNBYixJQUFBQSxPQUFPLENBQUNjLGVBQVIsR0FBMEIsSUFBMUI7QUFDQWQsSUFBQUEsT0FBTyxDQUFDZSxlQUFSLEdBQTBCLElBQTFCO0FBQ0FmLElBQUFBLE9BQU8sQ0FBQ2dCLE9BQVIsR0FBa0JaLE1BQU0sRUFBeEI7QUFDQUosSUFBQUEsT0FBTyxDQUFDaUIsTUFBUixHQUFpQjtBQUNiQyxNQUFBQSxNQUFNLEVBQUUsWUFESztBQUViQyxNQUFBQSxTQUFTLEVBQUUsS0FGRTtBQUdiQyxNQUFBQSxVQUFVLEVBQUVsQixlQUFlLENBQUNtQixZQUhmO0FBSWJDLE1BQUFBLFdBQVcsRUFBRXBCLGVBQWUsQ0FBQ3FCLGFBSmhCO0FBS2JDLE1BQUFBLFNBQVMsRUFBRXRCLGVBQWUsQ0FBQ3VCLFFBTGQ7QUFNYkMsTUFBQUEsT0FBTyxFQUFFeEIsZUFBZSxDQUFDeUIsTUFOWjtBQU9iQyxNQUFBQSxnQkFBZ0IsRUFBRTFCLGVBQWUsQ0FBQzJCLGdCQVByQjtBQVFiQyxNQUFBQSxVQUFVLEVBQUV4RSxvQkFBb0IsQ0FBQ3lFLFlBQXJCLENBQWtDQyxJQVJqQztBQVNiQyxNQUFBQSxVQUFVLEVBQUUzRSxvQkFBb0IsQ0FBQ3lFLFlBQXJCLENBQWtDRyxNQVRqQztBQVViQyxNQUFBQSxRQUFRLEVBQUU7QUFWRyxLQUFqQjtBQVlBbkMsSUFBQUEsT0FBTyxDQUFDb0MsU0FBUixHQUFvQmhDLE1BQU0sRUFBMUI7QUFDQUosSUFBQUEsT0FBTyxDQUFDcUMsT0FBUixHQUFrQmpDLE1BQU0sRUFBeEI7QUFDQTFGLElBQUFBLGlCQUFpQixDQUFDSSxrQkFBbEIsQ0FBcUN3SCxlQUFyQyxDQUNJdEMsT0FESixFQUVJdEYsaUJBQWlCLENBQUM2SCwyQkFGdEI7QUFJSCxHQTVQcUI7O0FBK1B0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUEsRUFBQUEsMkJBclFzQix1Q0FxUU1DLEtBclFOLEVBcVFhQyxHQXJRYixFQXFRa0JDLEtBclFsQixFQXFReUI7QUFDM0MsUUFBTWxILElBQUksYUFBTWdILEtBQUssQ0FBQ3RCLE1BQU4sQ0FBYSxZQUFiLENBQU4sY0FBb0N1QixHQUFHLENBQUN2QixNQUFKLENBQVcsWUFBWCxDQUFwQyxjQUFnRXhHLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ1MsR0FBaEMsRUFBaEUsQ0FBVjtBQUNBWixJQUFBQSxpQkFBaUIsQ0FBQ2UsV0FBbEIsQ0FBOEJELElBQTlCO0FBQ0gsR0F4UXFCOztBQTBRdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0E5UXNCLHVCQThRVkQsSUE5UVUsRUE4UUo7QUFDZGQsSUFBQUEsaUJBQWlCLENBQUNLLFNBQWxCLENBQTRCVyxNQUE1QixDQUFtQ0YsSUFBbkMsRUFBeUNtSCxJQUF6QztBQUNBakksSUFBQUEsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDNkMsT0FBaEMsQ0FBd0MsS0FBeEMsRUFBK0NYLFFBQS9DLENBQXdELFNBQXhEO0FBQ0g7QUFqUnFCLENBQTFCO0FBb1JBO0FBQ0E7QUFDQTs7QUFDQW5DLENBQUMsQ0FBQ2dJLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJuSSxFQUFBQSxpQkFBaUIsQ0FBQ08sVUFBbEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNlbWFudGljTG9jYWxpemF0aW9uLCBFeHRlbnNpb25zLCBtb21lbnQsIGdsb2JhbFRyYW5zbGF0ZSwgQ0RSUGxheWVyICovXG5cbi8qKlxuICogY2FsbERldGFpbFJlY29yZHMgbW9kdWxlLlxuICogQG1vZHVsZSBjYWxsRGV0YWlsUmVjb3Jkc1xuICovXG5jb25zdCBjYWxsRGV0YWlsUmVjb3JkcyA9IHtcbiAgICAvKipcbiAgICAgKiBUaGUgY2FsbCBkZXRhaWwgcmVjb3JkcyB0YWJsZSBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNkclRhYmxlOiAkKCcjY2RyLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbHNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkYXRlUmFuZ2VTZWxlY3RvcjogJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRhIHRhYmxlIG9iamVjdC5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGRhdGFUYWJsZToge30sXG5cbiAgICAvKipcbiAgICAgKiBBbiBhcnJheSBvZiBwbGF5ZXJzLlxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICBwbGF5ZXJzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjYWxsIGRldGFpbCByZWNvcmRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcigpO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzXG4gICAgICAgICAgICAgICAgfHwgZS5rZXlDb2RlID09PSA4XG4gICAgICAgICAgICAgICAgfHwgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gYCR7Y2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLnZhbCgpfSAke2NhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCl9YDtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmRhdGFUYWJsZSh7XG4gICAgICAgICAgICBzZWFyY2g6IHtcbiAgICAgICAgICAgICAgICBzZWFyY2g6IGAke2NhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci52YWwoKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAgICAgICAgeyBkZWZhdWx0Q29udGVudDogXCItXCIsICB0YXJnZXRzOiBcIl9hbGxcIn0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1jYWxsLWRldGFpbC1yZWNvcmRzL2dldE5ld1JlY29yZHNgLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICAvL3Njcm9sbFk6ICQod2luZG93KS5oZWlnaHQoKSAtIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vZmZzZXQoKS50b3AtMTUwLFxuICAgICAgICAgICAgc0RvbTogJ3J0aXAnLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBjYWxsRGV0YWlsUmVjb3Jkcy5jYWxjdWxhdGVQYWdlTGVuZ3RoKCksXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyB0aGUgQ0RSIHJvdy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJvdyAtIFRoZSByb3cgZWxlbWVudC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuRFRfUm93Q2xhc3MgPT09ICdkZXRhaWxlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBjYXJldCBkb3duXCI+PC9pPicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDEpLmh0bWwoZGF0YVswXSk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDIpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGRhdGFbMV0pXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoZGF0YVsyXSlcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCduZWVkLXVwZGF0ZScpO1xuXG4gICAgICAgICAgICAgICAgbGV0IGR1cmF0aW9uID0gZGF0YVszXTtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5pZHMgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uICs9ICc8aSBkYXRhLWlkcz1cIicgKyBkYXRhLmlkcyArICdcIiBjbGFzcz1cImZpbGUgYWx0ZXJuYXRlIG91dGxpbmUgaWNvblwiPic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSg0KS5odG1sKGR1cmF0aW9uKS5hZGRDbGFzcygncmlnaHQgYWxpZ25lZCcpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEcmF3IGV2ZW50IC0gZmlyZWQgb25jZSB0aGUgdGFibGUgaGFzIGNvbXBsZXRlZCBhIGRyYXcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLnVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLkRhdGFUYWJsZSgpO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICd0ci5uZWdhdGl2ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgaWRzID0gJChlLnRhcmdldCkuYXR0cignZGF0YS1pZHMnKTtcbiAgICAgICAgICAgIGlmIChpZHMgIT09IHVuZGVmaW5lZCAmJiBpZHMgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zeXN0ZW0tZGlhZ25vc3RpYy9pbmRleC8/ZmlsZW5hbWU9YXN0ZXJpc2svdmVyYm9zZSZmaWx0ZXI9JHtpZHN9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIGZvciBvcGVuaW5nIGFuZCBjbG9zaW5nIGRldGFpbHNcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICd0ci5kZXRhaWxlZCcsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgaWRzID0gJChlLnRhcmdldCkuYXR0cignZGF0YS1pZHMnKTtcbiAgICAgICAgICAgIGlmIChpZHMgIT09IHVuZGVmaW5lZCAmJiBpZHMgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zeXN0ZW0tZGlhZ25vc3RpYy9pbmRleC8/ZmlsZW5hbWU9YXN0ZXJpc2svdmVyYm9zZSZmaWx0ZXI9JHtpZHN9YDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB0ciA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucm93KHRyKTtcblxuICAgICAgICAgICAgaWYgKHJvdy5jaGlsZC5pc1Nob3duKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIHJvdyBpcyBhbHJlYWR5IG9wZW4gLSBjbG9zZSBpdFxuICAgICAgICAgICAgICAgIHJvdy5jaGlsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgdHIucmVtb3ZlQ2xhc3MoJ3Nob3duJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE9wZW4gdGhpcyByb3dcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoY2FsbERldGFpbFJlY29yZHMuc2hvd1JlY29yZHMocm93LmRhdGEoKSkpLnNob3coKTtcbiAgICAgICAgICAgICAgICB0ci5hZGRDbGFzcygnc2hvd24nKTtcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoKS5maW5kKCcuZGV0YWlsLXJlY29yZC1yb3cnKS5lYWNoKChpbmRleCwgcGxheWVyUm93KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gJChwbGF5ZXJSb3cpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ0RSUGxheWVyKGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLnVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGEgc2V0IG9mIGNhbGwgcmVjb3JkcyB3aGVuIGEgcm93IGlzIGNsaWNrZWQuXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2FsbCByZWNvcmRzLlxuICAgICAqL1xuICAgIHNob3dSZWNvcmRzKGRhdGEpIHtcbiAgICAgICAgbGV0IGh0bWxQbGF5ZXIgPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBiYXNpYyB0YWJsZSBjZHItcGxheWVyXCI+PHRib2R5Pic7XG4gICAgICAgIGRhdGFbNF0uZm9yRWFjaCgocmVjb3JkLCBpKSA9PiB7XG4gICAgICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIHx8IHJlY29yZC5yZWNvcmRpbmdmaWxlID09PSBudWxsXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3cgZGlzYWJsZWRcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiXCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiXCI+PC9pPlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5zcmNfbnVtfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5kc3RfbnVtfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgcmVjb3JkRmlsZU5hbWUgPSBgQ2FsbF9yZWNvcmRfYmV0d2Vlbl8ke3JlY29yZC5zcmNfbnVtfV9hbmRfJHtyZWNvcmQuZHN0X251bX1fZnJvbV8ke2RhdGFbMF19YDtcbiAgICAgICAgICAgICAgICByZWNvcmRGaWxlTmFtZS5yZXBsYWNlKC9bXlxcd1xccyE/XS9nLCAnJyk7XG4gICAgICAgICAgICAgICAgcmVjb3JkRmlsZU5hbWUgPSBlbmNvZGVVUklDb21wb25lbnQocmVjb3JkRmlsZU5hbWUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEZpbGVVcmkgPSBlbmNvZGVVUklDb21wb25lbnQocmVjb3JkLnJlY29yZGluZ2ZpbGUpO1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gYFxuXG48dHIgY2xhc3M9XCJkZXRhaWwtcmVjb3JkLXJvd1wiIGlkPVwiJHtyZWNvcmQuaWR9XCI+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGUgcmlnaHQgYWxpZ25lZFwiPlxuICAgXHRcdDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuXHQgICBcdDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke3JlY29yZC5pZH1cIiBzcmM9XCIvcGJ4Y29yZS9hcGkvY2RyL3YyL3BsYXliYWNrP3ZpZXc9JHtyZWNvcmRGaWxlVXJpfVwiPjwvYXVkaW8+XG5cdDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwiZml2ZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiIGRhdGEtdmFsdWU9XCIke3JlY29yZC5pZH1cIj48L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPlxuICAgIFx0PGkgY2xhc3M9XCJ1aSBpY29uIGRvd25sb2FkXCIgZGF0YS12YWx1ZT1cIi9wYnhjb3JlL2FwaS9jZHIvdjIvcGxheWJhY2s/dmlldz0ke3JlY29yZEZpbGVVcml9JmRvd25sb2FkPTEmZmlsZW5hbWU9JHtyZWNvcmRGaWxlTmFtZX0ubXAzXCI+PC9pPlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5zcmNfbnVtfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5kc3RfbnVtfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaHRtbFBsYXllciArPSAnPC90Ym9keT48L3RhYmxlPic7XG4gICAgICAgIHJldHVybiBodG1sUGxheWVyO1xuICAgIH0sXG5cbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgcm93IGhlaWdodFxuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmZpbmQoJ3Rib2R5ID4gdHInKS5maXJzdCgpLm91dGVySGVpZ2h0KCk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSA0MDA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKCkge1xuICAgICAgICBjb25zdCBvcHRpb25zID0ge307XG5cbiAgICAgICAgb3B0aW9ucy5yYW5nZXMgPSB7XG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLtGBYWxfVG9kYXldOiBbbW9tZW50KCksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUu0YFhbF9ZZXN0ZXJkYXldOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ2RheXMnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ2RheXMnKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLtGBYWxfTGFzdFdlZWtdOiBbbW9tZW50KCkuc3VidHJhY3QoNiwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS7RgWFsX0xhc3QzMERheXNdOiBbbW9tZW50KCkuc3VidHJhY3QoMjksICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUu0YFhbF9UaGlzTW9udGhdOiBbbW9tZW50KCkuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuZW5kT2YoJ21vbnRoJyldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS7RgWFsX0xhc3RNb250aF06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgIH07XG4gICAgICAgIG9wdGlvbnMuYWx3YXlzU2hvd0NhbGVuZGFycyA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMuYXV0b1VwZGF0ZUlucHV0ID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5saW5rZWRDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLm1heERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgb3B0aW9ucy5sb2NhbGUgPSB7XG4gICAgICAgICAgICBmb3JtYXQ6ICdERC9NTS9ZWVlZJyxcbiAgICAgICAgICAgIHNlcGFyYXRvcjogJyAtICcsXG4gICAgICAgICAgICBhcHBseUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUu0YFhbF9BcHBseUJ0bixcbiAgICAgICAgICAgIGNhbmNlbExhYmVsOiBnbG9iYWxUcmFuc2xhdGUu0YFhbF9DYW5jZWxCdG4sXG4gICAgICAgICAgICBmcm9tTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS7RgWFsX2Zyb20sXG4gICAgICAgICAgICB0b0xhYmVsOiBnbG9iYWxUcmFuc2xhdGUu0YFhbF90byxcbiAgICAgICAgICAgIGN1c3RvbVJhbmdlTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS7RgWFsX0N1c3RvbVBlcmlvZCxcbiAgICAgICAgICAgIGRheXNPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5kYXlzLFxuICAgICAgICAgICAgbW9udGhOYW1lczogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0Lm1vbnRocyxcbiAgICAgICAgICAgIGZpcnN0RGF5OiAxLFxuICAgICAgICB9O1xuICAgICAgICBvcHRpb25zLnN0YXJ0RGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICBvcHRpb25zLmVuZERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGVyYW5nZXBpY2tlcihcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QsXG4gICAgICAgICk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgZGF0ZSByYW5nZSBzZWxlY3RvciBzZWxlY3QgZXZlbnQuXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBzdGFydCAtIFRoZSBzdGFydCBkYXRlLlxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gZW5kIC0gVGhlIGVuZCBkYXRlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYWJlbCAtIFRoZSBsYWJlbC5cbiAgICAgKi9cbiAgICBjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3Qoc3RhcnQsIGVuZCwgbGFiZWwpIHtcbiAgICAgICAgY29uc3QgdGV4dCA9IGAke3N0YXJ0LmZvcm1hdCgnREQvTU0vWVlZWScpfSAke2VuZC5mb3JtYXQoJ0REL01NL1lZWVknKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWA7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKHRleHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIHRoZSBmaWx0ZXIgdG8gdGhlIGRhdGEgdGFibGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUaGUgZmlsdGVyIHRleHQuXG4gICAgICovXG4gICAgYXBwbHlGaWx0ZXIodGV4dCkge1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIENEUiB0YWJsZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=