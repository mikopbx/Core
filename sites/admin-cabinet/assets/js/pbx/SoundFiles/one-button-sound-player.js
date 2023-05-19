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

/* global globalRootUrl */
var oneButtonPlayer = {
  initialize: function initialize() {
    $('form .action-playback-button').each(function (index, button) {
      var id = $(button).attr('data-value');
      return new sndPlayerOneBtn(id);
    });
  }
};
$(document).ready(function () {
  oneButtonPlayer.initialize();
});

var sndPlayerOneBtn = /*#__PURE__*/function () {
  function sndPlayerOneBtn(id) {
    var _this2 = this;

    _classCallCheck(this, sndPlayerOneBtn);

    this.$pButton = $(".action-playback-button[data-value=\"".concat(id, "\"]")); // play button

    this.soundSelectorClass = id;
    this.duration = 0;
    this.id = id;
    var audioPlayer = "<audio id=\"audio-player-".concat(id, "\" preload=\"auto\"><source src=\"\" type=\"audio/mp3\"></audio>");
    this.$pButton.after(audioPlayer);
    this.html5Audio = document.getElementById("audio-player-".concat(id));
    $("#".concat(this.soundSelectorClass)).on('change', function () {
      _this2.updateAudioSource();
    });
    this.$pButton.on('click', function (e) {
      e.preventDefault();

      if (_this2.html5Audio.paused && _this2.html5Audio.duration) {
        _this2.html5Audio.play();

        _this2.html5Audio.currentTime = 0; // remove play, add pause

        _this2.$pButton.html('<i class="icon pause"></i>');
      } else {
        // pause music
        _this2.html5Audio.pause(); // remove pause, add play


        _this2.$pButton.html('<i class="icon play"></i>');
      }
    });
    this.updateAudioSource();
  }

  _createClass(sndPlayerOneBtn, [{
    key: "updateAudioSource",
    value: function updateAudioSource() {
      var audioFileId = $('form').form('get value', this.soundSelectorClass);

      if (audioFileId !== '' && audioFileId !== "-1") {
        var _this = this;

        $.api({
          url: "".concat(globalRootUrl, "sound-files/getpathbyid/").concat(audioFileId),
          on: 'now',
          onSuccess: function onSuccess(response) {
            if (response.message !== undefined) {
              _this.html5Audio.getElementsByTagName('source')[0].src = "/pbxcore/api/cdr/v2/playback?view=".concat(response.message);

              _this.html5Audio.pause();

              _this.html5Audio.load();

              _this.html5Audio.oncanplaythrough = this.cbCanPlayThrough;
            }
          },
          onError: function onError() {}
        });
      }
    }
  }, {
    key: "cbCanPlayThrough",
    value: function cbCanPlayThrough() {
      this.duration = this.html5Audio.duration;

      if (this.$pButton.html() === '<i class="icon pause"></i>') {
        this.html5Audio.play();
      }
    }
  }, {
    key: "cbOnSliderChange",
    value: function cbOnSliderChange(newVal, meta) {
      if (meta.triggeredByUser && Number.isFinite(this.html5Audio.duration)) {
        this.html5Audio.removeEventListener('timeupdate', this.cbTimeUpdate, false);
        this.html5Audio.currentTime = this.html5Audio.duration * newVal / 100;
        this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);
      }
    }
  }, {
    key: "cbTimeUpdate",
    value: function cbTimeUpdate() {
      if (Number.isFinite(this.html5Audio.duration)) {
        var percent = this.html5Audio.currentTime / this.html5Audio.duration;
        var rangePosition = Math.round(percent * 100);
        this.$slider.range('set value', rangePosition);

        if (this.html5Audio.currentTime === this.duration) {
          this.$pButton.html('<i class="icon play"></i>');
        }
      }
    }
  }]);

  return sndPlayerOneBtn;
}();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL29uZS1idXR0b24tc291bmQtcGxheWVyLmpzIl0sIm5hbWVzIjpbIm9uZUJ1dHRvblBsYXllciIsImluaXRpYWxpemUiLCIkIiwiZWFjaCIsImluZGV4IiwiYnV0dG9uIiwiaWQiLCJhdHRyIiwic25kUGxheWVyT25lQnRuIiwiZG9jdW1lbnQiLCJyZWFkeSIsIiRwQnV0dG9uIiwic291bmRTZWxlY3RvckNsYXNzIiwiZHVyYXRpb24iLCJhdWRpb1BsYXllciIsImFmdGVyIiwiaHRtbDVBdWRpbyIsImdldEVsZW1lbnRCeUlkIiwib24iLCJ1cGRhdGVBdWRpb1NvdXJjZSIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInBhdXNlZCIsInBsYXkiLCJjdXJyZW50VGltZSIsImh0bWwiLCJwYXVzZSIsImF1ZGlvRmlsZUlkIiwiZm9ybSIsIl90aGlzIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwibWVzc2FnZSIsInVuZGVmaW5lZCIsImdldEVsZW1lbnRzQnlUYWdOYW1lIiwic3JjIiwibG9hZCIsIm9uY2FucGxheXRocm91Z2giLCJjYkNhblBsYXlUaHJvdWdoIiwib25FcnJvciIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJjYlRpbWVVcGRhdGUiLCJhZGRFdmVudExpc3RlbmVyIiwicGVyY2VudCIsInJhbmdlUG9zaXRpb24iLCJNYXRoIiwicm91bmQiLCIkc2xpZGVyIiwicmFuZ2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUVBLElBQU1BLGVBQWUsR0FBRztBQUN2QkMsRUFBQUEsVUFEdUIsd0JBQ1Y7QUFDWkMsSUFB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LEtBQWIsQ0FBbUIsV0FBbkIsRUFBZ0NKLGFBQWhDOztBQUNBLFlBQUksS0FBS3BDLFVBQUwsQ0FBZ0JRLFdBQWhCLEtBQWdDLEtBQUtYLFFBQXpDLEVBQW1EO0FBQ2xELGVBQUtGLFFBQUwsQ0FBY2MsSUFBZCxDQUFtQiwyQkFBbkI7QUFDQTtBQUNEO0FBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCAqL1xuXG5jb25zdCBvbmVCdXR0b25QbGF5ZXIgPSB7XG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnZm9ybSAuYWN0aW9uLXBsYXliYWNrLWJ1dHRvbicpLmVhY2goKGluZGV4LCBidXR0b24pID0+IHtcblx0XHRcdGNvbnN0IGlkID0gJChidXR0b24pLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHRcdHJldHVybiBuZXcgc25kUGxheWVyT25lQnRuKGlkKTtcblx0XHR9KTtcblx0fVxufVxuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdG9uZUJ1dHRvblBsYXllci5pbml0aWFsaXplKCk7XG59KTtcblxuY2xhc3Mgc25kUGxheWVyT25lQnRuIHtcblx0Y29uc3RydWN0b3IoaWQpIHtcblx0XHR0aGlzLiRwQnV0dG9uID0gJChgLmFjdGlvbi1wbGF5YmFjay1idXR0b25bZGF0YS12YWx1ZT1cIiR7aWR9XCJdYCk7IC8vIHBsYXkgYnV0dG9uXG5cdFx0dGhpcy5zb3VuZFNlbGVjdG9yQ2xhc3MgPSBpZDtcblx0XHR0aGlzLmR1cmF0aW9uID0gMDtcblx0XHR0aGlzLmlkID0gaWQ7XG5cdFx0Y29uc3QgYXVkaW9QbGF5ZXIgPSBgPGF1ZGlvIGlkPVwiYXVkaW8tcGxheWVyLSR7aWR9XCIgcHJlbG9hZD1cImF1dG9cIj48c291cmNlIHNyYz1cIlwiIHR5cGU9XCJhdWRpby9tcDNcIj48L2F1ZGlvPmA7XG5cdFx0dGhpcy4kcEJ1dHRvbi5hZnRlcihhdWRpb1BsYXllcik7XG5cdFx0dGhpcy5odG1sNUF1ZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGF1ZGlvLXBsYXllci0ke2lkfWApO1xuXHRcdCQoYCMke3RoaXMuc291bmRTZWxlY3RvckNsYXNzfWApLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG5cdFx0XHR0aGlzLnVwZGF0ZUF1ZGlvU291cmNlKCk7XG5cdFx0fSk7XG5cdFx0dGhpcy4kcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0aWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQgJiYgdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSB7XG5cdFx0XHRcdHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG5cdFx0XHRcdHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZT0wO1xuXHRcdFx0XHQvLyByZW1vdmUgcGxheSwgYWRkIHBhdXNlXG5cdFx0XHRcdHRoaXMuJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBhdXNlXCI+PC9pPicpO1xuXHRcdFx0fSBlbHNlIHsgLy8gcGF1c2UgbXVzaWNcblx0XHRcdFx0dGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG5cdFx0XHRcdC8vIHJlbW92ZSBwYXVzZSwgYWRkIHBsYXlcblx0XHRcdFx0dGhpcy4kcEJ1dHRvbi5odG1sKCc8aSBjbGFzcz1cImljb24gcGxheVwiPjwvaT4nKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHR0aGlzLnVwZGF0ZUF1ZGlvU291cmNlKCk7XG5cdH1cblxuXHR1cGRhdGVBdWRpb1NvdXJjZSgpIHtcblx0XHRjb25zdCBhdWRpb0ZpbGVJZCA9ICQoJ2Zvcm0nKS5mb3JtKCdnZXQgdmFsdWUnLCB0aGlzLnNvdW5kU2VsZWN0b3JDbGFzcyk7XG5cdFx0aWYgKGF1ZGlvRmlsZUlkICE9PSAnJyAmJiBhdWRpb0ZpbGVJZCAhPT0gXCItMVwiKSB7XG5cdFx0XHRjb25zdCBfdGhpcyA9IHRoaXM7XG5cdFx0XHQkLmFwaSh7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9nZXRwYXRoYnlpZC8ke2F1ZGlvRmlsZUlkfWAsXG5cdFx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0aWYgKHJlc3BvbnNlLm1lc3NhZ2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0X3RoaXMuaHRtbDVBdWRpby5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc291cmNlJylbMF0uc3JjXG5cdFx0XHRcdFx0XHRcdD0gYC9wYnhjb3JlL2FwaS9jZHIvdjIvcGxheWJhY2s/dmlldz0ke3Jlc3BvbnNlLm1lc3NhZ2V9YDtcblx0XHRcdFx0XHRcdF90aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcblx0XHRcdFx0XHRcdF90aGlzLmh0bWw1QXVkaW8ubG9hZCgpO1xuXHRcdFx0XHRcdFx0X3RoaXMuaHRtbDVBdWRpby5vbmNhbnBsYXl0aHJvdWdoID0gdGhpcy5jYkNhblBsYXlUaHJvdWdoO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHR9XG5cblx0Y2JDYW5QbGF5VGhyb3VnaCgpIHtcblx0XHR0aGlzLmR1cmF0aW9uID0gdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uO1xuXHRcdGlmICh0aGlzLiRwQnV0dG9uLmh0bWwoKSA9PT0gJzxpIGNsYXNzPVwiaWNvbiBwYXVzZVwiPjwvaT4nKSB7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuXHRcdH1cblx0fVxuXG5cdGNiT25TbGlkZXJDaGFuZ2UobmV3VmFsLCBtZXRhKSB7XG5cdFx0aWYgKG1ldGEudHJpZ2dlcmVkQnlVc2VyICYmIE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgPSAodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uICogbmV3VmFsKSAvIDEwMDtcblx0XHRcdHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHR9XG5cdH1cblxuXHRjYlRpbWVVcGRhdGUoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG5cdFx0XHRjb25zdCBwZXJjZW50ID0gdGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lIC8gdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uO1xuXHRcdFx0Y29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKTtcblx0XHRcdHRoaXMuJHNsaWRlci5yYW5nZSgnc2V0IHZhbHVlJywgcmFuZ2VQb3NpdGlvbik7XG5cdFx0XHRpZiAodGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID09PSB0aGlzLmR1cmF0aW9uKSB7XG5cdFx0XHRcdHRoaXMuJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBsYXlcIj48L2k+Jyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG4iXX0=