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

/**
 * The oneButtonPlayer object handles the functionality of a one-button sound player.
 */
var oneButtonPlayer = {
  /**
   * Initializes the one-button sound player.
   */
  initialize: function initialize() {
    $('form .action-playback-button').each(function (index, button) {
      var id = $(button).attr('data-value');
      return new sndPlayerOneBtn(id);
    });
  }
}; // When the document is ready, initialize the one button sound player

$(document).ready(function () {
  oneButtonPlayer.initialize();
});
/**
 * The sndPlayerOneBtn class represents a one-button sound player.
 */

var sndPlayerOneBtn = /*#__PURE__*/function () {
  /**
   * Creates an instance of the sndPlayerOneBtn class.
   * @param {string} id - The identifier of the sound player.
   */
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
  /**
   * Updates the audio source based on the selected sound file.
   */


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
    /**
     * Callback function triggered when the audio can play through.
     */

  }, {
    key: "cbCanPlayThrough",
    value: function cbCanPlayThrough() {
      this.duration = this.html5Audio.duration;

      if (this.$pButton.html() === '<i class="icon pause"></i>') {
        this.html5Audio.play();
      }
    }
    /**
     * Callback function triggered when the slider value changes.
     * @param {number} newVal - The new value of the slider.
     * @param {object} meta - Additional metadata about the slider change.
     */

  }, {
    key: "cbOnSliderChange",
    value: function cbOnSliderChange(newVal, meta) {
      if (meta.triggeredByUser && Number.isFinite(this.html5Audio.duration)) {
        this.html5Audio.removeEventListener('timeupdate', this.cbTimeUpdate, false);
        this.html5Audio.currentTime = this.html5Audio.duration * newVal / 100;
        this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);
      }
    }
    /**
     * Callback function triggered when the audio time updates.
     */

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL29uZS1idXR0b24tc291bmQtcGxheWVyLmpzIl0sIm5hbWVzIjpbIm9uZUJ1dHRvblBsYXllciIsImluaXRpYWxpemUiLCIkIiwiZWFjaCIsImluZGV4IiwiYnV0dG9uIiwiaWQiLCJhdHRyIiwic25kUGxheWVyT25lQnRuIiwiZG9jdW1lbnQiLCJyZWFkeSIsIiRwQnV0dG9uIiwic291bmRTZWxlY3RvckNsYXNzIiwiZHVyYXRpb24iLCJhdWRpb1BsYXllciIsImFmdGVyIiwiaHRtbDVBdWRpbyIsImdldEVsZW1lbnRCeUlkIiwib24iLCJ1cGRhdGVBdWRpb1NvdXJjZSIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInBhdXNlZCIsInBsYXkiLCJjdXJyZW50VGltZSIsImh0bWwiLCJwYXVzZSIsImF1ZGlvRmlsZUlkIiwiZm9ybSIsIl90aGlzIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwibWVzc2FnZSIsInVuZGVmaW5lZCIsImdldEVsZW1lbnRzQnlUYWdOYW1lIiwic3JjIiwibG9hZCIsIm9uY2FucGxheXRocm91Z2giLCJjYkNhblBsYXlUaHJvdWdoIiwib25FcnJvciIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJjYlRpbWVVcGRhdGUiLCJhZGRFdmVudExpc3RlbmVyIiwicGVyY2VudCIsInJhbmdlUG9zaXRpb24iLCJNYXRoIiwicm91bmQiLCIkc2xpZGVyIiwicmFuZ2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxlQUFlLEdBQUc7QUFFcEI7QUFDSjtBQUNBO0FB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R0FBRyxLQUFLbkMsVUFBTCxDQUFnQlEsV0FBaEIsR0FBOEIsS0FBS1IsVUFBTCxDQUFnQkgsUUFBOUQ7QUFDQSxZQUFNdUMsYUFBYSxHQUFHQyxJQUFJLENBQUNDLEtBQUwsQ0FBWUgsT0FBRCxHQUFZLEdBQXZCLENBQXRCO0FBQ0EsYUFBS0ksT0FBTCxDQUFhQyxLQUFiLENBQW1CLFdBQW5CLEVBQWdDSixhQUFoQzs7QUFDQSxZQUFJLEtBQUtwQyxVQUFMLENBQWdCUSxXQUFoQixLQUFnQyxLQUFLWCxRQUF6QyxFQUFtRDtBQUMvQyxlQUFLRixRQUFMLENBQWNjLElBQWQsQ0FBbUIsMkJBQW5CO0FBQ0g7QUFDSjtBQUNKIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwgKi9cblxuLyoqXG4gKiBUaGUgb25lQnV0dG9uUGxheWVyIG9iamVjdCBoYW5kbGVzIHRoZSBmdW5jdGlvbmFsaXR5IG9mIGEgb25lLWJ1dHRvbiBzb3VuZCBwbGF5ZXIuXG4gKi9cbmNvbnN0IG9uZUJ1dHRvblBsYXllciA9IHtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBvbmUtYnV0dG9uIHNvdW5kIHBsYXllci5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAkKCdmb3JtIC5hY3Rpb24tcGxheWJhY2stYnV0dG9uJykuZWFjaCgoaW5kZXgsIGJ1dHRvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkKGJ1dHRvbikuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBzbmRQbGF5ZXJPbmVCdG4oaWQpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBvbmUgYnV0dG9uIHNvdW5kIHBsYXllclxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG9uZUJ1dHRvblBsYXllci5pbml0aWFsaXplKCk7XG59KTtcblxuLyoqXG4gKiBUaGUgc25kUGxheWVyT25lQnRuIGNsYXNzIHJlcHJlc2VudHMgYSBvbmUtYnV0dG9uIHNvdW5kIHBsYXllci5cbiAqL1xuY2xhc3Mgc25kUGxheWVyT25lQnRuIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgdGhlIHNuZFBsYXllck9uZUJ0biBjbGFzcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBUaGUgaWRlbnRpZmllciBvZiB0aGUgc291bmQgcGxheWVyLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGlkKSB7XG4gICAgICAgIHRoaXMuJHBCdXR0b24gPSAkKGAuYWN0aW9uLXBsYXliYWNrLWJ1dHRvbltkYXRhLXZhbHVlPVwiJHtpZH1cIl1gKTsgLy8gcGxheSBidXR0b25cbiAgICAgICAgdGhpcy5zb3VuZFNlbGVjdG9yQ2xhc3MgPSBpZDtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IDA7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgY29uc3QgYXVkaW9QbGF5ZXIgPSBgPGF1ZGlvIGlkPVwiYXVkaW8tcGxheWVyLSR7aWR9XCIgcHJlbG9hZD1cImF1dG9cIj48c291cmNlIHNyYz1cIlwiIHR5cGU9XCJhdWRpby9tcDNcIj48L2F1ZGlvPmA7XG4gICAgICAgIHRoaXMuJHBCdXR0b24uYWZ0ZXIoYXVkaW9QbGF5ZXIpO1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgYXVkaW8tcGxheWVyLSR7aWR9YCk7XG4gICAgICAgICQoYCMke3RoaXMuc291bmRTZWxlY3RvckNsYXNzfWApLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUF1ZGlvU291cmNlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLiRwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnBhdXNlZCAmJiB0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSA9IDA7XG4gICAgICAgICAgICAgICAgLy8gcmVtb3ZlIHBsYXksIGFkZCBwYXVzZVxuICAgICAgICAgICAgICAgIHRoaXMuJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBhdXNlXCI+PC9pPicpO1xuICAgICAgICAgICAgfSBlbHNlIHsgLy8gcGF1c2UgbXVzaWNcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgcGF1c2UsIGFkZCBwbGF5XG4gICAgICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5odG1sKCc8aSBjbGFzcz1cImljb24gcGxheVwiPjwvaT4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMudXBkYXRlQXVkaW9Tb3VyY2UoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBhdWRpbyBzb3VyY2UgYmFzZWQgb24gdGhlIHNlbGVjdGVkIHNvdW5kIGZpbGUuXG4gICAgICovXG4gICAgdXBkYXRlQXVkaW9Tb3VyY2UoKSB7XG4gICAgICAgIGNvbnN0IGF1ZGlvRmlsZUlkID0gJCgnZm9ybScpLmZvcm0oJ2dldCB2YWx1ZScsIHRoaXMuc291bmRTZWxlY3RvckNsYXNzKTtcbiAgICAgICAgaWYgKGF1ZGlvRmlsZUlkICE9PSAnJyAmJiBhdWRpb0ZpbGVJZCAhPT0gXCItMVwiKSB7XG4gICAgICAgICAgICBjb25zdCBfdGhpcyA9IHRoaXM7XG4gICAgICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2dldHBhdGhieWlkLyR7YXVkaW9GaWxlSWR9YCxcbiAgICAgICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmh0bWw1QXVkaW8uZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NvdXJjZScpWzBdLnNyY1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgID0gYC9wYnhjb3JlL2FwaS9jZHIvdjIvcGxheWJhY2s/dmlldz0ke3Jlc3BvbnNlLm1lc3NhZ2V9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmh0bWw1QXVkaW8ubG9hZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuaHRtbDVBdWRpby5vbmNhbnBsYXl0aHJvdWdoID0gdGhpcy5jYkNhblBsYXlUaHJvdWdoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCB3aGVuIHRoZSBhdWRpbyBjYW4gcGxheSB0aHJvdWdoLlxuICAgICAqL1xuICAgIGNiQ2FuUGxheVRocm91Z2goKSB7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSB0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb247XG4gICAgICAgIGlmICh0aGlzLiRwQnV0dG9uLmh0bWwoKSA9PT0gJzxpIGNsYXNzPVwiaWNvbiBwYXVzZVwiPjwvaT4nKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIHdoZW4gdGhlIHNsaWRlciB2YWx1ZSBjaGFuZ2VzLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBuZXdWYWwgLSBUaGUgbmV3IHZhbHVlIG9mIHRoZSBzbGlkZXIuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG1ldGEgLSBBZGRpdGlvbmFsIG1ldGFkYXRhIGFib3V0IHRoZSBzbGlkZXIgY2hhbmdlLlxuICAgICAqL1xuICAgIGNiT25TbGlkZXJDaGFuZ2UobmV3VmFsLCBtZXRhKSB7XG4gICAgICAgIGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID0gKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgd2hlbiB0aGUgYXVkaW8gdGltZSB1cGRhdGVzLlxuICAgICAqL1xuICAgIGNiVGltZVVwZGF0ZSgpIHtcbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gdGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lIC8gdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKTtcbiAgICAgICAgICAgIHRoaXMuJHNsaWRlci5yYW5nZSgnc2V0IHZhbHVlJywgcmFuZ2VQb3NpdGlvbik7XG4gICAgICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID09PSB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5odG1sKCc8aSBjbGFzcz1cImljb24gcGxheVwiPjwvaT4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==