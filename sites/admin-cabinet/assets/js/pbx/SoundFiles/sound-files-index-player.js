"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LXBsYXllci5qcyJdLCJuYW1lcyI6WyJJbmRleFNvdW5kUGxheWVyIiwiaWQiLCJodG1sNUF1ZGlvIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIiRyb3ciLCIkIiwiaGFzQ2xhc3MiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicGxheSIsIndpbmRvdyIsImxvY2F0aW9uIiwidGFyZ2V0IiwiYXR0ciIsImFkZEV2ZW50TGlzdGVuZXIiLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwic3BhbkR1cmF0aW9uIiwiYWRkQ2xhc3MiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsImR1cmF0aW9uIiwiY2xvc2VzdCIsImRhdGUiLCJEYXRlIiwic2V0U2Vjb25kcyIsImN1cnJlbnRUaW1lIiwidG9JU09TdHJpbmciLCJzdWJzdHIiLCJ0ZXh0IiwibmV3VmFsIiwibWV0YSIsInRyaWdnZXJlZEJ5VXNlciIsInBlcmNlbnQiLCJyYW5nZVBvc2l0aW9uIiwiTWF0aCIsInJvdW5kIiwicmVtb3ZlQ2xhc3MiLCJwYXVzZWQiLCJwYXVzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBR01BLGdCO0FBQ0wsNEJBQVlDLEVBQVosRUFBZ0I7QUFBQTs7QUFBQTs7QUFDZixTQUFLQSxFQUFMLEdBQVVBLEVBQVY7QUFDQSxTQUFLQyxVQUFMLEdBQWtCQyxRQUFRLENBQUNDLGNBQVQs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QixFQUFtQ25CLFFBQW5DLENBQTRDLE1BQTVDO0FBQ0E7QUFDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG5cbmNsYXNzIEluZGV4U291bmRQbGF5ZXIge1xuXHRjb25zdHJ1Y3RvcihpZCkge1xuXHRcdHRoaXMuaWQgPSBpZDtcblx0XHR0aGlzLmh0bWw1QXVkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgYXVkaW8tcGxheWVyLSR7aWR9YCk7XG5cdFx0Y29uc3QgJHJvdyA9ICQoYCMke2lkfWApO1xuXHRcdGlmICgkcm93Lmhhc0NsYXNzKCdpbml0aWFsaXplZCcpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMuJHBCdXR0b24gPSAkcm93LmZpbmQoJ2kucGxheScpOyAvLyBwbGF5IGJ1dHRvblxuXHRcdHRoaXMuJGRCdXR0b24gPSAkcm93LmZpbmQoJ2kuZG93bmxvYWQnKTsgLy8gZG93bmxvYWQgYnV0dG9uXG5cdFx0dGhpcy4kc2xpZGVyID0gJHJvdy5maW5kKCdkaXYuY2RyLXBsYXllcicpO1xuXHRcdHRoaXMuJHNwYW5EdXJhdGlvbiA9ICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKTtcblx0XHR0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG5cdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHR0aGlzLiRwQnV0dG9uLnVuYmluZCgpO1xuXHRcdHRoaXMuJGRCdXR0b24udW5iaW5kKCk7XG5cblxuXHRcdC8vIHBsYXkgYnV0dG9uIGV2ZW50IGxpc3RlbnRlclxuXHRcdHRoaXMuJHBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHRoaXMucGxheSgpO1xuXHRcdH0pO1xuXG5cdFx0Ly8gZG93bmxvYWQgYnV0dG9uIGV2ZW50IGxpc3RlbnRlclxuXHRcdHRoaXMuJGRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG5cblx0XHQvLyB0aW1ldXBkYXRlIGV2ZW50IGxpc3RlbmVyXG5cdFx0dGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXG5cdFx0dGhpcy4kc2xpZGVyLnJhbmdlKHtcblx0XHRcdG1pbjogMCxcblx0XHRcdG1heDogMTAwLFxuXHRcdFx0c3RhcnQ6IDAsXG5cdFx0XHRvbkNoYW5nZTogdGhpcy5jYk9uU2xpZGVyQ2hhbmdlLFxuXHRcdFx0aHRtbDVBdWRpbzogdGhpcy5odG1sNUF1ZGlvLFxuXHRcdFx0Y2JUaW1lVXBkYXRlOiB0aGlzLmNiVGltZVVwZGF0ZSxcblx0XHRcdHNwYW5EdXJhdGlvbjogdGhpcy4kc3BhbkR1cmF0aW9uLFxuXHRcdH0pO1xuXG5cdFx0Ly8gUHJldmVudCBkb3VibGUgcHJvY2Vzc2luZ1xuXHRcdCRyb3cuYWRkQ2xhc3MoJ2luaXRpYWxpemVkJyk7XG5cdH1cblxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLRh9C40Log0L/QvtC00LPRgNGD0LfQutC4INC80LXRgtCw0LTQsNC90L3Ri9GFXG5cdCAqL1xuXHRjYk9uTWV0YWRhdGFMb2FkZWQoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcblx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShudWxsKTtcblx0XHRcdGRhdGUuc2V0U2Vjb25kcyh0aGlzLmN1cnJlbnRUaW1lKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG5cdFx0XHRjb25zdCBjdXJyZW50VGltZSA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0ZGF0ZS5zZXRTZWNvbmRzKHRoaXMuZHVyYXRpb24pOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcblx0XHRcdGNvbnN0IGR1cmF0aW9uID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG5cdFx0XHQkcm93LmZpbmQoJ3NwYW4uY2RyLWR1cmF0aW9uJykudGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICog0JrQvtC70LHQtdC6INC90LAg0YHQtNCy0LjQsyDRgdC70LDQudC00LXRgNCwINC/0YDQvtC40LPRgNGL0LLQsNGC0LXQu9GPXG5cdCAqIEBwYXJhbSBuZXdWYWxcblx0ICogQHBhcmFtIG1ldGFcblx0ICovXG5cdGNiT25TbGlkZXJDaGFuZ2UobmV3VmFsLCBtZXRhKSB7XG5cdFx0aWYgKG1ldGEudHJpZ2dlcmVkQnlVc2VyICYmIE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgPSAodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uICogbmV3VmFsKSAvIDEwMDtcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHR9XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG5cdFx0XHRjb25zdCBjdXJyZW50VGltZSA9IG5ldyBEYXRlKHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSAqIDEwMDApLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcblx0XHRcdGNvbnN0IGR1cmF0aW9uICAgID0gbmV3IERhdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uICogMTAwMCkudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuXHRcdFx0dGhpcy5zcGFuRHVyYXRpb24udGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICog0JrQvtC70LHQtdC6INC90LAg0LjQt9C80LXQvdC10L3QuNC1INC/0L7Qt9C40YbQuNC4INC/0YDQvtC40LPRgNGL0LLQsNC10LzQvtCz0L4g0YTQsNC50LvQsCDQuNC3IEhUTUw1INCw0YPQtNC40L7RgtC10LPQsFxuXHQgKi9cblx0Y2JUaW1lVXBkYXRlKCkge1xuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcblx0XHRcdGNvbnN0IHBlcmNlbnQgPSB0aGlzLmN1cnJlbnRUaW1lIC8gdGhpcy5kdXJhdGlvbjtcblx0XHRcdGNvbnN0IHJhbmdlUG9zaXRpb24gPSBNYXRoLnJvdW5kKChwZXJjZW50KSAqIDEwMCk7XG5cdFx0XHRjb25zdCAkcm93ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpO1xuXHRcdFx0JHJvdy5maW5kKCdkaXYuY2RyLXBsYXllcicpLnJhbmdlKCdzZXQgdmFsdWUnLCByYW5nZVBvc2l0aW9uKTtcblx0XHRcdGlmIChyYW5nZVBvc2l0aW9uID09PSAxMDApIHtcblx0XHRcdFx0JHJvdy5maW5kKCdpLnBhdXNlJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICog0JfQsNC/0YPRgdC6INC4INC+0YHRgtCw0L3QvtCy0LrQsCDQstC+0YHQv9GA0L7QuNC30LLQtdC00LXQvdC40Y8g0LDRg9C00LjQviDRhNCw0LnQu9CwXG5cdCAqINC/0L4g0LrQu9C40LrRgyDQvdCwINC40LrQvtC90LrRgyBQbGF5XG5cdCAqL1xuXHRwbGF5KCkge1xuXHRcdC8vIHN0YXJ0IG11c2ljXG5cdFx0aWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQgJiYgdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSB7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBsYXksIGFkZCBwYXVzZVxuXHRcdFx0dGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuXHRcdH0gZWxzZSB7IC8vIHBhdXNlIG11c2ljXG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcblx0XHRcdC8vIHJlbW92ZSBwYXVzZSwgYWRkIHBsYXlcblx0XHRcdHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcblx0XHR9XG5cdH1cbn0iXX0=