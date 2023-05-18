"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL29uZS1idXR0b24tc291bmQtcGxheWVyLmpzIl0sIm5hbWVzIjpbIm9uZUJ1dHRvblBsYXllciIsImluaXRpYWxpemUiLCIkIiwiZWFjaCIsImluZGV4IiwiYnV0dG9uIiwiaWQiLCJhdHRyIiwic25kUGxheWVyT25lQnRuIiwiZG9jdW1lbnQiLCJyZWFkeSIsIiRwQnV0dG9uIiwic291bmRTZWxlY3RvckNsYXNzIiwiZHVyYXRpb24iLCJhdWRpb1BsYXllciIsImFmdGVyIiwiaHRtbDVBdWRpbyIsImdldEVsZW1lbnRCeUlkIiwib24iLCJ1cGRhdGVBdWRpb1NvdXJjZSIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInBhdXNlZCIsInBsYXkiLCJjdXJyZW50VGltZSIsImh0bWwiLCJwYXVzZSIsImF1ZGlvRmlsZUlkIiwiZm9ybSIsIl90aGlzIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwibWVzc2FnZSIsInVuZGVmaW5lZCIsImdldEVsZW1lbnRzQnlUYWdOYW1lIiwic3JjIiwibG9hZCIsIm9uY2FucGxheXRocm91Z2giLCJjYkNhblBsYXlUaHJvdWdoIiwib25FcnJvciIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJjYlRpbWVVcGRhdGUiLCJhZGRFdmVudExpc3RlbmVyIiwicGVyY2VudCIsInJhbmdlUG9zaXRpb24iLCJNYXRoIiwicm91bmQiLCIkc2xpZGVyIiwicmFuZ2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUVBLElBQU1BLGVBQWUsR0FBRztBQUN2QkMsRUFBQUEsVUFEdUIsd0JBQ1Y7QUFDWkMsSUFB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LEtBQWIsQ0FBbUIsV0FBbkIsRUFBZ0NKLGFBQWhDOztBQUNBLFlBQUksS0FBS3BDLFVBQUwsQ0FBZ0JRLFdBQWhCLEtBQWdDLEtBQUtYLFFBQXpDLEVBQW1EO0FBQ2xELGVBQUtGLFFBQUwsQ0FBY2MsSUFBZCxDQUFtQiwyQkFBbkI7QUFDQTtBQUNEO0FBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwgKi9cblxuY29uc3Qgb25lQnV0dG9uUGxheWVyID0ge1xuXHRpbml0aWFsaXplKCkge1xuXHRcdCQoJ2Zvcm0gLmFjdGlvbi1wbGF5YmFjay1idXR0b24nKS5lYWNoKChpbmRleCwgYnV0dG9uKSA9PiB7XG5cdFx0XHRjb25zdCBpZCA9ICQoYnV0dG9uKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHRyZXR1cm4gbmV3IHNuZFBsYXllck9uZUJ0bihpZCk7XG5cdFx0fSk7XG5cdH1cbn1cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRvbmVCdXR0b25QbGF5ZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbmNsYXNzIHNuZFBsYXllck9uZUJ0biB7XG5cdGNvbnN0cnVjdG9yKGlkKSB7XG5cdFx0dGhpcy4kcEJ1dHRvbiA9ICQoYC5hY3Rpb24tcGxheWJhY2stYnV0dG9uW2RhdGEtdmFsdWU9XCIke2lkfVwiXWApOyAvLyBwbGF5IGJ1dHRvblxuXHRcdHRoaXMuc291bmRTZWxlY3RvckNsYXNzID0gaWQ7XG5cdFx0dGhpcy5kdXJhdGlvbiA9IDA7XG5cdFx0dGhpcy5pZCA9IGlkO1xuXHRcdGNvbnN0IGF1ZGlvUGxheWVyID0gYDxhdWRpbyBpZD1cImF1ZGlvLXBsYXllci0ke2lkfVwiIHByZWxvYWQ9XCJhdXRvXCI+PHNvdXJjZSBzcmM9XCJcIiB0eXBlPVwiYXVkaW8vbXAzXCI+PC9hdWRpbz5gO1xuXHRcdHRoaXMuJHBCdXR0b24uYWZ0ZXIoYXVkaW9QbGF5ZXIpO1xuXHRcdHRoaXMuaHRtbDVBdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBhdWRpby1wbGF5ZXItJHtpZH1gKTtcblx0XHQkKGAjJHt0aGlzLnNvdW5kU2VsZWN0b3JDbGFzc31gKS5vbignY2hhbmdlJywgKCkgPT4ge1xuXHRcdFx0dGhpcy51cGRhdGVBdWRpb1NvdXJjZSgpO1xuXHRcdH0pO1xuXHRcdHRoaXMuJHBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGlmICh0aGlzLmh0bWw1QXVkaW8ucGF1c2VkICYmIHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikge1xuXHRcdFx0XHR0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuXHRcdFx0XHR0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWU9MDtcblx0XHRcdFx0Ly8gcmVtb3ZlIHBsYXksIGFkZCBwYXVzZVxuXHRcdFx0XHR0aGlzLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwYXVzZVwiPjwvaT4nKTtcblx0XHRcdH0gZWxzZSB7IC8vIHBhdXNlIG11c2ljXG5cdFx0XHRcdHRoaXMuaHRtbDVBdWRpby5wYXVzZSgpO1xuXHRcdFx0XHQvLyByZW1vdmUgcGF1c2UsIGFkZCBwbGF5XG5cdFx0XHRcdHRoaXMuJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBsYXlcIj48L2k+Jyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy51cGRhdGVBdWRpb1NvdXJjZSgpO1xuXHR9XG5cblx0dXBkYXRlQXVkaW9Tb3VyY2UoKSB7XG5cdFx0Y29uc3QgYXVkaW9GaWxlSWQgPSAkKCdmb3JtJykuZm9ybSgnZ2V0IHZhbHVlJywgdGhpcy5zb3VuZFNlbGVjdG9yQ2xhc3MpO1xuXHRcdGlmIChhdWRpb0ZpbGVJZCAhPT0gJycgJiYgYXVkaW9GaWxlSWQgIT09IFwiLTFcIikge1xuXHRcdFx0Y29uc3QgX3RoaXMgPSB0aGlzO1xuXHRcdFx0JC5hcGkoe1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvZ2V0cGF0aGJ5aWQvJHthdWRpb0ZpbGVJZH1gLFxuXHRcdFx0XHRvbjogJ25vdycsXG5cdFx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdF90aGlzLmh0bWw1QXVkaW8uZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NvdXJjZScpWzBdLnNyY1xuXHRcdFx0XHRcdFx0XHQ9IGAvcGJ4Y29yZS9hcGkvY2RyL3YyL3BsYXliYWNrP3ZpZXc9JHtyZXNwb25zZS5tZXNzYWdlfWA7XG5cdFx0XHRcdFx0XHRfdGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG5cdFx0XHRcdFx0XHRfdGhpcy5odG1sNUF1ZGlvLmxvYWQoKTtcblx0XHRcdFx0XHRcdF90aGlzLmh0bWw1QXVkaW8ub25jYW5wbGF5dGhyb3VnaCA9IHRoaXMuY2JDYW5QbGF5VGhyb3VnaDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0fVxuXG5cdGNiQ2FuUGxheVRocm91Z2goKSB7XG5cdFx0dGhpcy5kdXJhdGlvbiA9IHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbjtcblx0XHRpZiAodGhpcy4kcEJ1dHRvbi5odG1sKCkgPT09ICc8aSBjbGFzcz1cImljb24gcGF1c2VcIj48L2k+Jykge1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcblx0XHR9XG5cdH1cblxuXHRjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuXHRcdGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdFx0dGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID0gKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG5cdFx0XHR0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0fVxuXHR9XG5cblx0Y2JUaW1lVXBkYXRlKCkge1xuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSAvIHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbjtcblx0XHRcdGNvbnN0IHJhbmdlUG9zaXRpb24gPSBNYXRoLnJvdW5kKChwZXJjZW50KSAqIDEwMCk7XG5cdFx0XHR0aGlzLiRzbGlkZXIucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuXHRcdFx0aWYgKHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSA9PT0gdGhpcy5kdXJhdGlvbikge1xuXHRcdFx0XHR0aGlzLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwbGF5XCI+PC9pPicpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuIl19