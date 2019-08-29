"use strict";

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
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
        if (isFinite(this.duration)) {
          var $row = $(this).closest('tr');
          var date = new Date(null);
          date.setSeconds(this.currentTime); // specify value for SECONDS here

          var currentTime = date.toISOString().substr(14, 5);
          date.setSeconds(this.duration); // specify value for SECONDS here

          var duration = date.toISOString().substr(14, 5);
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
        if (meta.triggeredByUser && isFinite(this.html5Audio.duration)) {
          this.html5Audio.removeEventListener('timeupdate', this.cbTimeUpdate, false);
          this.html5Audio.currentTime = this.html5Audio.duration * newVal / 100;
          this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);
        }

        if (isFinite(this.html5Audio.duration)) {
          var date = new Date(null);
          date.setSeconds(this.html5Audio.currentTime); // specify value for SECONDS here

          var currentTime = date.toISOString().substr(14, 5);
          date.setSeconds(this.html5Audio.duration); // specify value for SECONDS here

          var duration = date.toISOString().substr(14, 5);
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
        if (isFinite(this.duration)) {
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
          var recordFileName = "Call_record_between_".concat(record.src_num, "_and_").concat(record.dst_num, "_from_").concat(data[0]);
          recordFileName.replace(/[^\w\s!?]/g, '');
          htmlPlayer += "\n\n<tr class=\"detail-record-row disabled\" id=\"".concat(record.id, "\">\n   \t<td class=\"one wide\"></td>\n   \t<td class=\"one wide right aligned\">\n   \t\t<i class=\"ui icon play\"></i>\n\t   \t<audio preload=\"metadata\" id=\"audio-player-").concat(record.id, "\" src=\"\"></audio>\n\t</td>\n    <td class=\"five wide\">\n    \t<div class=\"ui range cdr-player\" data-value=\"").concat(record.id, "\"></div>\n    </td>\n    <td class=\"one wide\"><span class=\"cdr-duration\"></span></td>\n    <td class=\"one wide\">\n    \t<i class=\"ui icon download\" data-value=\"\"></i>\n    </td>\n    <td class=\"right aligned\"><span class=\"need-update\">").concat(record.src_num, "</span></td>\n    <td class=\"one wide center aligned\"><i class=\"icon exchange\"></i></td>\n   \t<td class=\"left aligned\"><span class=\"need-update\">").concat(record.dst_num, "</span></td>\n</tr>");
        } else {
          var _recordFileName = "Call_record_between_".concat(record.src_num, "_and_").concat(record.dst_num, "_from_").concat(data[0]);

          _recordFileName.replace(/[^\w\s!?]/g, '');

          htmlPlayer += "\n\n<tr class=\"detail-record-row\" id=\"".concat(record.id, "\">\n   \t<td class=\"one wide\"></td>\n   \t<td class=\"one wide right aligned\">\n   \t\t<i class=\"ui icon play\"></i>\n\t   \t<audio preload=\"metadata\" id=\"audio-player-").concat(record.id, "\" src=\"/pbxcore/api/cdr/playback?view=").concat(record.recordingfile, "\"></audio>\n\t</td>\n    <td class=\"five wide\">\n    \t<div class=\"ui range cdr-player\" data-value=\"").concat(record.id, "\"></div>\n    </td>\n    <td class=\"one wide\"><span class=\"cdr-duration\"></span></td>\n    <td class=\"one wide\">\n    \t<i class=\"ui icon download\" data-value=\"/pbxcore/api/cdr/playback?view=").concat(record.recordingfile, "&download=1&filename=").concat(_recordFileName, ".mp3\"></i>\n    </td>\n    <td class=\"right aligned\"><span class=\"need-update\">").concat(record.src_num, "</span></td>\n    <td class=\"one wide center aligned\"><i class=\"icon exchange\"></i></td>\n   \t<td class=\"left aligned\"><span class=\"need-update\">").concat(record.dst_num, "</span></td>\n</tr>");
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
//# sourceMappingURL=call-detail-records-index.js.map