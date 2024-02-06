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

    return Math.floor((windowHeight - headerFooterHeight) / rowHeight);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCJkYXRhVGFibGUiLCJwbGF5ZXJzIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvciIsIm9uIiwiZSIsImtleUNvZGUiLCJ2YWwiLCJsZW5ndGgiLCJ0ZXh0IiwiYXBwbHlGaWx0ZXIiLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImNvbHVtbkRlZnMiLCJkZWZhdWx0Q29udGVudCIsInRhcmdldHMiLCJhamF4IiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInR5cGUiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJwYWdlTGVuZ3RoIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImNyZWF0ZWRSb3ciLCJyb3ciLCJkYXRhIiwiRFRfUm93Q2xhc3MiLCJpbmRleE9mIiwiZXEiLCJodG1sIiwiYWRkQ2xhc3MiLCJkdXJhdGlvbiIsImlkcyIsImRyYXdDYWxsYmFjayIsIkV4dGVuc2lvbnMiLCJ1cGRhdGVQaG9uZXNSZXByZXNlbnQiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJjbG9zZXN0IiwicmVtb3ZlQ2xhc3MiLCJ0YXJnZXQiLCJhdHRyIiwidW5kZWZpbmVkIiwid2luZG93IiwibG9jYXRpb24iLCJ0ciIsImNoaWxkIiwiaXNTaG93biIsImhpZGUiLCJzaG93UmVjb3JkcyIsInNob3ciLCJmaW5kIiwiZWFjaCIsImluZGV4IiwicGxheWVyUm93IiwiaWQiLCJDRFJQbGF5ZXIiLCJodG1sUGxheWVyIiwiZm9yRWFjaCIsInJlY29yZCIsImkiLCJyZWNvcmRpbmdmaWxlIiwic3JjX251bSIsImRzdF9udW0iLCJyZWNvcmRGaWxlTmFtZSIsInJlcGxhY2UiLCJlbmNvZGVVUklDb21wb25lbnQiLCJyZWNvcmRGaWxlVXJpIiwicm93SGVpZ2h0IiwiZmlyc3QiLCJvdXRlckhlaWdodCIsIndpbmRvd0hlaWdodCIsImlubmVySGVpZ2h0IiwiaGVhZGVyRm9vdGVySGVpZ2h0IiwiTWF0aCIsImZsb29yIiwib3B0aW9ucyIsInJhbmdlcyIsImdsb2JhbFRyYW5zbGF0ZSIsImNhbF9Ub2RheSIsIm1vbWVudCIsImNhbF9ZZXN0ZXJkYXkiLCJzdWJ0cmFjdCIsImNhbF9MYXN0V2VlayIsImNhbF9MYXN0MzBEYXlzIiwiY2FsX1RoaXNNb250aCIsInN0YXJ0T2YiLCJlbmRPZiIsImNhbF9MYXN0TW9udGgiLCJhbHdheXNTaG93Q2FsZW5kYXJzIiwiYXV0b1VwZGF0ZUlucHV0IiwibGlua2VkQ2FsZW5kYXJzIiwibWF4RGF0ZSIsImxvY2FsZSIsImZvcm1hdCIsInNlcGFyYXRvciIsImFwcGx5TGFiZWwiLCLRgWFsX0FwcGx5QnRuIiwiY2FuY2VsTGFiZWwiLCLRgWFsX0NhbmNlbEJ0biIsImZyb21MYWJlbCIsItGBYWxfZnJvbSIsInRvTGFiZWwiLCLRgWFsX3RvIiwiY3VzdG9tUmFuZ2VMYWJlbCIsItGBYWxfQ3VzdG9tUGVyaW9kIiwiZGF5c09mV2VlayIsImNhbGVuZGFyVGV4dCIsImRheXMiLCJtb250aE5hbWVzIiwibW9udGhzIiwiZmlyc3REYXkiLCJzdGFydERhdGUiLCJlbmREYXRlIiwiZGF0ZXJhbmdlcGlja2VyIiwiY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0Iiwic3RhcnQiLCJlbmQiLCJsYWJlbCIsImRyYXciLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFF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ZUFBckMsQ0FDSXRDLE9BREosRUFFSXZGLGlCQUFpQixDQUFDOEgsMkJBRnRCO0FBSUgsR0E1UHFCOztBQStQdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lBLEVBQUFBLDJCQXJRc0IsdUNBcVFNQyxLQXJRTixFQXFRYUMsR0FyUWIsRUFxUWtCQyxLQXJRbEIsRUFxUXlCO0FBQzNDLFFBQU1uSCxJQUFJLGFBQU1pSCxLQUFLLENBQUN0QixNQUFOLENBQWEsWUFBYixDQUFOLGNBQW9DdUIsR0FBRyxDQUFDdkIsTUFBSixDQUFXLFlBQVgsQ0FBcEMsY0FBZ0V6RyxpQkFBaUIsQ0FBQ0csYUFBbEIsQ0FBZ0NTLEdBQWhDLEVBQWhFLENBQVY7QUFDQVosSUFBQUEsaUJBQWlCLENBQUNlLFdBQWxCLENBQThCRCxJQUE5QjtBQUNILEdBeFFxQjs7QUEwUXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFdBOVFzQix1QkE4UVZELElBOVFVLEVBOFFKO0FBQ2RkLElBQUFBLGlCQUFpQixDQUFDSyxTQUFsQixDQUE0QlcsTUFBNUIsQ0FBbUNGLElBQW5DLEVBQXlDb0gsSUFBekM7QUFDQWxJLElBQUFBLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQzhDLE9BQWhDLENBQXdDLEtBQXhDLEVBQStDWCxRQUEvQyxDQUF3RCxTQUF4RDtBQUNIO0FBalJxQixDQUExQjtBQW9SQTtBQUNBO0FBQ0E7O0FBQ0FwQyxDQUFDLENBQUNpSSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCcEksRUFBQUEsaUJBQWlCLENBQUNPLFVBQWxCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRXh0ZW5zaW9ucywgbW9tZW50LCBnbG9iYWxUcmFuc2xhdGUsIENEUlBsYXllciAqL1xuXG4vKipcbiAqIGNhbGxEZXRhaWxSZWNvcmRzIG1vZHVsZS5cbiAqIEBtb2R1bGUgY2FsbERldGFpbFJlY29yZHNcbiAqL1xuY29uc3QgY2FsbERldGFpbFJlY29yZHMgPSB7XG4gICAgLyoqXG4gICAgICogVGhlIGNhbGwgZGV0YWlsIHJlY29yZHMgdGFibGUgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjZHJUYWJsZTogJCgnI2Nkci10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRnbG9iYWxTZWFyY2g6ICQoJyNnbG9iYWxzZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGF0ZVJhbmdlU2VsZWN0b3I6ICQoJyNkYXRlLXJhbmdlLXNlbGVjdG9yJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQW4gYXJyYXkgb2YgcGxheWVycy5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgcGxheWVyczogW10sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgY2FsbCBkZXRhaWwgcmVjb3Jkcy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IoKTtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxM1xuICAgICAgICAgICAgICAgIHx8IGUua2V5Q29kZSA9PT0gOFxuICAgICAgICAgICAgICAgIHx8IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGAke2NhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci52YWwoKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWA7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIodGV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5kYXRhVGFibGUoe1xuICAgICAgICAgICAgc2VhcmNoOiB7XG4gICAgICAgICAgICAgICAgc2VhcmNoOiBgJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IudmFsKCl9ICR7Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKX1gLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiB0cnVlLFxuICAgICAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgICAgICAgIHsgZGVmYXVsdENvbnRlbnQ6IFwiLVwiLCAgdGFyZ2V0czogXCJfYWxsXCJ9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1kZXRhaWwtcmVjb3Jkcy9nZXROZXdSZWNvcmRzYCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnUE9TVCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxuICAgICAgICAgICAgLy9zY3JvbGxZOiAkKHdpbmRvdykuaGVpZ2h0KCkgLSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub2Zmc2V0KCkudG9wLTE1MCxcbiAgICAgICAgICAgIHNEb206ICdydGlwJyxcbiAgICAgICAgICAgIGRlZmVyUmVuZGVyOiB0cnVlLFxuICAgICAgICAgICAgcGFnZUxlbmd0aDogY2FsbERldGFpbFJlY29yZHMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgdGhlIENEUiByb3cuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSByb3cgLSBUaGUgcm93IGVsZW1lbnQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjcmVhdGVkUm93KHJvdywgZGF0YSkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLkRUX1Jvd0NsYXNzLmluZGV4T2YoXCJkZXRhaWxlZFwiKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCc8aSBjbGFzcz1cImljb24gY2FyZXQgZG93blwiPjwvaT4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgxKS5odG1sKGRhdGFbMF0pO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgyKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChkYXRhWzFdKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDMpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGRhdGFbMl0pXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnbmVlZC11cGRhdGUnKTtcblxuICAgICAgICAgICAgICAgIGxldCBkdXJhdGlvbiA9IGRhdGFbM107XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiArPSAnPGkgZGF0YS1pZHM9XCInICsgZGF0YS5pZHMgKyAnXCIgY2xhc3M9XCJmaWxlIGFsdGVybmF0ZSBvdXRsaW5lIGljb25cIj4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoNCkuaHRtbChkdXJhdGlvbikuYWRkQ2xhc3MoJ3JpZ2h0IGFsaWduZWQnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRHJhdyBldmVudCAtIGZpcmVkIG9uY2UgdGhlIHRhYmxlIGhhcyBjb21wbGV0ZWQgYSBkcmF3LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIG9yZGVyaW5nOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZSA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5EYXRhVGFibGUoKTtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAndHIubmVnYXRpdmUnLCAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGlkcyA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtaWRzJyk7XG4gICAgICAgICAgICBpZiAoaWRzICE9PSB1bmRlZmluZWQgJiYgaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c3lzdGVtLWRpYWdub3N0aWMvaW5kZXgvP2ZpbGVuYW1lPWFzdGVyaXNrL3ZlcmJvc2UmZmlsdGVyPSR7aWRzfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3Igb3BlbmluZyBhbmQgY2xvc2luZyBkZXRhaWxzXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAndHIuZGV0YWlsZWQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGlkcyA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtaWRzJyk7XG4gICAgICAgICAgICBpZiAoaWRzICE9PSB1bmRlZmluZWQgJiYgaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c3lzdGVtLWRpYWdub3N0aWMvaW5kZXgvP2ZpbGVuYW1lPWFzdGVyaXNrL3ZlcmJvc2UmZmlsdGVyPSR7aWRzfWA7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdHIgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnJvdyh0cik7XG5cbiAgICAgICAgICAgIGlmIChyb3cuY2hpbGQuaXNTaG93bigpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyByb3cgaXMgYWxyZWFkeSBvcGVuIC0gY2xvc2UgaXRcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIHRyLnJlbW92ZUNsYXNzKCdzaG93bicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBPcGVuIHRoaXMgcm93XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkKGNhbGxEZXRhaWxSZWNvcmRzLnNob3dSZWNvcmRzKHJvdy5kYXRhKCkpKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgdHIuYWRkQ2xhc3MoJ3Nob3duJyk7XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkKCkuZmluZCgnLmRldGFpbC1yZWNvcmQtcm93JykuZWFjaCgoaW5kZXgsIHBsYXllclJvdykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZCA9ICQocGxheWVyUm93KS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IENEUlBsYXllcihpZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhIHNldCBvZiBjYWxsIHJlY29yZHMgd2hlbiBhIHJvdyBpcyBjbGlja2VkLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNhbGwgcmVjb3Jkcy5cbiAgICAgKi9cbiAgICBzaG93UmVjb3JkcyhkYXRhKSB7XG4gICAgICAgIGxldCBodG1sUGxheWVyID0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgYmFzaWMgdGFibGUgY2RyLXBsYXllclwiPjx0Ym9keT4nO1xuICAgICAgICBkYXRhWzRdLmZvckVhY2goKHJlY29yZCwgaSkgPT4ge1xuICAgICAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSAnPHRkPjx0cj48L3RyPjwvdGQ+JztcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlY29yZC5yZWNvcmRpbmdmaWxlID09PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICB8fCByZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gbnVsbFxuICAgICAgICAgICAgICAgIHx8IHJlY29yZC5yZWNvcmRpbmdmaWxlLmxlbmd0aCA9PT0gMCkge1xuXG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93IGRpc2FibGVkXCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIlwiPjwvYXVkaW8+XG5cdDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwiZml2ZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiIGRhdGEtdmFsdWU9XCIke3JlY29yZC5pZH1cIj48L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPlxuICAgIFx0PGkgY2xhc3M9XCJ1aSBpY29uIGRvd25sb2FkXCIgZGF0YS12YWx1ZT1cIlwiPjwvaT5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IHJlY29yZEZpbGVOYW1lID0gYENhbGxfcmVjb3JkX2JldHdlZW5fJHtyZWNvcmQuc3JjX251bX1fYW5kXyR7cmVjb3JkLmRzdF9udW19X2Zyb21fJHtkYXRhWzBdfWA7XG4gICAgICAgICAgICAgICAgcmVjb3JkRmlsZU5hbWUucmVwbGFjZSgvW15cXHdcXHMhP10vZywgJycpO1xuICAgICAgICAgICAgICAgIHJlY29yZEZpbGVOYW1lID0gZW5jb2RlVVJJQ29tcG9uZW50KHJlY29yZEZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRGaWxlVXJpID0gZW5jb2RlVVJJQ29tcG9uZW50KHJlY29yZC5yZWNvcmRpbmdmaWxlKTtcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3dcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiL3BieGNvcmUvYXBpL2Nkci92Mi9wbGF5YmFjaz92aWV3PSR7cmVjb3JkRmlsZVVyaX1cIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxpIGNsYXNzPVwidWkgaWNvbiBkb3dubG9hZFwiIGRhdGEtdmFsdWU9XCIvcGJ4Y29yZS9hcGkvY2RyL3YyL3BsYXliYWNrP3ZpZXc9JHtyZWNvcmRGaWxlVXJpfSZkb3dubG9hZD0xJmZpbGVuYW1lPSR7cmVjb3JkRmlsZU5hbWV9Lm1wM1wiPjwvaT5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGh0bWxQbGF5ZXIgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICByZXR1cm4gaHRtbFBsYXllcjtcbiAgICB9LFxuXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5maW5kKCd0Ym9keSA+IHRyJykuZmlyc3QoKS5vdXRlckhlaWdodCgpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aW5kb3cgaGVpZ2h0IGFuZCBhdmFpbGFibGUgc3BhY2UgZm9yIHRhYmxlXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgY29uc3QgaGVhZGVyRm9vdGVySGVpZ2h0ID0gNDAwOyAvLyBFc3RpbWF0ZSBoZWlnaHQgZm9yIGhlYWRlciwgZm9vdGVyLCBhbmQgb3RoZXIgZWxlbWVudHNcblxuICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHBhZ2UgbGVuZ3RoXG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBoZWFkZXJGb290ZXJIZWlnaHQpIC8gcm93SGVpZ2h0KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcigpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHt9O1xuXG4gICAgICAgIG9wdGlvbnMucmFuZ2VzID0ge1xuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVG9kYXldOiBbbW9tZW50KCksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1llc3RlcmRheV06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RXZWVrXTogW21vbWVudCgpLnN1YnRyYWN0KDYsICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3QzMERheXNdOiBbbW9tZW50KCkuc3VidHJhY3QoMjksICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1RoaXNNb250aF06IFttb21lbnQoKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9MYXN0TW9udGhdOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuZW5kT2YoJ21vbnRoJyldLFxuICAgICAgICB9O1xuICAgICAgICBvcHRpb25zLmFsd2F5c1Nob3dDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmF1dG9VcGRhdGVJbnB1dCA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMubGlua2VkQ2FsZW5kYXJzID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5tYXhEYXRlID0gbW9tZW50KCk7XG4gICAgICAgIG9wdGlvbnMubG9jYWxlID0ge1xuICAgICAgICAgICAgZm9ybWF0OiAnREQvTU0vWVlZWScsXG4gICAgICAgICAgICBzZXBhcmF0b3I6ICcgLSAnLFxuICAgICAgICAgICAgYXBwbHlMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLtGBYWxfQXBwbHlCdG4sXG4gICAgICAgICAgICBjYW5jZWxMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLtGBYWxfQ2FuY2VsQnRuLFxuICAgICAgICAgICAgZnJvbUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUu0YFhbF9mcm9tLFxuICAgICAgICAgICAgdG9MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLtGBYWxfdG8sXG4gICAgICAgICAgICBjdXN0b21SYW5nZUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUu0YFhbF9DdXN0b21QZXJpb2QsXG4gICAgICAgICAgICBkYXlzT2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQuZGF5cyxcbiAgICAgICAgICAgIG1vbnRoTmFtZXM6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5tb250aHMsXG4gICAgICAgICAgICBmaXJzdERheTogMSxcbiAgICAgICAgfTtcbiAgICAgICAgb3B0aW9ucy5zdGFydERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgb3B0aW9ucy5lbmREYXRlID0gbW9tZW50KCk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRlcmFuZ2VwaWNrZXIoXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0LFxuICAgICAgICApO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3Igc2VsZWN0IGV2ZW50LlxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gc3RhcnQgLSBUaGUgc3RhcnQgZGF0ZS5cbiAgICAgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IGVuZCAtIFRoZSBlbmQgZGF0ZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFiZWwgLSBUaGUgbGFiZWwuXG4gICAgICovXG4gICAgY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0KHN0YXJ0LCBlbmQsIGxhYmVsKSB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBgJHtzdGFydC5mb3JtYXQoJ0REL01NL1lZWVknKX0gJHtlbmQuZm9ybWF0KCdERC9NTS9ZWVlZJyl9ICR7Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKX1gO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgZmlsdGVyIHRvIHRoZSBkYXRhIHRhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIGZpbHRlciB0ZXh0LlxuICAgICAqL1xuICAgIGFwcGx5RmlsdGVyKHRleHQpIHtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBDRFIgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19