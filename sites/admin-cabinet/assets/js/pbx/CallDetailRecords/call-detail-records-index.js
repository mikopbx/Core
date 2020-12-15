"use strict";

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
 * Класс динамически создаваемых проигрываетелй для CDR
 *
 */
var CDRPlayer =
/*#__PURE__*/
function () {
  function CDRPlayer(id) {
    var _this = this;

    _classCallCheck(this, CDRPlayer);

    this.id = id;
    this.html5Audio = document.getElementById("audio-player-".concat(id));
    var $row = $("#".concat(id));
    this.$pButton = $row.find('i.play'); // play button

    this.$dButton = $row.find('i.download'); // download button

    this.$slider = $row.find('div.cdr-player');
    this.$spanDuration = $row.find('span.cdr-duration');
    this.html5Audio.removeEventListener('timeupdate', this.cbOnMetadataLoaded, false);
    this.html5Audio.removeEventListener('loadedmetadata', this.cbTimeUpdate, false);
    this.$pButton.unbind();
    this.$dButton.unbind(); // play button event listenter

    this.$pButton.on('click', function (e) {
      e.preventDefault();

      _this.play();
    }); // download button event listenter

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
   * Обработчик подгрузки метаданных
   */


  _createClass(CDRPlayer, [{
    key: "cbOnMetadataLoaded",
    value: function () {
      function cbOnMetadataLoaded() {
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

      return cbOnMetadataLoaded;
    }()
    /**
     * Колбек на сдвиг слайдера проигрывателя
     * @param newVal
     * @param meta
     */

  }, {
    key: "cbOnSliderChange",
    value: function () {
      function cbOnSliderChange(newVal, meta) {
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

      return cbOnSliderChange;
    }()
    /**
     * Колбек на изменение позиции проигрываемого файла из HTML5 аудиотега
     */

  }, {
    key: "cbTimeUpdate",
    value: function () {
      function cbTimeUpdate() {
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

      return cbTimeUpdate;
    }()
    /**
     * Запуск и остановка воспроизведения аудио файла
     * по клику на иконку Play
     */

  }, {
    key: "play",
    value: function () {
      function play() {
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

      return play;
    }()
    /**
     * Обработка ошибки полученя звукового файла
     */

  }, {
    key: "cbOnSrcMediaError",
    value: function () {
      function cbOnSrcMediaError() {
        $(this).closest('tr').addClass('disabled');
      }

      return cbOnSrcMediaError;
    }()
  }]);

  return CDRPlayer;
}();
/**
 * Класс страницы с CDR
 */


var callDetailRecords = {
  $cdrTable: $('#cdr-table'),
  $globalSearch: $('#globalsearch'),
  $dateRangeSelector: $('#date-range-selector'),
  dataTable: {},
  players: [],
  initialize: function () {
    function initialize() {
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
         * Конструктор строки CDR
         * @param row
         * @param data
         */
        createdRow: function () {
          function createdRow(row, data) {
            if (data.DT_RowClass === 'detailed') {
              $('td', row).eq(0).html('<i class="icon caret down"></i>');
            } else {
              $('td', row).eq(0).html('');
            }

            $('td', row).eq(1).html(data[0]);
            $('td', row).eq(2).html(data[1]).addClass('need-update');
            $('td', row).eq(3).html(data[2]).addClass('need-update');
            $('td', row).eq(4).html(data[3]);
          }

          return createdRow;
        }(),

        /**
         * Draw event - fired once the table has completed a draw.
         */
        drawCallback: function () {
          function drawCallback() {
            Extensions.UpdatePhonesRepresent('need-update');
          }

          return drawCallback;
        }(),
        language: SemanticLocalization.dataTableLocalisation,
        ordering: false
      });
      callDetailRecords.dataTable = callDetailRecords.$cdrTable.DataTable();
      callDetailRecords.dataTable.on('draw', function () {
        callDetailRecords.$globalSearch.closest('div').removeClass('loading');
      }); // Add event listener for opening and closing details

      callDetailRecords.$cdrTable.on('click', 'tr.detailed', function (e) {
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
    }

    return initialize;
  }(),

  /**
   * Отрисовывает набор с записями разговоров при клике на строку
   */
  showRecords: function () {
    function showRecords(data) {
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
          htmlPlayer += "\n\n<tr class=\"detail-record-row\" id=\"".concat(record.id, "\">\n   \t<td class=\"one wide\"></td>\n   \t<td class=\"one wide right aligned\">\n   \t\t<i class=\"ui icon play\"></i>\n\t   \t<audio preload=\"metadata\" id=\"audio-player-").concat(record.id, "\" src=\"/pbxcore/api/cdr/playback?view=").concat(recordFileUri, "\"></audio>\n\t</td>\n    <td class=\"five wide\">\n    \t<div class=\"ui range cdr-player\" data-value=\"").concat(record.id, "\"></div>\n    </td>\n    <td class=\"one wide\"><span class=\"cdr-duration\"></span></td>\n    <td class=\"one wide\">\n    \t<i class=\"ui icon download\" data-value=\"/pbxcore/api/cdr/playback?view=").concat(recordFileUri, "&download=1&filename=").concat(recordFileName, ".mp3\"></i>\n    </td>\n    <td class=\"right aligned\"><span class=\"need-update\">").concat(record.src_num, "</span></td>\n    <td class=\"one wide center aligned\"><i class=\"icon exchange\"></i></td>\n   \t<td class=\"left aligned\"><span class=\"need-update\">").concat(record.dst_num, "</span></td>\n</tr>");
        }
      });
      htmlPlayer += '</tbody></table>';
      return htmlPlayer;
    }

    return showRecords;
  }(),

  /**
   *
   */
  initializeDateRangeSelector: function () {
    function initializeDateRangeSelector() {
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
    }

    return initializeDateRangeSelector;
  }(),

  /**
   * Обработчик выбора периода
   * @param start
   * @param end
   * @param label
   */
  cbDateRangeSelectorOnSelect: function () {
    function cbDateRangeSelectorOnSelect(start, end, label) {
      var text = "".concat(start.format('DD/MM/YYYY'), " ").concat(end.format('DD/MM/YYYY'), " ").concat(callDetailRecords.$globalSearch.val());
      callDetailRecords.applyFilter(text);
    }

    return cbDateRangeSelectorOnSelect;
  }(),

  /**
   *
   */
  applyFilter: function () {
    function applyFilter(text) {
      callDetailRecords.dataTable.search(text).draw();
      callDetailRecords.$globalSearch.closest('div').addClass('loading');
    }

    return applyFilter;
  }()
};
$(document).ready(function () {
  callDetailRecords.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbIkNEUlBsYXllciIsImlkIiwiaHRtbDVBdWRpbyIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCIkcm93IiwiJCIsIiRwQnV0dG9uIiwiZmluZCIsIiRkQnV0dG9uIiwiJHNsaWRlciIsIiRzcGFuRHVyYXRpb24iLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiY2JPbk1ldGFkYXRhTG9hZGVkIiwiY2JUaW1lVXBkYXRlIiwidW5iaW5kIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJwbGF5Iiwid2luZG93IiwibG9jYXRpb24iLCJ0YXJnZXQiLCJhdHRyIiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25TcmNNZWRpYUVycm9yIiwicmFuZ2UiLCJtaW4iLCJtYXgiLCJzdGFydCIsIm9uQ2hhbmdlIiwiY2JPblNsaWRlckNoYW5nZSIsInNwYW5EdXJhdGlvbiIsIk51bWJlciIsImlzRmluaXRlIiwiZHVyYXRpb24iLCJjbG9zZXN0IiwiZGF0ZSIsIkRhdGUiLCJzZXRTZWNvbmRzIiwicGFyc2VJbnQiLCJjdXJyZW50VGltZSIsInRvSVNPU3RyaW5nIiwic3Vic3RyIiwiZGF0ZVN0ciIsImhvdXJzIiwidGV4dCIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJkYXRlQ3VycmVudCIsImRhdGVEdXJhdGlvbiIsInBlcmNlbnQiLCJyYW5nZVBvc2l0aW9uIiwiTWF0aCIsInJvdW5kIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInBhdXNlZCIsInBhdXNlIiwiY2FsbERldGFpbFJlY29yZHMiLCIkY2RyVGFibGUiLCIkZ2xvYmFsU2VhcmNoIiwiJGRhdGVSYW5nZVNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IiLCJrZXlDb2RlIiwidmFsIiwibGVuZ3RoIiwiYXBwbHlGaWx0ZXIiLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwidHlwZSIsInBhZ2luZyIsInNjcm9sbFkiLCJoZWlnaHQiLCJvZmZzZXQiLCJ0b3AiLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJwYWdlTGVuZ3RoIiwiY3JlYXRlZFJvdyIsInJvdyIsImRhdGEiLCJEVF9Sb3dDbGFzcyIsImVxIiwiaHRtbCIsImRyYXdDYWxsYmFjayIsIkV4dGVuc2lvbnMiLCJVcGRhdGVQaG9uZXNSZXByZXNlbnQiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJ0ciIsImNoaWxkIiwiaXNTaG93biIsImhpZGUiLCJzaG93UmVjb3JkcyIsInNob3ciLCJlYWNoIiwiaW5kZXgiLCJwbGF5ZXJSb3ciLCJodG1sUGxheWVyIiwiZm9yRWFjaCIsInJlY29yZCIsImkiLCJyZWNvcmRpbmdmaWxlIiwidW5kZWZpbmVkIiwic3JjX251bSIsImRzdF9udW0iLCJyZWNvcmRGaWxlTmFtZSIsInJlcGxhY2UiLCJlbmNvZGVVUklDb21wb25lbnQiLCJyZWNvcmRGaWxlVXJpIiwib3B0aW9ucyIsInJhbmdlcyIsImdsb2JhbFRyYW5zbGF0ZSIsItGBYWxfVG9kYXkiLCJtb21lbnQiLCLRgWFsX1llc3RlcmRheSIsInN1YnRyYWN0Iiwi0YFhbF9MYXN0V2VlayIsItGBYWxfTGFzdDMwRGF5cyIsItGBYWxfVGhpc01vbnRoIiwic3RhcnRPZiIsImVuZE9mIiwi0YFhbF9MYXN0TW9udGgiLCJhbHdheXNTaG93Q2FsZW5kYXJzIiwiYXV0b1VwZGF0ZUlucHV0IiwibGlua2VkQ2FsZW5kYXJzIiwibWF4RGF0ZSIsImxvY2FsZSIsImZvcm1hdCIsInNlcGFyYXRvciIsImFwcGx5TGFiZWwiLCLRgWFsX0FwcGx5QnRuIiwiY2FuY2VsTGFiZWwiLCLRgWFsX0NhbmNlbEJ0biIsImZyb21MYWJlbCIsItGBYWxfZnJvbSIsInRvTGFiZWwiLCLRgWFsX3RvIiwiY3VzdG9tUmFuZ2VMYWJlbCIsItGBYWxfQ3VzdG9tUGVyaW9kIiwiZGF5c09mV2VlayIsImNhbGVuZGFyVGV4dCIsImRheXMiLCJtb250aE5hbWVzIiwibW9udGhzIiwiZmlyc3REYXkiLCJzdGFydERhdGUiLCJlbmREYXRlIiwiZGF0ZXJhbmdlcGlja2VyIiwiY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0IiwiZW5kIiwibGFiZWwiLCJkcmF3IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBOztBQUNBOzs7O0lBSU1BLFM7OztBQUNMLHFCQUFZQyxFQUFaLEVBQWdCO0FBQUE7O0FBQUE7O0FBQ2YsU0FBS0EsRUFBTCxHQUFVQSxFQUFWO0FBQ0EsU0FBS0MsVUFBTCxHQUFrQkMsUUFBUSxDQUFDQyxjQUFULHdCQUF3Q0gsRUFBeEMsRUFBbEI7QUFDQSxRQUFNSSxJQUFJLEdBQUdDLENBQUMsWUFBS0wsRUFBTCxFQUFkO0FBQ0EsU0FBS00sUUFBTCxHQUFnQkYsSUFBSSxDQUFDRyxJQUFMLENBQVUsUUFBVixDQUFoQixDQUplLENBSXNCOztBQUNyQyxTQUFLQyxRQUFMLEdBQWdCSixJQUFJLENBQUNHLElBQUwsQ0FBVSxZQUFWLENBQWhCLENBTGUsQ0FLMEI7O0FBQ3pDLFNBQUtFLE9BQUwsR0FBZUwsSUFBSSxDQUFDRyxJQUFMLENBQVUsZ0JBQVYsQ0FBZjtBQUNBLFNBQUtHLGFBQUwsR0FBcUJOLElBQUksQ0FBQ0csSUFBTCxDQUFVLG1CQUFWLENBQXJCO0FBQ0EsU0FBS04sVUFBTCxDQUFnQlUsbUJBQWhCLENBQW9DLFlBQXBDLEVBQWtELEtBQUtDLGtCQUF2RCxFQUEyRSxLQUEzRTtBQUNBLFNBQUtYLFVBQUwsQ0FBZ0JVLG1CQUFoQixDQUFvQyxnQkFBcEMsRUFBc0QsS0FBS0UsWUFBM0QsRUFBeUUsS0FBekU7QUFDQSxTQUFL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QWxCLENBQTRCUSxNQUE1QixDQUFtQzFCLElBQW5DLEVBQXlDc0gsSUFBekM7QUFDQXhHLE1BQUFBLGlCQUFpQixDQUFDRSxhQUFsQixDQUFnQzFCLE9BQWhDLENBQXdDLEtBQXhDLEVBQStDcUIsUUFBL0MsQ0FBd0QsU0FBeEQ7QUFDQTs7QUFuTndCO0FBQUE7QUFBQSxDQUExQjtBQXFOQW5ELENBQUMsQ0FBQ0gsUUFBRCxDQUFELENBQVlrSyxLQUFaLENBQWtCLFlBQU07QUFDdkJ6RyxFQUFBQSxpQkFBaUIsQ0FBQ00sVUFBbEI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRXh0ZW5zaW9ucywgbW9tZW50LCBnbG9iYWxUcmFuc2xhdGUgKi9cbi8qKlxuICog0JrQu9Cw0YHRgSDQtNC40L3QsNC80LjRh9C10YHQutC4INGB0L7Qt9C00LDQstCw0LXQvNGL0YUg0L/RgNC+0LjQs9GA0YvQstCw0LXRgtC10LvQuSDQtNC70Y8gQ0RSXG4gKlxuICovXG5jbGFzcyBDRFJQbGF5ZXIge1xuXHRjb25zdHJ1Y3RvcihpZCkge1xuXHRcdHRoaXMuaWQgPSBpZDtcblx0XHR0aGlzLmh0bWw1QXVkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgYXVkaW8tcGxheWVyLSR7aWR9YCk7XG5cdFx0Y29uc3QgJHJvdyA9ICQoYCMke2lkfWApO1xuXHRcdHRoaXMuJHBCdXR0b24gPSAkcm93LmZpbmQoJ2kucGxheScpOyAvLyBwbGF5IGJ1dHRvblxuXHRcdHRoaXMuJGRCdXR0b24gPSAkcm93LmZpbmQoJ2kuZG93bmxvYWQnKTsgLy8gZG93bmxvYWQgYnV0dG9uXG5cdFx0dGhpcy4kc2xpZGVyID0gJHJvdy5maW5kKCdkaXYuY2RyLXBsYXllcicpO1xuXHRcdHRoaXMuJHNwYW5EdXJhdGlvbiA9ICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKTtcblx0XHR0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG5cdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHR0aGlzLiRwQnV0dG9uLnVuYmluZCgpO1xuXHRcdHRoaXMuJGRCdXR0b24udW5iaW5kKCk7XG5cblxuXHRcdC8vIHBsYXkgYnV0dG9uIGV2ZW50IGxpc3RlbnRlclxuXHRcdHRoaXMuJHBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHRoaXMucGxheSgpO1xuXHRcdH0pO1xuXG5cdFx0Ly8gZG93bmxvYWQgYnV0dG9uIGV2ZW50IGxpc3RlbnRlclxuXHRcdHRoaXMuJGRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG5cblx0XHQvLyB0aW1ldXBkYXRlIGV2ZW50IGxpc3RlbmVyXG5cdFx0dGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXG5cdFx0Ly8gbm8gc3JjIGhhbmRsZXJcblx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzLmNiT25TcmNNZWRpYUVycm9yLCBmYWxzZSk7XG5cblx0XHR0aGlzLiRzbGlkZXIucmFuZ2Uoe1xuXHRcdFx0bWluOiAwLFxuXHRcdFx0bWF4OiAxMDAsXG5cdFx0XHRzdGFydDogMCxcblx0XHRcdG9uQ2hhbmdlOiB0aGlzLmNiT25TbGlkZXJDaGFuZ2UsXG5cdFx0XHRodG1sNUF1ZGlvOiB0aGlzLmh0bWw1QXVkaW8sXG5cdFx0XHRjYlRpbWVVcGRhdGU6IHRoaXMuY2JUaW1lVXBkYXRlLFxuXHRcdFx0c3BhbkR1cmF0aW9uOiB0aGlzLiRzcGFuRHVyYXRpb24sXG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLRh9C40Log0L/QvtC00LPRgNGD0LfQutC4INC80LXRgtCw0LTQsNC90L3Ri9GFXG5cdCAqL1xuXHRjYk9uTWV0YWRhdGFMb2FkZWQoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcblx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShudWxsKTtcblx0XHRcdGRhdGUuc2V0U2Vjb25kcyhwYXJzZUludCh0aGlzLmN1cnJlbnRUaW1lLCAxMCkpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcblx0XHRcdGNvbnN0IGN1cnJlbnRUaW1lID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG5cdFx0XHRkYXRlLnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5kdXJhdGlvbiwgMTApKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG5cdFx0XHRjb25zdCBkYXRlU3RyID0gZGF0ZS50b0lTT1N0cmluZygpO1xuXHRcdFx0Y29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcblx0XHRcdGxldCBkdXJhdGlvbjtcblx0XHRcdGlmIChob3VycyA9PT0gMCkge1xuXHRcdFx0XHRkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDE0LCA1KTtcblx0XHRcdH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuXHRcdFx0XHRkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDEyLCA3KTtcblx0XHRcdH0gZWxzZSBpZiAoaG91cnMgPj0gMTApIHtcblx0XHRcdFx0ZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMSwgOCk7XG5cdFx0XHR9XG5cdFx0XHQkcm93LmZpbmQoJ3NwYW4uY2RyLWR1cmF0aW9uJykudGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICog0JrQvtC70LHQtdC6INC90LAg0YHQtNCy0LjQsyDRgdC70LDQudC00LXRgNCwINC/0YDQvtC40LPRgNGL0LLQsNGC0LXQu9GPXG5cdCAqIEBwYXJhbSBuZXdWYWxcblx0ICogQHBhcmFtIG1ldGFcblx0ICovXG5cdGNiT25TbGlkZXJDaGFuZ2UobmV3VmFsLCBtZXRhKSB7XG5cdFx0aWYgKG1ldGEudHJpZ2dlcmVkQnlVc2VyICYmIE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgPSAodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uICogbmV3VmFsKSAvIDEwMDtcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHR9XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG5cdFx0XHRjb25zdCBkYXRlQ3VycmVudCA9IG5ldyBEYXRlKG51bGwpO1xuXHRcdFx0ZGF0ZUN1cnJlbnQuc2V0U2Vjb25kcyhwYXJzZUludCh0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUsIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgY3VycmVudFRpbWUgPSBkYXRlQ3VycmVudC50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG5cdFx0XHRjb25zdCBkYXRlRHVyYXRpb24gPSBuZXcgRGF0ZShudWxsKTtcblx0XHRcdGRhdGVEdXJhdGlvbi5zZXRTZWNvbmRzKHBhcnNlSW50KHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiwgMTApKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG5cdFx0XHRjb25zdCBkYXRlU3RyID0gZGF0ZUR1cmF0aW9uLnRvSVNPU3RyaW5nKCk7XG5cdFx0XHRjb25zdCBob3VycyA9IHBhcnNlSW50KGRhdGVTdHIuc3Vic3RyKDExLCAyKSwgMTApO1xuXHRcdFx0bGV0IGR1cmF0aW9uO1xuXHRcdFx0aWYgKGhvdXJzID09PSAwKSB7XG5cdFx0XHRcdGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0fSBlbHNlIGlmIChob3VycyA8IDEwKSB7XG5cdFx0XHRcdGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTIsIDcpO1xuXHRcdFx0fSBlbHNlIGlmIChob3VycyA+PSAxMCkge1xuXHRcdFx0XHRkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDExLCA4KTtcblx0XHRcdH1cblx0XHRcdHRoaXMuc3BhbkR1cmF0aW9uLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqINCa0L7Qu9Cx0LXQuiDQvdCwINC40LfQvNC10L3QtdC90LjQtSDQv9C+0LfQuNGG0LjQuCDQv9GA0L7QuNCz0YDRi9Cy0LDQtdC80L7Qs9C+INGE0LDQudC70LAg0LjQtyBIVE1MNSDQsNGD0LTQuNC+0YLQtdCz0LBcblx0ICovXG5cdGNiVGltZVVwZGF0ZSgpIHtcblx0XHRpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuZHVyYXRpb24pKSB7XG5cdFx0XHRjb25zdCBwZXJjZW50ID0gdGhpcy5jdXJyZW50VGltZSAvIHRoaXMuZHVyYXRpb247XG5cdFx0XHRjb25zdCByYW5nZVBvc2l0aW9uID0gTWF0aC5taW4oTWF0aC5yb3VuZCgocGVyY2VudCkgKiAxMDApLCAxMDApO1xuXHRcdFx0Y29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcblx0XHRcdCRyb3cuZmluZCgnZGl2LmNkci1wbGF5ZXInKS5yYW5nZSgnc2V0IHZhbHVlJywgcmFuZ2VQb3NpdGlvbik7XG5cdFx0XHRpZiAodGhpcy5jdXJyZW50VGltZSA9PT0gdGhpcy5kdXJhdGlvbikge1xuXHRcdFx0XHQkcm93LmZpbmQoJ2kucGF1c2UnKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiDQl9Cw0L/Rg9GB0Log0Lgg0L7RgdGC0LDQvdC+0LLQutCwINCy0L7RgdC/0YDQvtC40LfQstC10LTQtdC90LjRjyDQsNGD0LTQuNC+INGE0LDQudC70LBcblx0ICog0L/QviDQutC70LjQutGDINC90LAg0LjQutC+0L3QutGDIFBsYXlcblx0ICovXG5cdHBsYXkoKSB7XG5cdFx0Ly8gc3RhcnQgbXVzaWNcblx0XHRpZiAodGhpcy5odG1sNUF1ZGlvLnBhdXNlZCkge1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcblx0XHRcdC8vIHJlbW92ZSBwbGF5LCBhZGQgcGF1c2Vcblx0XHRcdHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcblx0XHR9IGVsc2UgeyAvLyBwYXVzZSBtdXNpY1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG5cdFx0XHQvLyByZW1vdmUgcGF1c2UsIGFkZCBwbGF5XG5cdFx0XHR0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0LrQsCDQvtGI0LjQsdC60Lgg0L/QvtC70YPRh9C10L3RjyDQt9Cy0YPQutC+0LLQvtCz0L4g0YTQsNC50LvQsFxuXHQgKi9cblx0Y2JPblNyY01lZGlhRXJyb3IoKSB7XG5cdFx0JCh0aGlzKS5jbG9zZXN0KCd0cicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHR9XG59XG5cbi8qKlxuICog0JrQu9Cw0YHRgSDRgdGC0YDQsNC90LjRhtGLINGBIENEUlxuICovXG5jb25zdCBjYWxsRGV0YWlsUmVjb3JkcyA9IHtcblx0JGNkclRhYmxlOiAkKCcjY2RyLXRhYmxlJyksXG5cdCRnbG9iYWxTZWFyY2g6ICQoJyNnbG9iYWxzZWFyY2gnKSxcblx0JGRhdGVSYW5nZVNlbGVjdG9yOiAkKCcjZGF0ZS1yYW5nZS1zZWxlY3RvcicpLFxuXHRkYXRhVGFibGU6IHt9LFxuXHRwbGF5ZXJzOiBbXSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IoKTtcblxuXHRcdGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcblx0XHRcdGlmIChlLmtleUNvZGUgPT09IDEzXG5cdFx0XHRcdHx8IGUua2V5Q29kZSA9PT0gOFxuXHRcdFx0XHR8fCBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRjb25zdCB0ZXh0ID0gYCR7Y2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLnZhbCgpfSAke2NhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCl9YDtcblx0XHRcdFx0Y2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIodGV4dCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZGF0YVRhYmxlKHtcblx0XHRcdHNlYXJjaDoge1xuXHRcdFx0XHRzZWFyY2g6IGAke2NhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci52YWwoKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWAsXG5cdFx0XHR9LFxuXHRcdFx0c2VydmVyU2lkZTogdHJ1ZSxcblx0XHRcdHByb2Nlc3Npbmc6IHRydWUsXG5cdFx0XHRhamF4OiB7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1jYWxsLWRldGFpbC1yZWNvcmRzL2dldE5ld1JlY29yZHNgLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHR9LFxuXHRcdFx0cGFnaW5nOiB0cnVlLFxuXHRcdFx0c2Nyb2xsWTogJCh3aW5kb3cpLmhlaWdodCgpIC0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9mZnNldCgpLnRvcCAtIDQyMCxcblx0XHRcdC8vIHN0YXRlU2F2ZTogdHJ1ZSxcblx0XHRcdHNEb206ICdydGlwJyxcblx0XHRcdGRlZmVyUmVuZGVyOiB0cnVlLFxuXHRcdFx0cGFnZUxlbmd0aDogMTcsXG5cdFx0XHQvLyBzY3JvbGxDb2xsYXBzZTogdHJ1ZSxcblx0XHRcdC8vIHNjcm9sbGVyOiB0cnVlLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiDQmtC+0L3RgdGC0YDRg9C60YLQvtGAINGB0YLRgNC+0LrQuCBDRFJcblx0XHRcdCAqIEBwYXJhbSByb3dcblx0XHRcdCAqIEBwYXJhbSBkYXRhXG5cdFx0XHQgKi9cblx0XHRcdGNyZWF0ZWRSb3cocm93LCBkYXRhKSB7XG5cdFx0XHRcdGlmIChkYXRhLkRUX1Jvd0NsYXNzID09PSAnZGV0YWlsZWQnKSB7XG5cdFx0XHRcdFx0JCgndGQnLCByb3cpLmVxKDApLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBjYXJldCBkb3duXCI+PC9pPicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCcnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoJ3RkJywgcm93KS5lcSgxKS5odG1sKGRhdGFbMF0pO1xuXHRcdFx0XHQkKCd0ZCcsIHJvdykuZXEoMilcblx0XHRcdFx0XHQuaHRtbChkYXRhWzFdKVxuXHRcdFx0XHRcdC5hZGRDbGFzcygnbmVlZC11cGRhdGUnKTtcblx0XHRcdFx0JCgndGQnLCByb3cpLmVxKDMpXG5cdFx0XHRcdFx0Lmh0bWwoZGF0YVsyXSlcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG5cdFx0XHRcdCQoJ3RkJywgcm93KS5lcSg0KS5odG1sKGRhdGFbM10pO1xuXHRcdFx0fSxcblx0XHRcdC8qKlxuXHRcdFx0ICogRHJhdyBldmVudCAtIGZpcmVkIG9uY2UgdGhlIHRhYmxlIGhhcyBjb21wbGV0ZWQgYSBkcmF3LlxuXHRcdFx0ICovXG5cdFx0XHRkcmF3Q2FsbGJhY2soKSB7XG5cdFx0XHRcdEV4dGVuc2lvbnMuVXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuXHRcdFx0fSxcblx0XHRcdGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG5cdFx0XHRvcmRlcmluZzogZmFsc2UsXG5cdFx0fSk7XG5cdFx0Y2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLkRhdGFUYWJsZSgpO1xuXG5cdFx0Y2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuXHRcdFx0Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH0pO1xuXG5cblx0XHQvLyBBZGQgZXZlbnQgbGlzdGVuZXIgZm9yIG9wZW5pbmcgYW5kIGNsb3NpbmcgZGV0YWlsc1xuXHRcdGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAndHIuZGV0YWlsZWQnLCAoZSkgPT4ge1xuXHRcdFx0Y29uc3QgdHIgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuXHRcdFx0Y29uc3Qgcm93ID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnJvdyh0cik7XG5cblx0XHRcdGlmIChyb3cuY2hpbGQuaXNTaG93bigpKSB7XG5cdFx0XHRcdC8vIFRoaXMgcm93IGlzIGFscmVhZHkgb3BlbiAtIGNsb3NlIGl0XG5cdFx0XHRcdHJvdy5jaGlsZC5oaWRlKCk7XG5cdFx0XHRcdHRyLnJlbW92ZUNsYXNzKCdzaG93bicpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gT3BlbiB0aGlzIHJvd1xuXG5cdFx0XHRcdHJvdy5jaGlsZChjYWxsRGV0YWlsUmVjb3Jkcy5zaG93UmVjb3Jkcyhyb3cuZGF0YSgpKSkuc2hvdygpO1xuXG5cdFx0XHRcdHRyLmFkZENsYXNzKCdzaG93bicpO1xuXHRcdFx0XHRyb3cuY2hpbGQoKS5maW5kKCcuZGV0YWlsLXJlY29yZC1yb3cnKS5lYWNoKChpbmRleCwgcGxheWVyUm93KSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgaWQgPSAkKHBsYXllclJvdykuYXR0cignaWQnKTtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IENEUlBsYXllcihpZCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRFeHRlbnNpb25zLlVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0YLRgNC40YHQvtCy0YvQstCw0LXRgiDQvdCw0LHQvtGAINGBINC30LDQv9C40YHRj9C80Lgg0YDQsNC30LPQvtCy0L7RgNC+0LIg0L/RgNC4INC60LvQuNC60LUg0L3QsCDRgdGC0YDQvtC60YNcblx0ICovXG5cdHNob3dSZWNvcmRzKGRhdGEpIHtcblx0XHRsZXQgaHRtbFBsYXllciA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGJhc2ljIHRhYmxlIGNkci1wbGF5ZXJcIj48dGJvZHk+Jztcblx0XHRkYXRhWzRdLmZvckVhY2goKHJlY29yZCwgaSkgPT4ge1xuXHRcdFx0aWYgKGkgPiAwKSB7XG5cdFx0XHRcdGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG5cdFx0XHRcdGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IHVuZGVmaW5lZFxuXHRcdFx0XHR8fCByZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gbnVsbFxuXHRcdFx0XHR8fCByZWNvcmQucmVjb3JkaW5nZmlsZS5sZW5ndGggPT09IDApIHtcblxuXHRcdFx0XHRodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3cgZGlzYWJsZWRcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiXCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiXCI+PC9pPlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5zcmNfbnVtfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5kc3RfbnVtfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGV0IHJlY29yZEZpbGVOYW1lID0gYENhbGxfcmVjb3JkX2JldHdlZW5fJHtyZWNvcmQuc3JjX251bX1fYW5kXyR7cmVjb3JkLmRzdF9udW19X2Zyb21fJHtkYXRhWzBdfWA7XG5cdFx0XHRcdHJlY29yZEZpbGVOYW1lLnJlcGxhY2UoL1teXFx3XFxzIT9dL2csICcnKTtcblx0XHRcdFx0cmVjb3JkRmlsZU5hbWUgPSBlbmNvZGVVUklDb21wb25lbnQocmVjb3JkRmlsZU5hbWUpO1xuXHRcdFx0XHRjb25zdCByZWNvcmRGaWxlVXJpID0gZW5jb2RlVVJJQ29tcG9uZW50KHJlY29yZC5yZWNvcmRpbmdmaWxlKTtcblx0XHRcdFx0aHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93XCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIi9wYnhjb3JlL2FwaS9jZHIvcGxheWJhY2s/dmlldz0ke3JlY29yZEZpbGVVcml9XCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiL3BieGNvcmUvYXBpL2Nkci9wbGF5YmFjaz92aWV3PSR7cmVjb3JkRmlsZVVyaX0mZG93bmxvYWQ9MSZmaWxlbmFtZT0ke3JlY29yZEZpbGVOYW1lfS5tcDNcIj48L2k+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLnNyY19udW19PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGUgY2VudGVyIGFsaWduZWRcIj48aSBjbGFzcz1cImljb24gZXhjaGFuZ2VcIj48L2k+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwibGVmdCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLmRzdF9udW19PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0aHRtbFBsYXllciArPSAnPC90Ym9keT48L3RhYmxlPic7XG5cdFx0cmV0dXJuIGh0bWxQbGF5ZXI7XG5cdH0sXG5cdC8qKlxuXHQgKlxuXHQgKi9cblx0aW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKCkge1xuXHRcdGNvbnN0IG9wdGlvbnMgPSB7fTtcblxuXHRcdG9wdGlvbnMucmFuZ2VzID0ge1xuXHRcdFx0W2dsb2JhbFRyYW5zbGF0ZS7RgWFsX1RvZGF5XTogW21vbWVudCgpLCBtb21lbnQoKV0sXG5cdFx0XHRbZ2xvYmFsVHJhbnNsYXRlLtGBYWxfWWVzdGVyZGF5XTogW21vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyksIG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyldLFxuXHRcdFx0W2dsb2JhbFRyYW5zbGF0ZS7RgWFsX0xhc3RXZWVrXTogW21vbWVudCgpLnN1YnRyYWN0KDYsICdkYXlzJyksIG1vbWVudCgpXSxcblx0XHRcdFtnbG9iYWxUcmFuc2xhdGUu0YFhbF9MYXN0MzBEYXlzXTogW21vbWVudCgpLnN1YnRyYWN0KDI5LCAnZGF5cycpLCBtb21lbnQoKV0sXG5cdFx0XHRbZ2xvYmFsVHJhbnNsYXRlLtGBYWxfVGhpc01vbnRoXTogW21vbWVudCgpLnN0YXJ0T2YoJ21vbnRoJyksIG1vbWVudCgpLmVuZE9mKCdtb250aCcpXSxcblx0XHRcdFtnbG9iYWxUcmFuc2xhdGUu0YFhbF9MYXN0TW9udGhdOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuZW5kT2YoJ21vbnRoJyldLFxuXHRcdH07XG5cdFx0b3B0aW9ucy5hbHdheXNTaG93Q2FsZW5kYXJzID0gdHJ1ZTtcblx0XHRvcHRpb25zLmF1dG9VcGRhdGVJbnB1dCA9IHRydWU7XG5cdFx0b3B0aW9ucy5saW5rZWRDYWxlbmRhcnMgPSB0cnVlO1xuXHRcdG9wdGlvbnMubWF4RGF0ZSA9IG1vbWVudCgpO1xuXHRcdG9wdGlvbnMubG9jYWxlID0ge1xuXHRcdFx0Zm9ybWF0OiAnREQvTU0vWVlZWScsXG5cdFx0XHRzZXBhcmF0b3I6ICcgLSAnLFxuXHRcdFx0YXBwbHlMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLtGBYWxfQXBwbHlCdG4sXG5cdFx0XHRjYW5jZWxMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLtGBYWxfQ2FuY2VsQnRuLFxuXHRcdFx0ZnJvbUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUu0YFhbF9mcm9tLFxuXHRcdFx0dG9MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLtGBYWxfdG8sXG5cdFx0XHRjdXN0b21SYW5nZUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUu0YFhbF9DdXN0b21QZXJpb2QsXG5cdFx0XHRkYXlzT2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQuZGF5cyxcblx0XHRcdG1vbnRoTmFtZXM6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5tb250aHMsXG5cdFx0XHRmaXJzdERheTogMSxcblx0XHR9O1xuXHRcdG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KCk7XG5cdFx0b3B0aW9ucy5lbmREYXRlID0gbW9tZW50KCk7XG5cdFx0Y2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGVyYW5nZXBpY2tlcihcblx0XHRcdG9wdGlvbnMsXG5cdFx0XHRjYWxsRGV0YWlsUmVjb3Jkcy5jYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QsXG5cdFx0KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INCy0YvQsdC+0YDQsCDQv9C10YDQuNC+0LTQsFxuXHQgKiBAcGFyYW0gc3RhcnRcblx0ICogQHBhcmFtIGVuZFxuXHQgKiBAcGFyYW0gbGFiZWxcblx0ICovXG5cdGNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdChzdGFydCwgZW5kLCBsYWJlbCkge1xuXHRcdGNvbnN0IHRleHQgPSBgJHtzdGFydC5mb3JtYXQoJ0REL01NL1lZWVknKX0gJHtlbmQuZm9ybWF0KCdERC9NTS9ZWVlZJyl9ICR7Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKX1gO1xuXHRcdGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKHRleHQpO1xuXHR9LFxuXHQvKipcblx0ICpcblx0ICovXG5cdGFwcGx5RmlsdGVyKHRleHQpIHtcblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdH0sXG59O1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==