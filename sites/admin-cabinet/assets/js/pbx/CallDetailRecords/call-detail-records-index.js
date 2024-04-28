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

    return Math.max(Math.floor((windowHeight - headerFooterHeight) / rowHeight), 5);
  },

  /**
   * Initializes the date range selector.
   */
  initializeDateRangeSelector: function initializeDateRangeSelector() {
    var _options$ranges;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCJkYXRhVGFibGUiLCJwbGF5ZXJzIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvciIsIm9uIiwiZSIsImtleUNvZGUiLCJ2YWwiLCJsZW5ndGgiLCJ0ZXh0IiwiYXBwbHlGaWx0ZXIiLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImNvbHVtbkRlZnMiLCJkZWZhdWx0Q29udGVudCIsInRhcmdldHMiLCJhamF4IiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInR5cGUiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJwYWdlTGVuZ3RoIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImNyZWF0ZWRSb3ciLCJyb3ciLCJkYXRhIiwiRFRfUm93Q2xhc3MiLCJpbmRleE9mIiwiZXEiLCJodG1sIiwiYWRkQ2xhc3MiLCJkdXJhdGlvbiIsImlkcyIsImRyYXdDYWxsYmFjayIsIkV4dGVuc2lvbnMiLCJ1cGRhdGVQaG9uZXNSZXByZXNlbnQiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJjbG9zZXN0IiwicmVtb3ZlQ2xhc3MiLCJ0YXJnZXQiLCJhdHRyIiwidW5kZWZpbmVkIiwid2luZG93IiwibG9jYXRpb24iLCJ0ciIsImNoaWxkIiwiaXNTaG93biIsImhpZGUiLCJzaG93UmVjb3JkcyIsInNob3ciLCJmaW5kIiwiZWFjaCIsImluZGV4IiwicGxheWVyUm93IiwiaWQiLCJDRFJQbGF5ZXIiLCJodG1sUGxheWVyIiwiZm9yRWFjaCIsInJlY29yZCIsImkiLCJyZWNvcmRpbmdmaWxlIiwic3JjX251bSIsImRzdF9udW0iLCJyZWNvcmRGaWxlTmFtZSIsInJlcGxhY2UiLCJlbmNvZGVVUklDb21wb25lbnQiLCJyZWNvcmRGaWxlVXJpIiwicm93SGVpZ2h0IiwiZmlyc3QiLCJvdXRlckhlaWdodCIsIndpbmRvd0hlaWdodCIsImlubmVySGVpZ2h0IiwiaGVhZGVyRm9vdGVySGVpZ2h0IiwiTWF0aCIsIm1heCIsImZsb29yIiwib3B0aW9ucyIsInJhbmdlcyIsImdsb2JhbFRyYW5zbGF0ZSIsImNhbF9Ub2RheSIsIm1vbWVudCIsImNhbF9ZZXN0ZXJkYXkiLCJzdWJ0cmFjdCIsImNhbF9MYXN0V2VlayIsImNhbF9MYXN0MzBEYXlzIiwiY2FsX1RoaXNNb250aCIsInN0YXJ0T2YiLCJlbmRPZiIsImNhbF9MYXN0TW9udGgiLCJhbHdheXNTaG93Q2FsZW5kYXJzIiwiYXV0b1VwZGF0ZUlucHV0IiwibGlua2VkQ2FsZW5kYXJzIiwibWF4RGF0ZSIsImxvY2FsZSIsImZvcm1hdCIsInNlcGFyYXRvciIsImFwcGx5TGFiZWwiLCJjYWxfQXBwbHlCdG4iLCJjYW5jZWxMYWJlbCIsImNhbF9DYW5jZWxCdG4iLCJmcm9tTGFiZWwiLCJjYWxfZnJvbSIsInRvTGFiZWwiLCJjYWxfdG8iLCJjdXN0b21SYW5nZUxhYmVsIiwiY2FsX0N1c3RvbVBlcmlvZCIsImRheXNPZldlZWsiLCJjYWxlbmRhclRleHQiLCJkYXlzIiwibW9udGhOYW1lcyIsIm1vbnRocyIsImZpcnN0RGF5Iiwic3RhcnREYXRlIiwiZW5kRGF0ZSIsImRhdGVyYW5nZXBpY2tlciIsImNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdCIsInN0YXJ0IiwiZW5kIiwibGFiZWwiLCJkcmF3IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FB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QUNBNUYsSUFBQUEsaUJBQWlCLENBQUNJLGtCQUFsQixDQUFxQzBILGVBQXJDLENBQ0l0QyxPQURKLEVBRUl4RixpQkFBaUIsQ0FBQytILDJCQUZ0QjtBQUlILEdBNVBxQjs7QUErUHRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQSxFQUFBQSwyQkFyUXNCLHVDQXFRTUMsS0FyUU4sRUFxUWFDLEdBclFiLEVBcVFrQkMsS0FyUWxCLEVBcVF5QjtBQUMzQyxRQUFNcEgsSUFBSSxhQUFNa0gsS0FBSyxDQUFDdEIsTUFBTixDQUFhLFlBQWIsQ0FBTixjQUFvQ3VCLEdBQUcsQ0FBQ3ZCLE1BQUosQ0FBVyxZQUFYLENBQXBDLGNBQWdFMUcsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDUyxHQUFoQyxFQUFoRSxDQUFWO0FBQ0FaLElBQUFBLGlCQUFpQixDQUFDZSxXQUFsQixDQUE4QkQsSUFBOUI7QUFDSCxHQXhRcUI7O0FBMFF0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxXQTlRc0IsdUJBOFFWRCxJQTlRVSxFQThRSjtBQUNkZCxJQUFBQSxpQkFBaUIsQ0FBQ0ssU0FBbEIsQ0FBNEJXLE1BQTVCLENBQW1DRixJQUFuQyxFQUF5Q3FILElBQXpDO0FBQ0FuSSxJQUFBQSxpQkFBaUIsQ0FBQ0csYUFBbEIsQ0FBZ0M4QyxPQUFoQyxDQUF3QyxLQUF4QyxFQUErQ1gsUUFBL0MsQ0FBd0QsU0FBeEQ7QUFDSDtBQWpScUIsQ0FBMUI7QUFvUkE7QUFDQTtBQUNBOztBQUNBcEMsQ0FBQyxDQUFDa0ksUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnJJLEVBQUFBLGlCQUFpQixDQUFDTyxVQUFsQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEV4dGVuc2lvbnMsIG1vbWVudCwgZ2xvYmFsVHJhbnNsYXRlLCBDRFJQbGF5ZXIgKi9cblxuLyoqXG4gKiBjYWxsRGV0YWlsUmVjb3JkcyBtb2R1bGUuXG4gKiBAbW9kdWxlIGNhbGxEZXRhaWxSZWNvcmRzXG4gKi9cbmNvbnN0IGNhbGxEZXRhaWxSZWNvcmRzID0ge1xuICAgIC8qKlxuICAgICAqIFRoZSBjYWxsIGRldGFpbCByZWNvcmRzIHRhYmxlIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2RyVGFibGU6ICQoJyNjZHItdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsc2VhcmNoJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0ZSByYW5nZSBzZWxlY3RvciBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRhdGVSYW5nZVNlbGVjdG9yOiAkKCcjZGF0ZS1yYW5nZS1zZWxlY3RvcicpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdGFibGUgb2JqZWN0LlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEFuIGFycmF5IG9mIHBsYXllcnMuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHBsYXllcnM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGNhbGwgZGV0YWlsIHJlY29yZHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKCk7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5vbigna2V5dXAnLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTNcbiAgICAgICAgICAgICAgICB8fCBlLmtleUNvZGUgPT09IDhcbiAgICAgICAgICAgICAgICB8fCBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBgJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IudmFsKCl9ICR7Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKX1gO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKHRleHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZGF0YVRhYmxlKHtcbiAgICAgICAgICAgIHNlYXJjaDoge1xuICAgICAgICAgICAgICAgIHNlYXJjaDogYCR7Y2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLnZhbCgpfSAke2NhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCl9YCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXJ2ZXJTaWRlOiB0cnVlLFxuICAgICAgICAgICAgcHJvY2Vzc2luZzogdHJ1ZSxcbiAgICAgICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICAgICAgICB7IGRlZmF1bHRDb250ZW50OiBcIi1cIiwgIHRhcmdldHM6IFwiX2FsbFwifSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBhamF4OiB7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWNhbGwtZGV0YWlsLXJlY29yZHMvZ2V0TmV3UmVjb3Jkc2AsXG4gICAgICAgICAgICAgICAgdHlwZTogJ1BPU1QnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIC8vc2Nyb2xsWTogJCh3aW5kb3cpLmhlaWdodCgpIC0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9mZnNldCgpLnRvcC0xNTAsXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IGNhbGxEZXRhaWxSZWNvcmRzLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIHRoZSBDRFIgcm93LlxuICAgICAgICAgICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5EVF9Sb3dDbGFzcy5pbmRleE9mKFwiZGV0YWlsZWRcIikgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnPGkgY2xhc3M9XCJpY29uIGNhcmV0IGRvd25cIj48L2k+Jyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMSkuaHRtbChkYXRhWzBdKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMilcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoZGF0YVsxXSlcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgzKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChkYXRhWzJdKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG5cbiAgICAgICAgICAgICAgICBsZXQgZHVyYXRpb24gPSBkYXRhWzNdO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLmlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb24gKz0gJzxpIGRhdGEtaWRzPVwiJyArIGRhdGEuaWRzICsgJ1wiIGNsYXNzPVwiZmlsZSBhbHRlcm5hdGUgb3V0bGluZSBpY29uXCI+JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDQpLmh0bWwoZHVyYXRpb24pLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICBvcmRlcmluZzogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ3RyLm5lZ2F0aXZlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBpZHMgPSAkKGUudGFyZ2V0KS5hdHRyKCdkYXRhLWlkcycpO1xuICAgICAgICAgICAgaWYgKGlkcyAhPT0gdW5kZWZpbmVkICYmIGlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXN5c3RlbS1kaWFnbm9zdGljL2luZGV4Lz9maWxlbmFtZT1hc3Rlcmlzay92ZXJib3NlJmZpbHRlcj0ke2lkc31gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgZm9yIG9wZW5pbmcgYW5kIGNsb3NpbmcgZGV0YWlsc1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ3RyLmRldGFpbGVkJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBpZHMgPSAkKGUudGFyZ2V0KS5hdHRyKCdkYXRhLWlkcycpO1xuICAgICAgICAgICAgaWYgKGlkcyAhPT0gdW5kZWZpbmVkICYmIGlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXN5c3RlbS1kaWFnbm9zdGljL2luZGV4Lz9maWxlbmFtZT1hc3Rlcmlzay92ZXJib3NlJmZpbHRlcj0ke2lkc31gO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHRyID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5yb3codHIpO1xuXG4gICAgICAgICAgICBpZiAocm93LmNoaWxkLmlzU2hvd24oKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgcm93IGlzIGFscmVhZHkgb3BlbiAtIGNsb3NlIGl0XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB0ci5yZW1vdmVDbGFzcygnc2hvd24nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gT3BlbiB0aGlzIHJvd1xuICAgICAgICAgICAgICAgIHJvdy5jaGlsZChjYWxsRGV0YWlsUmVjb3Jkcy5zaG93UmVjb3Jkcyhyb3cuZGF0YSgpKSkuc2hvdygpO1xuICAgICAgICAgICAgICAgIHRyLmFkZENsYXNzKCdzaG93bicpO1xuICAgICAgICAgICAgICAgIHJvdy5jaGlsZCgpLmZpbmQoJy5kZXRhaWwtcmVjb3JkLXJvdycpLmVhY2goKGluZGV4LCBwbGF5ZXJSb3cpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWQgPSAkKHBsYXllclJvdykuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDRFJQbGF5ZXIoaWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYSBzZXQgb2YgY2FsbCByZWNvcmRzIHdoZW4gYSByb3cgaXMgY2xpY2tlZC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjYWxsIHJlY29yZHMuXG4gICAgICovXG4gICAgc2hvd1JlY29yZHMoZGF0YSkge1xuICAgICAgICBsZXQgaHRtbFBsYXllciA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGJhc2ljIHRhYmxlIGNkci1wbGF5ZXJcIj48dGJvZHk+JztcbiAgICAgICAgZGF0YVs0XS5mb3JFYWNoKChyZWNvcmQsIGkpID0+IHtcbiAgICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSAnPHRkPjx0cj48L3RyPjwvdGQ+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IG51bGxcbiAgICAgICAgICAgICAgICB8fCByZWNvcmQucmVjb3JkaW5nZmlsZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gYFxuXG48dHIgY2xhc3M9XCJkZXRhaWwtcmVjb3JkLXJvdyBkaXNhYmxlZFwiIGlkPVwiJHtyZWNvcmQuaWR9XCI+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGUgcmlnaHQgYWxpZ25lZFwiPlxuICAgXHRcdDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuXHQgICBcdDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke3JlY29yZC5pZH1cIiBzcmM9XCJcIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxpIGNsYXNzPVwidWkgaWNvbiBkb3dubG9hZFwiIGRhdGEtdmFsdWU9XCJcIj48L2k+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLnNyY19udW19PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGUgY2VudGVyIGFsaWduZWRcIj48aSBjbGFzcz1cImljb24gZXhjaGFuZ2VcIj48L2k+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwibGVmdCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLmRzdF9udW19PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCByZWNvcmRGaWxlTmFtZSA9IGBDYWxsX3JlY29yZF9iZXR3ZWVuXyR7cmVjb3JkLnNyY19udW19X2FuZF8ke3JlY29yZC5kc3RfbnVtfV9mcm9tXyR7ZGF0YVswXX1gO1xuICAgICAgICAgICAgICAgIHJlY29yZEZpbGVOYW1lLnJlcGxhY2UoL1teXFx3XFxzIT9dL2csICcnKTtcbiAgICAgICAgICAgICAgICByZWNvcmRGaWxlTmFtZSA9IGVuY29kZVVSSUNvbXBvbmVudChyZWNvcmRGaWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkRmlsZVVyaSA9IGVuY29kZVVSSUNvbXBvbmVudChyZWNvcmQucmVjb3JkaW5nZmlsZSk7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93XCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIi9wYnhjb3JlL2FwaS9jZHIvdjIvcGxheWJhY2s/dmlldz0ke3JlY29yZEZpbGVVcml9XCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiL3BieGNvcmUvYXBpL2Nkci92Mi9wbGF5YmFjaz92aWV3PSR7cmVjb3JkRmlsZVVyaX0mZG93bmxvYWQ9MSZmaWxlbmFtZT0ke3JlY29yZEZpbGVOYW1lfS5tcDNcIj48L2k+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLnNyY19udW19PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGUgY2VudGVyIGFsaWduZWRcIj48aSBjbGFzcz1cImljb24gZXhjaGFuZ2VcIj48L2k+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwibGVmdCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLmRzdF9udW19PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBodG1sUGxheWVyICs9ICc8L3Rib2R5PjwvdGFibGU+JztcbiAgICAgICAgcmV0dXJuIGh0bWxQbGF5ZXI7XG4gICAgfSxcblxuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZmluZCgndGJvZHkgPiB0cicpLmZpcnN0KCkub3V0ZXJIZWlnaHQoKTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDQwMDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDUpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKCkge1xuICAgICAgICBjb25zdCBvcHRpb25zID0ge307XG5cbiAgICAgICAgb3B0aW9ucy5yYW5nZXMgPSB7XG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9Ub2RheV06IFttb21lbnQoKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfWWVzdGVyZGF5XTogW21vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyksIG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdFdlZWtdOiBbbW9tZW50KCkuc3VidHJhY3QoNiwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdDMwRGF5c106IFttb21lbnQoKS5zdWJ0cmFjdCgyOSwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVGhpc01vbnRoXTogW21vbWVudCgpLnN0YXJ0T2YoJ21vbnRoJyksIG1vbWVudCgpLmVuZE9mKCdtb250aCcpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RNb250aF06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgIH07XG4gICAgICAgIG9wdGlvbnMuYWx3YXlzU2hvd0NhbGVuZGFycyA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMuYXV0b1VwZGF0ZUlucHV0ID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5saW5rZWRDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLm1heERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgb3B0aW9ucy5sb2NhbGUgPSB7XG4gICAgICAgICAgICBmb3JtYXQ6ICdERC9NTS9ZWVlZJyxcbiAgICAgICAgICAgIHNlcGFyYXRvcjogJyAtICcsXG4gICAgICAgICAgICBhcHBseUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0FwcGx5QnRuLFxuICAgICAgICAgICAgY2FuY2VsTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQ2FuY2VsQnRuLFxuICAgICAgICAgICAgZnJvbUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX2Zyb20sXG4gICAgICAgICAgICB0b0xhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX3RvLFxuICAgICAgICAgICAgY3VzdG9tUmFuZ2VMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9DdXN0b21QZXJpb2QsXG4gICAgICAgICAgICBkYXlzT2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQuZGF5cyxcbiAgICAgICAgICAgIG1vbnRoTmFtZXM6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5tb250aHMsXG4gICAgICAgICAgICBmaXJzdERheTogMSxcbiAgICAgICAgfTtcbiAgICAgICAgb3B0aW9ucy5zdGFydERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgb3B0aW9ucy5lbmREYXRlID0gbW9tZW50KCk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRlcmFuZ2VwaWNrZXIoXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0LFxuICAgICAgICApO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3Igc2VsZWN0IGV2ZW50LlxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gc3RhcnQgLSBUaGUgc3RhcnQgZGF0ZS5cbiAgICAgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IGVuZCAtIFRoZSBlbmQgZGF0ZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFiZWwgLSBUaGUgbGFiZWwuXG4gICAgICovXG4gICAgY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0KHN0YXJ0LCBlbmQsIGxhYmVsKSB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBgJHtzdGFydC5mb3JtYXQoJ0REL01NL1lZWVknKX0gJHtlbmQuZm9ybWF0KCdERC9NTS9ZWVlZJyl9ICR7Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKX1gO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgZmlsdGVyIHRvIHRoZSBkYXRhIHRhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIGZpbHRlciB0ZXh0LlxuICAgICAqL1xuICAgIGFwcGx5RmlsdGVyKHRleHQpIHtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBDRFIgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19