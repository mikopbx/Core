"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
var IndexSoundPlayer = /*#__PURE__*/function () {
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
    value: function cbOnMetadataLoaded() {
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
        var currentTime = new Date(this.html5Audio.currentTime * 1000).toISOString().substr(14, 5);
        var duration = new Date(this.html5Audio.duration * 1000).toISOString().substr(14, 5);
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
        var rangePosition = Math.round(percent * 100);
        var $row = $(this).closest('tr');
        $row.find('div.cdr-player').range('set value', rangePosition);

        if (rangePosition === 100) {
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
      if (this.html5Audio.paused && this.html5Audio.duration) {
        this.html5Audio.play(); // remove play, add pause

        this.$pButton.removeClass('play').addClass('pause');
      } else {
        // pause music
        this.html5Audio.pause(); // remove pause, add play

        this.$pButton.removeClass('pause').addClass('play');
      }
    }
  }]);

  return IndexSoundPlayer;
}();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LXBsYXllci5qcyJdLCJuYW1lcyI6WyJJbmRleFNvdW5kUGxheWVyIiwiaWQiLCJodG1sNUF1ZGlvIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIiRyb3ciLCIkIiwiaGFzQ2xhc3MiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicGxheSIsIndpbmRvdyIsImxvY2F0aW9uIiwidGFyZ2V0IiwiYXR0ciIsImFkZEV2ZW50TGlzdGVuZXIiLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwic3BhbkR1cmF0aW9uIiwiYWRkQ2xhc3MiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsImR1cmF0aW9uIiwiY2xvc2VzdCIsImRhdGUiLCJEYXRlIiwic2V0U2Vjb25kcyIsImN1cnJlbnRUaW1lIiwidG9JU09TdHJpbmciLCJzdWJzdHIiLCJ0ZXh0IiwibmV3VmFsIiwibWV0YSIsInRyaWdnZXJlZEJ5VXNlciIsInBlcmNlbnQiLCJyYW5nZVBvc2l0aW9uIiwiTWF0aCIsInJvdW5kIiwicmVtb3ZlQ2xhc3MiLCJwYXVzZWQiLCJwYXVzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBR01BLGdCO0FBQ0wsNEJBQVlDLEVBQVosRUFBZ0I7QUFBQTs7QUFBQTs7QUFDZixTQUFLQSxFQUFMLEdBQVVBLEVBQVY7QUFDQSxTQUFLQyxVQUFMLEdBQWtCQyxRQUFRLENBQUNDLGNBQVQs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QixFQUFtQ25CLFFBQW5DLENBQTRDLE1BQTVDO0FBQ0E7QUFDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cblxuY2xhc3MgSW5kZXhTb3VuZFBsYXllciB7XG5cdGNvbnN0cnVjdG9yKGlkKSB7XG5cdFx0dGhpcy5pZCA9IGlkO1xuXHRcdHRoaXMuaHRtbDVBdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBhdWRpby1wbGF5ZXItJHtpZH1gKTtcblx0XHRjb25zdCAkcm93ID0gJChgIyR7aWR9YCk7XG5cdFx0aWYgKCRyb3cuaGFzQ2xhc3MoJ2luaXRpYWxpemVkJykpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dGhpcy4kcEJ1dHRvbiA9ICRyb3cuZmluZCgnaS5wbGF5Jyk7IC8vIHBsYXkgYnV0dG9uXG5cdFx0dGhpcy4kZEJ1dHRvbiA9ICRyb3cuZmluZCgnaS5kb3dubG9hZCcpOyAvLyBkb3dubG9hZCBidXR0b25cblx0XHR0aGlzLiRzbGlkZXIgPSAkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJyk7XG5cdFx0dGhpcy4kc3BhbkR1cmF0aW9uID0gJHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpO1xuXHRcdHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYk9uTWV0YWRhdGFMb2FkZWQsIGZhbHNlKTtcblx0XHR0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdHRoaXMuJHBCdXR0b24udW5iaW5kKCk7XG5cdFx0dGhpcy4kZEJ1dHRvbi51bmJpbmQoKTtcblxuXG5cdFx0Ly8gcGxheSBidXR0b24gZXZlbnQgbGlzdGVudGVyXG5cdFx0dGhpcy4kcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dGhpcy5wbGF5KCk7XG5cdFx0fSk7XG5cblx0XHQvLyBkb3dubG9hZCBidXR0b24gZXZlbnQgbGlzdGVudGVyXG5cdFx0dGhpcy4kZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gJChlLnRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYk9uTWV0YWRhdGFMb2FkZWQsIGZhbHNlKTtcblxuXHRcdC8vIHRpbWV1cGRhdGUgZXZlbnQgbGlzdGVuZXJcblx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cblx0XHR0aGlzLiRzbGlkZXIucmFuZ2Uoe1xuXHRcdFx0bWluOiAwLFxuXHRcdFx0bWF4OiAxMDAsXG5cdFx0XHRzdGFydDogMCxcblx0XHRcdG9uQ2hhbmdlOiB0aGlzLmNiT25TbGlkZXJDaGFuZ2UsXG5cdFx0XHRodG1sNUF1ZGlvOiB0aGlzLmh0bWw1QXVkaW8sXG5cdFx0XHRjYlRpbWVVcGRhdGU6IHRoaXMuY2JUaW1lVXBkYXRlLFxuXHRcdFx0c3BhbkR1cmF0aW9uOiB0aGlzLiRzcGFuRHVyYXRpb24sXG5cdFx0fSk7XG5cblx0XHQvLyBQcmV2ZW50IGRvdWJsZSBwcm9jZXNzaW5nXG5cdFx0JHJvdy5hZGRDbGFzcygnaW5pdGlhbGl6ZWQnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtGH0LjQuiDQv9C+0LTQs9GA0YPQt9C60Lgg0LzQtdGC0LDQtNCw0L3QvdGL0YVcblx0ICovXG5cdGNiT25NZXRhZGF0YUxvYWRlZCgpIHtcblx0XHRpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuZHVyYXRpb24pKSB7XG5cdFx0XHRjb25zdCAkcm93ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpO1xuXHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKG51bGwpO1xuXHRcdFx0ZGF0ZS5zZXRTZWNvbmRzKHRoaXMuY3VycmVudFRpbWUpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcblx0XHRcdGNvbnN0IGN1cnJlbnRUaW1lID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG5cdFx0XHRkYXRlLnNldFNlY29uZHModGhpcy5kdXJhdGlvbik7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuXHRcdFx0Y29uc3QgZHVyYXRpb24gPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcblx0XHRcdCRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKS50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiDQmtC+0LvQsdC10Log0L3QsCDRgdC00LLQuNCzINGB0LvQsNC50LTQtdGA0LAg0L/RgNC+0LjQs9GA0YvQstCw0YLQtdC70Y9cblx0ICogQHBhcmFtIG5ld1ZhbFxuXHQgKiBAcGFyYW0gbWV0YVxuXHQgKi9cblx0Y2JPblNsaWRlckNoYW5nZShuZXdWYWwsIG1ldGEpIHtcblx0XHRpZiAobWV0YS50cmlnZ2VyZWRCeVVzZXIgJiYgTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSA9ICh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24gKiBuZXdWYWwpIC8gMTAwO1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdH1cblx0XHRpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcblx0XHRcdGNvbnN0IGN1cnJlbnRUaW1lID0gbmV3IERhdGUodGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lICogMTAwMCkudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0Y29uc3QgZHVyYXRpb24gICAgPSBuZXcgRGF0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24gKiAxMDAwKS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG5cdFx0XHR0aGlzLnNwYW5EdXJhdGlvbi50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiDQmtC+0LvQsdC10Log0L3QsCDQuNC30LzQtdC90LXQvdC40LUg0L/QvtC30LjRhtC40Lgg0L/RgNC+0LjQs9GA0YvQstCw0LXQvNC+0LPQviDRhNCw0LnQu9CwINC40LcgSFRNTDUg0LDRg9C00LjQvtGC0LXQs9CwXG5cdCAqL1xuXHRjYlRpbWVVcGRhdGUoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uO1xuXHRcdFx0Y29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKTtcblx0XHRcdGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHQkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJykucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuXHRcdFx0aWYgKHJhbmdlUG9zaXRpb24gPT09IDEwMCkge1xuXHRcdFx0XHQkcm93LmZpbmQoJ2kucGF1c2UnKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiDQl9Cw0L/Rg9GB0Log0Lgg0L7RgdGC0LDQvdC+0LLQutCwINCy0L7RgdC/0YDQvtC40LfQstC10LTQtdC90LjRjyDQsNGD0LTQuNC+INGE0LDQudC70LBcblx0ICog0L/QviDQutC70LjQutGDINC90LAg0LjQutC+0L3QutGDIFBsYXlcblx0ICovXG5cdHBsYXkoKSB7XG5cdFx0Ly8gc3RhcnQgbXVzaWNcblx0XHRpZiAodGhpcy5odG1sNUF1ZGlvLnBhdXNlZCAmJiB0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pIHtcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG5cdFx0XHQvLyByZW1vdmUgcGxheSwgYWRkIHBhdXNlXG5cdFx0XHR0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG5cdFx0fSBlbHNlIHsgLy8gcGF1c2UgbXVzaWNcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5wYXVzZSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBhdXNlLCBhZGQgcGxheVxuXHRcdFx0dGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuXHRcdH1cblx0fVxufSJdfQ==