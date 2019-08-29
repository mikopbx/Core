"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

/* global globalTranslate, SemanticLocalization, PbxApi, globalRootUrl */
var IndexSoundPlayer =
/*#__PURE__*/
function () {
  function IndexSoundPlayer(id) {
    var _this = this;

    _classCallCheck(this, IndexSoundPlayer);

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

    this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);
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


  _createClass(IndexSoundPlayer, [{
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
          var rangePosition = Math.round(percent * 100);
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
        if (this.html5Audio.paused && this.html5Audio.duration) {
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
  }]);

  return IndexSoundPlayer;
}();

var soundFiles = {
  $audioFilesList: $('#sound-files-table'),
  $contentFrame: $('#content-frame'),
  initialize: function () {
    function initialize() {
      soundFiles.$audioFilesList.DataTable({
        lengthChange: false,
        paging: false,
        columns: [null, {
          orderable: false,
          searchable: false
        }, {
          orderable: false,
          searchable: false
        }],
        order: [0, 'asc'],
        initComplete: function () {
          function initComplete() {
            $('.file-row').each(function (index, row) {
              var id = $(row).attr('id');
              return new IndexSoundPlayer(id);
            });
          }

          return initComplete;
        }(),
        language: SemanticLocalization.dataTableLocalisation
      });
      soundFiles.dataTable = soundFiles.$audioFilesList.DataTable();
      soundFiles.dataTable.on('draw', function () {
        $('.file-row').each(function (index, row) {
          var id = $(row).attr('id');
          return new IndexSoundPlayer(id);
        });
      });
      $('#add-new-button').appendTo($('div.eight.column:eq(0)'));
      var toArray = Array.prototype.slice;
      toArray.apply(document.getElementsByTagName('audio')).forEach(function (audio) {
        audio.addEventListener('error', soundFiles.handleMediaError);
      });
      $('body').on('click', 'a.delete', function (e) {
        e.preventDefault();
        var fileName = $(e.target).closest('tr').attr('data-value');
        var id = $(e.target).closest('tr').attr('id');
        $('.message.ajax').remove();
        $.api({
          url: "".concat(globalRootUrl, "sound-files/delete/").concat(id),
          on: 'now',
          successTest: function () {
            function successTest(response) {
              // test whether a JSON response is valid
              return response !== undefined && Object.keys(response).length > 0;
            }

            return successTest;
          }(),
          onSuccess: function () {
            function onSuccess(response) {
              if (response.success === true) {
                PbxApi.SystemRemoveAudioFile(fileName);
                soundFiles.$audioFilesList.find("tr[id=".concat(id, "]")).remove();
              } else {
                soundFiles.$contentFrame.before("<div class=\"ui error message ajax\">".concat(response.message.error, "</div>"));
              }
            }

            return onSuccess;
          }()
        });
      });
    }

    return initialize;
  }(),
  handleMediaError: function () {
    function handleMediaError(e) {
      switch (e.target.error.code) {
        case e.target.error.MEDIA_ERR_ABORTED:
          console.log('You aborted the media playback.');
          break;

        case e.target.error.MEDIA_ERR_NETWORK:
          console.log('A network error caused the media download to fail.');
          break;

        case e.target.error.MEDIA_ERR_DECODE:
          console.log('The media playback was aborted due to a corruption problem or because the media used features your browser did not support.');
          break;

        case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          console.log('The media could not be loaded, either because the server or network failed or because the format is not supported.');
          break;

        default:
          console.log('An unknown media error occurred.');
      }

      var $row = $(e.target).closest('tr');
      $row.addClass('negative');
      $row.find('td.player').html(globalTranslate.sf_FileNotFound);
    }

    return handleMediaError;
  }()
};
$(document).ready(function () {
  soundFiles.initialize();
});
//# sourceMappingURL=sound-files-index.js.map