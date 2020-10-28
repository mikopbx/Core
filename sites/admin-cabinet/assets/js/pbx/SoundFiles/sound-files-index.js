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
        PbxApi.FilesRemoveAudioFile(fileName, fileId, soundFiles.cbAfterDelete);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LmpzIl0sIm5hbWVzIjpbIkluZGV4U291bmRQbGF5ZXIiLCJpZCIsImh0bWw1QXVkaW8iLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiJHJvdyIsIiQiLCJoYXNDbGFzcyIsIiRwQnV0dG9uIiwiZmluZCIsIiRkQnV0dG9uIiwiJHNsaWRlciIsIiRzcGFuRHVyYXRpb24iLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiY2JPbk1ldGFkYXRhTG9hZGVkIiwiY2JUaW1lVXBkYXRlIiwidW5iaW5kIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJwbGF5Iiwid2luZG93IiwibG9jYXRpb24iLCJ0YXJnZXQiLCJhdHRyIiwiYWRkRXZlbnRMaXN0ZW5lciIsInJhbmdlIiwibWluIiwibWF4Iiwic3RhcnQiLCJvbkNoYW5nZSIsImNiT25TbGlkZXJDaGFuZ2UiLCJzcGFuRHVyYXRpb24iLCJhZGRDbGFzcyIsIk51bWJlciIsImlzRmluaXRlIiwiZHVyYXRpb24iLCJjbG9zZXN0IiwiZGF0ZSIsIkRhdGUiLCJzZXRTZWNvbmRzIiwiY3VycmVudFRpbWUiLCJ0b0lTT1N0cmluZyIsInN1YnN0ciIsInRleHQiLCJuZXdWYWwiLCJtZXRhIiwidHJpZ2dlcmVkQnlVc2VyIiwicGVyY2VudCIsInJhbmdlUG9zaXRpb24iLCJNYXRoIiwicm91bmQiLCJyZW1vdmVDbGFzcyIsInBhdXNlZCIsInBhdXNlIiwic291bmRGaWxlcyIsIiRhdWRpb0ZpbGVzTGlzdCIsIiRjb250ZW50RnJhbWUiLCIkdGFiTWVudUl0ZW1zIiwiaW5pdGlhbGl6ZSIsInRhYiIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwib3JkZXIiLCJpbml0Q29tcGxldGUiLCJlYWNoIiwiaW5kZXgiLCJyb3ciLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZGF0YVRhYmxlIiwiYXBwZW5kVG8iLCJ0b0FycmF5IiwiQXJyYXkiLCJwcm90b3R5cGUiLCJzbGljZSIsImFwcGx5IiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJmb3JFYWNoIiwiYXVkaW8iLCJoYW5kbGVNZWRpYUVycm9yIiwiZmlsZU5hbWUiLCJmaWxlSWQiLCJQYnhBcGkiLCJGaWxlc1JlbW92ZUF1ZGlvRmlsZSIsImNiQWZ0ZXJEZWxldGUiLCJyZW1vdmUiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJvblN1Y2Nlc3MiLCJzdWNjZXNzIiwiYmVmb3JlIiwibWVzc2FnZSIsImVycm9yIiwiY29kZSIsIk1FRElBX0VSUl9BQk9SVEVEIiwiY29uc29sZSIsImxvZyIsIk1FRElBX0VSUl9ORVRXT1JLIiwiTUVESUFfRVJSX0RFQ09ERSIsIk1FRElBX0VSUl9TUkNfTk9UX1NVUFBPUlRFRCIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZl9GaWxlTm90Rm91bmQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7QUFRQTtJQUVNQSxnQjs7O0FBQ0wsNEJBQVlDLEVBQVosRUFBZ0I7QUFBQTs7QUFBQTs7QUFDZixTQUFLQSxFQUFMLEdBQVVBLEVBQVY7QUFDQSxTQUFLQyxVQUFMLEdBQWtCQyxRQUFRLENBQUNDLGNBQVQsd0JBQXdDSCxFQUF4QyxFQUFsQjtBQUNBLFFBQU1JLElBQUksR0FBR0MsQ0FBQyxZQUFLTCxFQUFMLEVBQWQ7O0FBQ0EsUUFBSUksSUFBSSxDQUFDRSxRQUFMLENBQWMsYUFBZCxDQUFKLEVBQWtDO0FBQ2pDO0FBQ0E7O0FBQ0QsU0FBS0MsUUFBTCxHQUFnQkgsSUFBSSxDQUFDSSxJQUFMLENBQVUsUUFBVixDQUFoQixDQVBlLENBT3NCOztBQUNyQyxTQUFLQyxRQUFMLEdB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QUFDQyxhQUFLeEYsQ0FBQyxDQUFDSyxNQUFGLENBQVNrRixLQUFULENBQWVFLGlCQUFwQjtBQUNDQyxVQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxpQ0FBWjtBQUNBOztBQUNELGFBQUszRixDQUFDLENBQUNLLE1BQUYsQ0FBU2tGLEtBQVQsQ0FBZUssaUJBQXBCO0FBQ0NGLFVBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLG9EQUFaO0FBQ0E7O0FBQ0QsYUFBSzNGLENBQUMsQ0FBQ0ssTUFBRixDQUFTa0YsS0FBVCxDQUFlTSxnQkFBcEI7QUFDQ0gsVUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksNkhBQVo7QUFDQTs7QUFDRCxhQUFLM0YsQ0FBQyxDQUFDSyxNQUFGLENBQVNrRixLQUFULENBQWVPLDJCQUFwQjtBQUNDSixVQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxvSEFBWjtBQUNBOztBQUNEO0FBQ0NELFVBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLGtDQUFaO0FBZEY7O0FBZ0JBLFVBQU14RyxJQUFJLEdBQUdDLENBQUMsQ0FBQ1ksQ0FBQyxDQUFDSyxNQUFILENBQUQsQ0FBWWMsT0FBWixDQUFvQixJQUFwQixDQUFiO0FBQ0FoQyxNQUFBQSxJQUFJLENBQUM0QixRQUFMLENBQWMsVUFBZDtBQUNBNUIsTUFBQUEsSUFBSSxDQUFDSSxJQUFMLENBQVUsV0FBVixFQUF1QndHLElBQXZCLENBQTRCQyxlQUFlLENBQUNDLGVBQTVDO0FBQ0E7O0FBdkZpQjtBQUFBO0FBQUEsQ0FBbkI7QUEyRkE3RyxDQUFDLENBQUNILFFBQUQsQ0FBRCxDQUFZaUgsS0FBWixDQUFrQixZQUFNO0FBQ3ZCN0QsRUFBQUEsVUFBVSxDQUFDSSxVQUFYO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgUGJ4QXBpLCBnbG9iYWxSb290VXJsICovXG5cbmNsYXNzIEluZGV4U291bmRQbGF5ZXIge1xuXHRjb25zdHJ1Y3RvcihpZCkge1xuXHRcdHRoaXMuaWQgPSBpZDtcblx0XHR0aGlzLmh0bWw1QXVkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgYXVkaW8tcGxheWVyLSR7aWR9YCk7XG5cdFx0Y29uc3QgJHJvdyA9ICQoYCMke2lkfWApO1xuXHRcdGlmICgkcm93Lmhhc0NsYXNzKCdpbml0aWFsaXplZCcpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMuJHBCdXR0b24gPSAkcm93LmZpbmQoJ2kucGxheScpOyAvLyBwbGF5IGJ1dHRvblxuXHRcdHRoaXMuJGRCdXR0b24gPSAkcm93LmZpbmQoJ2kuZG93bmxvYWQnKTsgLy8gZG93bmxvYWQgYnV0dG9uXG5cdFx0dGhpcy4kc2xpZGVyID0gJHJvdy5maW5kKCdkaXYuY2RyLXBsYXllcicpO1xuXHRcdHRoaXMuJHNwYW5EdXJhdGlvbiA9ICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKTtcblx0XHR0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG5cdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHR0aGlzLiRwQnV0dG9uLnVuYmluZCgpO1xuXHRcdHRoaXMuJGRCdXR0b24udW5iaW5kKCk7XG5cblxuXHRcdC8vIHBsYXkgYnV0dG9uIGV2ZW50IGxpc3RlbnRlclxuXHRcdHRoaXMuJHBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHRoaXMucGxheSgpO1xuXHRcdH0pO1xuXG5cdFx0Ly8gZG93bmxvYWQgYnV0dG9uIGV2ZW50IGxpc3RlbnRlclxuXHRcdHRoaXMuJGRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG5cblx0XHQvLyB0aW1ldXBkYXRlIGV2ZW50IGxpc3RlbmVyXG5cdFx0dGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXG5cdFx0dGhpcy4kc2xpZGVyLnJhbmdlKHtcblx0XHRcdG1pbjogMCxcblx0XHRcdG1heDogMTAwLFxuXHRcdFx0c3RhcnQ6IDAsXG5cdFx0XHRvbkNoYW5nZTogdGhpcy5jYk9uU2xpZGVyQ2hhbmdlLFxuXHRcdFx0aHRtbDVBdWRpbzogdGhpcy5odG1sNUF1ZGlvLFxuXHRcdFx0Y2JUaW1lVXBkYXRlOiB0aGlzLmNiVGltZVVwZGF0ZSxcblx0XHRcdHNwYW5EdXJhdGlvbjogdGhpcy4kc3BhbkR1cmF0aW9uLFxuXHRcdH0pO1xuXG5cdFx0Ly8gUHJldmVudCBkb3VibGUgcHJvY2Vzc2luZ1xuXHRcdCRyb3cuYWRkQ2xhc3MoJ2luaXRpYWxpemVkJyk7XG5cdH1cblxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLRh9C40Log0L/QvtC00LPRgNGD0LfQutC4INC80LXRgtCw0LTQsNC90L3Ri9GFXG5cdCAqL1xuXHRjYk9uTWV0YWRhdGFMb2FkZWQoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcblx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShudWxsKTtcblx0XHRcdGRhdGUuc2V0U2Vjb25kcyh0aGlzLmN1cnJlbnRUaW1lKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG5cdFx0XHRjb25zdCBjdXJyZW50VGltZSA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0ZGF0ZS5zZXRTZWNvbmRzKHRoaXMuZHVyYXRpb24pOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcblx0XHRcdGNvbnN0IGR1cmF0aW9uID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG5cdFx0XHQkcm93LmZpbmQoJ3NwYW4uY2RyLWR1cmF0aW9uJykudGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICog0JrQvtC70LHQtdC6INC90LAg0YHQtNCy0LjQsyDRgdC70LDQudC00LXRgNCwINC/0YDQvtC40LPRgNGL0LLQsNGC0LXQu9GPXG5cdCAqIEBwYXJhbSBuZXdWYWxcblx0ICogQHBhcmFtIG1ldGFcblx0ICovXG5cdGNiT25TbGlkZXJDaGFuZ2UobmV3VmFsLCBtZXRhKSB7XG5cdFx0aWYgKG1ldGEudHJpZ2dlcmVkQnlVc2VyICYmIE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgPSAodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uICogbmV3VmFsKSAvIDEwMDtcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHR9XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG5cdFx0XHRkYXRlLnNldFNlY29uZHModGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG5cdFx0XHRjb25zdCBjdXJyZW50VGltZSA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0ZGF0ZS5zZXRTZWNvbmRzKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbik7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgZHVyYXRpb24gPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcblx0XHRcdHRoaXMuc3BhbkR1cmF0aW9uLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqINCa0L7Qu9Cx0LXQuiDQvdCwINC40LfQvNC10L3QtdC90LjQtSDQv9C+0LfQuNGG0LjQuCDQv9GA0L7QuNCz0YDRi9Cy0LDQtdC80L7Qs9C+INGE0LDQudC70LAg0LjQtyBIVE1MNSDQsNGD0LTQuNC+0YLQtdCz0LBcblx0ICovXG5cdGNiVGltZVVwZGF0ZSgpIHtcblx0XHRpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuZHVyYXRpb24pKSB7XG5cdFx0XHRjb25zdCBwZXJjZW50ID0gdGhpcy5jdXJyZW50VGltZSAvIHRoaXMuZHVyYXRpb247XG5cdFx0XHRjb25zdCByYW5nZVBvc2l0aW9uID0gTWF0aC5yb3VuZCgocGVyY2VudCkgKiAxMDApO1xuXHRcdFx0Y29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcblx0XHRcdCRyb3cuZmluZCgnZGl2LmNkci1wbGF5ZXInKS5yYW5nZSgnc2V0IHZhbHVlJywgcmFuZ2VQb3NpdGlvbik7XG5cdFx0XHRpZiAodGhpcy5jdXJyZW50VGltZSA9PT0gdGhpcy5kdXJhdGlvbikge1xuXHRcdFx0XHQkcm93LmZpbmQoJ2kucGF1c2UnKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiDQl9Cw0L/Rg9GB0Log0Lgg0L7RgdGC0LDQvdC+0LLQutCwINCy0L7RgdC/0YDQvtC40LfQstC10LTQtdC90LjRjyDQsNGD0LTQuNC+INGE0LDQudC70LBcblx0ICog0L/QviDQutC70LjQutGDINC90LAg0LjQutC+0L3QutGDIFBsYXlcblx0ICovXG5cdHBsYXkoKSB7XG5cdFx0Ly8gc3RhcnQgbXVzaWNcblx0XHRpZiAodGhpcy5odG1sNUF1ZGlvLnBhdXNlZCAmJiB0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pIHtcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG5cdFx0XHQvLyByZW1vdmUgcGxheSwgYWRkIHBhdXNlXG5cdFx0XHR0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG5cdFx0fSBlbHNlIHsgLy8gcGF1c2UgbXVzaWNcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5wYXVzZSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBhdXNlLCBhZGQgcGxheVxuXHRcdFx0dGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuXHRcdH1cblx0fVxufVxuXG5jb25zdCBzb3VuZEZpbGVzID0ge1xuXHQkYXVkaW9GaWxlc0xpc3Q6ICQoJyNjdXN0b20tc291bmQtZmlsZXMtdGFibGUsICNtb2gtc291bmQtZmlsZXMtdGFibGUnKSxcblx0JGNvbnRlbnRGcmFtZTogJCgnI2NvbnRlbnQtZnJhbWUnKSxcblx0JHRhYk1lbnVJdGVtczogJCgnI3NvdW5kLWZpbGVzLW1lbnUgLml0ZW0nKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRzb3VuZEZpbGVzLiR0YWJNZW51SXRlbXMudGFiKCk7XG5cdFx0c291bmRGaWxlcy4kYXVkaW9GaWxlc0xpc3QuRGF0YVRhYmxlKHtcblx0XHRcdGxlbmd0aENoYW5nZTogZmFsc2UsXG5cdFx0XHRwYWdpbmc6IGZhbHNlLFxuXHRcdFx0Y29sdW1uczogW1xuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHR7IG9yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlIH0sXG5cdFx0XHRcdHsgb3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2UgfSxcblx0XHRcdF0sXG5cdFx0XHRvcmRlcjogWzAsICdhc2MnXSxcblx0XHRcdGluaXRDb21wbGV0ZSgpIHtcblx0XHRcdFx0JCgnLmZpbGUtcm93JykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IGlkID0gJChyb3cpLmF0dHIoJ2lkJyk7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBJbmRleFNvdW5kUGxheWVyKGlkKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdFx0bGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcblx0XHR9KTtcblx0XHRzb3VuZEZpbGVzLmRhdGFUYWJsZSA9IHNvdW5kRmlsZXMuJGF1ZGlvRmlsZXNMaXN0LkRhdGFUYWJsZSgpO1xuXHRcdHNvdW5kRmlsZXMuZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuXHRcdFx0JCgnLmZpbGUtcm93JykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuXHRcdFx0XHRjb25zdCBpZCA9ICQocm93KS5hdHRyKCdpZCcpO1xuXHRcdFx0XHRyZXR1cm4gbmV3IEluZGV4U291bmRQbGF5ZXIoaWQpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFx0JCgnI2FkZC1uZXctY3VzdG9tLWJ1dHRvbicpLmFwcGVuZFRvKCQoJyNjdXN0b20tc291bmQtZmlsZXMtdGFibGVfd3JhcHBlciBkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuXHRcdCQoJyNhZGQtbmV3LW1vaC1idXR0b24nKS5hcHBlbmRUbygkKCcjbW9oLXNvdW5kLWZpbGVzLXRhYmxlX3dyYXBwZXIgZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcblx0XHRjb25zdCB0b0FycmF5ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuXHRcdHRvQXJyYXkuYXBwbHkoZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2F1ZGlvJykpLmZvckVhY2goKGF1ZGlvKSA9PiB7XG5cdFx0XHRhdWRpby5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIHNvdW5kRmlsZXMuaGFuZGxlTWVkaWFFcnJvcik7XG5cdFx0fSk7XG5cdFx0JCgnYm9keScpLm9uKCdjbGljaycsICdhLmRlbGV0ZScsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRjb25zdCBmaWxlTmFtZSA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS12YWx1ZScpO1xuXHRcdFx0Y29uc3QgZmlsZUlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0UGJ4QXBpLkZpbGVzUmVtb3ZlQXVkaW9GaWxlKGZpbGVOYW1lLCBmaWxlSWQsIHNvdW5kRmlsZXMuY2JBZnRlckRlbGV0ZSk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBhZnRlciBzdWNjZXNzIGZpbGUgZGVsZXRlXG5cdCAqIEBwYXJhbSBpZFxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbnxib29sZWFufVxuXHQgKi9cblx0Y2JBZnRlckRlbGV0ZShpZCkge1xuXHRcdCQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvZGVsZXRlLyR7aWR9YCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0XHRcdC8vIHRlc3Qgd2hldGhlciBhIEpTT04gcmVzcG9uc2UgaXMgdmFsaWRcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMDtcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWUpIHtcblx0XHRcdFx0XHRzb3VuZEZpbGVzLiRhdWRpb0ZpbGVzTGlzdC5maW5kKGB0cltpZD0ke2lkfV1gKS5yZW1vdmUoKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzb3VuZEZpbGVzLiRjb250ZW50RnJhbWUuYmVmb3JlKGA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+JHtyZXNwb25zZS5tZXNzYWdlLmVycm9yfTwvZGl2PmApO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHRoYW5kbGVNZWRpYUVycm9yKGUpIHtcblx0XHRzd2l0Y2ggKGUudGFyZ2V0LmVycm9yLmNvZGUpIHtcblx0XHRcdGNhc2UgZS50YXJnZXQuZXJyb3IuTUVESUFfRVJSX0FCT1JURUQ6XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdZb3UgYWJvcnRlZCB0aGUgbWVkaWEgcGxheWJhY2suJyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBlLnRhcmdldC5lcnJvci5NRURJQV9FUlJfTkVUV09SSzpcblx0XHRcdFx0Y29uc29sZS5sb2coJ0EgbmV0d29yayBlcnJvciBjYXVzZWQgdGhlIG1lZGlhIGRvd25sb2FkIHRvIGZhaWwuJyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBlLnRhcmdldC5lcnJvci5NRURJQV9FUlJfREVDT0RFOlxuXHRcdFx0XHRjb25zb2xlLmxvZygnVGhlIG1lZGlhIHBsYXliYWNrIHdhcyBhYm9ydGVkIGR1ZSB0byBhIGNvcnJ1cHRpb24gcHJvYmxlbSBvciBiZWNhdXNlIHRoZSBtZWRpYSB1c2VkIGZlYXR1cmVzIHlvdXIgYnJvd3NlciBkaWQgbm90IHN1cHBvcnQuJyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBlLnRhcmdldC5lcnJvci5NRURJQV9FUlJfU1JDX05PVF9TVVBQT1JURUQ6XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdUaGUgbWVkaWEgY291bGQgbm90IGJlIGxvYWRlZCwgZWl0aGVyIGJlY2F1c2UgdGhlIHNlcnZlciBvciBuZXR3b3JrIGZhaWxlZCBvciBiZWNhdXNlIHRoZSBmb3JtYXQgaXMgbm90IHN1cHBvcnRlZC4nKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRjb25zb2xlLmxvZygnQW4gdW5rbm93biBtZWRpYSBlcnJvciBvY2N1cnJlZC4nKTtcblx0XHR9XG5cdFx0Y29uc3QgJHJvdyA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0JHJvdy5hZGRDbGFzcygnbmVnYXRpdmUnKTtcblx0XHQkcm93LmZpbmQoJ3RkLnBsYXllcicpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnNmX0ZpbGVOb3RGb3VuZCk7XG5cdH0sXG59O1xuXG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0c291bmRGaWxlcy5pbml0aWFsaXplKCk7XG59KTtcblxuIl19