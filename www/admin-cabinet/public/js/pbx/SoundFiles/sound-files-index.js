"use strict";

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
        if (Number.isFinite(this.duration)) {
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
        if (meta.triggeredByUser && Number.isFinite(this.html5Audio.duration)) {
          this.html5Audio.removeEventListener('timeupdate', this.cbTimeUpdate, false);
          this.html5Audio.currentTime = this.html5Audio.duration * newVal / 100;
          this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);
        }

        if (Number.isFinite(this.html5Audio.duration)) {
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
        if (Number.isFinite(this.duration)) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LmpzIl0sIm5hbWVzIjpbIkluZGV4U291bmRQbGF5ZXIiLCJpZCIsImh0bWw1QXVkaW8iLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiJHJvdyIsIiQiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicGxheSIsIndpbmRvdyIsImxvY2F0aW9uIiwidGFyZ2V0IiwiYXR0ciIsImFkZEV2ZW50TGlzdGVuZXIiLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwic3BhbkR1cmF0aW9uIiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJkdXJhdGlvbiIsImNsb3Nlc3QiLCJkYXRlIiwiRGF0ZSIsInNldFNlY29uZHMiLCJjdXJyZW50VGltZSIsInRvSVNPU3RyaW5nIiwic3Vic3RyIiwidGV4dCIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJwZXJjZW50IiwicmFuZ2VQb3NpdGlvbiIsIk1hdGgiLCJyb3VuZCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJwYXVzZWQiLCJwYXVzZSIsInNvdW5kRmlsZXMiLCIkYXVkaW9GaWxlc0xpc3QiLCIkY29udGVudEZyYW1lIiwiaW5pdGlhbGl6ZSIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwib3JkZXIiLCJpbml0Q29tcGxldGUiLCJlYWNoIiwiaW5kZXgiLCJyb3ciLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZGF0YVRhYmxlIiwiYXBwZW5kVG8iLCJ0b0FycmF5IiwiQXJyYXkiLCJwcm90b3R5cGUiLCJzbGljZSIsImFwcGx5IiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJmb3JFYWNoIiwiYXVkaW8iLCJoYW5kbGVNZWRpYUVycm9yIiwiZmlsZU5hbWUiLCJyZW1vdmUiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJvblN1Y2Nlc3MiLCJzdWNjZXNzIiwiUGJ4QXBpIiwiU3lzdGVtUmVtb3ZlQXVkaW9GaWxlIiwiYmVmb3JlIiwibWVzc2FnZSIsImVycm9yIiwiY29kZSIsIk1FRElBX0VSUl9BQk9SVEVEIiwiY29uc29sZSIsImxvZyIsIk1FRElBX0VSUl9ORVRXT1JLIiwiTUVESUFfRVJSX0RFQ09ERSIsIk1FRElBX0VSUl9TUkNfTk9UX1NVUFBPUlRFRCIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZl9GaWxlTm90Rm91bmQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7QUFRQTtJQUVNQSxnQjs7O0FBQ0wsNEJBQVlDLEVBQVosRUFBZ0I7QUFBQTs7QUFBQTs7QUFDZixTQUFLQSxFQUFMLEdBQVVBLEVBQVY7QUFDQSxTQUFLQyxVQUFMLEdBQWtCQyxRQUFRLENBQUNDLGNBQVQsd0JBQXdDSCxFQUF4QyxFQUFsQjtBQUNBLFFBQU1JLElBQUksR0FBR0MsQ0FBQyxZQUFLTCxFQUFMLEVBQWQ7QUFDQSxTQUFLTSxRQUFMLEdBQWdCRixJQUFJLENBQUNHLElBQUwsQ0FBVSxRQUFWLENBQWhCLENBSmUsQ0FJc0I7O0FBQ3JDLFNBQUtDLFFBQUwsR0FBZ0JKLElBQUksQ0FBQ0csSUFBTCxDQUFVLFlBQVYsQ0FBaEIsQ0FMZSxDQUswQjs7QUFDekMsU0FBS0UsT0FBTCxHQUFlTCxJQUFJLENBQUNHLElBQUwsQ0FBVSxnQkFBVixDQUFmO0FBQ0EsU0FBS0csYUFB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RyxJQUFJLEdBQUdDLENBQUMsQ0FBQ1csQ0FBQyxDQUFDSyxNQUFILENBQUQsQ0FBWWEsT0FBWixDQUFvQixJQUFwQixDQUFiO0FBQ0E5QixNQUFBQSxJQUFJLENBQUM4QyxRQUFMLENBQWMsVUFBZDtBQUNBOUMsTUFBQUEsSUFBSSxDQUFDRyxJQUFMLENBQVUsV0FBVixFQUF1Qm9HLElBQXZCLENBQTRCQyxlQUFlLENBQUNDLGVBQTVDO0FBQ0E7O0FBN0VpQjtBQUFBO0FBQUEsQ0FBbkI7QUFpRkF4RyxDQUFDLENBQUNILFFBQUQsQ0FBRCxDQUFZNEcsS0FBWixDQUFrQixZQUFNO0FBQ3ZCekQsRUFBQUEsVUFBVSxDQUFDRyxVQUFYO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgUGJ4QXBpLCBnbG9iYWxSb290VXJsICovXG5cbmNsYXNzIEluZGV4U291bmRQbGF5ZXIge1xuXHRjb25zdHJ1Y3RvcihpZCkge1xuXHRcdHRoaXMuaWQgPSBpZDtcblx0XHR0aGlzLmh0bWw1QXVkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgYXVkaW8tcGxheWVyLSR7aWR9YCk7XG5cdFx0Y29uc3QgJHJvdyA9ICQoYCMke2lkfWApO1xuXHRcdHRoaXMuJHBCdXR0b24gPSAkcm93LmZpbmQoJ2kucGxheScpOyAvLyBwbGF5IGJ1dHRvblxuXHRcdHRoaXMuJGRCdXR0b24gPSAkcm93LmZpbmQoJ2kuZG93bmxvYWQnKTsgLy8gZG93bmxvYWQgYnV0dG9uXG5cdFx0dGhpcy4kc2xpZGVyID0gJHJvdy5maW5kKCdkaXYuY2RyLXBsYXllcicpO1xuXHRcdHRoaXMuJHNwYW5EdXJhdGlvbiA9ICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKTtcblx0XHR0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG5cdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHR0aGlzLiRwQnV0dG9uLnVuYmluZCgpO1xuXHRcdHRoaXMuJGRCdXR0b24udW5iaW5kKCk7XG5cblxuXHRcdC8vIHBsYXkgYnV0dG9uIGV2ZW50IGxpc3RlbnRlclxuXHRcdHRoaXMuJHBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHRoaXMucGxheSgpO1xuXHRcdH0pO1xuXG5cdFx0Ly8gZG93bmxvYWQgYnV0dG9uIGV2ZW50IGxpc3RlbnRlclxuXHRcdHRoaXMuJGRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG5cblx0XHQvLyB0aW1ldXBkYXRlIGV2ZW50IGxpc3RlbmVyXG5cdFx0dGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXG5cdFx0dGhpcy4kc2xpZGVyLnJhbmdlKHtcblx0XHRcdG1pbjogMCxcblx0XHRcdG1heDogMTAwLFxuXHRcdFx0c3RhcnQ6IDAsXG5cdFx0XHRvbkNoYW5nZTogdGhpcy5jYk9uU2xpZGVyQ2hhbmdlLFxuXHRcdFx0aHRtbDVBdWRpbzogdGhpcy5odG1sNUF1ZGlvLFxuXHRcdFx0Y2JUaW1lVXBkYXRlOiB0aGlzLmNiVGltZVVwZGF0ZSxcblx0XHRcdHNwYW5EdXJhdGlvbjogdGhpcy4kc3BhbkR1cmF0aW9uLFxuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INC/0L7QtNCz0YDRg9C30LrQuCDQvNC10YLQsNC00LDQvdC90YvRhVxuXHQgKi9cblx0Y2JPbk1ldGFkYXRhTG9hZGVkKCkge1xuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcblx0XHRcdGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG5cdFx0XHRkYXRlLnNldFNlY29uZHModGhpcy5jdXJyZW50VGltZSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgY3VycmVudFRpbWUgPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcblx0XHRcdGRhdGUuc2V0U2Vjb25kcyh0aGlzLmR1cmF0aW9uKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG5cdFx0XHRjb25zdCBkdXJhdGlvbiA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0JHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqINCa0L7Qu9Cx0LXQuiDQvdCwINGB0LTQstC40LMg0YHQu9Cw0LnQtNC10YDQsCDQv9GA0L7QuNCz0YDRi9Cy0LDRgtC10LvRj1xuXHQgKiBAcGFyYW0gbmV3VmFsXG5cdCAqIEBwYXJhbSBtZXRhXG5cdCAqL1xuXHRjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuXHRcdGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID0gKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0fVxuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKG51bGwpO1xuXHRcdFx0ZGF0ZS5zZXRTZWNvbmRzKHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgY3VycmVudFRpbWUgPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcblx0XHRcdGRhdGUuc2V0U2Vjb25kcyh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcblx0XHRcdGNvbnN0IGR1cmF0aW9uID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG5cdFx0XHR0aGlzLnNwYW5EdXJhdGlvbi50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiDQmtC+0LvQsdC10Log0L3QsCDQuNC30LzQtdC90LXQvdC40LUg0L/QvtC30LjRhtC40Lgg0L/RgNC+0LjQs9GA0YvQstCw0LXQvNC+0LPQviDRhNCw0LnQu9CwINC40LcgSFRNTDUg0LDRg9C00LjQvtGC0LXQs9CwXG5cdCAqL1xuXHRjYlRpbWVVcGRhdGUoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uO1xuXHRcdFx0Y29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKTtcblx0XHRcdGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHQkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJykucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuXHRcdFx0aWYgKHRoaXMuY3VycmVudFRpbWUgPT09IHRoaXMuZHVyYXRpb24pIHtcblx0XHRcdFx0JHJvdy5maW5kKCdpLnBhdXNlJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICog0JfQsNC/0YPRgdC6INC4INC+0YHRgtCw0L3QvtCy0LrQsCDQstC+0YHQv9GA0L7QuNC30LLQtdC00LXQvdC40Y8g0LDRg9C00LjQviDRhNCw0LnQu9CwXG5cdCAqINC/0L4g0LrQu9C40LrRgyDQvdCwINC40LrQvtC90LrRgyBQbGF5XG5cdCAqL1xuXHRwbGF5KCkge1xuXHRcdC8vIHN0YXJ0IG11c2ljXG5cdFx0aWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQgJiYgdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSB7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBsYXksIGFkZCBwYXVzZVxuXHRcdFx0dGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuXHRcdH0gZWxzZSB7IC8vIHBhdXNlIG11c2ljXG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcblx0XHRcdC8vIHJlbW92ZSBwYXVzZSwgYWRkIHBsYXlcblx0XHRcdHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcblx0XHR9XG5cdH1cbn1cblxuY29uc3Qgc291bmRGaWxlcyA9IHtcblx0JGF1ZGlvRmlsZXNMaXN0OiAkKCcjc291bmQtZmlsZXMtdGFibGUnKSxcblx0JGNvbnRlbnRGcmFtZTogJCgnI2NvbnRlbnQtZnJhbWUnKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRzb3VuZEZpbGVzLiRhdWRpb0ZpbGVzTGlzdC5EYXRhVGFibGUoe1xuXHRcdFx0bGVuZ3RoQ2hhbmdlOiBmYWxzZSxcblx0XHRcdHBhZ2luZzogZmFsc2UsXG5cdFx0XHRjb2x1bW5zOiBbXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG5cdFx0XHRcdHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG5cdFx0XHRdLFxuXHRcdFx0b3JkZXI6IFswLCAnYXNjJ10sXG5cdFx0XHRpbml0Q29tcGxldGUoKSB7XG5cdFx0XHRcdCQoJy5maWxlLXJvdycpLmVhY2goKGluZGV4LCByb3cpID0+IHtcblx0XHRcdFx0XHRjb25zdCBpZCA9ICQocm93KS5hdHRyKCdpZCcpO1xuXHRcdFx0XHRcdHJldHVybiBuZXcgSW5kZXhTb3VuZFBsYXllcihpZCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG5cdFx0fSk7XG5cdFx0c291bmRGaWxlcy5kYXRhVGFibGUgPSBzb3VuZEZpbGVzLiRhdWRpb0ZpbGVzTGlzdC5EYXRhVGFibGUoKTtcblx0XHRzb3VuZEZpbGVzLmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcblx0XHRcdCQoJy5maWxlLXJvdycpLmVhY2goKGluZGV4LCByb3cpID0+IHtcblx0XHRcdFx0Y29uc3QgaWQgPSAkKHJvdykuYXR0cignaWQnKTtcblx0XHRcdFx0cmV0dXJuIG5ldyBJbmRleFNvdW5kUGxheWVyKGlkKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdCQoJyNhZGQtbmV3LWJ1dHRvbicpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cdFx0Y29uc3QgdG9BcnJheSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblx0XHR0b0FycmF5LmFwcGx5KGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdhdWRpbycpKS5mb3JFYWNoKChhdWRpbykgPT4ge1xuXHRcdFx0YXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBzb3VuZEZpbGVzLmhhbmRsZU1lZGlhRXJyb3IpO1xuXHRcdH0pO1xuXHRcdCQoJ2JvZHknKS5vbignY2xpY2snLCAnYS5kZWxldGUnLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0Y29uc3QgZmlsZU5hbWUgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHRcdGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0JCgnLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXHRcdFx0JC5hcGkoe1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvZGVsZXRlLyR7aWR9YCxcblx0XHRcdFx0b246ICdub3cnLFxuXHRcdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHRcdC8vIHRlc3Qgd2hldGhlciBhIEpTT04gcmVzcG9uc2UgaXMgdmFsaWRcblx0XHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDA7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRcdGlmIChyZXNwb25zZS5zdWNjZXNzID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtUmVtb3ZlQXVkaW9GaWxlKGZpbGVOYW1lKTtcblx0XHRcdFx0XHRcdHNvdW5kRmlsZXMuJGF1ZGlvRmlsZXNMaXN0LmZpbmQoYHRyW2lkPSR7aWR9XWApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRzb3VuZEZpbGVzLiRjb250ZW50RnJhbWUuYmVmb3JlKGA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+JHtyZXNwb25zZS5tZXNzYWdlLmVycm9yfTwvZGl2PmApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXHRoYW5kbGVNZWRpYUVycm9yKGUpIHtcblx0XHRzd2l0Y2ggKGUudGFyZ2V0LmVycm9yLmNvZGUpIHtcblx0XHRcdGNhc2UgZS50YXJnZXQuZXJyb3IuTUVESUFfRVJSX0FCT1JURUQ6XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdZb3UgYWJvcnRlZCB0aGUgbWVkaWEgcGxheWJhY2suJyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBlLnRhcmdldC5lcnJvci5NRURJQV9FUlJfTkVUV09SSzpcblx0XHRcdFx0Y29uc29sZS5sb2coJ0EgbmV0d29yayBlcnJvciBjYXVzZWQgdGhlIG1lZGlhIGRvd25sb2FkIHRvIGZhaWwuJyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBlLnRhcmdldC5lcnJvci5NRURJQV9FUlJfREVDT0RFOlxuXHRcdFx0XHRjb25zb2xlLmxvZygnVGhlIG1lZGlhIHBsYXliYWNrIHdhcyBhYm9ydGVkIGR1ZSB0byBhIGNvcnJ1cHRpb24gcHJvYmxlbSBvciBiZWNhdXNlIHRoZSBtZWRpYSB1c2VkIGZlYXR1cmVzIHlvdXIgYnJvd3NlciBkaWQgbm90IHN1cHBvcnQuJyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBlLnRhcmdldC5lcnJvci5NRURJQV9FUlJfU1JDX05PVF9TVVBQT1JURUQ6XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdUaGUgbWVkaWEgY291bGQgbm90IGJlIGxvYWRlZCwgZWl0aGVyIGJlY2F1c2UgdGhlIHNlcnZlciBvciBuZXR3b3JrIGZhaWxlZCBvciBiZWNhdXNlIHRoZSBmb3JtYXQgaXMgbm90IHN1cHBvcnRlZC4nKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRjb25zb2xlLmxvZygnQW4gdW5rbm93biBtZWRpYSBlcnJvciBvY2N1cnJlZC4nKTtcblx0XHR9XG5cdFx0Y29uc3QgJHJvdyA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0JHJvdy5hZGRDbGFzcygnbmVnYXRpdmUnKTtcblx0XHQkcm93LmZpbmQoJ3RkLnBsYXllcicpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnNmX0ZpbGVOb3RGb3VuZCk7XG5cdH0sXG59O1xuXG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0c291bmRGaWxlcy5pbml0aWFsaXplKCk7XG59KTtcblxuIl19