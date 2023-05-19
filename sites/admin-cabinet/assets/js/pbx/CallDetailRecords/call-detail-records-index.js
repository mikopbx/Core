"use strict";

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

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

/* global globalRootUrl, SemanticLocalization, Extensions, moment, globalTranslate */

/**
 * CDRPlayer class.
 */
var CDRPlayer = /*#__PURE__*/function () {
  /**
   * Creates an instance of CDRPlayer.
   * @param {string} id - The ID of the player.
   */
  function CDRPlayer(id) {
    var _this = this;

    _classCallCheck(this, CDRPlayer);

    this.id = id;
    this.html5Audio = document.getElementById("audio-player-".concat(id));
    var $row = $("#".concat(id));
    this.$pButton = $row.find('i.play'); // Play button

    this.$dButton = $row.find('i.download'); // Download button

    this.$slider = $row.find('div.cdr-player'); // Slider element

    this.$spanDuration = $row.find('span.cdr-duration'); // Duration span element

    this.html5Audio.removeEventListener('timeupdate', this.cbOnMetadataLoaded, false);
    this.html5Audio.removeEventListener('loadedmetadata', this.cbTimeUpdate, false);
    this.$pButton.unbind();
    this.$dButton.unbind(); // Play button event listener

    this.$pButton.on('click', function (e) {
      e.preventDefault();

      _this.play();
    }); // Download button event listener

    this.$dButton.on('click', function (e) {
      e.preventDefault();
      window.location = $(e.target).attr('data-value');
    });
    this.html5Audio.addEventListener('loadedmetadata', this.cbOnMetadataLoaded, false); // timeupdate event listener

    this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false); // no src handler

    this.html5Audio.addEventListener('error', this.cbOnSrcMediaError, false);
    this.$slider.range({
      min: 0,
      max: 100,
      start: 0,
      onChange: this.cbOnSliderChange,
      html5Audio: this.html5Audio,
      cbTimeUpdate: this.cbTimeUpdate,
      spanDuration: this.$spanDuration
    });
  }
  /**
   * Callback for metadata loaded event.
   */


  _createClass(CDRPlayer, [{
    key: "cbOnMetadataLoaded",
    value: function cbOnMetadataLoaded() {
      if (Number.isFinite(this.duration)) {
        var $row = $(this).closest('tr');
        var date = new Date(null);
        date.setSeconds(parseInt(this.currentTime, 10)); // specify value for SECONDS here

        var currentTime = date.toISOString().substr(14, 5);
        date.setSeconds(parseInt(this.duration, 10)); // specify value for SECONDS here

        var dateStr = date.toISOString();
        var hours = parseInt(dateStr.substr(11, 2), 10);
        var duration;

        if (hours === 0) {
          duration = dateStr.substr(14, 5);
        } else if (hours < 10) {
          duration = dateStr.substr(12, 7);
        } else if (hours >= 10) {
          duration = dateStr.substr(11, 8);
        }

        $row.find('span.cdr-duration').text("".concat(currentTime, "/").concat(duration));
      }
    }
    /**
     * Callback for slider change event.
     * @param {number} newVal - The new value of the slider.
     * @param {object} meta - Additional metadata.
     */

  }, {
    key: "cbOnSliderChange",
    value: function cbOnSliderChange(newVal, meta) {
      if (meta.triggeredByUser && Number.isFinite(this.html5Audio.duration)) {
        this.html5Audio.removeEventListener('timeupdate', this.cbTimeUpdate, false);
        this.html5Audio.currentTime = this.html5Audio.duration * newVal / 100;
        this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);
      }

      if (Number.isFinite(this.html5Audio.duration)) {
        var dateCurrent = new Date(null);
        dateCurrent.setSeconds(parseInt(this.html5Audio.currentTime, 10)); // specify value for SECONDS here

        var currentTime = dateCurrent.toISOString().substr(14, 5);
        var dateDuration = new Date(null);
        dateDuration.setSeconds(parseInt(this.html5Audio.duration, 10)); // specify value for SECONDS here

        var dateStr = dateDuration.toISOString();
        var hours = parseInt(dateStr.substr(11, 2), 10);
        var duration;

        if (hours === 0) {
          duration = dateStr.substr(14, 5);
        } else if (hours < 10) {
          duration = dateStr.substr(12, 7);
        } else if (hours >= 10) {
          duration = dateStr.substr(11, 8);
        }

        this.spanDuration.text("".concat(currentTime, "/").concat(duration));
      }
    }
    /**
     * Callback for time update event.
     */

  }, {
    key: "cbTimeUpdate",
    value: function cbTimeUpdate() {
      if (Number.isFinite(this.duration)) {
        var percent = this.currentTime / this.duration;
        var rangePosition = Math.min(Math.round(percent * 100), 100);
        var $row = $(this).closest('tr');
        $row.find('div.cdr-player').range('set value', rangePosition);

        if (this.currentTime === this.duration) {
          $row.find('i.pause').removeClass('pause').addClass('play');
        }
      }
    }
    /**
     * Plays or pauses the audio file.
     */

  }, {
    key: "play",
    value: function play() {
      // start music
      if (this.html5Audio.paused) {
        this.html5Audio.play(); // remove play, add pause

        this.$pButton.removeClass('play').addClass('pause');
      } else {
        // pause music
        this.html5Audio.pause(); // remove pause, add play

        this.$pButton.removeClass('pause').addClass('play');
      }
    }
    /**
     * Callback for src media error event.
     */

  }, {
    key: "cbOnSrcMediaError",
    value: function cbOnSrcMediaError() {
      $(this).closest('tr').addClass('disabled');
    }
  }]);

  return CDRPlayer;
}();
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
$(document).ready(function () {
  callDetailRecords.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbIkNEUlBsYXllciIsImlkIiwiaHRtbDVBdWRpbyIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCIkcm93IiwiJCIsIiRwQnV0dG9uIiwiZmluZCIsIiRkQnV0dG9uIiwiJHNsaWRlciIsIiRzcGFuRHVyYXRpb24iLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiY2JPbk1ldGFkYXRhTG9hZGVkIiwiY2JUaW1lVXBkYXRlIiwidW5iaW5kIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJwbGF5Iiwid2luZG93IiwibG9jYXRpb24iLCJ0YXJnZXQiLCJhdHRyIiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25TcmNNZWRpYUVycm9yIiwicmFuZ2UiLCJtaW4iLCJtYXgiLCJzdGFydCIsIm9uQ2hhbmdlIiwiY2JPblNsaWRlckNoYW5nZSIsInNwYW5EdXJhdGlvbiIsIk51bWJlciIsImlzRmluaXRlIiwiZHVyYXRpb24iLCJjbG9zZXN0IiwiZGF0ZSIsIkRhdGUiLCJzZXRTZWNvbmRzIiwicGFyc2VJbnQiLCJjdXJyZW50VGltZSIsInRvSVNPU3RyaW5nIiwic3Vic3RyIiwiZGF0ZVN0ciIsImhvdXJzIiwidGV4dCIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJkYXRlQ3VycmVudCIsImRhdGVEdXJhdGlvbiIsInBlcmNlbnQiLCJyYW5nZVBvc2l0aW9uIiwiTWF0aCIsInJvdW5kIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInBhdXNlZCIsInBhdXNlIiwiY2FsbERldGFpbFJlY29yZHMiLCIkY2RyVGFibGUiLCIkZ2xvYmFsU2VhcmNoIiwiJGRhdGVSYW5nZVNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IiLCJrZXlDb2RlIiwidmFsIiwibGVuZ3RoIiwiYXBwbHlGaWx0ZXIiLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwidHlwZSIsInBhZ2luZyIsInNjcm9sbFkiLCJoZWlnaHQiLCJvZmZzZXQiLCJ0b3AiLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJwYWdlTGVuZ3RoIiwiY3JlYXRlZFJvdyIsInJvdyIsImRhdGEiLCJEVF9Sb3dDbGFzcyIsImVxIiwiaHRtbCIsImlkcyIsImRyYXdDYWxsYmFjayIsIkV4dGVuc2lvbnMiLCJVcGRhdGVQaG9uZXNSZXByZXNlbnQiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJ1bmRlZmluZWQiLCJ0ciIsImNoaWxkIiwiaXNTaG93biIsImhpZGUiLCJzaG93UmVjb3JkcyIsInNob3ciLCJlYWNoIiwiaW5kZXgiLCJwbGF5ZXJSb3ciLCJodG1sUGxheWVyIiwiZm9yRWFjaCIsInJlY29yZCIsImkiLCJyZWNvcmRpbmdmaWxlIiwic3JjX251bSIsImRzdF9udW0iLCJyZWNvcmRGaWxlTmFtZSIsInJlcGxhY2UiLCJlbmNvZGVVUklDb21wb25lbnQiLCJyZWNvcmRGaWxlVXJpIiwib3B0aW9ucyIsInJhbmdlcyIsImdsb2JhbFRyYW5zbGF0ZSIsItGBYWxfVG9kYXkiLCJtb21lbnQiLCLRgWFsX1llc3RlcmRheSIsInN1YnRyYWN0Iiwi0YFhbF9MYXN0V2VlayIsItGBYWxfTGFzdDMwRGF5cyIsItGBYWxfVGhpc01vbnRoIiwic3RhcnRPZiIsImVuZE9mIiwi0YFhbF9MYXN0TW9udGgiLCJhbHdheXNTaG93Q2FsZW5kYXJzIiwiYXV0b1VwZGF0ZUlucHV0IiwibGlua2VkQ2FsZW5kYXJzIiwibWF4RGF0ZSIsImxvY2FsZSIsImZvcm1hdCIsInNlcGFyYXRvciIsImFwcGx5TGFiZWwiLCLRgWFsX0FwcGx5QnRuIiwiY2FuY2VsTGFiZWwiLCLRgWFsX0NhbmNlbEJ0biIsImZyb21MYWJlbCIsItGBYWxfZnJvbSIsInRvTGFiZWwiLCLRgWFsX3RvIiwiY3VzdG9tUmFuZ2VMYWJlbCIsItGBYWxfQ3VzdG9tUGVyaW9kIiwiZGF5c09mV2VlayIsImNhbGVuZGFyVGV4dCIsImRheXMiLCJtb250aE5hbWVzIiwibW9udGhzIiwiZmlyc3REYXkiLCJzdGFydERhdGUiLCJlbmREYXRlIiwiZGF0ZXJhbmdlcGlja2VyIiwiY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0IiwiZW5kIiwibGFiZWwiLCJkcmF3IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtJQUNNQSxTO0FBRUw7QUFDRDtBQUNBO0FBQ0E7QUFDQyxxQkFBWUMsRUFBWixFQUFnQjtBQUFBOztBQUFBOztBQUNmLFNBQUtBLEVBQUwsR0FBVUEsRUFBVjtBQUNBLFNBQUtDLFVBQUwsR0FBa0JDLFFBQVEsQ0FBQ0MsY0FBVCx3QkFBd0NILEVBQXhDLEVBQWxCO0FBQ0EsUUFBTUksSUFBSSxHQUFHQyxDQUFDLFlBQUtMLEVBQUwsRUFBZDtBQUNBLFNBQUtNLFFBQUwsR0FBZ0JGLElBQUksQ0FBQ0csSUFBTCxDQUFVLFFBQVYsQ0FBaEIsQ0FKZSxDQUlzQjs7QUFDckMsU0FBS0MsUUFBTCxHQUFnQkosSUFBSSxDQUFDRyxJQUFMLENBQVUsWUFBVixDQUFoQixDQUxlLENBSzBCOztBQUN6QyxTQUFLRSxPQUFMLEdBQWVMLElBQUksQ0FBQ0csSUFBTCxDQUFVLGdCQUFWLENBQWYsQ0FOZSxDQU02Qjs7QUFDNUMsU0FBS0csYUFBTCxHQUFxQk4sSUFBSSxDQUFDRyxJQUFMLENBQVUsbUJBQVYsQ0FBckIsQ0FQZSxDQU9zQzs7QUFDckQsU0FBS04sVUFBTCxDQUFnQlUsbUJBQWhCLENBQW9DLFlBQXBDLEVBQWtELEtBQUtDLGtCQUF2RCxFQUEyRSxLQUEzRTtBQUNBLFNBQUtYLFVBQUwsQ0FBZ0JVLG1CQUFoQixDQUFvQyxnQkFBcEMsRUFBc0QsS0FBS0UsWUFBM0QsRUFBeUUsS0FBekU7QUFDQSxTQUFLUCxRQUFMLENBQWNRLE1BQWQ7QUFDQSxTQUFLTixRQUFMLENBQWNNLE1BQWQsR0FYZSxDQWFmOztBQUNBLFNBQUtSLFFBQUwsQ0FBY1MsRUFBZCxDQUFpQixPQUFqQixFQUEwQixVQUFDQyxDQUFELEVBQU87QUFDaENBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjs7QUFDQSxNQUFBLEtBQUksQ0FBQ0MsSUFBTDtBQUNBLEtBSEQsRUFkZSxDQW1CZjs7QUFDQSxTQUFLVixRQUFMLENBQWNPLEVBQWQsQ0FBaUIsT0FBakIsRUFBMEIsVUFBQ0MsQ0FBRCxFQUFPO0FBQ2hDQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQUUsTUFBQUEsTUFBTSxDQUFDQyxRQUFQLEdBQWtCZixDQUFDLENBQUNXLENBQUMsQ0FBQ0ssTUFBSCxDQUFELENBQVlDLElBQVosQ0FBaUIsWUFBakIsQ0FBbEI7QUFDQSxLQUhEO0FBS0EsU0FBS3JCLFVBQUwsQ0FBZ0JzQixnQkFBaEIsQ0FBaUMsZ0JBQWpDLEVBQW1ELEtBQUtYLGtCQUF4RCxFQUE0RSxLQUE1RSxFQXpCZSxDQTJCZjs7QUFDQSxTQUFLWCxVQUFMLENBQWdCc0IsZ0JBQWhCLENBQWlDLFlBQWpDLEVBQStDLEtBQUtWLFlBQXBELEVBQWtFLEtBQWxFLEVBNUJlLENBOEJmOztBQUNBLFNBQUtaLFVBQUwsQ0FBZ0JzQixnQkFBaEIsQ0FBaUMsT0FBakMsRUFBMEMsS0FBS0MsaUJBQS9DLEVBQWtFLEtBQWxFO0FBRUEsU0FBS2YsT0FBTCxDQUFhZ0IsS0FBYixDQUFtQjtBQUNsQkMsTUFBQUEsR0FBRyxFQUFFLENBRGE7QUFFbEJDLE1BQUFBLEdBQUcsRUFBRSxHQUZhO0FBR2xCQyxNQUFBQSxLQUFLLEVBQUUsQ0FIVztBQUlsQkMsTUFBQUEsUUFBUSxFQUFFLEtBQUtDLGdCQUpHO0FBS2xCN0IsTUFBQUEsVUFBVSxFQUFFLEtBQUtBLFVBTEM7QUFNbEJZLE1BQUFBLFlBQVksRUFBRSxLQUFLQSxZQU5EO0FBT2xCa0IsTUFBQUEsWUFBWSxFQUFFLEtBQUtyQjtBQVBELEtBQW5CO0FBU0E7QUFFRDtBQUNEO0FBQ0E7Ozs7O1dBQ0MsOEJBQXFCO0FBQ3BCLFVBQUlzQixNQUFNLENBQUNDLFFBQVAsQ0FBZ0IsS0FBS0MsUUFBckIsQ0FBSixFQUFvQztBQUNuQyxZQUFNOUIsSUFBSSxHQUFHQyxDQUFDLENBQUMsSUFBRCxDQUFELENBQVE4QixPQUFSLENBQWdCLElBQWhCLENBQWI7QUFDQSxZQUFNQyxJQUFJLEdBQUcsSUFBSUMsSUFBSixDQUFTLElBQVQsQ0FBYjtBQUNBRCxRQUFBQSxJQUFJLENBQUNFLFVBQUwsQ0FBZ0JDLFFBQVEsQ0FBQyxLQUFLQyxXQUFOLEVBQW1CLEVBQW5CLENBQXhCLEVBSG1DLENBR2M7O0FBQ2pELFlBQU1BLFdBQVcsR0FBR0osSUFBSSxDQUFDSyxXQUFMLEdBQW1CQyxNQUFuQixDQUEwQixFQUExQixFQUE4QixDQUE5QixDQUFwQjtBQUNBTixRQUFBQSxJQUFJLENBQUNFLFVBQUwsQ0FBZ0JDLFFBQVEsQ0FBQyxLQUFLTCxRQUFOLEVBQWdCLEVBQWhCLENBQXhCLEVBTG1DLENBS1c7O0FBQzlDLFlBQU1TLE9BQU8sR0FBR1AsSUFBSSxDQUFDSyxXQUFMLEVBQWhCO0FBQ0EsWUFBTUcsS0FBSyxHQUFHTCxRQUFRLENBQUNJLE9BQU8sQ0FBQ0QsTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBRCxFQUF3QixFQUF4QixDQUF0QjtBQUNBLFlBQUlSLFFBQUo7O0FBQ0EsWUFBSVUsS0FBSyxLQUFLLENBQWQsRUFBaUI7QUFDaEJWLFVBQUFBLFFBQVEsR0FBR1MsT0FBTyxDQUFDRCxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFYO0FBQ0EsU0FGRCxNQUVPLElBQUlFLEtBQUssR0FBRyxFQUFaLEVBQWdCO0FBQ3RCVixVQUFBQSxRQUFRLEdBQUdTLE9BQU8sQ0FBQ0QsTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBWDtBQUNBLFNBRk0sTUFFQSxJQUFJRSxLQUFLLElBQUksRUFBYixFQUFpQjtBQUN2QlYsVUFBQUEsUUFBUSxHQUFHUyxPQUFPLENBQUNELE1BQVIsQ0FBZSxFQUFmLEVBQW1CLENBQW5CLENBQVg7QUFDQTs7QUFDRHRDLFFBQUFBLElBQUksQ0FBQ0csSUFBTCxDQUFVLG1CQUFWLEVBQStCc0MsSUFBL0IsV0FBdUNMLFdBQXZDLGNBQXNETixRQUF0RDtBQUNBO0FBQ0Q7QUFFRDtBQUNEO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0MsMEJBQWlCWSxNQUFqQixFQUF5QkMsSUFBekIsRUFBK0I7QUFDOUIsVUFBSUEsSUFBSSxDQUFDQyxlQUFMLElBQXdCaEIsTUFBTSxDQUFDQyxRQUFQLENBQWdCLEtBQUtoQyxVQUFMLENBQWdCaUMsUUFBaEMsQ0FBNUIsRUFBdUU7QUFDdEUsYUFBS2pDLFVBQUwsQ0FBZ0JVLG1CQUFoQixDQUFvQyxZQUFwQyxFQUFrRCxLQUFLRSxZQUF2RCxFQUFxRSxLQUFyRTtBQUNBLGFBQUtaLFVBQUwsQ0FBZ0J1QyxXQUFoQixHQUErQixLQUFLdkMsVUFBTCxDQUFnQmlDLFFBQWhCLEdBQTJCWSxNQUE1QixHQUFzQyxHQUFwRTtBQUNBLGFBQUs3QyxVQUFMLENBQWdCc0IsZ0JBQWhCLENBQWlDLFlBQWpDLEVBQStDLEtBQUtWLFlBQXBELEVBQWtFLEtBQWxFO0FBQ0E7O0FBQ0QsVUFBSW1CLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQixLQUFLaEMsVUFBTCxDQUFnQmlDLFFBQWhDLENBQUosRUFBK0M7QUFDOUMsWUFBTWUsV0FBVyxHQUFHLElBQUlaLElBQUosQ0FBUyxJQUFULENBQXBCO0FBQ0FZLFFBQUFBLFdBQVcsQ0FBQ1gsVUFBWixDQUF1QkMsUUFBUSxDQUFDLEtBQUt0QyxVQUFMLENBQWdCdUMsV0FBakIsRUFBOEIsRUFBOUIsQ0FBL0IsRUFGOEMsQ0FFcUI7O0FBQ25FLFlBQU1BLFdBQVcsR0FBR1MsV0FBVyxDQUFDUixXQUFaLEdBQTBCQyxNQUExQixDQUFpQyxFQUFqQyxFQUFxQyxDQUFyQyxDQUFwQjtBQUNBLFlBQU1RLFlBQVksR0FBRyxJQUFJYixJQUFKLENBQVMsSUFBVCxDQUFyQjtBQUNBYSxRQUFBQSxZQUFZLENBQUNaLFVBQWIsQ0FBd0JDLFFBQVEsQ0FBQyxLQUFLdEMsVUFBTCxDQUFnQmlDLFFBQWpCLEVBQTJCLEVBQTNCLENBQWhDLEVBTDhDLENBS21COztBQUNqRSxZQUFNUyxPQUFPLEdBQUdPLFlBQVksQ0FBQ1QsV0FBYixFQUFoQjtBQUNBLFlBQU1HLEtBQUssR0FBR0wsUUFBUSxDQUFDSSxPQUFPLENBQUNELE1BQVIsQ0FBZSxFQUFmLEVBQW1CLENBQW5CLENBQUQsRUFBd0IsRUFBeEIsQ0FBdEI7QUFDQSxZQUFJUixRQUFKOztBQUNBLFlBQUlVLEtBQUssS0FBSyxDQUFkLEVBQWlCO0FBQ2hCVixVQUFBQSxRQUFRLEdBQUdTLE9BQU8sQ0FBQ0QsTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBWDtBQUNBLFNBRkQsTUFFTyxJQUFJRSxLQUFLLEdBQUcsRUFBWixFQUFnQjtBQUN0QlYsVUFBQUEsUUFBUSxHQUFHUyxPQUFPLENBQUNELE1BQVIsQ0FBZSxFQUFmLEVBQW1CLENBQW5CLENBQVg7QUFDQSxTQUZNLE1BRUEsSUFBSUUsS0FBSyxJQUFJLEVBQWIsRUFBaUI7QUFDdkJWLFVBQUFBLFFBQVEsR0FBR1MsT0FBTyxDQUFDRCxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFYO0FBQ0E7O0FBQ0QsYUFBS1gsWUFBTCxDQUFrQmMsSUFBbEIsV0FBMEJMLFdBQTFCLGNBQXlDTixRQUF6QztBQUNBO0FBQ0Q7QUFFRDtBQUNEO0FBQ0E7Ozs7V0FDQyx3QkFBZTtBQUNkLFVBQUlGLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQixLQUFLQyxRQUFyQixDQUFKLEVBQW9DO0FBQ25DLFlBQU1pQixPQUFPLEdBQUcsS0FBS1gsV0FBTCxHQUFtQixLQUFLTixRQUF4QztBQUNBLFlBQU1rQixhQUFhLEdBQUdDLElBQUksQ0FBQzNCLEdBQUwsQ0FBUzJCLElBQUksQ0FBQ0MsS0FBTCxDQUFZSCxPQUFELEdBQVksR0FBdkIsQ0FBVCxFQUFzQyxHQUF0QyxDQUF0QjtBQUNBLFlBQU0vQyxJQUFJLEdBQUdDLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUThCLE9BQVIsQ0FBZ0IsSUFBaEIsQ0FBYjtBQUNBL0IsUUFBQUEsSUFBSSxDQUFDRyxJQUFMLENBQVUsZ0JBQVYsRUFBNEJrQixLQUE1QixDQUFrQyxXQUFsQyxFQUErQzJCLGFBQS9DOztBQUNBLFlBQUksS0FBS1osV0FBTCxLQUFxQixLQUFLTixRQUE5QixFQUF3QztBQUN2QzlCLFVBQUFBLElBQUksQ0FBQ0csSUFBTCxDQUFVLFNBQVYsRUFBcUJnRCxXQUFyQixDQUFpQyxPQUFqQyxFQUEwQ0MsUUFBMUMsQ0FBbUQsTUFBbkQ7QUFDQTtBQUNEO0FBQ0Q7QUFFRDtBQUNEO0FBQ0E7Ozs7V0FDQyxnQkFBTztBQUNOO0FBQ0EsVUFBSSxLQUFLdkQsVUFBTCxDQUFnQndELE1BQXBCLEVBQTRCO0FBQzNCLGFBQUt4RCxVQUFMLENBQWdCaUIsSUFBaEIsR0FEMkIsQ0FFM0I7O0FBQ0EsYUFBS1osUUFBTCxDQUFjaUQsV0FBZCxDQUEwQixNQUExQixFQUFrQ0MsUUFBbEMsQ0FBMkMsT0FBM0M7QUFDQSxPQUpELE1BSU87QUFBRTtBQUNSLGFBQUt2RCxVQUFMLENBQWdCeUQsS0FBaEIsR0FETSxDQUVOOztBQUNBLGFBQUtwRCxRQUFMLENBQWNpRCxXQUFkLENBQTBCLE9BQTFCLEVBQW1DQyxRQUFuQyxDQUE0QyxNQUE1QztBQUNBO0FBQ0Q7QUFFRDtBQUNEO0FBQ0E7Ozs7V0FDQyw2QkFBb0I7QUFDbkJuRCxNQUFBQSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVE4QixPQUFSLENBQWdCLElBQWhCLEVBQXNCcUIsUUFBdEIsQ0FBK0IsVUFBL0I7QUFDQTs7Ozs7QUFJRjtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0EsSUFBTUcsaUJBQWlCLEdBQUc7QUFDekI7QUFDRDtBQUNBO0FBQ0E7QUFDQ0MsRUFBQUEsU0FBUyxFQUFFdkQsQ0FBQyxDQUFDLFlBQUQsQ0FMYTs7QUFPekI7QUFDRDtBQUNBO0FBQ0E7QUFDQ3dELEVBQUFBLGFBQWEsRUFBRXhELENBQUMsQ0FBQyxlQUFELENBWFM7O0FBYXpCO0FBQ0Q7QUFDQTtBQUNBO0FBQ0N5RCxFQUFBQSxrQkFBa0IsRUFBRXpELENBQUMsQ0FBQyxzQkFBRCxDQWpCSTs7QUFtQnpCO0FBQ0Q7QUFDQTtBQUNBO0FBQ0MwRCxFQUFBQSxTQUFTLEVBQUUsRUF2QmM7O0FBeUJ6QjtBQUNEO0FBQ0E7QUFDQTtBQUNDQyxFQUFBQSxPQUFPLEVBQUUsRUE3QmdCOztBQStCekI7QUFDRDtBQUNBO0FBQ0NDLEVBQUFBLFVBbEN5Qix3QkFrQ1o7QUFDWk4sSUFBQUEsaUJBQWlCLENBQUNPLDJCQUFsQjtBQUVBUCxJQUFBQSxpQkFBaUIsQ0FBQ0UsYUFBbEIsQ0FBZ0M5QyxFQUFoQyxDQUFtQyxPQUFuQyxFQUE0QyxVQUFDQyxDQUFELEVBQU87QUFDbEQsVUFBSUEsQ0FBQyxDQUFDbUQsT0FBRixLQUFjLEVBQWQsSUFDQW5ELENBQUMsQ0FBQ21ELE9BQUYsS0FBYyxDQURkLElBRUFSLGlCQUFpQixDQUFDRSxhQUFsQixDQUFnQ08sR0FBaEMsR0FBc0NDLE1BQXRDLEtBQWlELENBRnJELEVBRXdEO0FBQ3ZELFlBQU14QixJQUFJLGFBQU1jLGlCQUFpQixDQUFDRyxrQkFBbEIsQ0FBcUNNLEdBQXJDLEVBQU4sY0FBb0RULGlCQUFpQixDQUFDRSxhQUFsQixDQUFnQ08sR0FBaEMsRUFBcEQsQ0FBVjtBQUNBVCxRQUFBQSxpQkFBaUIsQ0FBQ1csV0FBbEIsQ0FBOEJ6QixJQUE5QjtBQUNBO0FBQ0QsS0FQRDtBQVNBYyxJQUFBQSxpQkFBaUIsQ0FBQ0MsU0FBbEIsQ0FBNEJHLFNBQTVCLENBQXNDO0FBQ3JDUSxNQUFBQSxNQUFNLEVBQUU7QUFDUEEsUUFBQUEsTUFBTSxZQUFLWixpQkFBaUIsQ0FBQ0csa0JBQWxCLENBQXFDTSxHQUFyQyxFQUFMLGNBQW1EVCxpQkFBaUIsQ0FBQ0UsYUFBbEIsQ0FBZ0NPLEdBQWhDLEVBQW5EO0FBREMsT0FENkI7QUFJckNJLE1BQUFBLFVBQVUsRUFBRSxJQUp5QjtBQUtyQ0MsTUFBQUEsVUFBVSxFQUFFLElBTHlCO0FBTXJDQyxNQUFBQSxJQUFJLEVBQUU7QUFDTEMsUUFBQUEsR0FBRyxZQUFLQyxhQUFMLHNDQURFO0FBRUxDLFFBQUFBLElBQUksRUFBRTtBQUZELE9BTitCO0FBVXJDQyxNQUFBQSxNQUFNLEVBQUUsSUFWNkI7QUFXckNDLE1BQUFBLE9BQU8sRUFBRTFFLENBQUMsQ0FBQ2MsTUFBRCxDQUFELENBQVU2RCxNQUFWLEtBQXFCckIsaUJBQWlCLENBQUNDLFNBQWxCLENBQTRCcUIsTUFBNUIsR0FBcUNDLEdBQTFELEdBQWdFLEdBWHBDO0FBWXJDO0FBQ0FDLE1BQUFBLElBQUksRUFBRSxNQWIrQjtBQWNyQ0MsTUFBQUEsV0FBVyxFQUFFLElBZHdCO0FBZXJDQyxNQUFBQSxVQUFVLEVBQUUsRUFmeUI7QUFnQnJDO0FBQ0E7O0FBRUE7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNHQyxNQUFBQSxVQXhCcUMsc0JBd0IxQkMsR0F4QjBCLEVBd0JyQkMsSUF4QnFCLEVBd0JmO0FBQ3JCLFlBQUlBLElBQUksQ0FBQ0MsV0FBTCxLQUFxQixVQUF6QixFQUFxQztBQUNwQ3BGLFVBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU9rRixHQUFQLENBQUQsQ0FBYUcsRUFBYixDQUFnQixDQUFoQixFQUFtQkMsSUFBbkIsQ0FBd0IsaUNBQXhCO0FBQ0EsU0FGRCxNQUVPO0FBQ050RixVQUFBQSxDQUFDLENBQUMsSUFBRCxFQUFPa0YsR0FBUCxDQUFELENBQWFHLEVBQWIsQ0FBZ0IsQ0FBaEIsRUFBbUJDLElBQW5CLENBQXdCLEVBQXhCO0FBQ0E7O0FBQ0R0RixRQUFBQSxDQUFDLENBQUMsSUFBRCxFQUFPa0YsR0FBUCxDQUFELENBQWFHLEVBQWIsQ0FBZ0IsQ0FBaEIsRUFBbUJDLElBQW5CLENBQXdCSCxJQUFJLENBQUMsQ0FBRCxDQUE1QjtBQUNBbkYsUUFBQUEsQ0FBQyxDQUFDLElBQUQsRUFBT2tGLEdBQVAsQ0FBRCxDQUFhRyxFQUFiLENBQWdCLENBQWhCLEVBQ0VDLElBREYsQ0FDT0gsSUFBSSxDQUFDLENBQUQsQ0FEWCxFQUVFaEMsUUFGRixDQUVXLGFBRlg7QUFHQW5ELFFBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU9rRixHQUFQLENBQUQsQ0FBYUcsRUFBYixDQUFnQixDQUFoQixFQUNFQyxJQURGLENBQ09ILElBQUksQ0FBQyxDQUFELENBRFgsRUFFRWhDLFFBRkYsQ0FFVyxhQUZYO0FBSUEsWUFBSXRCLFFBQVEsR0FBR3NELElBQUksQ0FBQyxDQUFELENBQW5COztBQUNBLFlBQUdBLElBQUksQ0FBQ0ksR0FBTCxLQUFhLEVBQWhCLEVBQW1CO0FBQ2xCMUQsVUFBQUEsUUFBUSxJQUFJLGtCQUFpQnNELElBQUksQ0FBQ0ksR0FBdEIsR0FBMkIsd0NBQXZDO0FBQ0E7O0FBQ0R2RixRQUFBQSxDQUFDLENBQUMsSUFBRCxFQUFPa0YsR0FBUCxDQUFELENBQWFHLEVBQWIsQ0FBZ0IsQ0FBaEIsRUFBbUJDLElBQW5CLENBQXdCekQsUUFBeEIsRUFBa0NzQixRQUFsQyxDQUEyQyxlQUEzQztBQUNBLE9BM0NvQzs7QUE2Q3JDO0FBQ0g7QUFDQTtBQUNHcUMsTUFBQUEsWUFoRHFDLDBCQWdEdEI7QUFDZEMsUUFBQUEsVUFBVSxDQUFDQyxxQkFBWCxDQUFpQyxhQUFqQztBQUNBLE9BbERvQztBQW1EckNDLE1BQUFBLFFBQVEsRUFBRUMsb0JBQW9CLENBQUNDLHFCQW5ETTtBQW9EckNDLE1BQUFBLFFBQVEsRUFBRTtBQXBEMkIsS0FBdEM7QUFzREF4QyxJQUFBQSxpQkFBaUIsQ0FBQ0ksU0FBbEIsR0FBOEJKLGlCQUFpQixDQUFDQyxTQUFsQixDQUE0QndDLFNBQTVCLEVBQTlCO0FBRUF6QyxJQUFBQSxpQkFBaUIsQ0FBQ0ksU0FBbEIsQ0FBNEJoRCxFQUE1QixDQUErQixNQUEvQixFQUF1QyxZQUFNO0FBQzVDNEMsTUFBQUEsaUJBQWlCLENBQUNFLGFBQWxCLENBQWdDMUIsT0FBaEMsQ0FBd0MsS0FBeEMsRUFBK0NvQixXQUEvQyxDQUEyRCxTQUEzRDtBQUNBLEtBRkQ7QUFJQUksSUFBQUEsaUJBQWlCLENBQUNDLFNBQWxCLENBQTRCN0MsRUFBNUIsQ0FBK0IsT0FBL0IsRUFBd0MsYUFBeEMsRUFBdUQsVUFBQ0MsQ0FBRCxFQUFPO0FBQzdELFVBQUk0RSxHQUFHLEdBQUd2RixDQUFDLENBQUNXLENBQUMsQ0FBQ0ssTUFBSCxDQUFELENBQVlDLElBQVosQ0FBaUIsVUFBakIsQ0FBVjs7QUFDQSxVQUFJc0UsR0FBRyxLQUFLUyxTQUFSLElBQXFCVCxHQUFHLEtBQUssRUFBakMsRUFBcUM7QUFDcEN6RSxRQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJ3RCxhQUFyQix1RUFBK0ZnQixHQUEvRjtBQUNBO0FBQ0QsS0FMRCxFQXhFWSxDQStFWjs7QUFDQWpDLElBQUFBLGlCQUFpQixDQUFDQyxTQUFsQixDQUE0QjdDLEVBQTVCLENBQStCLE9BQS9CLEVBQXdDLGFBQXhDLEVBQXVELFVBQUNDLENBQUQsRUFBTztBQUM3RCxVQUFJNEUsR0FBRyxHQUFHdkYsQ0FBQyxDQUFDVyxDQUFDLENBQUNLLE1BQUgsQ0FBRCxDQUFZQyxJQUFaLENBQWlCLFVBQWpCLENBQVY7O0FBQ0EsVUFBR3NFLEdBQUcsS0FBS1MsU0FBUixJQUFxQlQsR0FBRyxLQUFLLEVBQWhDLEVBQW1DO0FBQ2xDekUsUUFBQUEsTUFBTSxDQUFDQyxRQUFQLGFBQXFCd0QsYUFBckIsdUVBQStGZ0IsR0FBL0Y7QUFDQTtBQUNBOztBQUNELFVBQU1VLEVBQUUsR0FBR2pHLENBQUMsQ0FBQ1csQ0FBQyxDQUFDSyxNQUFILENBQUQsQ0FBWWMsT0FBWixDQUFvQixJQUFwQixDQUFYO0FBQ0EsVUFBTW9ELEdBQUcsR0FBRzVCLGlCQUFpQixDQUFDSSxTQUFsQixDQUE0QndCLEdBQTVCLENBQWdDZSxFQUFoQyxDQUFaOztBQUVBLFVBQUlmLEdBQUcsQ0FBQ2dCLEtBQUosQ0FBVUMsT0FBVixFQUFKLEVBQXlCO0FBQ3hCO0FBQ0FqQixRQUFBQSxHQUFHLENBQUNnQixLQUFKLENBQVVFLElBQVY7QUFDQUgsUUFBQUEsRUFBRSxDQUFDL0MsV0FBSCxDQUFlLE9BQWY7QUFDQSxPQUpELE1BSU87QUFDTjtBQUNBZ0MsUUFBQUEsR0FBRyxDQUFDZ0IsS0FBSixDQUFVNUMsaUJBQWlCLENBQUMrQyxXQUFsQixDQUE4Qm5CLEdBQUcsQ0FBQ0MsSUFBSixFQUE5QixDQUFWLEVBQXFEbUIsSUFBckQ7QUFDQUwsUUFBQUEsRUFBRSxDQUFDOUMsUUFBSCxDQUFZLE9BQVo7QUFDQStCLFFBQUFBLEdBQUcsQ0FBQ2dCLEtBQUosR0FBWWhHLElBQVosQ0FBaUIsb0JBQWpCLEVBQXVDcUcsSUFBdkMsQ0FBNEMsVUFBQ0MsS0FBRCxFQUFRQyxTQUFSLEVBQXNCO0FBQ2pFLGNBQU05RyxFQUFFLEdBQUdLLENBQUMsQ0FBQ3lHLFNBQUQsQ0FBRCxDQUFheEYsSUFBYixDQUFrQixJQUFsQixDQUFYO0FBQ0EsaUJBQU8sSUFBSXZCLFNBQUosQ0FBY0MsRUFBZCxDQUFQO0FBQ0EsU0FIRDtBQUlBOEYsUUFBQUEsVUFBVSxDQUFDQyxxQkFBWCxDQUFpQyxhQUFqQztBQUNBO0FBQ0QsS0F2QkQ7QUF3QkEsR0ExSXdCOztBQTRJekI7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNDVyxFQUFBQSxXQWpKeUIsdUJBaUpibEIsSUFqSmEsRUFpSlA7QUFDakIsUUFBSXVCLFVBQVUsR0FBRyx1REFBakI7QUFDQXZCLElBQUFBLElBQUksQ0FBQyxDQUFELENBQUosQ0FBUXdCLE9BQVIsQ0FBZ0IsVUFBQ0MsTUFBRCxFQUFTQyxDQUFULEVBQWU7QUFDOUIsVUFBSUEsQ0FBQyxHQUFHLENBQVIsRUFBVztBQUNWSCxRQUFBQSxVQUFVLElBQUksb0JBQWQ7QUFDQUEsUUFBQUEsVUFBVSxJQUFJLG9CQUFkO0FBQ0E7O0FBQ0QsVUFBSUUsTUFBTSxDQUFDRSxhQUFQLEtBQXlCZCxTQUF6QixJQUNBWSxNQUFNLENBQUNFLGFBQVAsS0FBeUIsSUFEekIsSUFFQUYsTUFBTSxDQUFDRSxhQUFQLENBQXFCOUMsTUFBckIsS0FBZ0MsQ0FGcEMsRUFFdUM7QUFFdEMwQyxRQUFBQSxVQUFVLGdFQUUrQkUsTUFBTSxDQUFDakgsRUFGdEMsNkxBTW9DaUgsTUFBTSxDQUFDakgsRUFOM0MsZ0lBU3NDaUgsTUFBTSxDQUFDakgsRUFUN0MsdVFBZTRDaUgsTUFBTSxDQUFDRyxPQWZuRCx1S0FpQjJDSCxNQUFNLENBQUNJLE9BakJsRCx3QkFBVjtBQW1CQSxPQXZCRCxNQXVCTztBQUNOLFlBQUlDLGNBQWMsaUNBQTBCTCxNQUFNLENBQUNHLE9BQWpDLGtCQUFnREgsTUFBTSxDQUFDSSxPQUF2RCxtQkFBdUU3QixJQUFJLENBQUMsQ0FBRCxDQUEzRSxDQUFsQjtBQUNBOEIsUUFBQUEsY0FBYyxDQUFDQyxPQUFmLENBQXVCLFlBQXZCLEVBQXFDLEVBQXJDO0FBQ0FELFFBQUFBLGNBQWMsR0FBR0Usa0JBQWtCLENBQUNGLGNBQUQsQ0FBbkM7QUFDQSxZQUFNRyxhQUFhLEdBQUdELGtCQUFrQixDQUFDUCxNQUFNLENBQUNFLGFBQVIsQ0FBeEM7QUFDQUosUUFBQUEsVUFBVSx1REFFc0JFLE1BQU0sQ0FBQ2pILEVBRjdCLDZMQU1vQ2lILE1BQU0sQ0FBQ2pILEVBTjNDLHdEQU15RnlILGFBTnpGLHVIQVNzQ1IsTUFBTSxDQUFDakgsRUFUN0MseU5BYW1FeUgsYUFibkUsa0NBYXdHSCxjQWJ4RyxpR0FlNENMLE1BQU0sQ0FBQ0csT0FmbkQsdUtBaUIyQ0gsTUFBTSxDQUFDSSxPQWpCbEQsd0JBQVY7QUFtQkE7QUFDRCxLQXJERDtBQXNEQU4sSUFBQUEsVUFBVSxJQUFJLGtCQUFkO0FBQ0EsV0FBT0EsVUFBUDtBQUNBLEdBM013Qjs7QUE4TXpCO0FBQ0Q7QUFDQTtBQUNDN0MsRUFBQUEsMkJBak55Qix5Q0FpTks7QUFBQTs7QUFDN0IsUUFBTXdELE9BQU8sR0FBRyxFQUFoQjtBQUVBQSxJQUFBQSxPQUFPLENBQUNDLE1BQVIsMkRBQ0VDLGVBQWUsQ0FBQ0MsU0FEbEIsRUFDOEIsQ0FBQ0MsTUFBTSxFQUFQLEVBQVdBLE1BQU0sRUFBakIsQ0FEOUIsb0NBRUVGLGVBQWUsQ0FBQ0csYUFGbEIsRUFFa0MsQ0FBQ0QsTUFBTSxHQUFHRSxRQUFULENBQWtCLENBQWxCLEVBQXFCLE1BQXJCLENBQUQsRUFBK0JGLE1BQU0sR0FBR0UsUUFBVCxDQUFrQixDQUFsQixFQUFxQixNQUFyQixDQUEvQixDQUZsQyxvQ0FHRUosZUFBZSxDQUFDSyxZQUhsQixFQUdpQyxDQUFDSCxNQUFNLEdBQUdFLFFBQVQsQ0FBa0IsQ0FBbEIsRUFBcUIsTUFBckIsQ0FBRCxFQUErQkYsTUFBTSxFQUFyQyxDQUhqQyxvQ0FJRUYsZUFBZSxDQUFDTSxjQUpsQixFQUltQyxDQUFDSixNQUFNLEdBQUdFLFFBQVQsQ0FBa0IsRUFBbEIsRUFBc0IsTUFBdEIsQ0FBRCxFQUFnQ0YsTUFBTSxFQUF0QyxDQUpuQyxvQ0FLRUYsZUFBZSxDQUFDTyxhQUxsQixFQUtrQyxDQUFDTCxNQUFNLEdBQUdNLE9BQVQsQ0FBaUIsT0FBakIsQ0FBRCxFQUE0Qk4sTUFBTSxHQUFHTyxLQUFULENBQWUsT0FBZixDQUE1QixDQUxsQyxvQ0FNRVQsZUFBZSxDQUFDVSxhQU5sQixFQU1rQyxDQUFDUixNQUFNLEdBQUdFLFFBQVQsQ0FBa0IsQ0FBbEIsRUFBcUIsT0FBckIsRUFBOEJJLE9BQTlCLENBQXNDLE9BQXRDLENBQUQsRUFBaUROLE1BQU0sR0FBR0UsUUFBVCxDQUFrQixDQUFsQixFQUFxQixPQUFyQixFQUE4QkssS0FBOUIsQ0FBb0MsT0FBcEMsQ0FBakQsQ0FObEM7QUFRQVgsSUFBQUEsT0FBTyxDQUFDYSxtQkFBUixHQUE4QixJQUE5QjtBQUNBYixJQUFBQSxPQUFPLENBQUNjLGVBQVIsR0FBMEIsSUFBMUI7QUFDQWQsSUFBQUEsT0FBTyxDQUFDZSxlQUFSLEdBQTBCLElBQTFCO0FBQ0FmLElBQUFBLE9BQU8sQ0FBQ2dCLE9BQVIsR0FBa0JaLE1BQU0sRUFBeEI7QUFDQUosSUFBQUEsT0FBTyxDQUFDaUIsTUFBUixHQUFpQjtBQUNoQkMsTUFBQUEsTUFBTSxFQUFFLFlBRFE7QUFFaEJDLE1BQUFBLFNBQVMsRUFBRSxLQUZLO0FBR2hCQyxNQUFBQSxVQUFVLEVBQUVsQixlQUFlLENBQUNtQixZQUhaO0FBSWhCQyxNQUFBQSxXQUFXLEVBQUVwQixlQUFlLENBQUNxQixhQUpiO0FBS2hCQyxNQUFBQSxTQUFTLEVBQUV0QixlQUFlLENBQUN1QixRQUxYO0FBTWhCQyxNQUFBQSxPQUFPLEVBQUV4QixlQUFlLENBQUN5QixNQU5UO0FBT2hCQyxNQUFBQSxnQkFBZ0IsRUFBRTFCLGVBQWUsQ0FBQzJCLGdCQVBsQjtBQVFoQkMsTUFBQUEsVUFBVSxFQUFFdkQsb0JBQW9CLENBQUN3RCxZQUFyQixDQUFrQ0MsSUFSOUI7QUFTaEJDLE1BQUFBLFVBQVUsRUFBRTFELG9CQUFvQixDQUFDd0QsWUFBckIsQ0FBa0NHLE1BVDlCO0FBVWhCQyxNQUFBQSxRQUFRLEVBQUU7QUFWTSxLQUFqQjtBQVlBbkMsSUFBQUEsT0FBTyxDQUFDb0MsU0FBUixHQUFvQmhDLE1BQU0sRUFBMUI7QUFDQUosSUFBQUEsT0FBTyxDQUFDcUMsT0FBUixHQUFrQmpDLE1BQU0sRUFBeEI7QUFDQW5FLElBQUFBLGlCQUFpQixDQUFDRyxrQkFBbEIsQ0FBcUNrRyxlQUFyQyxDQUNDdEMsT0FERCxFQUVDL0QsaUJBQWlCLENBQUNzRywyQkFGbkI7QUFJQSxHQWxQd0I7O0FBcVB6QjtBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQ0EsRUFBQUEsMkJBM1B5Qix1Q0EyUEdySSxLQTNQSCxFQTJQVXNJLEdBM1BWLEVBMlBlQyxLQTNQZixFQTJQc0I7QUFDOUMsUUFBTXRILElBQUksYUFBTWpCLEtBQUssQ0FBQ2dILE1BQU4sQ0FBYSxZQUFiLENBQU4sY0FBb0NzQixHQUFHLENBQUN0QixNQUFKLENBQVcsWUFBWCxDQUFwQyxjQUFnRWpGLGlCQUFpQixDQUFDRSxhQUFsQixDQUFnQ08sR0FBaEMsRUFBaEUsQ0FBVjtBQUNBVCxJQUFBQSxpQkFBaUIsQ0FBQ1csV0FBbEIsQ0FBOEJ6QixJQUE5QjtBQUNBLEdBOVB3Qjs7QUFnUXpCO0FBQ0Q7QUFDQTtBQUNBO0FBQ0N5QixFQUFBQSxXQXBReUIsdUJBb1FiekIsSUFwUWEsRUFvUVA7QUFDakJjLElBQUFBLGlCQUFpQixDQUFDSSxTQUFsQixDQUE0QlEsTUFBNUIsQ0FBbUMxQixJQUFuQyxFQUF5Q3VILElBQXpDO0FBQ0F6RyxJQUFBQSxpQkFBaUIsQ0FBQ0UsYUFBbEIsQ0FBZ0MxQixPQUFoQyxDQUF3QyxLQUF4QyxFQUErQ3FCLFFBQS9DLENBQXdELFNBQXhEO0FBQ0E7QUF2UXdCLENBQTFCO0FBeVFBbkQsQ0FBQyxDQUFDSCxRQUFELENBQUQsQ0FBWW1LLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjFHLEVBQUFBLGlCQUFpQixDQUFDTSxVQUFsQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEV4dGVuc2lvbnMsIG1vbWVudCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cblxuLyoqXG4gKiBDRFJQbGF5ZXIgY2xhc3MuXG4gKi9cbmNsYXNzIENEUlBsYXllciB7XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgQ0RSUGxheWVyLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBUaGUgSUQgb2YgdGhlIHBsYXllci5cblx0ICovXG5cdGNvbnN0cnVjdG9yKGlkKSB7XG5cdFx0dGhpcy5pZCA9IGlkO1xuXHRcdHRoaXMuaHRtbDVBdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBhdWRpby1wbGF5ZXItJHtpZH1gKTtcblx0XHRjb25zdCAkcm93ID0gJChgIyR7aWR9YCk7XG5cdFx0dGhpcy4kcEJ1dHRvbiA9ICRyb3cuZmluZCgnaS5wbGF5Jyk7IC8vIFBsYXkgYnV0dG9uXG5cdFx0dGhpcy4kZEJ1dHRvbiA9ICRyb3cuZmluZCgnaS5kb3dubG9hZCcpOyAvLyBEb3dubG9hZCBidXR0b25cblx0XHR0aGlzLiRzbGlkZXIgPSAkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJyk7IC8vIFNsaWRlciBlbGVtZW50XG5cdFx0dGhpcy4kc3BhbkR1cmF0aW9uID0gJHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpOyAvLyBEdXJhdGlvbiBzcGFuIGVsZW1lbnRcblx0XHR0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG5cdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHR0aGlzLiRwQnV0dG9uLnVuYmluZCgpO1xuXHRcdHRoaXMuJGRCdXR0b24udW5iaW5kKCk7XG5cblx0XHQvLyBQbGF5IGJ1dHRvbiBldmVudCBsaXN0ZW5lclxuXHRcdHRoaXMuJHBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHRoaXMucGxheSgpO1xuXHRcdH0pO1xuXG5cdFx0Ly8gRG93bmxvYWQgYnV0dG9uIGV2ZW50IGxpc3RlbmVyXG5cdFx0dGhpcy4kZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gJChlLnRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYk9uTWV0YWRhdGFMb2FkZWQsIGZhbHNlKTtcblxuXHRcdC8vIHRpbWV1cGRhdGUgZXZlbnQgbGlzdGVuZXJcblx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cblx0XHQvLyBubyBzcmMgaGFuZGxlclxuXHRcdHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIHRoaXMuY2JPblNyY01lZGlhRXJyb3IsIGZhbHNlKTtcblxuXHRcdHRoaXMuJHNsaWRlci5yYW5nZSh7XG5cdFx0XHRtaW46IDAsXG5cdFx0XHRtYXg6IDEwMCxcblx0XHRcdHN0YXJ0OiAwLFxuXHRcdFx0b25DaGFuZ2U6IHRoaXMuY2JPblNsaWRlckNoYW5nZSxcblx0XHRcdGh0bWw1QXVkaW86IHRoaXMuaHRtbDVBdWRpbyxcblx0XHRcdGNiVGltZVVwZGF0ZTogdGhpcy5jYlRpbWVVcGRhdGUsXG5cdFx0XHRzcGFuRHVyYXRpb246IHRoaXMuJHNwYW5EdXJhdGlvbixcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBmb3IgbWV0YWRhdGEgbG9hZGVkIGV2ZW50LlxuXHQgKi9cblx0Y2JPbk1ldGFkYXRhTG9hZGVkKCkge1xuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcblx0XHRcdGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG5cdFx0XHRkYXRlLnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5jdXJyZW50VGltZSwgMTApKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG5cdFx0XHRjb25zdCBjdXJyZW50VGltZSA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0ZGF0ZS5zZXRTZWNvbmRzKHBhcnNlSW50KHRoaXMuZHVyYXRpb24sIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IGRhdGUudG9JU09TdHJpbmcoKTtcblx0XHRcdGNvbnN0IGhvdXJzID0gcGFyc2VJbnQoZGF0ZVN0ci5zdWJzdHIoMTEsIDIpLCAxMCk7XG5cdFx0XHRsZXQgZHVyYXRpb247XG5cdFx0XHRpZiAoaG91cnMgPT09IDApIHtcblx0XHRcdFx0ZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG5cdFx0XHR9IGVsc2UgaWYgKGhvdXJzIDwgMTApIHtcblx0XHRcdFx0ZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMiwgNyk7XG5cdFx0XHR9IGVsc2UgaWYgKGhvdXJzID49IDEwKSB7XG5cdFx0XHRcdGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTEsIDgpO1xuXHRcdFx0fVxuXHRcdFx0JHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIENhbGxiYWNrIGZvciBzbGlkZXIgY2hhbmdlIGV2ZW50LlxuXHQgKiBAcGFyYW0ge251bWJlcn0gbmV3VmFsIC0gVGhlIG5ldyB2YWx1ZSBvZiB0aGUgc2xpZGVyLlxuXHQgKiBAcGFyYW0ge29iamVjdH0gbWV0YSAtIEFkZGl0aW9uYWwgbWV0YWRhdGEuXG5cdCAqL1xuXHRjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuXHRcdGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID0gKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0fVxuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgZGF0ZUN1cnJlbnQgPSBuZXcgRGF0ZShudWxsKTtcblx0XHRcdGRhdGVDdXJyZW50LnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lLCAxMCkpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcblx0XHRcdGNvbnN0IGN1cnJlbnRUaW1lID0gZGF0ZUN1cnJlbnQudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0Y29uc3QgZGF0ZUR1cmF0aW9uID0gbmV3IERhdGUobnVsbCk7XG5cdFx0XHRkYXRlRHVyYXRpb24uc2V0U2Vjb25kcyhwYXJzZUludCh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24sIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IGRhdGVEdXJhdGlvbi50b0lTT1N0cmluZygpO1xuXHRcdFx0Y29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcblx0XHRcdGxldCBkdXJhdGlvbjtcblx0XHRcdGlmIChob3VycyA9PT0gMCkge1xuXHRcdFx0XHRkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDE0LCA1KTtcblx0XHRcdH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuXHRcdFx0XHRkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDEyLCA3KTtcblx0XHRcdH0gZWxzZSBpZiAoaG91cnMgPj0gMTApIHtcblx0XHRcdFx0ZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMSwgOCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnNwYW5EdXJhdGlvbi50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBmb3IgdGltZSB1cGRhdGUgZXZlbnQuXG5cdCAqL1xuXHRjYlRpbWVVcGRhdGUoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uO1xuXHRcdFx0Y29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgubWluKE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKSwgMTAwKTtcblx0XHRcdGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHQkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJykucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuXHRcdFx0aWYgKHRoaXMuY3VycmVudFRpbWUgPT09IHRoaXMuZHVyYXRpb24pIHtcblx0XHRcdFx0JHJvdy5maW5kKCdpLnBhdXNlJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogUGxheXMgb3IgcGF1c2VzIHRoZSBhdWRpbyBmaWxlLlxuXHQgKi9cblx0cGxheSgpIHtcblx0XHQvLyBzdGFydCBtdXNpY1xuXHRcdGlmICh0aGlzLmh0bWw1QXVkaW8ucGF1c2VkKSB7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBsYXksIGFkZCBwYXVzZVxuXHRcdFx0dGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuXHRcdH0gZWxzZSB7IC8vIHBhdXNlIG11c2ljXG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcblx0XHRcdC8vIHJlbW92ZSBwYXVzZSwgYWRkIHBsYXlcblx0XHRcdHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogQ2FsbGJhY2sgZm9yIHNyYyBtZWRpYSBlcnJvciBldmVudC5cblx0ICovXG5cdGNiT25TcmNNZWRpYUVycm9yKCkge1xuXHRcdCQodGhpcykuY2xvc2VzdCgndHInKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0fVxufVxuXG5cbi8qKlxuICogY2FsbERldGFpbFJlY29yZHMgbW9kdWxlLlxuICogQG1vZHVsZSBjYWxsRGV0YWlsUmVjb3Jkc1xuICovXG5jb25zdCBjYWxsRGV0YWlsUmVjb3JkcyA9IHtcblx0LyoqXG5cdCAqIFRoZSBjYWxsIGRldGFpbCByZWNvcmRzIHRhYmxlIGVsZW1lbnQuXG5cdCAqIEB0eXBlIHtKUXVlcnk8SFRNTEVsZW1lbnQ+fVxuXHQgKi9cblx0JGNkclRhYmxlOiAkKCcjY2RyLXRhYmxlJyksXG5cblx0LyoqXG5cdCAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG5cdCAqIEB0eXBlIHtKUXVlcnk8SFRNTEVsZW1lbnQ+fVxuXHQgKi9cblx0JGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbHNlYXJjaCcpLFxuXG5cdC8qKlxuXHQgKiBUaGUgZGF0ZSByYW5nZSBzZWxlY3RvciBlbGVtZW50LlxuXHQgKiBAdHlwZSB7SlF1ZXJ5PEhUTUxFbGVtZW50Pn1cblx0ICovXG5cdCRkYXRlUmFuZ2VTZWxlY3RvcjogJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKSxcblxuXHQvKipcblx0ICogVGhlIGRhdGEgdGFibGUgb2JqZWN0LlxuXHQgKiBAdHlwZSB7T2JqZWN0fVxuXHQgKi9cblx0ZGF0YVRhYmxlOiB7fSxcblxuXHQvKipcblx0ICogQW4gYXJyYXkgb2YgcGxheWVycy5cblx0ICogQHR5cGUge0FycmF5fVxuXHQgKi9cblx0cGxheWVyczogW10sXG5cblx0LyoqXG5cdCAqIEluaXRpYWxpemVzIHRoZSBjYWxsIGRldGFpbCByZWNvcmRzLlxuXHQgKi9cblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IoKTtcblxuXHRcdGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcblx0XHRcdGlmIChlLmtleUNvZGUgPT09IDEzXG5cdFx0XHRcdHx8IGUua2V5Q29kZSA9PT0gOFxuXHRcdFx0XHR8fCBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRjb25zdCB0ZXh0ID0gYCR7Y2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLnZhbCgpfSAke2NhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCl9YDtcblx0XHRcdFx0Y2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIodGV4dCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZGF0YVRhYmxlKHtcblx0XHRcdHNlYXJjaDoge1xuXHRcdFx0XHRzZWFyY2g6IGAke2NhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci52YWwoKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWAsXG5cdFx0XHR9LFxuXHRcdFx0c2VydmVyU2lkZTogdHJ1ZSxcblx0XHRcdHByb2Nlc3Npbmc6IHRydWUsXG5cdFx0XHRhamF4OiB7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1jYWxsLWRldGFpbC1yZWNvcmRzL2dldE5ld1JlY29yZHNgLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHR9LFxuXHRcdFx0cGFnaW5nOiB0cnVlLFxuXHRcdFx0c2Nyb2xsWTogJCh3aW5kb3cpLmhlaWdodCgpIC0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9mZnNldCgpLnRvcCAtIDQyMCxcblx0XHRcdC8vIHN0YXRlU2F2ZTogdHJ1ZSxcblx0XHRcdHNEb206ICdydGlwJyxcblx0XHRcdGRlZmVyUmVuZGVyOiB0cnVlLFxuXHRcdFx0cGFnZUxlbmd0aDogMTcsXG5cdFx0XHQvLyBzY3JvbGxDb2xsYXBzZTogdHJ1ZSxcblx0XHRcdC8vIHNjcm9sbGVyOiB0cnVlLFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIENvbnN0cnVjdHMgdGhlIENEUiByb3cuXG5cdFx0XHQgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSByb3cgLSBUaGUgcm93IGVsZW1lbnQuXG5cdFx0XHQgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuXHRcdFx0ICovXG5cdFx0XHRjcmVhdGVkUm93KHJvdywgZGF0YSkge1xuXHRcdFx0XHRpZiAoZGF0YS5EVF9Sb3dDbGFzcyA9PT0gJ2RldGFpbGVkJykge1xuXHRcdFx0XHRcdCQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCc8aSBjbGFzcz1cImljb24gY2FyZXQgZG93blwiPjwvaT4nKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCgndGQnLCByb3cpLmVxKDEpLmh0bWwoZGF0YVswXSk7XG5cdFx0XHRcdCQoJ3RkJywgcm93KS5lcSgyKVxuXHRcdFx0XHRcdC5odG1sKGRhdGFbMV0pXG5cdFx0XHRcdFx0LmFkZENsYXNzKCduZWVkLXVwZGF0ZScpO1xuXHRcdFx0XHQkKCd0ZCcsIHJvdykuZXEoMylcblx0XHRcdFx0XHQuaHRtbChkYXRhWzJdKVxuXHRcdFx0XHRcdC5hZGRDbGFzcygnbmVlZC11cGRhdGUnKTtcblxuXHRcdFx0XHRsZXQgZHVyYXRpb24gPSBkYXRhWzNdO1xuXHRcdFx0XHRpZihkYXRhLmlkcyAhPT0gJycpe1xuXHRcdFx0XHRcdGR1cmF0aW9uICs9ICc8aSBkYXRhLWlkcz1cIicrIGRhdGEuaWRzICsnXCIgY2xhc3M9XCJmaWxlIGFsdGVybmF0ZSBvdXRsaW5lIGljb25cIj4nO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQoJ3RkJywgcm93KS5lcSg0KS5odG1sKGR1cmF0aW9uKS5hZGRDbGFzcygncmlnaHQgYWxpZ25lZCcpO1xuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBEcmF3IGV2ZW50IC0gZmlyZWQgb25jZSB0aGUgdGFibGUgaGFzIGNvbXBsZXRlZCBhIGRyYXcuXG5cdFx0XHQgKi9cblx0XHRcdGRyYXdDYWxsYmFjaygpIHtcblx0XHRcdFx0RXh0ZW5zaW9ucy5VcGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG5cdFx0XHR9LFxuXHRcdFx0bGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcblx0XHRcdG9yZGVyaW5nOiBmYWxzZSxcblx0XHR9KTtcblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuRGF0YVRhYmxlKCk7XG5cblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG5cdFx0XHRjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fSk7XG5cblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ3RyLm5lZ2F0aXZlJywgKGUpID0+IHtcblx0XHRcdGxldCBpZHMgPSAkKGUudGFyZ2V0KS5hdHRyKCdkYXRhLWlkcycpO1xuXHRcdFx0aWYgKGlkcyAhPT0gdW5kZWZpbmVkICYmIGlkcyAhPT0gJycpIHtcblx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zeXN0ZW0tZGlhZ25vc3RpYy9pbmRleC8/ZmlsZW5hbWU9YXN0ZXJpc2svdmVyYm9zZSZmaWx0ZXI9JHtpZHN9YDtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3Igb3BlbmluZyBhbmQgY2xvc2luZyBkZXRhaWxzXG5cdFx0Y2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICd0ci5kZXRhaWxlZCcsIChlKSA9PiB7XG5cdFx0XHRsZXQgaWRzID0gJChlLnRhcmdldCkuYXR0cignZGF0YS1pZHMnKTtcblx0XHRcdGlmKGlkcyAhPT0gdW5kZWZpbmVkICYmIGlkcyAhPT0gJycpe1xuXHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXN5c3RlbS1kaWFnbm9zdGljL2luZGV4Lz9maWxlbmFtZT1hc3Rlcmlzay92ZXJib3NlJmZpbHRlcj0ke2lkc31gO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRjb25zdCB0ciA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHRjb25zdCByb3cgPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucm93KHRyKTtcblxuXHRcdFx0aWYgKHJvdy5jaGlsZC5pc1Nob3duKCkpIHtcblx0XHRcdFx0Ly8gVGhpcyByb3cgaXMgYWxyZWFkeSBvcGVuIC0gY2xvc2UgaXRcblx0XHRcdFx0cm93LmNoaWxkLmhpZGUoKTtcblx0XHRcdFx0dHIucmVtb3ZlQ2xhc3MoJ3Nob3duJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBPcGVuIHRoaXMgcm93XG5cdFx0XHRcdHJvdy5jaGlsZChjYWxsRGV0YWlsUmVjb3Jkcy5zaG93UmVjb3Jkcyhyb3cuZGF0YSgpKSkuc2hvdygpO1xuXHRcdFx0XHR0ci5hZGRDbGFzcygnc2hvd24nKTtcblx0XHRcdFx0cm93LmNoaWxkKCkuZmluZCgnLmRldGFpbC1yZWNvcmQtcm93JykuZWFjaCgoaW5kZXgsIHBsYXllclJvdykgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IGlkID0gJChwbGF5ZXJSb3cpLmF0dHIoJ2lkJyk7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBDRFJQbGF5ZXIoaWQpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0RXh0ZW5zaW9ucy5VcGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNob3dzIGEgc2V0IG9mIGNhbGwgcmVjb3JkcyB3aGVuIGEgcm93IGlzIGNsaWNrZWQuXG5cdCAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjYWxsIHJlY29yZHMuXG5cdCAqL1xuXHRzaG93UmVjb3JkcyhkYXRhKSB7XG5cdFx0bGV0IGh0bWxQbGF5ZXIgPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBiYXNpYyB0YWJsZSBjZHItcGxheWVyXCI+PHRib2R5Pic7XG5cdFx0ZGF0YVs0XS5mb3JFYWNoKChyZWNvcmQsIGkpID0+IHtcblx0XHRcdGlmIChpID4gMCkge1xuXHRcdFx0XHRodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuXHRcdFx0XHRodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHJlY29yZC5yZWNvcmRpbmdmaWxlID09PSB1bmRlZmluZWRcblx0XHRcdFx0fHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IG51bGxcblx0XHRcdFx0fHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUubGVuZ3RoID09PSAwKSB7XG5cblx0XHRcdFx0aHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93IGRpc2FibGVkXCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIlwiPjwvYXVkaW8+XG5cdDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwiZml2ZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiIGRhdGEtdmFsdWU9XCIke3JlY29yZC5pZH1cIj48L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPlxuICAgIFx0PGkgY2xhc3M9XCJ1aSBpY29uIGRvd25sb2FkXCIgZGF0YS12YWx1ZT1cIlwiPjwvaT5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxldCByZWNvcmRGaWxlTmFtZSA9IGBDYWxsX3JlY29yZF9iZXR3ZWVuXyR7cmVjb3JkLnNyY19udW19X2FuZF8ke3JlY29yZC5kc3RfbnVtfV9mcm9tXyR7ZGF0YVswXX1gO1xuXHRcdFx0XHRyZWNvcmRGaWxlTmFtZS5yZXBsYWNlKC9bXlxcd1xccyE/XS9nLCAnJyk7XG5cdFx0XHRcdHJlY29yZEZpbGVOYW1lID0gZW5jb2RlVVJJQ29tcG9uZW50KHJlY29yZEZpbGVOYW1lKTtcblx0XHRcdFx0Y29uc3QgcmVjb3JkRmlsZVVyaSA9IGVuY29kZVVSSUNvbXBvbmVudChyZWNvcmQucmVjb3JkaW5nZmlsZSk7XG5cdFx0XHRcdGh0bWxQbGF5ZXIgKz0gYFxuXG48dHIgY2xhc3M9XCJkZXRhaWwtcmVjb3JkLXJvd1wiIGlkPVwiJHtyZWNvcmQuaWR9XCI+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGUgcmlnaHQgYWxpZ25lZFwiPlxuICAgXHRcdDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuXHQgICBcdDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke3JlY29yZC5pZH1cIiBzcmM9XCIvcGJ4Y29yZS9hcGkvY2RyL3YyL3BsYXliYWNrP3ZpZXc9JHtyZWNvcmRGaWxlVXJpfVwiPjwvYXVkaW8+XG5cdDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwiZml2ZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiIGRhdGEtdmFsdWU9XCIke3JlY29yZC5pZH1cIj48L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPlxuICAgIFx0PGkgY2xhc3M9XCJ1aSBpY29uIGRvd25sb2FkXCIgZGF0YS12YWx1ZT1cIi9wYnhjb3JlL2FwaS9jZHIvdjIvcGxheWJhY2s/dmlldz0ke3JlY29yZEZpbGVVcml9JmRvd25sb2FkPTEmZmlsZW5hbWU9JHtyZWNvcmRGaWxlTmFtZX0ubXAzXCI+PC9pPlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5zcmNfbnVtfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5kc3RfbnVtfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGh0bWxQbGF5ZXIgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuXHRcdHJldHVybiBodG1sUGxheWVyO1xuXHR9LFxuXG5cblx0LyoqXG5cdCAqIEluaXRpYWxpemVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yLlxuXHQgKi9cblx0aW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKCkge1xuXHRcdGNvbnN0IG9wdGlvbnMgPSB7fTtcblxuXHRcdG9wdGlvbnMucmFuZ2VzID0ge1xuXHRcdFx0W2dsb2JhbFRyYW5zbGF0ZS7RgWFsX1RvZGF5XTogW21vbWVudCgpLCBtb21lbnQoKV0sXG5cdFx0XHRbZ2xvYmFsVHJhbnNsYXRlLtGBYWxfWWVzdGVyZGF5XTogW21vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyksIG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyldLFxuXHRcdFx0W2dsb2JhbFRyYW5zbGF0ZS7RgWFsX0xhc3RXZWVrXTogW21vbWVudCgpLnN1YnRyYWN0KDYsICdkYXlzJyksIG1vbWVudCgpXSxcblx0XHRcdFtnbG9iYWxUcmFuc2xhdGUu0YFhbF9MYXN0MzBEYXlzXTogW21vbWVudCgpLnN1YnRyYWN0KDI5LCAnZGF5cycpLCBtb21lbnQoKV0sXG5cdFx0XHRbZ2xvYmFsVHJhbnNsYXRlLtGBYWxfVGhpc01vbnRoXTogW21vbWVudCgpLnN0YXJ0T2YoJ21vbnRoJyksIG1vbWVudCgpLmVuZE9mKCdtb250aCcpXSxcblx0XHRcdFtnbG9iYWxUcmFuc2xhdGUu0YFhbF9MYXN0TW9udGhdOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuZW5kT2YoJ21vbnRoJyldLFxuXHRcdH07XG5cdFx0b3B0aW9ucy5hbHdheXNTaG93Q2FsZW5kYXJzID0gdHJ1ZTtcblx0XHRvcHRpb25zLmF1dG9VcGRhdGVJbnB1dCA9IHRydWU7XG5cdFx0b3B0aW9ucy5saW5rZWRDYWxlbmRhcnMgPSB0cnVlO1xuXHRcdG9wdGlvbnMubWF4RGF0ZSA9IG1vbWVudCgpO1xuXHRcdG9wdGlvbnMubG9jYWxlID0ge1xuXHRcdFx0Zm9ybWF0OiAnREQvTU0vWVlZWScsXG5cdFx0XHRzZXBhcmF0b3I6ICcgLSAnLFxuXHRcdFx0YXBwbHlMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLtGBYWxfQXBwbHlCdG4sXG5cdFx0XHRjYW5jZWxMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLtGBYWxfQ2FuY2VsQnRuLFxuXHRcdFx0ZnJvbUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUu0YFhbF9mcm9tLFxuXHRcdFx0dG9MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLtGBYWxfdG8sXG5cdFx0XHRjdXN0b21SYW5nZUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUu0YFhbF9DdXN0b21QZXJpb2QsXG5cdFx0XHRkYXlzT2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQuZGF5cyxcblx0XHRcdG1vbnRoTmFtZXM6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5tb250aHMsXG5cdFx0XHRmaXJzdERheTogMSxcblx0XHR9O1xuXHRcdG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KCk7XG5cdFx0b3B0aW9ucy5lbmREYXRlID0gbW9tZW50KCk7XG5cdFx0Y2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGVyYW5nZXBpY2tlcihcblx0XHRcdG9wdGlvbnMsXG5cdFx0XHRjYWxsRGV0YWlsUmVjb3Jkcy5jYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QsXG5cdFx0KTtcblx0fSxcblxuXG5cdC8qKlxuXHQgKiBIYW5kbGVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIHNlbGVjdCBldmVudC5cblx0ICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBzdGFydCAtIFRoZSBzdGFydCBkYXRlLlxuXHQgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IGVuZCAtIFRoZSBlbmQgZGF0ZS5cblx0ICogQHBhcmFtIHtzdHJpbmd9IGxhYmVsIC0gVGhlIGxhYmVsLlxuXHQgKi9cblx0Y2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0KHN0YXJ0LCBlbmQsIGxhYmVsKSB7XG5cdFx0Y29uc3QgdGV4dCA9IGAke3N0YXJ0LmZvcm1hdCgnREQvTU0vWVlZWScpfSAke2VuZC5mb3JtYXQoJ0REL01NL1lZWVknKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWA7XG5cdFx0Y2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIodGV4dCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEFwcGxpZXMgdGhlIGZpbHRlciB0byB0aGUgZGF0YSB0YWJsZS5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUaGUgZmlsdGVyIHRleHQuXG5cdCAqL1xuXHRhcHBseUZpbHRlcih0ZXh0KSB7XG5cdFx0Y2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG5cdFx0Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHR9LFxufTtcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0Y2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=