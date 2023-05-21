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
   * @type {JQuery<HTMLElement>}
   */
  $cdrTable: $('#cdr-table'),

  /**
   * The global search input element.
   * @type {JQuery<HTMLElement>}
   */
  $globalSearch: $('#globalsearch'),

  /**
   * The date range selector element.
   * @type {JQuery<HTMLElement>}
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
      ajax: {
        url: "".concat(globalRootUrl, "call-detail-records/getNewRecords"),
        type: 'POST'
      },
      paging: true,
      scrollY: $(window).height() - callDetailRecords.$cdrTable.offset().top - 420,
      // stateSave: true,
      sDom: 'rtip',
      deferRender: true,
      pageLength: 17,
      // scrollCollapse: true,
      // scroller: true,

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
        Extensions.UpdatePhonesRepresent('need-update');
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
        Extensions.UpdatePhonesRepresent('need-update');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCJkYXRhVGFibGUiLCJwbGF5ZXJzIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvciIsIm9uIiwiZSIsImtleUNvZGUiLCJ2YWwiLCJsZW5ndGgiLCJ0ZXh0IiwiYXBwbHlGaWx0ZXIiLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwidHlwZSIsInBhZ2luZyIsInNjcm9sbFkiLCJ3aW5kb3ciLCJoZWlnaHQiLCJvZmZzZXQiLCJ0b3AiLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJwYWdlTGVuZ3RoIiwiY3JlYXRlZFJvdyIsInJvdyIsImRhdGEiLCJEVF9Sb3dDbGFzcyIsImVxIiwiaHRtbCIsImFkZENsYXNzIiwiZHVyYXRpb24iLCJpZHMiLCJkcmF3Q2FsbGJhY2siLCJFeHRlbnNpb25zIiwiVXBkYXRlUGhvbmVzUmVwcmVzZW50IiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsIm9yZGVyaW5nIiwiRGF0YVRhYmxlIiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwidGFyZ2V0IiwiYXR0ciIsInVuZGVmaW5lZCIsImxvY2F0aW9uIiwidHIiLCJjaGlsZCIsImlzU2hvd24iLCJoaWRlIiwic2hvd1JlY29yZHMiLCJzaG93IiwiZmluZCIsImVhY2giLCJpbmRleCIsInBsYXllclJvdyIsImlkIiwiQ0RSUGxheWVyIiwiaHRtbFBsYXllciIsImZvckVhY2giLCJyZWNvcmQiLCJpIiwicmVjb3JkaW5nZmlsZSIsInNyY19udW0iLCJkc3RfbnVtIiwicmVjb3JkRmlsZU5hbWUiLCJyZXBsYWNlIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwicmVjb3JkRmlsZVVyaSIsIm9wdGlvbnMiLCJyYW5nZXMiLCJnbG9iYWxUcmFuc2xhdGUiLCLRgWFsX1RvZGF5IiwibW9tZW50Iiwi0YFhbF9ZZXN0ZXJkYXkiLCJzdWJ0cmFjdCIsItGBYWxfTGFzdFdlZWsiLCLRgWFsX0xhc3QzMERheXMiLCLRgWFsX1RoaXNNb250aCIsInN0YXJ0T2YiLCJlbmRPZiIsItGBYWxfTGFzdE1vbnRoIiwiYWx3YXlzU2hvd0NhbGVuZGFycyIsImF1dG9VcGRhdGVJbnB1dCIsImxpbmtlZENhbGVuZGFycyIsIm1heERhdGUiLCJsb2NhbGUiLCJmb3JtYXQiLCJzZXBhcmF0b3IiLCJhcHBseUxhYmVsIiwi0YFhbF9BcHBseUJ0biIsImNhbmNlbExhYmVsIiwi0YFhbF9DYW5jZWxCdG4iLCJmcm9tTGFiZWwiLCLRgWFsX2Zyb20iLCJ0b0xhYmVsIiwi0YFhbF90byIsImN1c3RvbVJhbmdlTGFiZWwiLCLRgWFsX0N1c3RvbVBlcmlvZCIsImRheXNPZldlZWsiLCJjYWxlbmRhclRleHQiLCJkYXlzIiwibW9udGhOYW1lcyIsIm1vbnRocyIsImZpcnN0RGF5Iiwic3RhcnREYXRlIiwiZW5kRGF0ZSIsImRhdGVyYW5nZXBpY2tlciIsImNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdCIsInN0YXJ0IiwiZW5kIiwibGFiZWwiLCJkcmF3IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxpQkFBaUIsR0FBRztBQUN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUVDLENBQUMsQ0FBQyxZQUFELENBTFU7O0FBT3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lD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QixDQUFtQ0YsSUFBbkMsRUFBeUMyRyxJQUF6QztBQUNBekgsSUFBQUEsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDOEMsT0FBaEMsQ0FBd0MsS0FBeEMsRUFBK0NYLFFBQS9DLENBQXdELFNBQXhEO0FBQ0g7QUF2UXFCLENBQTFCO0FBMFFBO0FBQ0E7QUFDQTs7QUFDQXBDLENBQUMsQ0FBQ3dILFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIzSCxFQUFBQSxpQkFBaUIsQ0FBQ08sVUFBbEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNlbWFudGljTG9jYWxpemF0aW9uLCBFeHRlbnNpb25zLCBtb21lbnQsIGdsb2JhbFRyYW5zbGF0ZSwgQ0RSUGxheWVyICovXG5cbi8qKlxuICogY2FsbERldGFpbFJlY29yZHMgbW9kdWxlLlxuICogQG1vZHVsZSBjYWxsRGV0YWlsUmVjb3Jkc1xuICovXG5jb25zdCBjYWxsRGV0YWlsUmVjb3JkcyA9IHtcbiAgICAvKipcbiAgICAgKiBUaGUgY2FsbCBkZXRhaWwgcmVjb3JkcyB0YWJsZSBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtKUXVlcnk8SFRNTEVsZW1lbnQ+fVxuICAgICAqL1xuICAgICRjZHJUYWJsZTogJCgnI2Nkci10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7SlF1ZXJ5PEhUTUxFbGVtZW50Pn1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsc2VhcmNoJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0ZSByYW5nZSBzZWxlY3RvciBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtKUXVlcnk8SFRNTEVsZW1lbnQ+fVxuICAgICAqL1xuICAgICRkYXRlUmFuZ2VTZWxlY3RvcjogJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRhIHRhYmxlIG9iamVjdC5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGRhdGFUYWJsZToge30sXG5cbiAgICAvKipcbiAgICAgKiBBbiBhcnJheSBvZiBwbGF5ZXJzLlxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICBwbGF5ZXJzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjYWxsIGRldGFpbCByZWNvcmRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcigpO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzXG4gICAgICAgICAgICAgICAgfHwgZS5rZXlDb2RlID09PSA4XG4gICAgICAgICAgICAgICAgfHwgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gYCR7Y2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLnZhbCgpfSAke2NhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCl9YDtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmRhdGFUYWJsZSh7XG4gICAgICAgICAgICBzZWFyY2g6IHtcbiAgICAgICAgICAgICAgICBzZWFyY2g6IGAke2NhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci52YWwoKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IHRydWUsXG4gICAgICAgICAgICBhamF4OiB7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWNhbGwtZGV0YWlsLXJlY29yZHMvZ2V0TmV3UmVjb3Jkc2AsXG4gICAgICAgICAgICAgICAgdHlwZTogJ1BPU1QnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIHNjcm9sbFk6ICQod2luZG93KS5oZWlnaHQoKSAtIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vZmZzZXQoKS50b3AgLSA0MjAsXG4gICAgICAgICAgICAvLyBzdGF0ZVNhdmU6IHRydWUsXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IDE3LFxuICAgICAgICAgICAgLy8gc2Nyb2xsQ29sbGFwc2U6IHRydWUsXG4gICAgICAgICAgICAvLyBzY3JvbGxlcjogdHJ1ZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIHRoZSBDRFIgcm93LlxuICAgICAgICAgICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5EVF9Sb3dDbGFzcyA9PT0gJ2RldGFpbGVkJykge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnPGkgY2xhc3M9XCJpY29uIGNhcmV0IGRvd25cIj48L2k+Jyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMSkuaHRtbChkYXRhWzBdKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMilcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoZGF0YVsxXSlcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgzKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChkYXRhWzJdKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG5cbiAgICAgICAgICAgICAgICBsZXQgZHVyYXRpb24gPSBkYXRhWzNdO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLmlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb24gKz0gJzxpIGRhdGEtaWRzPVwiJyArIGRhdGEuaWRzICsgJ1wiIGNsYXNzPVwiZmlsZSBhbHRlcm5hdGUgb3V0bGluZSBpY29uXCI+JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDQpLmh0bWwoZHVyYXRpb24pLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMuVXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICBvcmRlcmluZzogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ3RyLm5lZ2F0aXZlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBpZHMgPSAkKGUudGFyZ2V0KS5hdHRyKCdkYXRhLWlkcycpO1xuICAgICAgICAgICAgaWYgKGlkcyAhPT0gdW5kZWZpbmVkICYmIGlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXN5c3RlbS1kaWFnbm9zdGljL2luZGV4Lz9maWxlbmFtZT1hc3Rlcmlzay92ZXJib3NlJmZpbHRlcj0ke2lkc31gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgZm9yIG9wZW5pbmcgYW5kIGNsb3NpbmcgZGV0YWlsc1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ3RyLmRldGFpbGVkJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBpZHMgPSAkKGUudGFyZ2V0KS5hdHRyKCdkYXRhLWlkcycpO1xuICAgICAgICAgICAgaWYgKGlkcyAhPT0gdW5kZWZpbmVkICYmIGlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXN5c3RlbS1kaWFnbm9zdGljL2luZGV4Lz9maWxlbmFtZT1hc3Rlcmlzay92ZXJib3NlJmZpbHRlcj0ke2lkc31gO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHRyID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5yb3codHIpO1xuXG4gICAgICAgICAgICBpZiAocm93LmNoaWxkLmlzU2hvd24oKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgcm93IGlzIGFscmVhZHkgb3BlbiAtIGNsb3NlIGl0XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB0ci5yZW1vdmVDbGFzcygnc2hvd24nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gT3BlbiB0aGlzIHJvd1xuICAgICAgICAgICAgICAgIHJvdy5jaGlsZChjYWxsRGV0YWlsUmVjb3Jkcy5zaG93UmVjb3Jkcyhyb3cuZGF0YSgpKSkuc2hvdygpO1xuICAgICAgICAgICAgICAgIHRyLmFkZENsYXNzKCdzaG93bicpO1xuICAgICAgICAgICAgICAgIHJvdy5jaGlsZCgpLmZpbmQoJy5kZXRhaWwtcmVjb3JkLXJvdycpLmVhY2goKGluZGV4LCBwbGF5ZXJSb3cpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWQgPSAkKHBsYXllclJvdykuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDRFJQbGF5ZXIoaWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMuVXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYSBzZXQgb2YgY2FsbCByZWNvcmRzIHdoZW4gYSByb3cgaXMgY2xpY2tlZC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjYWxsIHJlY29yZHMuXG4gICAgICovXG4gICAgc2hvd1JlY29yZHMoZGF0YSkge1xuICAgICAgICBsZXQgaHRtbFBsYXllciA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGJhc2ljIHRhYmxlIGNkci1wbGF5ZXJcIj48dGJvZHk+JztcbiAgICAgICAgZGF0YVs0XS5mb3JFYWNoKChyZWNvcmQsIGkpID0+IHtcbiAgICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSAnPHRkPjx0cj48L3RyPjwvdGQ+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IG51bGxcbiAgICAgICAgICAgICAgICB8fCByZWNvcmQucmVjb3JkaW5nZmlsZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gYFxuXG48dHIgY2xhc3M9XCJkZXRhaWwtcmVjb3JkLXJvdyBkaXNhYmxlZFwiIGlkPVwiJHtyZWNvcmQuaWR9XCI+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGUgcmlnaHQgYWxpZ25lZFwiPlxuICAgXHRcdDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuXHQgICBcdDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke3JlY29yZC5pZH1cIiBzcmM9XCJcIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxpIGNsYXNzPVwidWkgaWNvbiBkb3dubG9hZFwiIGRhdGEtdmFsdWU9XCJcIj48L2k+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLnNyY19udW19PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGUgY2VudGVyIGFsaWduZWRcIj48aSBjbGFzcz1cImljb24gZXhjaGFuZ2VcIj48L2k+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwibGVmdCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLmRzdF9udW19PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCByZWNvcmRGaWxlTmFtZSA9IGBDYWxsX3JlY29yZF9iZXR3ZWVuXyR7cmVjb3JkLnNyY19udW19X2FuZF8ke3JlY29yZC5kc3RfbnVtfV9mcm9tXyR7ZGF0YVswXX1gO1xuICAgICAgICAgICAgICAgIHJlY29yZEZpbGVOYW1lLnJlcGxhY2UoL1teXFx3XFxzIT9dL2csICcnKTtcbiAgICAgICAgICAgICAgICByZWNvcmRGaWxlTmFtZSA9IGVuY29kZVVSSUNvbXBvbmVudChyZWNvcmRGaWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkRmlsZVVyaSA9IGVuY29kZVVSSUNvbXBvbmVudChyZWNvcmQucmVjb3JkaW5nZmlsZSk7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93XCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIi9wYnhjb3JlL2FwaS9jZHIvdjIvcGxheWJhY2s/dmlldz0ke3JlY29yZEZpbGVVcml9XCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiL3BieGNvcmUvYXBpL2Nkci92Mi9wbGF5YmFjaz92aWV3PSR7cmVjb3JkRmlsZVVyaX0mZG93bmxvYWQ9MSZmaWxlbmFtZT0ke3JlY29yZEZpbGVOYW1lfS5tcDNcIj48L2k+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLnNyY19udW19PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGUgY2VudGVyIGFsaWduZWRcIj48aSBjbGFzcz1cImljb24gZXhjaGFuZ2VcIj48L2k+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwibGVmdCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLmRzdF9udW19PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBodG1sUGxheWVyICs9ICc8L3Rib2R5PjwvdGFibGU+JztcbiAgICAgICAgcmV0dXJuIGh0bWxQbGF5ZXI7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKCkge1xuICAgICAgICBjb25zdCBvcHRpb25zID0ge307XG5cbiAgICAgICAgb3B0aW9ucy5yYW5nZXMgPSB7XG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLtGBYWxfVG9kYXldOiBbbW9tZW50KCksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUu0YFhbF9ZZXN0ZXJkYXldOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ2RheXMnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ2RheXMnKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLtGBYWxfTGFzdFdlZWtdOiBbbW9tZW50KCkuc3VidHJhY3QoNiwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS7RgWFsX0xhc3QzMERheXNdOiBbbW9tZW50KCkuc3VidHJhY3QoMjksICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUu0YFhbF9UaGlzTW9udGhdOiBbbW9tZW50KCkuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuZW5kT2YoJ21vbnRoJyldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS7RgWFsX0xhc3RNb250aF06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgIH07XG4gICAgICAgIG9wdGlvbnMuYWx3YXlzU2hvd0NhbGVuZGFycyA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMuYXV0b1VwZGF0ZUlucHV0ID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5saW5rZWRDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLm1heERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgb3B0aW9ucy5sb2NhbGUgPSB7XG4gICAgICAgICAgICBmb3JtYXQ6ICdERC9NTS9ZWVlZJyxcbiAgICAgICAgICAgIHNlcGFyYXRvcjogJyAtICcsXG4gICAgICAgICAgICBhcHBseUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUu0YFhbF9BcHBseUJ0bixcbiAgICAgICAgICAgIGNhbmNlbExhYmVsOiBnbG9iYWxUcmFuc2xhdGUu0YFhbF9DYW5jZWxCdG4sXG4gICAgICAgICAgICBmcm9tTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS7RgWFsX2Zyb20sXG4gICAgICAgICAgICB0b0xhYmVsOiBnbG9iYWxUcmFuc2xhdGUu0YFhbF90byxcbiAgICAgICAgICAgIGN1c3RvbVJhbmdlTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS7RgWFsX0N1c3RvbVBlcmlvZCxcbiAgICAgICAgICAgIGRheXNPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5kYXlzLFxuICAgICAgICAgICAgbW9udGhOYW1lczogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0Lm1vbnRocyxcbiAgICAgICAgICAgIGZpcnN0RGF5OiAxLFxuICAgICAgICB9O1xuICAgICAgICBvcHRpb25zLnN0YXJ0RGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICBvcHRpb25zLmVuZERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGVyYW5nZXBpY2tlcihcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QsXG4gICAgICAgICk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgZGF0ZSByYW5nZSBzZWxlY3RvciBzZWxlY3QgZXZlbnQuXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBzdGFydCAtIFRoZSBzdGFydCBkYXRlLlxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gZW5kIC0gVGhlIGVuZCBkYXRlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYWJlbCAtIFRoZSBsYWJlbC5cbiAgICAgKi9cbiAgICBjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3Qoc3RhcnQsIGVuZCwgbGFiZWwpIHtcbiAgICAgICAgY29uc3QgdGV4dCA9IGAke3N0YXJ0LmZvcm1hdCgnREQvTU0vWVlZWScpfSAke2VuZC5mb3JtYXQoJ0REL01NL1lZWVknKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWA7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKHRleHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIHRoZSBmaWx0ZXIgdG8gdGhlIGRhdGEgdGFibGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUaGUgZmlsdGVyIHRleHQuXG4gICAgICovXG4gICAgYXBwbHlGaWx0ZXIodGV4dCkge1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIENEUiB0YWJsZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=