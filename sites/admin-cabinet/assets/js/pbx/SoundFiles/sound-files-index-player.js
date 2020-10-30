"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2020
 *
 */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LXBsYXllci5qcyJdLCJuYW1lcyI6WyJJbmRleFNvdW5kUGxheWVyIiwiaWQiLCJodG1sNUF1ZGlvIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIiRyb3ciLCIkIiwiaGFzQ2xhc3MiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicGxheSIsIndpbmRvdyIsImxvY2F0aW9uIiwidGFyZ2V0IiwiYXR0ciIsImFkZEV2ZW50TGlzdGVuZXIiLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwic3BhbkR1cmF0aW9uIiwiYWRkQ2xhc3MiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsImR1cmF0aW9uIiwiY2xvc2VzdCIsImRhdGUiLCJEYXRlIiwic2V0U2Vjb25kcyIsImN1cnJlbnRUaW1lIiwidG9JU09TdHJpbmciLCJzdWJzdHIiLCJ0ZXh0IiwibmV3VmFsIiwibWV0YSIsInRyaWdnZXJlZEJ5VXNlciIsInBlcmNlbnQiLCJyYW5nZVBvc2l0aW9uIiwiTWF0aCIsInJvdW5kIiwicmVtb3ZlQ2xhc3MiLCJwYXVzZWQiLCJwYXVzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7Ozs7OztJQVNNQSxnQjs7O0FBQ0wsNEJBQVlDLEVBQVosRUFBZ0I7QUFBQTs7QUFBQTs7QUFDZixTQUFLQSxFQUFMLEdBQVVBLEVBQVY7QUFDQSxTQUFLQyxVQUFMLEdBQWtCQyxRQUFRLENBQUNDLGNBQVQsd0JBQXdDSCxFQUF4QyxFQUFsQjtBQUNBLFFBQU1JLElBQUksR0FBR0MsQ0FBQyxZQUFLTCxFQUFMLEVBQWQ7O0FBQ0EsUUFB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QUFDQTtBQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMCAyMDIwXG4gKlxuICovXG5cblxuY2xhc3MgSW5kZXhTb3VuZFBsYXllciB7XG5cdGNvbnN0cnVjdG9yKGlkKSB7XG5cdFx0dGhpcy5pZCA9IGlkO1xuXHRcdHRoaXMuaHRtbDVBdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBhdWRpby1wbGF5ZXItJHtpZH1gKTtcblx0XHRjb25zdCAkcm93ID0gJChgIyR7aWR9YCk7XG5cdFx0aWYgKCRyb3cuaGFzQ2xhc3MoJ2luaXRpYWxpemVkJykpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dGhpcy4kcEJ1dHRvbiA9ICRyb3cuZmluZCgnaS5wbGF5Jyk7IC8vIHBsYXkgYnV0dG9uXG5cdFx0dGhpcy4kZEJ1dHRvbiA9ICRyb3cuZmluZCgnaS5kb3dubG9hZCcpOyAvLyBkb3dubG9hZCBidXR0b25cblx0XHR0aGlzLiRzbGlkZXIgPSAkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJyk7XG5cdFx0dGhpcy4kc3BhbkR1cmF0aW9uID0gJHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpO1xuXHRcdHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYk9uTWV0YWRhdGFMb2FkZWQsIGZhbHNlKTtcblx0XHR0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdHRoaXMuJHBCdXR0b24udW5iaW5kKCk7XG5cdFx0dGhpcy4kZEJ1dHRvbi51bmJpbmQoKTtcblxuXG5cdFx0Ly8gcGxheSBidXR0b24gZXZlbnQgbGlzdGVudGVyXG5cdFx0dGhpcy4kcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dGhpcy5wbGF5KCk7XG5cdFx0fSk7XG5cblx0XHQvLyBkb3dubG9hZCBidXR0b24gZXZlbnQgbGlzdGVudGVyXG5cdFx0dGhpcy4kZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gJChlLnRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYk9uTWV0YWRhdGFMb2FkZWQsIGZhbHNlKTtcblxuXHRcdC8vIHRpbWV1cGRhdGUgZXZlbnQgbGlzdGVuZXJcblx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cblx0XHR0aGlzLiRzbGlkZXIucmFuZ2Uoe1xuXHRcdFx0bWluOiAwLFxuXHRcdFx0bWF4OiAxMDAsXG5cdFx0XHRzdGFydDogMCxcblx0XHRcdG9uQ2hhbmdlOiB0aGlzLmNiT25TbGlkZXJDaGFuZ2UsXG5cdFx0XHRodG1sNUF1ZGlvOiB0aGlzLmh0bWw1QXVkaW8sXG5cdFx0XHRjYlRpbWVVcGRhdGU6IHRoaXMuY2JUaW1lVXBkYXRlLFxuXHRcdFx0c3BhbkR1cmF0aW9uOiB0aGlzLiRzcGFuRHVyYXRpb24sXG5cdFx0fSk7XG5cblx0XHQvLyBQcmV2ZW50IGRvdWJsZSBwcm9jZXNzaW5nXG5cdFx0JHJvdy5hZGRDbGFzcygnaW5pdGlhbGl6ZWQnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtGH0LjQuiDQv9C+0LTQs9GA0YPQt9C60Lgg0LzQtdGC0LDQtNCw0L3QvdGL0YVcblx0ICovXG5cdGNiT25NZXRhZGF0YUxvYWRlZCgpIHtcblx0XHRpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuZHVyYXRpb24pKSB7XG5cdFx0XHRjb25zdCAkcm93ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpO1xuXHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKG51bGwpO1xuXHRcdFx0ZGF0ZS5zZXRTZWNvbmRzKHRoaXMuY3VycmVudFRpbWUpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcblx0XHRcdGNvbnN0IGN1cnJlbnRUaW1lID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG5cdFx0XHRkYXRlLnNldFNlY29uZHModGhpcy5kdXJhdGlvbik7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgZHVyYXRpb24gPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcblx0XHRcdCRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKS50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiDQmtC+0LvQsdC10Log0L3QsCDRgdC00LLQuNCzINGB0LvQsNC50LTQtdGA0LAg0L/RgNC+0LjQs9GA0YvQstCw0YLQtdC70Y9cblx0ICogQHBhcmFtIG5ld1ZhbFxuXHQgKiBAcGFyYW0gbWV0YVxuXHQgKi9cblx0Y2JPblNsaWRlckNoYW5nZShuZXdWYWwsIG1ldGEpIHtcblx0XHRpZiAobWV0YS50cmlnZ2VyZWRCeVVzZXIgJiYgTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSA9ICh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24gKiBuZXdWYWwpIC8gMTAwO1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdH1cblx0XHRpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcblx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShudWxsKTtcblx0XHRcdGRhdGUuc2V0U2Vjb25kcyh0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcblx0XHRcdGNvbnN0IGN1cnJlbnRUaW1lID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG5cdFx0XHRkYXRlLnNldFNlY29uZHModGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG5cdFx0XHRjb25zdCBkdXJhdGlvbiA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0dGhpcy5zcGFuRHVyYXRpb24udGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICog0JrQvtC70LHQtdC6INC90LAg0LjQt9C80LXQvdC10L3QuNC1INC/0L7Qt9C40YbQuNC4INC/0YDQvtC40LPRgNGL0LLQsNC10LzQvtCz0L4g0YTQsNC50LvQsCDQuNC3IEhUTUw1INCw0YPQtNC40L7RgtC10LPQsFxuXHQgKi9cblx0Y2JUaW1lVXBkYXRlKCkge1xuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcblx0XHRcdGNvbnN0IHBlcmNlbnQgPSB0aGlzLmN1cnJlbnRUaW1lIC8gdGhpcy5kdXJhdGlvbjtcblx0XHRcdGNvbnN0IHJhbmdlUG9zaXRpb24gPSBNYXRoLnJvdW5kKChwZXJjZW50KSAqIDEwMCk7XG5cdFx0XHRjb25zdCAkcm93ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpO1xuXHRcdFx0JHJvdy5maW5kKCdkaXYuY2RyLXBsYXllcicpLnJhbmdlKCdzZXQgdmFsdWUnLCByYW5nZVBvc2l0aW9uKTtcblx0XHRcdGlmICh0aGlzLmN1cnJlbnRUaW1lID09PSB0aGlzLmR1cmF0aW9uKSB7XG5cdFx0XHRcdCRyb3cuZmluZCgnaS5wYXVzZScpLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqINCX0LDQv9GD0YHQuiDQuCDQvtGB0YLQsNC90L7QstC60LAg0LLQvtGB0L/RgNC+0LjQt9Cy0LXQtNC10L3QuNGPINCw0YPQtNC40L4g0YTQsNC50LvQsFxuXHQgKiDQv9C+INC60LvQuNC60YMg0L3QsCDQuNC60L7QvdC60YMgUGxheVxuXHQgKi9cblx0cGxheSgpIHtcblx0XHQvLyBzdGFydCBtdXNpY1xuXHRcdGlmICh0aGlzLmh0bWw1QXVkaW8ucGF1c2VkICYmIHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikge1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcblx0XHRcdC8vIHJlbW92ZSBwbGF5LCBhZGQgcGF1c2Vcblx0XHRcdHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcblx0XHR9IGVsc2UgeyAvLyBwYXVzZSBtdXNpY1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG5cdFx0XHQvLyByZW1vdmUgcGF1c2UsIGFkZCBwbGF5XG5cdFx0XHR0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG5cdFx0fVxuXHR9XG59Il19