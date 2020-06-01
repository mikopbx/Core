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

    if ($row.hasClass('initialized')) {
      return;
    }

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
    }); // Prevent double processing

    $row.addClass('initialized');
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
  $audioFilesList: $('#custom-sound-files-table, #moh-sound-files-table'),
  $contentFrame: $('#content-frame'),
  $tabMenuItems: $('#sound-files-menu .item'),
  initialize: function () {
    function initialize() {
      soundFiles.$tabMenuItems.tab();
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
      $('#add-new-custom-button').appendTo($('#custom-sound-files-table_wrapper div.eight.column:eq(0)'));
      $('#add-new-moh-button').appendTo($('#moh-sound-files-table_wrapper div.eight.column:eq(0)'));
      var toArray = Array.prototype.slice;
      toArray.apply(document.getElementsByTagName('audio')).forEach(function (audio) {
        audio.addEventListener('error', soundFiles.handleMediaError);
      });
      $('body').on('click', 'a.delete', function (e) {
        e.preventDefault();
        var fileName = $(e.target).closest('tr').attr('data-value');
        var fileId = $(e.target).closest('tr').attr('id');
        PbxApi.SystemRemoveAudioFile(fileName, fileId, soundFiles.cbAfterDelete);
      });
    }

    return initialize;
  }(),

  /**
   * Callback after success file delete
   * @param id
   * @returns {boolean|boolean}
   */
  cbAfterDelete: function () {
    function cbAfterDelete(id) {
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
              soundFiles.$audioFilesList.find("tr[id=".concat(id, "]")).remove();
            } else {
              soundFiles.$contentFrame.before("<div class=\"ui error message ajax\">".concat(response.message.error, "</div>"));
            }
          }

          return onSuccess;
        }()
      });
    }

    return cbAfterDelete;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LmpzIl0sIm5hbWVzIjpbIkluZGV4U291bmRQbGF5ZXIiLCJpZCIsImh0bWw1QXVkaW8iLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiJHJvdyIsIiQiLCJoYXNDbGFzcyIsIiRwQnV0dG9uIiwiZmluZCIsIiRkQnV0dG9uIiwiJHNsaWRlciIsIiRzcGFuRHVyYXRpb24iLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiY2JPbk1ldGFkYXRhTG9hZGVkIiwiY2JUaW1lVXBkYXRlIiwidW5iaW5kIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJwbGF5Iiwid2luZG93IiwibG9jYXRpb24iLCJ0YXJnZXQiLCJhdHRyIiwiYWRkRXZlbnRMaXN0ZW5lciIsInJhbmdlIiwibWluIiwibWF4Iiwic3RhcnQiLCJvbkNoYW5nZSIsImNiT25TbGlkZXJDaGFuZ2UiLCJzcGFuRHVyYXRpb24iLCJhZGRDbGFzcyIsIk51bWJlciIsImlzRmluaXRlIiwiZHVyYXRpb24iLCJjbG9zZXN0IiwiZGF0ZSIsIkRhdGUiLCJzZXRTZWNvbmRzIiwiY3VycmVudFRpbWUiLCJ0b0lTT1N0cmluZyIsInN1YnN0ciIsInRleHQiLCJuZXdWYWwiLCJtZXRhIiwidHJpZ2dlcmVkQnlVc2VyIiwicGVyY2VudCIsInJhbmdlUG9zaXRpb24iLCJNYXRoIiwicm91bmQiLCJyZW1vdmVDbGFzcyIsInBhdXNlZCIsInBhdXNlIiwic291bmRGaWxlcyIsIiRhdWRpb0ZpbGVzTGlzdCIsIiRjb250ZW50RnJhbWUiLCIkdGFiTWVudUl0ZW1zIiwiaW5pdGlhbGl6ZSIsInRhYiIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwib3JkZXIiLCJpbml0Q29tcGxldGUiLCJlYWNoIiwiaW5kZXgiLCJyb3ciLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZGF0YVRhYmxlIiwiYXBwZW5kVG8iLCJ0b0FycmF5IiwiQXJyYXkiLCJwcm90b3R5cGUiLCJzbGljZSIsImFwcGx5IiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJmb3JFYWNoIiwiYXVkaW8iLCJoYW5kbGVNZWRpYUVycm9yIiwiZmlsZU5hbWUiLCJmaWxlSWQiLCJQYnhBcGkiLCJTeXN0ZW1SZW1vdmVBdWRpb0ZpbGUiLCJjYkFmdGVyRGVsZXRlIiwicmVtb3ZlIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwib25TdWNjZXNzIiwic3VjY2VzcyIsImJlZm9yZSIsIm1lc3NhZ2UiLCJlcnJvciIsImNvZGUiLCJNRURJQV9FUlJfQUJPUlRFRCIsImNvbnNvbGUiLCJsb2ciLCJNRURJQV9FUlJfTkVUV09SSyIsIk1FRElBX0VSUl9ERUNPREUiLCJNRURJQV9FUlJfU1JDX05PVF9TVVBQT1JURUQiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwic2ZfRmlsZU5vdEZvdW5kIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7Ozs7O0FBUUE7SUFFTUEsZ0I7OztBQUNMLDRCQUFZQyxFQUFaLEVBQWdCO0FBQUE7O0FBQUE7O0FBQ2YsU0FBS0EsRUFBTCxHQUFVQSxFQUFWO0FBQ0EsU0FBS0MsVUFBTCxHQUFrQkMsUUFBUSxDQUFDQyxjQUFULHdCQUF3Q0gsRUFBeEMsRUFBbEI7QUFDQSxRQUFNSSxJQUFJLEdBQUdDLENBQUMsWUFBS0wsRUFBTCxFQUFkOztBQUNBLFFBQUlJLElBQUksQ0FBQ0UsUUFBTCxDQUFjLGFBQWQsQ0FBSixFQUFrQztBQUNqQztBQUNBOztBQUNELFNBQUtDLFFBQUwsR0FBZ0JILElBQUksQ0FBQ0ksSUFBTCxDQUFVLFFBQVYsQ0FBaEIsQ0FQZSxDQU9zQjs7QUFDckMsU0FBS0MsUUFBTCxH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O0FBQ0MsYUFBS3hGLENBQUMsQ0FBQ0ssTUFBRixDQUFTa0YsS0FBVCxDQUFlRSxpQkFBcEI7QUFDQ0MsVUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksaUNBQVo7QUFDQTs7QUFDRCxhQUFLM0YsQ0FBQyxDQUFDSyxNQUFGLENBQVNrRixLQUFULENBQWVLLGlCQUFwQjtBQUNDRixVQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxvREFBWjtBQUNBOztBQUNELGFBQUszRixDQUFDLENBQUNLLE1BQUYsQ0FBU2tGLEtBQVQsQ0FBZU0sZ0JBQXBCO0FBQ0NILFVBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLDZIQUFaO0FBQ0E7O0FBQ0QsYUFBSzNGLENBQUMsQ0FBQ0ssTUFBRixDQUFTa0YsS0FBVCxDQUFlTywyQkFBcEI7QUFDQ0osVUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksb0hBQVo7QUFDQTs7QUFDRDtBQUNDRCxVQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxrQ0FBWjtBQWRGOztBQWdCQSxVQUFNeEcsSUFBSSxHQUFHQyxDQUFDLENBQUNZLENBQUMsQ0FBQ0ssTUFBSCxDQUFELENBQVljLE9BQVosQ0FBb0IsSUFBcEIsQ0FBYjtBQUNBaEMsTUFBQUEsSUFBSSxDQUFDNEIsUUFBTCxDQUFjLFVBQWQ7QUFDQTVCLE1BQUFBLElBQUksQ0FBQ0ksSUFBTCxDQUFVLFdBQVYsRUFBdUJ3RyxJQUF2QixDQUE0QkMsZUFBZSxDQUFDQyxlQUE1QztBQUNBOztBQXZGaUI7QUFBQTtBQUFBLENBQW5CO0FBMkZBN0csQ0FBQyxDQUFDSCxRQUFELENBQUQsQ0FBWWlILEtBQVosQ0FBa0IsWUFBTTtBQUN2QjdELEVBQUFBLFVBQVUsQ0FBQ0ksVUFBWDtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIFBieEFwaSwgZ2xvYmFsUm9vdFVybCAqL1xuXG5jbGFzcyBJbmRleFNvdW5kUGxheWVyIHtcblx0Y29uc3RydWN0b3IoaWQpIHtcblx0XHR0aGlzLmlkID0gaWQ7XG5cdFx0dGhpcy5odG1sNUF1ZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGF1ZGlvLXBsYXllci0ke2lkfWApO1xuXHRcdGNvbnN0ICRyb3cgPSAkKGAjJHtpZH1gKTtcblx0XHRpZiAoJHJvdy5oYXNDbGFzcygnaW5pdGlhbGl6ZWQnKSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLiRwQnV0dG9uID0gJHJvdy5maW5kKCdpLnBsYXknKTsgLy8gcGxheSBidXR0b25cblx0XHR0aGlzLiRkQnV0dG9uID0gJHJvdy5maW5kKCdpLmRvd25sb2FkJyk7IC8vIGRvd25sb2FkIGJ1dHRvblxuXHRcdHRoaXMuJHNsaWRlciA9ICRyb3cuZmluZCgnZGl2LmNkci1wbGF5ZXInKTtcblx0XHR0aGlzLiRzcGFuRHVyYXRpb24gPSAkcm93LmZpbmQoJ3NwYW4uY2RyLWR1cmF0aW9uJyk7XG5cdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZCwgZmFsc2UpO1xuXHRcdHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0dGhpcy4kcEJ1dHRvbi51bmJpbmQoKTtcblx0XHR0aGlzLiRkQnV0dG9uLnVuYmluZCgpO1xuXG5cblx0XHQvLyBwbGF5IGJ1dHRvbiBldmVudCBsaXN0ZW50ZXJcblx0XHR0aGlzLiRwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR0aGlzLnBsYXkoKTtcblx0XHR9KTtcblxuXHRcdC8vIGRvd25sb2FkIGJ1dHRvbiBldmVudCBsaXN0ZW50ZXJcblx0XHR0aGlzLiRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSAkKGUudGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZCwgZmFsc2UpO1xuXG5cdFx0Ly8gdGltZXVwZGF0ZSBldmVudCBsaXN0ZW5lclxuXHRcdHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblxuXHRcdHRoaXMuJHNsaWRlci5yYW5nZSh7XG5cdFx0XHRtaW46IDAsXG5cdFx0XHRtYXg6IDEwMCxcblx0XHRcdHN0YXJ0OiAwLFxuXHRcdFx0b25DaGFuZ2U6IHRoaXMuY2JPblNsaWRlckNoYW5nZSxcblx0XHRcdGh0bWw1QXVkaW86IHRoaXMuaHRtbDVBdWRpbyxcblx0XHRcdGNiVGltZVVwZGF0ZTogdGhpcy5jYlRpbWVVcGRhdGUsXG5cdFx0XHRzcGFuRHVyYXRpb246IHRoaXMuJHNwYW5EdXJhdGlvbixcblx0XHR9KTtcblxuXHRcdC8vIFByZXZlbnQgZG91YmxlIHByb2Nlc3Npbmdcblx0XHQkcm93LmFkZENsYXNzKCdpbml0aWFsaXplZCcpO1xuXHR9XG5cblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INC/0L7QtNCz0YDRg9C30LrQuCDQvNC10YLQsNC00LDQvdC90YvRhVxuXHQgKi9cblx0Y2JPbk1ldGFkYXRhTG9hZGVkKCkge1xuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcblx0XHRcdGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG5cdFx0XHRkYXRlLnNldFNlY29uZHModGhpcy5jdXJyZW50VGltZSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgY3VycmVudFRpbWUgPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcblx0XHRcdGRhdGUuc2V0U2Vjb25kcyh0aGlzLmR1cmF0aW9uKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG5cdFx0XHRjb25zdCBkdXJhdGlvbiA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0JHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqINCa0L7Qu9Cx0LXQuiDQvdCwINGB0LTQstC40LMg0YHQu9Cw0LnQtNC10YDQsCDQv9GA0L7QuNCz0YDRi9Cy0LDRgtC10LvRj1xuXHQgKiBAcGFyYW0gbmV3VmFsXG5cdCAqIEBwYXJhbSBtZXRhXG5cdCAqL1xuXHRjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuXHRcdGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID0gKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0fVxuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKG51bGwpO1xuXHRcdFx0ZGF0ZS5zZXRTZWNvbmRzKHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgY3VycmVudFRpbWUgPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcblx0XHRcdGRhdGUuc2V0U2Vjb25kcyh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcblx0XHRcdGNvbnN0IGR1cmF0aW9uID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG5cdFx0XHR0aGlzLnNwYW5EdXJhdGlvbi50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiDQmtC+0LvQsdC10Log0L3QsCDQuNC30LzQtdC90LXQvdC40LUg0L/QvtC30LjRhtC40Lgg0L/RgNC+0LjQs9GA0YvQstCw0LXQvNC+0LPQviDRhNCw0LnQu9CwINC40LcgSFRNTDUg0LDRg9C00LjQvtGC0LXQs9CwXG5cdCAqL1xuXHRjYlRpbWVVcGRhdGUoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uO1xuXHRcdFx0Y29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKTtcblx0XHRcdGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHQkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJykucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuXHRcdFx0aWYgKHRoaXMuY3VycmVudFRpbWUgPT09IHRoaXMuZHVyYXRpb24pIHtcblx0XHRcdFx0JHJvdy5maW5kKCdpLnBhdXNlJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICog0JfQsNC/0YPRgdC6INC4INC+0YHRgtCw0L3QvtCy0LrQsCDQstC+0YHQv9GA0L7QuNC30LLQtdC00LXQvdC40Y8g0LDRg9C00LjQviDRhNCw0LnQu9CwXG5cdCAqINC/0L4g0LrQu9C40LrRgyDQvdCwINC40LrQvtC90LrRgyBQbGF5XG5cdCAqL1xuXHRwbGF5KCkge1xuXHRcdC8vIHN0YXJ0IG11c2ljXG5cdFx0aWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQgJiYgdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSB7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBsYXksIGFkZCBwYXVzZVxuXHRcdFx0dGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuXHRcdH0gZWxzZSB7IC8vIHBhdXNlIG11c2ljXG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcblx0XHRcdC8vIHJlbW92ZSBwYXVzZSwgYWRkIHBsYXlcblx0XHRcdHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcblx0XHR9XG5cdH1cbn1cblxuY29uc3Qgc291bmRGaWxlcyA9IHtcblx0JGF1ZGlvRmlsZXNMaXN0OiAkKCcjY3VzdG9tLXNvdW5kLWZpbGVzLXRhYmxlLCAjbW9oLXNvdW5kLWZpbGVzLXRhYmxlJyksXG5cdCRjb250ZW50RnJhbWU6ICQoJyNjb250ZW50LWZyYW1lJyksXG5cdCR0YWJNZW51SXRlbXM6ICQoJyNzb3VuZC1maWxlcy1tZW51IC5pdGVtJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0c291bmRGaWxlcy4kdGFiTWVudUl0ZW1zLnRhYigpO1xuXHRcdHNvdW5kRmlsZXMuJGF1ZGlvRmlsZXNMaXN0LkRhdGFUYWJsZSh7XG5cdFx0XHRsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuXHRcdFx0cGFnaW5nOiBmYWxzZSxcblx0XHRcdGNvbHVtbnM6IFtcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0eyBvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZSB9LFxuXHRcdFx0XHR7IG9yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlIH0sXG5cdFx0XHRdLFxuXHRcdFx0b3JkZXI6IFswLCAnYXNjJ10sXG5cdFx0XHRpbml0Q29tcGxldGUoKSB7XG5cdFx0XHRcdCQoJy5maWxlLXJvdycpLmVhY2goKGluZGV4LCByb3cpID0+IHtcblx0XHRcdFx0XHRjb25zdCBpZCA9ICQocm93KS5hdHRyKCdpZCcpO1xuXHRcdFx0XHRcdHJldHVybiBuZXcgSW5kZXhTb3VuZFBsYXllcihpZCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG5cdFx0fSk7XG5cdFx0c291bmRGaWxlcy5kYXRhVGFibGUgPSBzb3VuZEZpbGVzLiRhdWRpb0ZpbGVzTGlzdC5EYXRhVGFibGUoKTtcblx0XHRzb3VuZEZpbGVzLmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcblx0XHRcdCQoJy5maWxlLXJvdycpLmVhY2goKGluZGV4LCByb3cpID0+IHtcblx0XHRcdFx0Y29uc3QgaWQgPSAkKHJvdykuYXR0cignaWQnKTtcblx0XHRcdFx0cmV0dXJuIG5ldyBJbmRleFNvdW5kUGxheWVyKGlkKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdCQoJyNhZGQtbmV3LWN1c3RvbS1idXR0b24nKS5hcHBlbmRUbygkKCcjY3VzdG9tLXNvdW5kLWZpbGVzLXRhYmxlX3dyYXBwZXIgZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcblx0XHQkKCcjYWRkLW5ldy1tb2gtYnV0dG9uJykuYXBwZW5kVG8oJCgnI21vaC1zb3VuZC1maWxlcy10YWJsZV93cmFwcGVyIGRpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cdFx0Y29uc3QgdG9BcnJheSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblx0XHR0b0FycmF5LmFwcGx5KGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdhdWRpbycpKS5mb3JFYWNoKChhdWRpbykgPT4ge1xuXHRcdFx0YXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBzb3VuZEZpbGVzLmhhbmRsZU1lZGlhRXJyb3IpO1xuXHRcdH0pO1xuXHRcdCQoJ2JvZHknKS5vbignY2xpY2snLCAnYS5kZWxldGUnLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0Y29uc3QgZmlsZU5hbWUgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHRcdGNvbnN0IGZpbGVJZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdFBieEFwaS5TeXN0ZW1SZW1vdmVBdWRpb0ZpbGUoZmlsZU5hbWUsIGZpbGVJZCwgc291bmRGaWxlcy5jYkFmdGVyRGVsZXRlKTtcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIENhbGxiYWNrIGFmdGVyIHN1Y2Nlc3MgZmlsZSBkZWxldGVcblx0ICogQHBhcmFtIGlkXG5cdCAqIEByZXR1cm5zIHtib29sZWFufGJvb2xlYW59XG5cdCAqL1xuXHRjYkFmdGVyRGVsZXRlKGlkKSB7XG5cdFx0JCgnLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9kZWxldGUvJHtpZH1gLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcblx0XHRcdFx0Ly8gdGVzdCB3aGV0aGVyIGEgSlNPTiByZXNwb25zZSBpcyB2YWxpZFxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwO1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdHNvdW5kRmlsZXMuJGF1ZGlvRmlsZXNMaXN0LmZpbmQoYHRyW2lkPSR7aWR9XWApLnJlbW92ZSgpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNvdW5kRmlsZXMuJGNvbnRlbnRGcmFtZS5iZWZvcmUoYDxkaXYgY2xhc3M9XCJ1aSBlcnJvciBtZXNzYWdlIGFqYXhcIj4ke3Jlc3BvbnNlLm1lc3NhZ2UuZXJyb3J9PC9kaXY+YCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdGhhbmRsZU1lZGlhRXJyb3IoZSkge1xuXHRcdHN3aXRjaCAoZS50YXJnZXQuZXJyb3IuY29kZSkge1xuXHRcdFx0Y2FzZSBlLnRhcmdldC5lcnJvci5NRURJQV9FUlJfQUJPUlRFRDpcblx0XHRcdFx0Y29uc29sZS5sb2coJ1lvdSBhYm9ydGVkIHRoZSBtZWRpYSBwbGF5YmFjay4nKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIGUudGFyZ2V0LmVycm9yLk1FRElBX0VSUl9ORVRXT1JLOlxuXHRcdFx0XHRjb25zb2xlLmxvZygnQSBuZXR3b3JrIGVycm9yIGNhdXNlZCB0aGUgbWVkaWEgZG93bmxvYWQgdG8gZmFpbC4nKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIGUudGFyZ2V0LmVycm9yLk1FRElBX0VSUl9ERUNPREU6XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdUaGUgbWVkaWEgcGxheWJhY2sgd2FzIGFib3J0ZWQgZHVlIHRvIGEgY29ycnVwdGlvbiBwcm9ibGVtIG9yIGJlY2F1c2UgdGhlIG1lZGlhIHVzZWQgZmVhdHVyZXMgeW91ciBicm93c2VyIGRpZCBub3Qgc3VwcG9ydC4nKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIGUudGFyZ2V0LmVycm9yLk1FRElBX0VSUl9TUkNfTk9UX1NVUFBPUlRFRDpcblx0XHRcdFx0Y29uc29sZS5sb2coJ1RoZSBtZWRpYSBjb3VsZCBub3QgYmUgbG9hZGVkLCBlaXRoZXIgYmVjYXVzZSB0aGUgc2VydmVyIG9yIG5ldHdvcmsgZmFpbGVkIG9yIGJlY2F1c2UgdGhlIGZvcm1hdCBpcyBub3Qgc3VwcG9ydGVkLicpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdBbiB1bmtub3duIG1lZGlhIGVycm9yIG9jY3VycmVkLicpO1xuXHRcdH1cblx0XHRjb25zdCAkcm93ID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcblx0XHQkcm93LmFkZENsYXNzKCduZWdhdGl2ZScpO1xuXHRcdCRyb3cuZmluZCgndGQucGxheWVyJykuaHRtbChnbG9iYWxUcmFuc2xhdGUuc2ZfRmlsZU5vdEZvdW5kKTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRzb3VuZEZpbGVzLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=