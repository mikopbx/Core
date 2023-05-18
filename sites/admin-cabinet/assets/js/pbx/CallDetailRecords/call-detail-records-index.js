"use strict";

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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
var CDRPlayer = /*#__PURE__*/function () {
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
     * Колбек на сдвиг слайдера проигрывателя
     * @param newVal
     * @param meta
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
     * Колбек на изменение позиции проигрываемого файла из HTML5 аудиотега
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
     * Запуск и остановка воспроизведения аудио файла
     * по клику на иконку Play
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
     * Обработка ошибки полученя звукового файла
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
 * Класс страницы с CDR
 */


var callDetailRecords = {
  $cdrTable: $('#cdr-table'),
  $globalSearch: $('#globalsearch'),
  $dateRangeSelector: $('#date-range-selector'),
  dataTable: {},
  players: [],
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
       * Конструктор строки CDR
       * @param row
       * @param data
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
   * Отрисовывает набор с записями разговоров при клике на строку
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
   *
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
   * Обработчик выбора периода
   * @param start
   * @param end
   * @param label
   */
  cbDateRangeSelectorOnSelect: function cbDateRangeSelectorOnSelect(start, end, label) {
    var text = "".concat(start.format('DD/MM/YYYY'), " ").concat(end.format('DD/MM/YYYY'), " ").concat(callDetailRecords.$globalSearch.val());
    callDetailRecords.applyFilter(text);
  },

  /**
   *
   */
  applyFilter: function applyFilter(text) {
    callDetailRecords.dataTable.search(text).draw();
    callDetailRecords.$globalSearch.closest('div').addClass('loading');
  }
};
$(document).ready(function () {
  callDetailRecords.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbIkNEUlBsYXllciIsImlkIiwiaHRtbDVBdWRpbyIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCIkcm93IiwiJCIsIiRwQnV0dG9uIiwiZmluZCIsIiRkQnV0dG9uIiwiJHNsaWRlciIsIiRzcGFuRHVyYXRpb24iLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiY2JPbk1ldGFkYXRhTG9hZGVkIiwiY2JUaW1lVXBkYXRlIiwidW5iaW5kIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJwbGF5Iiwid2luZG93IiwibG9jYXRpb24iLCJ0YXJnZXQiLCJhdHRyIiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25TcmNNZWRpYUVycm9yIiwicmFuZ2UiLCJtaW4iLCJtYXgiLCJzdGFydCIsIm9uQ2hhbmdlIiwiY2JPblNsaWRlckNoYW5nZSIsInNwYW5EdXJhdGlvbiIsIk51bWJlciIsImlzRmluaXRlIiwiZHVyYXRpb24iLCJjbG9zZXN0IiwiZGF0ZSIsIkRhdGUiLCJzZXRTZWNvbmRzIiwicGFyc2VJbnQiLCJjdXJyZW50VGltZSIsInRvSVNPU3RyaW5nIiwic3Vic3RyIiwiZGF0ZVN0ciIsImhvdXJzIiwidGV4dCIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJkYXRlQ3VycmVudCIsImRhdGVEdXJhdGlvbiIsInBlcmNlbnQiLCJyYW5nZVBvc2l0aW9uIiwiTWF0aCIsInJvdW5kIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInBhdXNlZCIsInBhdXNlIiwiY2FsbERldGFpbFJlY29yZHMiLCIkY2RyVGFibGUiLCIkZ2xvYmFsU2VhcmNoIiwiJGRhdGVSYW5nZVNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IiLCJrZXlDb2RlIiwidmFsIiwibGVuZ3RoIiwiYXBwbHlGaWx0ZXIiLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwidHlwZSIsInBhZ2luZyIsInNjcm9sbFkiLCJoZWlnaHQiLCJvZmZzZXQiLCJ0b3AiLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJwYWdlTGVuZ3RoIiwiY3JlYXRlZFJvdyIsInJvdyIsImRhdGEiLCJEVF9Sb3dDbGFzcyIsImVxIiwiaHRtbCIsImlkcyIsImRyYXdDYWxsYmFjayIsIkV4dGVuc2lvbnMiLCJVcGRhdGVQaG9uZXNSZXByZXNlbnQiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJ1bmRlZmluZWQiLCJ0ciIsImNoaWxkIiwiaXNTaG93biIsImhpZGUiLCJzaG93UmVjb3JkcyIsInNob3ciLCJlYWNoIiwiaW5kZXgiLCJwbGF5ZXJSb3ciLCJodG1sUGxheWVyIiwiZm9yRWFjaCIsInJlY29yZCIsImkiLCJyZWNvcmRpbmdmaWxlIiwic3JjX251bSIsImRzdF9udW0iLCJyZWNvcmRGaWxlTmFtZSIsInJlcGxhY2UiLCJlbmNvZGVVUklDb21wb25lbnQiLCJyZWNvcmRGaWxlVXJpIiwib3B0aW9ucyIsInJhbmdlcyIsImdsb2JhbFRyYW5zbGF0ZSIsItGBYWxfVG9kYXkiLCJtb21lbnQiLCLRgWFsX1llc3RlcmRheSIsInN1YnRyYWN0Iiwi0YFhbF9MYXN0V2VlayIsItGBYWxfTGFzdDMwRGF5cyIsItGBYWxfVGhpc01vbnRoIiwic3RhcnRPZiIsImVuZE9mIiwi0YFhbF9MYXN0TW9udGgiLCJhbHdheXNTaG93Q2FsZW5kYXJzIiwiYXV0b1VwZGF0ZUlucHV0IiwibGlua2VkQ2FsZW5kYXJzIiwibWF4RGF0ZSIsImxvY2FsZSIsImZvcm1hdCIsInNlcGFyYXRvciIsImFwcGx5TGFiZWwiLCLRgWFsX0FwcGx5QnRuIiwiY2FuY2VsTGFiZWwiLCLRgWFsX0NhbmNlbEJ0biIsImZyb21MYWJlbCIsItGBYWxfZnJvbSIsInRvTGFiZWwiLCLRgWFsX3RvIiwiY3VzdG9tUmFuZ2VMYWJlbCIsItGBYWxfQ3VzdG9tUGVyaW9kIiwiZGF5c09mV2VlayIsImNhbGVuZGFyVGV4dCIsImRheXMiLCJtb250aE5hbWVzIiwibW9udGhzIiwiZmlyc3REYXkiLCJzdGFydERhdGUiLCJlbmREYXRlIiwiZGF0ZXJhbmdlcGlja2VyIiwiY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0IiwiZW5kIiwibGFiZWwiLCJkcmF3IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLFM7QUFDTCxxQkFBWUMsRUFBWixFQUFnQjtBQUFBOztBQUFBOztBQUNmLFNBQUtBLEVBQUwsR0FBVUEsRUFBVjtBQUNBLFNBQUtDLFVBQUwsR0FBa0JDLFFBQVEsQ0FBQ0MsY0FBVCx3QkFBd0NILEVBQXhDLEVBQWxCO0FBQ0EsUUFBTUksSUFBSSxHQUFHQyxDQUFDLFlBQUtMLEVBQUwsRUFBZDtBQUNBLFNBQUtNLFFBQUwsR0FBZ0JGLElBQUksQ0FBQ0csSUFBTCxDQUFVLFFBQVYsQ0FBaEIsQ0FKZSxDQUlzQjs7QUFDckMsU0FBS0MsUUFBTCxHQUFnQkosSUFBSSxDQUFDRyxJQUFMLENBQVUsWUFBVixDQUFoQixDQUxlLENBSzBCOztBQUN6QyxTQUFLRSxPQUFMLEdBQWVMLElBQUksQ0FBQ0csSUFBTCxDQUFVLGdCQUFWLENBQWY7QUFDQSxTQUFLRyxhQUFMLEdBQXFCTixJQUFJLENBQUNHLElBQUwsQ0FBVSxtQkFBVixDQUFyQjtBQUNBLFNBQUtOLFVBQUwsQ0FBZ0JVLG1CQUFoQixDQUFvQyxZQUFwQyxFQUFrRCxLQUFLQyxrQkFBdkQsRUFBMkUsS0FBM0U7QUFD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QUFBLGlCQUFpQixDQUFDRSxhQUFsQixDQUFnQzFCLE9BQWhDLENBQXdDLEtBQXhDLEVBQStDcUIsUUFBL0MsQ0FBd0QsU0FBeEQ7QUFDQTtBQS9Od0IsQ0FBMUI7QUFpT0FuRCxDQUFDLENBQUNILFFBQUQsQ0FBRCxDQUFZbUssS0FBWixDQUFrQixZQUFNO0FBQ3ZCMUcsRUFBQUEsaUJBQWlCLENBQUNNLFVBQWxCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEV4dGVuc2lvbnMsIG1vbWVudCwgZ2xvYmFsVHJhbnNsYXRlICovXG4vKipcbiAqINCa0LvQsNGB0YEg0LTQuNC90LDQvNC40YfQtdGB0LrQuCDRgdC+0LfQtNCw0LLQsNC10LzRi9GFINC/0YDQvtC40LPRgNGL0LLQsNC10YLQtdC70Lkg0LTQu9GPIENEUlxuICpcbiAqL1xuY2xhc3MgQ0RSUGxheWVyIHtcblx0Y29uc3RydWN0b3IoaWQpIHtcblx0XHR0aGlzLmlkID0gaWQ7XG5cdFx0dGhpcy5odG1sNUF1ZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGF1ZGlvLXBsYXllci0ke2lkfWApO1xuXHRcdGNvbnN0ICRyb3cgPSAkKGAjJHtpZH1gKTtcblx0XHR0aGlzLiRwQnV0dG9uID0gJHJvdy5maW5kKCdpLnBsYXknKTsgLy8gcGxheSBidXR0b25cblx0XHR0aGlzLiRkQnV0dG9uID0gJHJvdy5maW5kKCdpLmRvd25sb2FkJyk7IC8vIGRvd25sb2FkIGJ1dHRvblxuXHRcdHRoaXMuJHNsaWRlciA9ICRyb3cuZmluZCgnZGl2LmNkci1wbGF5ZXInKTtcblx0XHR0aGlzLiRzcGFuRHVyYXRpb24gPSAkcm93LmZpbmQoJ3NwYW4uY2RyLWR1cmF0aW9uJyk7XG5cdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZCwgZmFsc2UpO1xuXHRcdHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0dGhpcy4kcEJ1dHRvbi51bmJpbmQoKTtcblx0XHR0aGlzLiRkQnV0dG9uLnVuYmluZCgpO1xuXG5cblx0XHQvLyBwbGF5IGJ1dHRvbiBldmVudCBsaXN0ZW50ZXJcblx0XHR0aGlzLiRwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR0aGlzLnBsYXkoKTtcblx0XHR9KTtcblxuXHRcdC8vIGRvd25sb2FkIGJ1dHRvbiBldmVudCBsaXN0ZW50ZXJcblx0XHR0aGlzLiRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSAkKGUudGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZCwgZmFsc2UpO1xuXG5cdFx0Ly8gdGltZXVwZGF0ZSBldmVudCBsaXN0ZW5lclxuXHRcdHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblxuXHRcdC8vIG5vIHNyYyBoYW5kbGVyXG5cdFx0dGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5jYk9uU3JjTWVkaWFFcnJvciwgZmFsc2UpO1xuXG5cdFx0dGhpcy4kc2xpZGVyLnJhbmdlKHtcblx0XHRcdG1pbjogMCxcblx0XHRcdG1heDogMTAwLFxuXHRcdFx0c3RhcnQ6IDAsXG5cdFx0XHRvbkNoYW5nZTogdGhpcy5jYk9uU2xpZGVyQ2hhbmdlLFxuXHRcdFx0aHRtbDVBdWRpbzogdGhpcy5odG1sNUF1ZGlvLFxuXHRcdFx0Y2JUaW1lVXBkYXRlOiB0aGlzLmNiVGltZVVwZGF0ZSxcblx0XHRcdHNwYW5EdXJhdGlvbjogdGhpcy4kc3BhbkR1cmF0aW9uLFxuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INC/0L7QtNCz0YDRg9C30LrQuCDQvNC10YLQsNC00LDQvdC90YvRhVxuXHQgKi9cblx0Y2JPbk1ldGFkYXRhTG9hZGVkKCkge1xuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcblx0XHRcdGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG5cdFx0XHRkYXRlLnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5jdXJyZW50VGltZSwgMTApKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG5cdFx0XHRjb25zdCBjdXJyZW50VGltZSA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0ZGF0ZS5zZXRTZWNvbmRzKHBhcnNlSW50KHRoaXMuZHVyYXRpb24sIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IGRhdGUudG9JU09TdHJpbmcoKTtcblx0XHRcdGNvbnN0IGhvdXJzID0gcGFyc2VJbnQoZGF0ZVN0ci5zdWJzdHIoMTEsIDIpLCAxMCk7XG5cdFx0XHRsZXQgZHVyYXRpb247XG5cdFx0XHRpZiAoaG91cnMgPT09IDApIHtcblx0XHRcdFx0ZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG5cdFx0XHR9IGVsc2UgaWYgKGhvdXJzIDwgMTApIHtcblx0XHRcdFx0ZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMiwgNyk7XG5cdFx0XHR9IGVsc2UgaWYgKGhvdXJzID49IDEwKSB7XG5cdFx0XHRcdGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTEsIDgpO1xuXHRcdFx0fVxuXHRcdFx0JHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqINCa0L7Qu9Cx0LXQuiDQvdCwINGB0LTQstC40LMg0YHQu9Cw0LnQtNC10YDQsCDQv9GA0L7QuNCz0YDRi9Cy0LDRgtC10LvRj1xuXHQgKiBAcGFyYW0gbmV3VmFsXG5cdCAqIEBwYXJhbSBtZXRhXG5cdCAqL1xuXHRjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuXHRcdGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID0gKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0fVxuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgZGF0ZUN1cnJlbnQgPSBuZXcgRGF0ZShudWxsKTtcblx0XHRcdGRhdGVDdXJyZW50LnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lLCAxMCkpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcblx0XHRcdGNvbnN0IGN1cnJlbnRUaW1lID0gZGF0ZUN1cnJlbnQudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0Y29uc3QgZGF0ZUR1cmF0aW9uID0gbmV3IERhdGUobnVsbCk7XG5cdFx0XHRkYXRlRHVyYXRpb24uc2V0U2Vjb25kcyhwYXJzZUludCh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24sIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IGRhdGVEdXJhdGlvbi50b0lTT1N0cmluZygpO1xuXHRcdFx0Y29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcblx0XHRcdGxldCBkdXJhdGlvbjtcblx0XHRcdGlmIChob3VycyA9PT0gMCkge1xuXHRcdFx0XHRkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDE0LCA1KTtcblx0XHRcdH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuXHRcdFx0XHRkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDEyLCA3KTtcblx0XHRcdH0gZWxzZSBpZiAoaG91cnMgPj0gMTApIHtcblx0XHRcdFx0ZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMSwgOCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnNwYW5EdXJhdGlvbi50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiDQmtC+0LvQsdC10Log0L3QsCDQuNC30LzQtdC90LXQvdC40LUg0L/QvtC30LjRhtC40Lgg0L/RgNC+0LjQs9GA0YvQstCw0LXQvNC+0LPQviDRhNCw0LnQu9CwINC40LcgSFRNTDUg0LDRg9C00LjQvtGC0LXQs9CwXG5cdCAqL1xuXHRjYlRpbWVVcGRhdGUoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uO1xuXHRcdFx0Y29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgubWluKE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKSwgMTAwKTtcblx0XHRcdGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHQkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJykucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuXHRcdFx0aWYgKHRoaXMuY3VycmVudFRpbWUgPT09IHRoaXMuZHVyYXRpb24pIHtcblx0XHRcdFx0JHJvdy5maW5kKCdpLnBhdXNlJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICog0JfQsNC/0YPRgdC6INC4INC+0YHRgtCw0L3QvtCy0LrQsCDQstC+0YHQv9GA0L7QuNC30LLQtdC00LXQvdC40Y8g0LDRg9C00LjQviDRhNCw0LnQu9CwXG5cdCAqINC/0L4g0LrQu9C40LrRgyDQvdCwINC40LrQvtC90LrRgyBQbGF5XG5cdCAqL1xuXHRwbGF5KCkge1xuXHRcdC8vIHN0YXJ0IG11c2ljXG5cdFx0aWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQpIHtcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG5cdFx0XHQvLyByZW1vdmUgcGxheSwgYWRkIHBhdXNlXG5cdFx0XHR0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG5cdFx0fSBlbHNlIHsgLy8gcGF1c2UgbXVzaWNcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5wYXVzZSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBhdXNlLCBhZGQgcGxheVxuXHRcdFx0dGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtC60LAg0L7RiNC40LHQutC4INC/0L7Qu9GD0YfQtdC90Y8g0LfQstGD0LrQvtCy0L7Qs9C+INGE0LDQudC70LBcblx0ICovXG5cdGNiT25TcmNNZWRpYUVycm9yKCkge1xuXHRcdCQodGhpcykuY2xvc2VzdCgndHInKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0fVxufVxuXG4vKipcbiAqINCa0LvQsNGB0YEg0YHRgtGA0LDQvdC40YbRiyDRgSBDRFJcbiAqL1xuY29uc3QgY2FsbERldGFpbFJlY29yZHMgPSB7XG5cdCRjZHJUYWJsZTogJCgnI2Nkci10YWJsZScpLFxuXHQkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsc2VhcmNoJyksXG5cdCRkYXRlUmFuZ2VTZWxlY3RvcjogJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKSxcblx0ZGF0YVRhYmxlOiB7fSxcblx0cGxheWVyczogW10sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0Y2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKCk7XG5cblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XG5cdFx0XHRpZiAoZS5rZXlDb2RlID09PSAxM1xuXHRcdFx0XHR8fCBlLmtleUNvZGUgPT09IDhcblx0XHRcdFx0fHwgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0Y29uc3QgdGV4dCA9IGAke2NhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci52YWwoKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWA7XG5cdFx0XHRcdGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKHRleHQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Y2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmRhdGFUYWJsZSh7XG5cdFx0XHRzZWFyY2g6IHtcblx0XHRcdFx0c2VhcmNoOiBgJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IudmFsKCl9ICR7Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKX1gLFxuXHRcdFx0fSxcblx0XHRcdHNlcnZlclNpZGU6IHRydWUsXG5cdFx0XHRwcm9jZXNzaW5nOiB0cnVlLFxuXHRcdFx0YWpheDoge1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1kZXRhaWwtcmVjb3Jkcy9nZXROZXdSZWNvcmRzYCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0fSxcblx0XHRcdHBhZ2luZzogdHJ1ZSxcblx0XHRcdHNjcm9sbFk6ICQod2luZG93KS5oZWlnaHQoKSAtIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vZmZzZXQoKS50b3AgLSA0MjAsXG5cdFx0XHQvLyBzdGF0ZVNhdmU6IHRydWUsXG5cdFx0XHRzRG9tOiAncnRpcCcsXG5cdFx0XHRkZWZlclJlbmRlcjogdHJ1ZSxcblx0XHRcdHBhZ2VMZW5ndGg6IDE3LFxuXHRcdFx0Ly8gc2Nyb2xsQ29sbGFwc2U6IHRydWUsXG5cdFx0XHQvLyBzY3JvbGxlcjogdHJ1ZSxcblx0XHRcdC8qKlxuXHRcdFx0ICog0JrQvtC90YHRgtGA0YPQutGC0L7RgCDRgdGC0YDQvtC60LggQ0RSXG5cdFx0XHQgKiBAcGFyYW0gcm93XG5cdFx0XHQgKiBAcGFyYW0gZGF0YVxuXHRcdFx0ICovXG5cdFx0XHRjcmVhdGVkUm93KHJvdywgZGF0YSkge1xuXHRcdFx0XHRpZiAoZGF0YS5EVF9Sb3dDbGFzcyA9PT0gJ2RldGFpbGVkJykge1xuXHRcdFx0XHRcdCQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCc8aSBjbGFzcz1cImljb24gY2FyZXQgZG93blwiPjwvaT4nKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCgndGQnLCByb3cpLmVxKDEpLmh0bWwoZGF0YVswXSk7XG5cdFx0XHRcdCQoJ3RkJywgcm93KS5lcSgyKVxuXHRcdFx0XHRcdC5odG1sKGRhdGFbMV0pXG5cdFx0XHRcdFx0LmFkZENsYXNzKCduZWVkLXVwZGF0ZScpO1xuXHRcdFx0XHQkKCd0ZCcsIHJvdykuZXEoMylcblx0XHRcdFx0XHQuaHRtbChkYXRhWzJdKVxuXHRcdFx0XHRcdC5hZGRDbGFzcygnbmVlZC11cGRhdGUnKTtcblxuXHRcdFx0XHRsZXQgZHVyYXRpb24gPSBkYXRhWzNdO1xuXHRcdFx0XHRpZihkYXRhLmlkcyAhPT0gJycpe1xuXHRcdFx0XHRcdGR1cmF0aW9uICs9ICc8aSBkYXRhLWlkcz1cIicrIGRhdGEuaWRzICsnXCIgY2xhc3M9XCJmaWxlIGFsdGVybmF0ZSBvdXRsaW5lIGljb25cIj4nO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQoJ3RkJywgcm93KS5lcSg0KS5odG1sKGR1cmF0aW9uKS5hZGRDbGFzcygncmlnaHQgYWxpZ25lZCcpO1xuXHRcdFx0fSxcblx0XHRcdC8qKlxuXHRcdFx0ICogRHJhdyBldmVudCAtIGZpcmVkIG9uY2UgdGhlIHRhYmxlIGhhcyBjb21wbGV0ZWQgYSBkcmF3LlxuXHRcdFx0ICovXG5cdFx0XHRkcmF3Q2FsbGJhY2soKSB7XG5cdFx0XHRcdEV4dGVuc2lvbnMuVXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuXHRcdFx0fSxcblx0XHRcdGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG5cdFx0XHRvcmRlcmluZzogZmFsc2UsXG5cdFx0fSk7XG5cdFx0Y2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLkRhdGFUYWJsZSgpO1xuXG5cdFx0Y2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuXHRcdFx0Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH0pO1xuXG5cdFx0Y2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICd0ci5uZWdhdGl2ZScsIChlKSA9PiB7XG5cdFx0XHRsZXQgaWRzID0gJChlLnRhcmdldCkuYXR0cignZGF0YS1pZHMnKTtcblx0XHRcdGlmIChpZHMgIT09IHVuZGVmaW5lZCAmJiBpZHMgIT09ICcnKSB7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c3lzdGVtLWRpYWdub3N0aWMvaW5kZXgvP2ZpbGVuYW1lPWFzdGVyaXNrL3ZlcmJvc2UmZmlsdGVyPSR7aWRzfWA7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Ly8gQWRkIGV2ZW50IGxpc3RlbmVyIGZvciBvcGVuaW5nIGFuZCBjbG9zaW5nIGRldGFpbHNcblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ3RyLmRldGFpbGVkJywgKGUpID0+IHtcblx0XHRcdGxldCBpZHMgPSAkKGUudGFyZ2V0KS5hdHRyKCdkYXRhLWlkcycpO1xuXHRcdFx0aWYoaWRzICE9PSB1bmRlZmluZWQgJiYgaWRzICE9PSAnJyl7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c3lzdGVtLWRpYWdub3N0aWMvaW5kZXgvP2ZpbGVuYW1lPWFzdGVyaXNrL3ZlcmJvc2UmZmlsdGVyPSR7aWRzfWA7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGNvbnN0IHRyID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcblx0XHRcdGNvbnN0IHJvdyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5yb3codHIpO1xuXG5cdFx0XHRpZiAocm93LmNoaWxkLmlzU2hvd24oKSkge1xuXHRcdFx0XHQvLyBUaGlzIHJvdyBpcyBhbHJlYWR5IG9wZW4gLSBjbG9zZSBpdFxuXHRcdFx0XHRyb3cuY2hpbGQuaGlkZSgpO1xuXHRcdFx0XHR0ci5yZW1vdmVDbGFzcygnc2hvd24nKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIE9wZW4gdGhpcyByb3dcblx0XHRcdFx0cm93LmNoaWxkKGNhbGxEZXRhaWxSZWNvcmRzLnNob3dSZWNvcmRzKHJvdy5kYXRhKCkpKS5zaG93KCk7XG5cdFx0XHRcdHRyLmFkZENsYXNzKCdzaG93bicpO1xuXHRcdFx0XHRyb3cuY2hpbGQoKS5maW5kKCcuZGV0YWlsLXJlY29yZC1yb3cnKS5lYWNoKChpbmRleCwgcGxheWVyUm93KSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgaWQgPSAkKHBsYXllclJvdykuYXR0cignaWQnKTtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IENEUlBsYXllcihpZCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRFeHRlbnNpb25zLlVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0YLRgNC40YHQvtCy0YvQstCw0LXRgiDQvdCw0LHQvtGAINGBINC30LDQv9C40YHRj9C80Lgg0YDQsNC30LPQvtCy0L7RgNC+0LIg0L/RgNC4INC60LvQuNC60LUg0L3QsCDRgdGC0YDQvtC60YNcblx0ICovXG5cdHNob3dSZWNvcmRzKGRhdGEpIHtcblx0XHRsZXQgaHRtbFBsYXllciA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGJhc2ljIHRhYmxlIGNkci1wbGF5ZXJcIj48dGJvZHk+Jztcblx0XHRkYXRhWzRdLmZvckVhY2goKHJlY29yZCwgaSkgPT4ge1xuXHRcdFx0aWYgKGkgPiAwKSB7XG5cdFx0XHRcdGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG5cdFx0XHRcdGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IHVuZGVmaW5lZFxuXHRcdFx0XHR8fCByZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gbnVsbFxuXHRcdFx0XHR8fCByZWNvcmQucmVjb3JkaW5nZmlsZS5sZW5ndGggPT09IDApIHtcblxuXHRcdFx0XHRodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3cgZGlzYWJsZWRcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiXCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiXCI+PC9pPlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5zcmNfbnVtfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5kc3RfbnVtfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGV0IHJlY29yZEZpbGVOYW1lID0gYENhbGxfcmVjb3JkX2JldHdlZW5fJHtyZWNvcmQuc3JjX251bX1fYW5kXyR7cmVjb3JkLmRzdF9udW19X2Zyb21fJHtkYXRhWzBdfWA7XG5cdFx0XHRcdHJlY29yZEZpbGVOYW1lLnJlcGxhY2UoL1teXFx3XFxzIT9dL2csICcnKTtcblx0XHRcdFx0cmVjb3JkRmlsZU5hbWUgPSBlbmNvZGVVUklDb21wb25lbnQocmVjb3JkRmlsZU5hbWUpO1xuXHRcdFx0XHRjb25zdCByZWNvcmRGaWxlVXJpID0gZW5jb2RlVVJJQ29tcG9uZW50KHJlY29yZC5yZWNvcmRpbmdmaWxlKTtcblx0XHRcdFx0aHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93XCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIi9wYnhjb3JlL2FwaS9jZHIvdjIvcGxheWJhY2s/dmlldz0ke3JlY29yZEZpbGVVcml9XCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiL3BieGNvcmUvYXBpL2Nkci92Mi9wbGF5YmFjaz92aWV3PSR7cmVjb3JkRmlsZVVyaX0mZG93bmxvYWQ9MSZmaWxlbmFtZT0ke3JlY29yZEZpbGVOYW1lfS5tcDNcIj48L2k+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLnNyY19udW19PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGUgY2VudGVyIGFsaWduZWRcIj48aSBjbGFzcz1cImljb24gZXhjaGFuZ2VcIj48L2k+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwibGVmdCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLmRzdF9udW19PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0aHRtbFBsYXllciArPSAnPC90Ym9keT48L3RhYmxlPic7XG5cdFx0cmV0dXJuIGh0bWxQbGF5ZXI7XG5cdH0sXG5cdC8qKlxuXHQgKlxuXHQgKi9cblx0aW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKCkge1xuXHRcdGNvbnN0IG9wdGlvbnMgPSB7fTtcblxuXHRcdG9wdGlvbnMucmFuZ2VzID0ge1xuXHRcdFx0W2dsb2JhbFRyYW5zbGF0ZS7RgWFsX1RvZGF5XTogW21vbWVudCgpLCBtb21lbnQoKV0sXG5cdFx0XHRbZ2xvYmFsVHJhbnNsYXRlLtGBYWxfWWVzdGVyZGF5XTogW21vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyksIG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyldLFxuXHRcdFx0W2dsb2JhbFRyYW5zbGF0ZS7RgWFsX0xhc3RXZWVrXTogW21vbWVudCgpLnN1YnRyYWN0KDYsICdkYXlzJyksIG1vbWVudCgpXSxcblx0XHRcdFtnbG9iYWxUcmFuc2xhdGUu0YFhbF9MYXN0MzBEYXlzXTogW21vbWVudCgpLnN1YnRyYWN0KDI5LCAnZGF5cycpLCBtb21lbnQoKV0sXG5cdFx0XHRbZ2xvYmFsVHJhbnNsYXRlLtGBYWxfVGhpc01vbnRoXTogW21vbWVudCgpLnN0YXJ0T2YoJ21vbnRoJyksIG1vbWVudCgpLmVuZE9mKCdtb250aCcpXSxcblx0XHRcdFtnbG9iYWxUcmFuc2xhdGUu0YFhbF9MYXN0TW9udGhdOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuZW5kT2YoJ21vbnRoJyldLFxuXHRcdH07XG5cdFx0b3B0aW9ucy5hbHdheXNTaG93Q2FsZW5kYXJzID0gdHJ1ZTtcblx0XHRvcHRpb25zLmF1dG9VcGRhdGVJbnB1dCA9IHRydWU7XG5cdFx0b3B0aW9ucy5saW5rZWRDYWxlbmRhcnMgPSB0cnVlO1xuXHRcdG9wdGlvbnMubWF4RGF0ZSA9IG1vbWVudCgpO1xuXHRcdG9wdGlvbnMubG9jYWxlID0ge1xuXHRcdFx0Zm9ybWF0OiAnREQvTU0vWVlZWScsXG5cdFx0XHRzZXBhcmF0b3I6ICcgLSAnLFxuXHRcdFx0YXBwbHlMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLtGBYWxfQXBwbHlCdG4sXG5cdFx0XHRjYW5jZWxMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLtGBYWxfQ2FuY2VsQnRuLFxuXHRcdFx0ZnJvbUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUu0YFhbF9mcm9tLFxuXHRcdFx0dG9MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLtGBYWxfdG8sXG5cdFx0XHRjdXN0b21SYW5nZUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUu0YFhbF9DdXN0b21QZXJpb2QsXG5cdFx0XHRkYXlzT2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQuZGF5cyxcblx0XHRcdG1vbnRoTmFtZXM6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5tb250aHMsXG5cdFx0XHRmaXJzdERheTogMSxcblx0XHR9O1xuXHRcdG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KCk7XG5cdFx0b3B0aW9ucy5lbmREYXRlID0gbW9tZW50KCk7XG5cdFx0Y2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGVyYW5nZXBpY2tlcihcblx0XHRcdG9wdGlvbnMsXG5cdFx0XHRjYWxsRGV0YWlsUmVjb3Jkcy5jYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QsXG5cdFx0KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INCy0YvQsdC+0YDQsCDQv9C10YDQuNC+0LTQsFxuXHQgKiBAcGFyYW0gc3RhcnRcblx0ICogQHBhcmFtIGVuZFxuXHQgKiBAcGFyYW0gbGFiZWxcblx0ICovXG5cdGNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdChzdGFydCwgZW5kLCBsYWJlbCkge1xuXHRcdGNvbnN0IHRleHQgPSBgJHtzdGFydC5mb3JtYXQoJ0REL01NL1lZWVknKX0gJHtlbmQuZm9ybWF0KCdERC9NTS9ZWVlZJyl9ICR7Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKX1gO1xuXHRcdGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKHRleHQpO1xuXHR9LFxuXHQvKipcblx0ICpcblx0ICovXG5cdGFwcGx5RmlsdGVyKHRleHQpIHtcblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdH0sXG59O1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==