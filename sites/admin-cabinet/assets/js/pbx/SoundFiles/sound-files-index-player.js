"use strict";

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LXBsYXllci5qcyJdLCJuYW1lcyI6WyJJbmRleFNvdW5kUGxheWVyIiwiaWQiLCJodG1sNUF1ZGlvIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIiRyb3ciLCIkIiwiaGFzQ2xhc3MiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicGxheSIsIndpbmRvdyIsImxvY2F0aW9uIiwidGFyZ2V0IiwiYXR0ciIsImFkZEV2ZW50TGlzdGVuZXIiLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwic3BhbkR1cmF0aW9uIiwiYWRkQ2xhc3MiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsImR1cmF0aW9uIiwiY2xvc2VzdCIsImRhdGUiLCJEYXRlIiwic2V0U2Vjb25kcyIsImN1cnJlbnRUaW1lIiwidG9JU09TdHJpbmciLCJzdWJzdHIiLCJ0ZXh0IiwibmV3VmFsIiwibWV0YSIsInRyaWdnZXJlZEJ5VXNlciIsInBlcmNlbnQiLCJyYW5nZVBvc2l0aW9uIiwiTWF0aCIsInJvdW5kIiwicmVtb3ZlQ2xhc3MiLCJwYXVzZWQiLCJwYXVzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFtQk1BLGdCOzs7QUFDTCw0QkFBWUMsRUFBWixFQUFnQjtBQUFBOztBQUFBOztBQUNmLFNBQUtBLEVBQUwsR0FBVUEsRUFBVjtBQUNBLFNBQUtDLFVBQUwsR0FBa0JDLFFBQVEsQ0FBQ0MsY0FBVCx3QkFBd0NILEVBQXhDLEVBQWxCO0FBQ0EsUUFBTUksSUFBSSxHQUFHQyxDQUFDLFlBQUtMLEVBQUwsRUFB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QUE0QyxNQUE1QztBQUNBO0FBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuXG5jbGFzcyBJbmRleFNvdW5kUGxheWVyIHtcblx0Y29uc3RydWN0b3IoaWQpIHtcblx0XHR0aGlzLmlkID0gaWQ7XG5cdFx0dGhpcy5odG1sNUF1ZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGF1ZGlvLXBsYXllci0ke2lkfWApO1xuXHRcdGNvbnN0ICRyb3cgPSAkKGAjJHtpZH1gKTtcblx0XHRpZiAoJHJvdy5oYXNDbGFzcygnaW5pdGlhbGl6ZWQnKSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLiRwQnV0dG9uID0gJHJvdy5maW5kKCdpLnBsYXknKTsgLy8gcGxheSBidXR0b25cblx0XHR0aGlzLiRkQnV0dG9uID0gJHJvdy5maW5kKCdpLmRvd25sb2FkJyk7IC8vIGRvd25sb2FkIGJ1dHRvblxuXHRcdHRoaXMuJHNsaWRlciA9ICRyb3cuZmluZCgnZGl2LmNkci1wbGF5ZXInKTtcblx0XHR0aGlzLiRzcGFuRHVyYXRpb24gPSAkcm93LmZpbmQoJ3NwYW4uY2RyLWR1cmF0aW9uJyk7XG5cdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZCwgZmFsc2UpO1xuXHRcdHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0dGhpcy4kcEJ1dHRvbi51bmJpbmQoKTtcblx0XHR0aGlzLiRkQnV0dG9uLnVuYmluZCgpO1xuXG5cblx0XHQvLyBwbGF5IGJ1dHRvbiBldmVudCBsaXN0ZW50ZXJcblx0XHR0aGlzLiRwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR0aGlzLnBsYXkoKTtcblx0XHR9KTtcblxuXHRcdC8vIGRvd25sb2FkIGJ1dHRvbiBldmVudCBsaXN0ZW50ZXJcblx0XHR0aGlzLiRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSAkKGUudGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZCwgZmFsc2UpO1xuXG5cdFx0Ly8gdGltZXVwZGF0ZSBldmVudCBsaXN0ZW5lclxuXHRcdHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblxuXHRcdHRoaXMuJHNsaWRlci5yYW5nZSh7XG5cdFx0XHRtaW46IDAsXG5cdFx0XHRtYXg6IDEwMCxcblx0XHRcdHN0YXJ0OiAwLFxuXHRcdFx0b25DaGFuZ2U6IHRoaXMuY2JPblNsaWRlckNoYW5nZSxcblx0XHRcdGh0bWw1QXVkaW86IHRoaXMuaHRtbDVBdWRpbyxcblx0XHRcdGNiVGltZVVwZGF0ZTogdGhpcy5jYlRpbWVVcGRhdGUsXG5cdFx0XHRzcGFuRHVyYXRpb246IHRoaXMuJHNwYW5EdXJhdGlvbixcblx0XHR9KTtcblxuXHRcdC8vIFByZXZlbnQgZG91YmxlIHByb2Nlc3Npbmdcblx0XHQkcm93LmFkZENsYXNzKCdpbml0aWFsaXplZCcpO1xuXHR9XG5cblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INC/0L7QtNCz0YDRg9C30LrQuCDQvNC10YLQsNC00LDQvdC90YvRhVxuXHQgKi9cblx0Y2JPbk1ldGFkYXRhTG9hZGVkKCkge1xuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcblx0XHRcdGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG5cdFx0XHRkYXRlLnNldFNlY29uZHModGhpcy5jdXJyZW50VGltZSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgY3VycmVudFRpbWUgPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcblx0XHRcdGRhdGUuc2V0U2Vjb25kcyh0aGlzLmR1cmF0aW9uKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG5cdFx0XHRjb25zdCBkdXJhdGlvbiA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0JHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqINCa0L7Qu9Cx0LXQuiDQvdCwINGB0LTQstC40LMg0YHQu9Cw0LnQtNC10YDQsCDQv9GA0L7QuNCz0YDRi9Cy0LDRgtC10LvRj1xuXHQgKiBAcGFyYW0gbmV3VmFsXG5cdCAqIEBwYXJhbSBtZXRhXG5cdCAqL1xuXHRjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuXHRcdGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID0gKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0fVxuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKG51bGwpO1xuXHRcdFx0ZGF0ZS5zZXRTZWNvbmRzKHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgY3VycmVudFRpbWUgPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcblx0XHRcdGRhdGUuc2V0U2Vjb25kcyh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcblx0XHRcdGNvbnN0IGR1cmF0aW9uID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG5cdFx0XHR0aGlzLnNwYW5EdXJhdGlvbi50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiDQmtC+0LvQsdC10Log0L3QsCDQuNC30LzQtdC90LXQvdC40LUg0L/QvtC30LjRhtC40Lgg0L/RgNC+0LjQs9GA0YvQstCw0LXQvNC+0LPQviDRhNCw0LnQu9CwINC40LcgSFRNTDUg0LDRg9C00LjQvtGC0LXQs9CwXG5cdCAqL1xuXHRjYlRpbWVVcGRhdGUoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uO1xuXHRcdFx0Y29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKTtcblx0XHRcdGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHQkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJykucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuXHRcdFx0aWYgKHRoaXMuY3VycmVudFRpbWUgPT09IHRoaXMuZHVyYXRpb24pIHtcblx0XHRcdFx0JHJvdy5maW5kKCdpLnBhdXNlJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICog0JfQsNC/0YPRgdC6INC4INC+0YHRgtCw0L3QvtCy0LrQsCDQstC+0YHQv9GA0L7QuNC30LLQtdC00LXQvdC40Y8g0LDRg9C00LjQviDRhNCw0LnQu9CwXG5cdCAqINC/0L4g0LrQu9C40LrRgyDQvdCwINC40LrQvtC90LrRgyBQbGF5XG5cdCAqL1xuXHRwbGF5KCkge1xuXHRcdC8vIHN0YXJ0IG11c2ljXG5cdFx0aWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQgJiYgdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSB7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBsYXksIGFkZCBwYXVzZVxuXHRcdFx0dGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuXHRcdH0gZWxzZSB7IC8vIHBhdXNlIG11c2ljXG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcblx0XHRcdC8vIHJlbW92ZSBwYXVzZSwgYWRkIHBsYXlcblx0XHRcdHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcblx0XHR9XG5cdH1cbn0iXX0=