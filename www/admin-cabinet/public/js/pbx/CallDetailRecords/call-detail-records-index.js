"use strict";

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbIkNEUlBsYXllciIsImlkIiwiaHRtbDVBdWRpbyIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCIkcm93IiwiJCIsIiRwQnV0dG9uIiwiZmluZCIsIiRkQnV0dG9uIiwiJHNsaWRlciIsIiRzcGFuRHVyYXRpb24iLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiY2JPbk1ldGFkYXRhTG9hZGVkIiwiY2JUaW1lVXBkYXRlIiwidW5iaW5kIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJwbGF5Iiwid2luZG93IiwibG9jYXRpb24iLCJ0YXJnZXQiLCJhdHRyIiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25TcmNNZWRpYUVycm9yIiwicmFuZ2UiLCJtaW4iLCJtYXgiLCJzdGFydCIsIm9uQ2hhbmdlIiwiY2JPblNsaWRlckNoYW5nZSIsInNwYW5EdXJhdGlvbiIsIk51bWJlciIsImlzRmluaXRlIiwiZHVyYXRpb24iLCJjbG9zZXN0IiwiZGF0ZSIsIkRhdGUiLCJzZXRTZWNvbmRzIiwicGFyc2VJbnQiLCJjdXJyZW50VGltZSIsInRvSVNPU3RyaW5nIiwic3Vic3RyIiwiZGF0ZVN0ciIsImhvdXJzIiwidGV4dCIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJkYXRlQ3VycmVudCIsImRhdGVEdXJhdGlvbiIsInBlcmNlbnQiLCJyYW5nZVBvc2l0aW9uIiwiTWF0aCIsInJvdW5kIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInBhdXNlZCIsInBhdXNlIiwiY2FsbERldGFpbFJlY29yZHMiLCIkY2RyVGFibGUiLCIkZ2xvYmFsU2VhcmNoIiwiJGRhdGVSYW5nZVNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IiLCJrZXlDb2RlIiwidmFsIiwibGVuZ3RoIiwiYXBwbHlGaWx0ZXIiLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwidHlwZSIsInBhZ2luZyIsInNjcm9sbFkiLCJoZWlnaHQiLCJvZmZzZXQiLCJ0b3AiLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJwYWdlTGVuZ3RoIiwiY3JlYXRlZFJvdyIsInJvdyIsImRhdGEiLCJEVF9Sb3dDbGFzcyIsImVxIiwiaHRtbCIsImRyYXdDYWxsYmFjayIsIkV4dGVuc2lvbnMiLCJVcGRhdGVQaG9uZXNSZXByZXNlbnQiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJ0ciIsImNoaWxkIiwiaXNTaG93biIsImhpZGUiLCJzaG93UmVjb3JkcyIsInNob3ciLCJlYWNoIiwiaW5kZXgiLCJwbGF5ZXJSb3ciLCJodG1sUGxheWVyIiwiZm9yRWFjaCIsInJlY29yZCIsImkiLCJyZWNvcmRpbmdmaWxlIiwidW5kZWZpbmVkIiwic3JjX251bSIsImRzdF9udW0iLCJyZWNvcmRGaWxlTmFtZSIsInJlcGxhY2UiLCJlbmNvZGVVUklDb21wb25lbnQiLCJyZWNvcmRGaWxlVXJpIiwib3B0aW9ucyIsInJhbmdlcyIsImdsb2JhbFRyYW5zbGF0ZSIsItGBYWxfVG9kYXkiLCJtb21lbnQiLCLRgWFsX1llc3RlcmRheSIsInN1YnRyYWN0Iiwi0YFhbF9MYXN0V2VlayIsItGBYWxfTGFzdDMwRGF5cyIsItGBYWxfVGhpc01vbnRoIiwic3RhcnRPZiIsImVuZE9mIiwi0YFhbF9MYXN0TW9udGgiLCJhbHdheXNTaG93Q2FsZW5kYXJzIiwiYXV0b1VwZGF0ZUlucHV0IiwibGlua2VkQ2FsZW5kYXJzIiwibWF4RGF0ZSIsImxvY2FsZSIsImZvcm1hdCIsInNlcGFyYXRvciIsImFwcGx5TGFiZWwiLCLRgWFsX0FwcGx5QnRuIiwiY2FuY2VsTGFiZWwiLCLRgWFsX0NhbmNlbEJ0biIsImZyb21MYWJlbCIsItGBYWxfZnJvbSIsInRvTGFiZWwiLCLRgWFsX3RvIiwiY3VzdG9tUmFuZ2VMYWJlbCIsItGBYWxfQ3VzdG9tUGVyaW9kIiwiZGF5c09mV2VlayIsImNhbGVuZGFyVGV4dCIsImRheXMiLCJtb250aE5hbWVzIiwibW9udGhzIiwiZmlyc3REYXkiLCJzdGFydERhdGUiLCJlbmREYXRlIiwiZGF0ZXJhbmdlcGlja2VyIiwiY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0IiwiZW5kIiwibGFiZWwiLCJkcmF3IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7QUFRQTs7QUFDQTs7OztJQUlNQSxTOzs7QUFDTCxxQkFBWUMsRUFBWixFQUFnQjtBQUFBOztBQUFBOztBQUNmLFNBQUtBLEVBQUwsR0FBVUEsRUFBVjtBQUNBLFNBQUtDLFVBQUwsR0FBa0JDLFFBQVEsQ0FBQ0MsY0FBVCx3QkFBd0NILEVBQXhDLEVBQWxCO0FBQ0EsUUFBTUksSUFBSSxHQUFHQyxDQUFDLFlBQUtMLEVBQUwsRUFBZDtBQUNBLFNBQUtNLFFBQUwsR0FBZ0JGLElBQUksQ0FBQ0csSUFBTCxDQUFVLFFBQVYsQ0FBaEIsQ0FKZSxDQUlzQjs7QUFDckMsU0FBS0MsUUFBTCxHQUFnQkosSUFBSSxDQUFDRyxJQUFMLENBQVUsWUFBVixDQUFoQixDQUxlLENBSzBCOztBQUN6QyxTQUFLRSxPQUFMLEdBQWVMLElBQUksQ0FBQ0csSUFBTCxDQUFVLGdCQUFWLENBQWY7QUFDQSxTQUFLRyxhQUFMLEdBQXFCTixJQUFJLENBQUNHLElBQUwsQ0FBVSxtQkFBVixDQUFyQjtBQUNBLFNBQUtOLFVBQUwsQ0FBZ0JVLG1CQUFoQixDQUFvQyxZQUFwQyxFQUFrRCxLQUFLQyxrQkFBdkQsRUFBMkUsS0FBM0U7QUFDQSxTQUFLWCxVQUFMLENBQWdCVSxtQkFBaEIsQ0FBb0MsZ0JBQXBDLEVBQXNELEtBQUtFLFlBQTNELEVBQXlFLEtBQXpFO0FBQ0EsU0FBS1AsUUFBTCxDQUFj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TUFBNUIsQ0FBbUMxQixJQUFuQyxFQUF5Q3NILElBQXpDO0FBQ0F4RyxNQUFBQSxpQkFBaUIsQ0FBQ0UsYUFBbEIsQ0FBZ0MxQixPQUFoQyxDQUF3QyxLQUF4QyxFQUErQ3FCLFFBQS9DLENBQXdELFNBQXhEO0FBQ0E7O0FBbk53QjtBQUFBO0FBQUEsQ0FBMUI7QUFxTkFuRCxDQUFDLENBQUNILFFBQUQsQ0FBRCxDQUFZa0ssS0FBWixDQUFrQixZQUFNO0FBQ3ZCekcsRUFBQUEsaUJBQWlCLENBQUNNLFVBQWxCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEV4dGVuc2lvbnMsIG1vbWVudCwgZ2xvYmFsVHJhbnNsYXRlICovXG4vKipcbiAqINCa0LvQsNGB0YEg0LTQuNC90LDQvNC40YfQtdGB0LrQuCDRgdC+0LfQtNCw0LLQsNC10LzRi9GFINC/0YDQvtC40LPRgNGL0LLQsNC10YLQtdC70Lkg0LTQu9GPIENEUlxuICpcbiAqL1xuY2xhc3MgQ0RSUGxheWVyIHtcblx0Y29uc3RydWN0b3IoaWQpIHtcblx0XHR0aGlzLmlkID0gaWQ7XG5cdFx0dGhpcy5odG1sNUF1ZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGF1ZGlvLXBsYXllci0ke2lkfWApO1xuXHRcdGNvbnN0ICRyb3cgPSAkKGAjJHtpZH1gKTtcblx0XHR0aGlzLiRwQnV0dG9uID0gJHJvdy5maW5kKCdpLnBsYXknKTsgLy8gcGxheSBidXR0b25cblx0XHR0aGlzLiRkQnV0dG9uID0gJHJvdy5maW5kKCdpLmRvd25sb2FkJyk7IC8vIGRvd25sb2FkIGJ1dHRvblxuXHRcdHRoaXMuJHNsaWRlciA9ICRyb3cuZmluZCgnZGl2LmNkci1wbGF5ZXInKTtcblx0XHR0aGlzLiRzcGFuRHVyYXRpb24gPSAkcm93LmZpbmQoJ3NwYW4uY2RyLWR1cmF0aW9uJyk7XG5cdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZCwgZmFsc2UpO1xuXHRcdHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0dGhpcy4kcEJ1dHRvbi51bmJpbmQoKTtcblx0XHR0aGlzLiRkQnV0dG9uLnVuYmluZCgpO1xuXG5cblx0XHQvLyBwbGF5IGJ1dHRvbiBldmVudCBsaXN0ZW50ZXJcblx0XHR0aGlzLiRwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR0aGlzLnBsYXkoKTtcblx0XHR9KTtcblxuXHRcdC8vIGRvd25sb2FkIGJ1dHRvbiBldmVudCBsaXN0ZW50ZXJcblx0XHR0aGlzLiRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSAkKGUudGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZCwgZmFsc2UpO1xuXG5cdFx0Ly8gdGltZXVwZGF0ZSBldmVudCBsaXN0ZW5lclxuXHRcdHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblxuXHRcdC8vIG5vIHNyYyBoYW5kbGVyXG5cdFx0dGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5jYk9uU3JjTWVkaWFFcnJvciwgZmFsc2UpO1xuXG5cdFx0dGhpcy4kc2xpZGVyLnJhbmdlKHtcblx0XHRcdG1pbjogMCxcblx0XHRcdG1heDogMTAwLFxuXHRcdFx0c3RhcnQ6IDAsXG5cdFx0XHRvbkNoYW5nZTogdGhpcy5jYk9uU2xpZGVyQ2hhbmdlLFxuXHRcdFx0aHRtbDVBdWRpbzogdGhpcy5odG1sNUF1ZGlvLFxuXHRcdFx0Y2JUaW1lVXBkYXRlOiB0aGlzLmNiVGltZVVwZGF0ZSxcblx0XHRcdHNwYW5EdXJhdGlvbjogdGhpcy4kc3BhbkR1cmF0aW9uLFxuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INC/0L7QtNCz0YDRg9C30LrQuCDQvNC10YLQsNC00LDQvdC90YvRhVxuXHQgKi9cblx0Y2JPbk1ldGFkYXRhTG9hZGVkKCkge1xuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcblx0XHRcdGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG5cdFx0XHRkYXRlLnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5jdXJyZW50VGltZSwgMTApKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG5cdFx0XHRjb25zdCBjdXJyZW50VGltZSA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0ZGF0ZS5zZXRTZWNvbmRzKHBhcnNlSW50KHRoaXMuZHVyYXRpb24sIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IGRhdGUudG9JU09TdHJpbmcoKTtcblx0XHRcdGNvbnN0IGhvdXJzID0gcGFyc2VJbnQoZGF0ZVN0ci5zdWJzdHIoMTEsIDIpLCAxMCk7XG5cdFx0XHRsZXQgZHVyYXRpb247XG5cdFx0XHRpZiAoaG91cnMgPT09IDApIHtcblx0XHRcdFx0ZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG5cdFx0XHR9IGVsc2UgaWYgKGhvdXJzIDwgMTApIHtcblx0XHRcdFx0ZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMiwgNyk7XG5cdFx0XHR9IGVsc2UgaWYgKGhvdXJzID49IDEwKSB7XG5cdFx0XHRcdGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTEsIDgpO1xuXHRcdFx0fVxuXHRcdFx0JHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqINCa0L7Qu9Cx0LXQuiDQvdCwINGB0LTQstC40LMg0YHQu9Cw0LnQtNC10YDQsCDQv9GA0L7QuNCz0YDRi9Cy0LDRgtC10LvRj1xuXHQgKiBAcGFyYW0gbmV3VmFsXG5cdCAqIEBwYXJhbSBtZXRhXG5cdCAqL1xuXHRjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuXHRcdGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID0gKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0fVxuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgZGF0ZUN1cnJlbnQgPSBuZXcgRGF0ZShudWxsKTtcblx0XHRcdGRhdGVDdXJyZW50LnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lLCAxMCkpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcblx0XHRcdGNvbnN0IGN1cnJlbnRUaW1lID0gZGF0ZUN1cnJlbnQudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0Y29uc3QgZGF0ZUR1cmF0aW9uID0gbmV3IERhdGUobnVsbCk7XG5cdFx0XHRkYXRlRHVyYXRpb24uc2V0U2Vjb25kcyhwYXJzZUludCh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24sIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IGRhdGVEdXJhdGlvbi50b0lTT1N0cmluZygpO1xuXHRcdFx0Y29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcblx0XHRcdGxldCBkdXJhdGlvbjtcblx0XHRcdGlmIChob3VycyA9PT0gMCkge1xuXHRcdFx0XHRkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDE0LCA1KTtcblx0XHRcdH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuXHRcdFx0XHRkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDEyLCA3KTtcblx0XHRcdH0gZWxzZSBpZiAoaG91cnMgPj0gMTApIHtcblx0XHRcdFx0ZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMSwgOCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnNwYW5EdXJhdGlvbi50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiDQmtC+0LvQsdC10Log0L3QsCDQuNC30LzQtdC90LXQvdC40LUg0L/QvtC30LjRhtC40Lgg0L/RgNC+0LjQs9GA0YvQstCw0LXQvNC+0LPQviDRhNCw0LnQu9CwINC40LcgSFRNTDUg0LDRg9C00LjQvtGC0LXQs9CwXG5cdCAqL1xuXHRjYlRpbWVVcGRhdGUoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uO1xuXHRcdFx0Y29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgubWluKE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKSwgMTAwKTtcblx0XHRcdGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHQkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJykucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuXHRcdFx0aWYgKHRoaXMuY3VycmVudFRpbWUgPT09IHRoaXMuZHVyYXRpb24pIHtcblx0XHRcdFx0JHJvdy5maW5kKCdpLnBhdXNlJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICog0JfQsNC/0YPRgdC6INC4INC+0YHRgtCw0L3QvtCy0LrQsCDQstC+0YHQv9GA0L7QuNC30LLQtdC00LXQvdC40Y8g0LDRg9C00LjQviDRhNCw0LnQu9CwXG5cdCAqINC/0L4g0LrQu9C40LrRgyDQvdCwINC40LrQvtC90LrRgyBQbGF5XG5cdCAqL1xuXHRwbGF5KCkge1xuXHRcdC8vIHN0YXJ0IG11c2ljXG5cdFx0aWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQpIHtcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG5cdFx0XHQvLyByZW1vdmUgcGxheSwgYWRkIHBhdXNlXG5cdFx0XHR0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG5cdFx0fSBlbHNlIHsgLy8gcGF1c2UgbXVzaWNcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5wYXVzZSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBhdXNlLCBhZGQgcGxheVxuXHRcdFx0dGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtC60LAg0L7RiNC40LHQutC4INC/0L7Qu9GD0YfQtdC90Y8g0LfQstGD0LrQvtCy0L7Qs9C+INGE0LDQudC70LBcblx0ICovXG5cdGNiT25TcmNNZWRpYUVycm9yKCkge1xuXHRcdCQodGhpcykuY2xvc2VzdCgndHInKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0fVxufVxuXG4vKipcbiAqINCa0LvQsNGB0YEg0YHRgtGA0LDQvdC40YbRiyDRgSBDRFJcbiAqL1xuY29uc3QgY2FsbERldGFpbFJlY29yZHMgPSB7XG5cdCRjZHJUYWJsZTogJCgnI2Nkci10YWJsZScpLFxuXHQkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsc2VhcmNoJyksXG5cdCRkYXRlUmFuZ2VTZWxlY3RvcjogJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKSxcblx0ZGF0YVRhYmxlOiB7fSxcblx0cGxheWVyczogW10sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0Y2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKCk7XG5cblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XG5cdFx0XHRpZiAoZS5rZXlDb2RlID09PSAxM1xuXHRcdFx0XHR8fCBlLmtleUNvZGUgPT09IDhcblx0XHRcdFx0fHwgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0Y29uc3QgdGV4dCA9IGAke2NhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci52YWwoKX0gJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpfWA7XG5cdFx0XHRcdGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKHRleHQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Y2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmRhdGFUYWJsZSh7XG5cdFx0XHRzZWFyY2g6IHtcblx0XHRcdFx0c2VhcmNoOiBgJHtjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IudmFsKCl9ICR7Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKX1gLFxuXHRcdFx0fSxcblx0XHRcdHNlcnZlclNpZGU6IHRydWUsXG5cdFx0XHRwcm9jZXNzaW5nOiB0cnVlLFxuXHRcdFx0YWpheDoge1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1kZXRhaWwtcmVjb3Jkcy9nZXROZXdSZWNvcmRzYCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0fSxcblx0XHRcdHBhZ2luZzogdHJ1ZSxcblx0XHRcdHNjcm9sbFk6ICQod2luZG93KS5oZWlnaHQoKSAtIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vZmZzZXQoKS50b3AgLSA0MjAsXG5cdFx0XHQvLyBzdGF0ZVNhdmU6IHRydWUsXG5cdFx0XHRzRG9tOiAncnRpcCcsXG5cdFx0XHRkZWZlclJlbmRlcjogdHJ1ZSxcblx0XHRcdHBhZ2VMZW5ndGg6IDE3LFxuXHRcdFx0Ly8gc2Nyb2xsQ29sbGFwc2U6IHRydWUsXG5cdFx0XHQvLyBzY3JvbGxlcjogdHJ1ZSxcblx0XHRcdC8qKlxuXHRcdFx0ICog0JrQvtC90YHRgtGA0YPQutGC0L7RgCDRgdGC0YDQvtC60LggQ0RSXG5cdFx0XHQgKiBAcGFyYW0gcm93XG5cdFx0XHQgKiBAcGFyYW0gZGF0YVxuXHRcdFx0ICovXG5cdFx0XHRjcmVhdGVkUm93KHJvdywgZGF0YSkge1xuXHRcdFx0XHRpZiAoZGF0YS5EVF9Sb3dDbGFzcyA9PT0gJ2RldGFpbGVkJykge1xuXHRcdFx0XHRcdCQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCc8aSBjbGFzcz1cImljb24gY2FyZXQgZG93blwiPjwvaT4nKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCd0ZCcsIHJvdykuZXEoMSkuaHRtbChkYXRhWzBdKTtcblx0XHRcdFx0JCgndGQnLCByb3cpLmVxKDIpXG5cdFx0XHRcdFx0Lmh0bWwoZGF0YVsxXSlcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG5cdFx0XHRcdCQoJ3RkJywgcm93KS5lcSgzKVxuXHRcdFx0XHRcdC5odG1sKGRhdGFbMl0pXG5cdFx0XHRcdFx0LmFkZENsYXNzKCduZWVkLXVwZGF0ZScpO1xuXHRcdFx0XHQkKCd0ZCcsIHJvdykuZXEoNCkuaHRtbChkYXRhWzNdKTtcblx0XHRcdH0sXG5cdFx0XHQvKipcblx0XHRcdCAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cblx0XHRcdCAqL1xuXHRcdFx0ZHJhd0NhbGxiYWNrKCkge1xuXHRcdFx0XHRFeHRlbnNpb25zLlVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcblx0XHRcdH0sXG5cdFx0XHRsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuXHRcdFx0b3JkZXJpbmc6IGZhbHNlLFxuXHRcdH0pO1xuXHRcdGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZSA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5EYXRhVGFibGUoKTtcblxuXHRcdGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcblx0XHRcdGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9KTtcblxuXG5cdFx0Ly8gQWRkIGV2ZW50IGxpc3RlbmVyIGZvciBvcGVuaW5nIGFuZCBjbG9zaW5nIGRldGFpbHNcblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ3RyLmRldGFpbGVkJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IHRyID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcblx0XHRcdGNvbnN0IHJvdyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5yb3codHIpO1xuXG5cdFx0XHRpZiAocm93LmNoaWxkLmlzU2hvd24oKSkge1xuXHRcdFx0XHQvLyBUaGlzIHJvdyBpcyBhbHJlYWR5IG9wZW4gLSBjbG9zZSBpdFxuXHRcdFx0XHRyb3cuY2hpbGQuaGlkZSgpO1xuXHRcdFx0XHR0ci5yZW1vdmVDbGFzcygnc2hvd24nKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIE9wZW4gdGhpcyByb3dcblxuXHRcdFx0XHRyb3cuY2hpbGQoY2FsbERldGFpbFJlY29yZHMuc2hvd1JlY29yZHMocm93LmRhdGEoKSkpLnNob3coKTtcblxuXHRcdFx0XHR0ci5hZGRDbGFzcygnc2hvd24nKTtcblx0XHRcdFx0cm93LmNoaWxkKCkuZmluZCgnLmRldGFpbC1yZWNvcmQtcm93JykuZWFjaCgoaW5kZXgsIHBsYXllclJvdykgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IGlkID0gJChwbGF5ZXJSb3cpLmF0dHIoJ2lkJyk7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBDRFJQbGF5ZXIoaWQpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0RXh0ZW5zaW9ucy5VcGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntGC0YDQuNGB0L7QstGL0LLQsNC10YIg0L3QsNCx0L7RgCDRgSDQt9Cw0L/QuNGB0Y/QvNC4INGA0LDQt9Cz0L7QstC+0YDQvtCyINC/0YDQuCDQutC70LjQutC1INC90LAg0YHRgtGA0L7QutGDXG5cdCAqL1xuXHRzaG93UmVjb3JkcyhkYXRhKSB7XG5cdFx0bGV0IGh0bWxQbGF5ZXIgPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBiYXNpYyB0YWJsZSBjZHItcGxheWVyXCI+PHRib2R5Pic7XG5cdFx0ZGF0YVs0XS5mb3JFYWNoKChyZWNvcmQsIGkpID0+IHtcblx0XHRcdGlmIChpID4gMCkge1xuXHRcdFx0XHRodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuXHRcdFx0XHRodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHJlY29yZC5yZWNvcmRpbmdmaWxlID09PSB1bmRlZmluZWRcblx0XHRcdFx0fHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IG51bGxcblx0XHRcdFx0fHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUubGVuZ3RoID09PSAwKSB7XG5cblx0XHRcdFx0aHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93IGRpc2FibGVkXCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIlwiPjwvYXVkaW8+XG5cdDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwiZml2ZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiIGRhdGEtdmFsdWU9XCIke3JlY29yZC5pZH1cIj48L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPlxuICAgIFx0PGkgY2xhc3M9XCJ1aSBpY29uIGRvd25sb2FkXCIgZGF0YS12YWx1ZT1cIlwiPjwvaT5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxldCByZWNvcmRGaWxlTmFtZSA9IGBDYWxsX3JlY29yZF9iZXR3ZWVuXyR7cmVjb3JkLnNyY19udW19X2FuZF8ke3JlY29yZC5kc3RfbnVtfV9mcm9tXyR7ZGF0YVswXX1gO1xuXHRcdFx0XHRyZWNvcmRGaWxlTmFtZS5yZXBsYWNlKC9bXlxcd1xccyE/XS9nLCAnJyk7XG5cdFx0XHRcdHJlY29yZEZpbGVOYW1lID0gZW5jb2RlVVJJQ29tcG9uZW50KHJlY29yZEZpbGVOYW1lKTtcblx0XHRcdFx0Y29uc3QgcmVjb3JkRmlsZVVyaSA9IGVuY29kZVVSSUNvbXBvbmVudChyZWNvcmQucmVjb3JkaW5nZmlsZSk7XG5cdFx0XHRcdGh0bWxQbGF5ZXIgKz0gYFxuXG48dHIgY2xhc3M9XCJkZXRhaWwtcmVjb3JkLXJvd1wiIGlkPVwiJHtyZWNvcmQuaWR9XCI+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGUgcmlnaHQgYWxpZ25lZFwiPlxuICAgXHRcdDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuXHQgICBcdDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke3JlY29yZC5pZH1cIiBzcmM9XCIvcGJ4Y29yZS9hcGkvY2RyL3BsYXliYWNrP3ZpZXc9JHtyZWNvcmRGaWxlVXJpfVwiPjwvYXVkaW8+XG5cdDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwiZml2ZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiIGRhdGEtdmFsdWU9XCIke3JlY29yZC5pZH1cIj48L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPlxuICAgIFx0PGkgY2xhc3M9XCJ1aSBpY29uIGRvd25sb2FkXCIgZGF0YS12YWx1ZT1cIi9wYnhjb3JlL2FwaS9jZHIvcGxheWJhY2s/dmlldz0ke3JlY29yZEZpbGVVcml9JmRvd25sb2FkPTEmZmlsZW5hbWU9JHtyZWNvcmRGaWxlTmFtZX0ubXAzXCI+PC9pPlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5zcmNfbnVtfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5kc3RfbnVtfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGh0bWxQbGF5ZXIgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuXHRcdHJldHVybiBodG1sUGxheWVyO1xuXHR9LFxuXHQvKipcblx0ICpcblx0ICovXG5cdGluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcigpIHtcblx0XHRjb25zdCBvcHRpb25zID0ge307XG5cblx0XHRvcHRpb25zLnJhbmdlcyA9IHtcblx0XHRcdFtnbG9iYWxUcmFuc2xhdGUu0YFhbF9Ub2RheV06IFttb21lbnQoKSwgbW9tZW50KCldLFxuXHRcdFx0W2dsb2JhbFRyYW5zbGF0ZS7RgWFsX1llc3RlcmRheV06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpXSxcblx0XHRcdFtnbG9iYWxUcmFuc2xhdGUu0YFhbF9MYXN0V2Vla106IFttb21lbnQoKS5zdWJ0cmFjdCg2LCAnZGF5cycpLCBtb21lbnQoKV0sXG5cdFx0XHRbZ2xvYmFsVHJhbnNsYXRlLtGBYWxfTGFzdDMwRGF5c106IFttb21lbnQoKS5zdWJ0cmFjdCgyOSwgJ2RheXMnKSwgbW9tZW50KCldLFxuXHRcdFx0W2dsb2JhbFRyYW5zbGF0ZS7RgWFsX1RoaXNNb250aF06IFttb21lbnQoKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5lbmRPZignbW9udGgnKV0sXG5cdFx0XHRbZ2xvYmFsVHJhbnNsYXRlLtGBYWxfTGFzdE1vbnRoXTogW21vbWVudCgpLnN1YnRyYWN0KDEsICdtb250aCcpLnN0YXJ0T2YoJ21vbnRoJyksIG1vbWVudCgpLnN1YnRyYWN0KDEsICdtb250aCcpLmVuZE9mKCdtb250aCcpXSxcblx0XHR9O1xuXHRcdG9wdGlvbnMuYWx3YXlzU2hvd0NhbGVuZGFycyA9IHRydWU7XG5cdFx0b3B0aW9ucy5hdXRvVXBkYXRlSW5wdXQgPSB0cnVlO1xuXHRcdG9wdGlvbnMubGlua2VkQ2FsZW5kYXJzID0gdHJ1ZTtcblx0XHRvcHRpb25zLm1heERhdGUgPSBtb21lbnQoKTtcblx0XHRvcHRpb25zLmxvY2FsZSA9IHtcblx0XHRcdGZvcm1hdDogJ0REL01NL1lZWVknLFxuXHRcdFx0c2VwYXJhdG9yOiAnIC0gJyxcblx0XHRcdGFwcGx5TGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS7RgWFsX0FwcGx5QnRuLFxuXHRcdFx0Y2FuY2VsTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS7RgWFsX0NhbmNlbEJ0bixcblx0XHRcdGZyb21MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLtGBYWxfZnJvbSxcblx0XHRcdHRvTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS7RgWFsX3RvLFxuXHRcdFx0Y3VzdG9tUmFuZ2VMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLtGBYWxfQ3VzdG9tUGVyaW9kLFxuXHRcdFx0ZGF5c09mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LmRheXMsXG5cdFx0XHRtb250aE5hbWVzOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQubW9udGhzLFxuXHRcdFx0Zmlyc3REYXk6IDEsXG5cdFx0fTtcblx0XHRvcHRpb25zLnN0YXJ0RGF0ZSA9IG1vbWVudCgpO1xuXHRcdG9wdGlvbnMuZW5kRGF0ZSA9IG1vbWVudCgpO1xuXHRcdGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRlcmFuZ2VwaWNrZXIoXG5cdFx0XHRvcHRpb25zLFxuXHRcdFx0Y2FsbERldGFpbFJlY29yZHMuY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0LFxuXHRcdCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtGH0LjQuiDQstGL0LHQvtGA0LAg0L/QtdGA0LjQvtC00LBcblx0ICogQHBhcmFtIHN0YXJ0XG5cdCAqIEBwYXJhbSBlbmRcblx0ICogQHBhcmFtIGxhYmVsXG5cdCAqL1xuXHRjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3Qoc3RhcnQsIGVuZCwgbGFiZWwpIHtcblx0XHRjb25zdCB0ZXh0ID0gYCR7c3RhcnQuZm9ybWF0KCdERC9NTS9ZWVlZJyl9ICR7ZW5kLmZvcm1hdCgnREQvTU0vWVlZWScpfSAke2NhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCl9YDtcblx0XHRjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcih0ZXh0KTtcblx0fSxcblx0LyoqXG5cdCAqXG5cdCAqL1xuXHRhcHBseUZpbHRlcih0ZXh0KSB7XG5cdFx0Y2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG5cdFx0Y2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHR9LFxufTtcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0Y2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=