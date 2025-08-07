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

/* global globalRootUrl, SoundFilesAPI */

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
    this.html5Audio = document.getElementById("audio-player-".concat(id)); // Bind callback functions to preserve context

    this.cbCanPlayThrough = this.cbCanPlayThrough.bind(this);
    this.cbTimeUpdate = this.cbTimeUpdate.bind(this); // Track the last loaded audio file ID to prevent duplicate loads

    this.lastLoadedFileId = null;
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
        // Check if we've already loaded this file
        if (this.lastLoadedFileId === audioFileId) {
          return; // Skip duplicate load
        }

        var _this = this;

        this.lastLoadedFileId = audioFileId; // Remember the loaded file
        // Use REST API to get sound file details

        SoundFilesAPI.getRecord(audioFileId, function (response) {
          if (response.result && response.data && response.data.path) {
            _this.html5Audio.getElementsByTagName('source')[0].src = "/pbxcore/api/cdr/v2/playback?view=".concat(response.data.path);

            _this.html5Audio.pause();

            _this.html5Audio.load();

            _this.html5Audio.oncanplaythrough = _this.cbCanPlayThrough;
          }
        });
      } else {
        // Reset when no file is selected
        this.lastLoadedFileId = null;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL29uZS1idXR0b24tc291bmQtcGxheWVyLmpzIl0sIm5hbWVzIjpbIm9uZUJ1dHRvblBsYXllciIsImluaXRpYWxpemUiLCIkIiwiZWFjaCIsImluZGV4IiwiYnV0dG9uIiwiaWQiLCJhdHRyIiwic25kUGxheWVyT25lQnRuIiwiZG9jdW1lbnQiLCJyZWFkeSIsIiRwQnV0dG9uIiwic291bmRTZWxlY3RvckNsYXNzIiwiZHVyYXRpb24iLCJhdWRpb1BsYXllciIsImFmdGVyIiwiaHRtbDVBdWRpbyIsImdldEVsZW1lbnRCeUlkIiwiY2JDYW5QbGF5VGhyb3VnaCIsImJpbmQiLCJjYlRpbWVVcGRhdGUiLCJsYXN0TG9hZGVkRmlsZUlkIiwib24iLCJ1cGRhdGVBdWRpb1NvdXJjZSIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInBhdXNlZCIsInBsYXkiLCJjdXJyZW50VGltZSIsImh0bWwiLCJwYXVzZSIsImF1ZGlvRmlsZUlkIiwiZm9ybSIsIl90aGlzIiwiU291bmRGaWxlc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsInBhdGgiLCJnZXRFbGVtZW50c0J5VGFnTmFtZSIsInNyYyIsImxvYWQiLCJvbmNhbnBsYXl0aHJvdWdoIiwibmV3VmFsIiwibWV0YSIsInRyaWdnZXJlZEJ5VXNlciIsIk51bWJlciIsImlzRmluaXRlIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImFkZEV2ZW50TGlzdGVuZXIiLCJwZXJjZW50IiwicmFuZ2VQb3NpdGlvbiIsIk1hdGgiLCJyb3VuZCIsIiRzbGlkZXIiLCJyYW5nZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGVBQWUsR0FBRztBQUVwQjtBQUNKO0FB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QUFLN0IsWUFBdkQsRUFBcUUsS0FBckU7QUFDQSxhQUFLSixVQUFMLENBQWdCWSxXQUFoQixHQUErQixLQUFLWixVQUFMLENBQWdCSCxRQUFoQixHQUEyQitCLE1BQTVCLEdBQXNDLEdBQXBFO0FBQ0EsYUFBSzVCLFVBQUwsQ0FBZ0JrQyxnQkFBaEIsQ0FBaUMsWUFBakMsRUFBK0MsS0FBSzlCLFlBQXBELEVBQWtFLEtBQWxFO0FBQ0g7QUFDSjtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLHdCQUFlO0FBQ1gsVUFBSTJCLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQixLQUFLaEMsVUFBTCxDQUFnQkgsUUFBaEMsQ0FBSixFQUErQztBQUMzQyxZQUFNc0MsT0FBTyxHQUFHLEtBQUtuQyxVQUFMLENBQWdCWSxXQUFoQixHQUE4QixLQUFLWixVQUFMLENBQWdCSCxRQUE5RDtBQUNBLFlBQU11QyxhQUFhLEdBQUdDLElBQUksQ0FBQ0MsS0FBTCxDQUFZSCxPQUFELEdBQVksR0FBdkIsQ0FBdEI7QUFDQSxhQUFLSSxPQUFMLENBQWFDLEtBQWIsQ0FBbUIsV0FBbkIsRUFBZ0NKLGFBQWhDOztBQUNBLFlBQUksS0FBS3BDLFVBQUwsQ0FBZ0JZLFdBQWhCLEtBQWdDLEtBQUtmLFFBQXpDLEVBQW1EO0FBQy9DLGVBQUtGLFFBQUwsQ0FBY2tCLElBQWQsQ0FBbUIsMkJBQW5CO0FBQ0g7QUFDSjtBQUNKIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNvdW5kRmlsZXNBUEkgKi9cblxuLyoqXG4gKiBUaGUgb25lQnV0dG9uUGxheWVyIG9iamVjdCBoYW5kbGVzIHRoZSBmdW5jdGlvbmFsaXR5IG9mIGEgb25lLWJ1dHRvbiBzb3VuZCBwbGF5ZXIuXG4gKi9cbmNvbnN0IG9uZUJ1dHRvblBsYXllciA9IHtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBvbmUtYnV0dG9uIHNvdW5kIHBsYXllci5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAkKCdmb3JtIC5hY3Rpb24tcGxheWJhY2stYnV0dG9uJykuZWFjaCgoaW5kZXgsIGJ1dHRvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkKGJ1dHRvbikuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBzbmRQbGF5ZXJPbmVCdG4oaWQpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBvbmUgYnV0dG9uIHNvdW5kIHBsYXllclxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG9uZUJ1dHRvblBsYXllci5pbml0aWFsaXplKCk7XG59KTtcblxuLyoqXG4gKiBUaGUgc25kUGxheWVyT25lQnRuIGNsYXNzIHJlcHJlc2VudHMgYSBvbmUtYnV0dG9uIHNvdW5kIHBsYXllci5cbiAqL1xuY2xhc3Mgc25kUGxheWVyT25lQnRuIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgdGhlIHNuZFBsYXllck9uZUJ0biBjbGFzcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBUaGUgaWRlbnRpZmllciBvZiB0aGUgc291bmQgcGxheWVyLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGlkKSB7XG4gICAgICAgIHRoaXMuJHBCdXR0b24gPSAkKGAuYWN0aW9uLXBsYXliYWNrLWJ1dHRvbltkYXRhLXZhbHVlPVwiJHtpZH1cIl1gKTsgLy8gcGxheSBidXR0b25cbiAgICAgICAgdGhpcy5zb3VuZFNlbGVjdG9yQ2xhc3MgPSBpZDtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IDA7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgY29uc3QgYXVkaW9QbGF5ZXIgPSBgPGF1ZGlvIGlkPVwiYXVkaW8tcGxheWVyLSR7aWR9XCIgcHJlbG9hZD1cImF1dG9cIj48c291cmNlIHNyYz1cIlwiIHR5cGU9XCJhdWRpby9tcDNcIj48L2F1ZGlvPmA7XG4gICAgICAgIHRoaXMuJHBCdXR0b24uYWZ0ZXIoYXVkaW9QbGF5ZXIpO1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgYXVkaW8tcGxheWVyLSR7aWR9YCk7XG4gICAgICAgIFxuICAgICAgICAvLyBCaW5kIGNhbGxiYWNrIGZ1bmN0aW9ucyB0byBwcmVzZXJ2ZSBjb250ZXh0XG4gICAgICAgIHRoaXMuY2JDYW5QbGF5VGhyb3VnaCA9IHRoaXMuY2JDYW5QbGF5VGhyb3VnaC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmNiVGltZVVwZGF0ZSA9IHRoaXMuY2JUaW1lVXBkYXRlLmJpbmQodGhpcyk7XG4gICAgICAgIC8vIFRyYWNrIHRoZSBsYXN0IGxvYWRlZCBhdWRpbyBmaWxlIElEIHRvIHByZXZlbnQgZHVwbGljYXRlIGxvYWRzXG4gICAgICAgIHRoaXMubGFzdExvYWRlZEZpbGVJZCA9IG51bGw7XG4gICAgICAgIFxuICAgICAgICAkKGAjJHt0aGlzLnNvdW5kU2VsZWN0b3JDbGFzc31gKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVBdWRpb1NvdXJjZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy4kcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQgJiYgdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgPSAwO1xuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBwbGF5LCBhZGQgcGF1c2VcbiAgICAgICAgICAgICAgICB0aGlzLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwYXVzZVwiPjwvaT4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7IC8vIHBhdXNlIG11c2ljXG4gICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG4gICAgICAgICAgICAgICAgLy8gcmVtb3ZlIHBhdXNlLCBhZGQgcGxheVxuICAgICAgICAgICAgICAgIHRoaXMuJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBsYXlcIj48L2k+Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnVwZGF0ZUF1ZGlvU291cmNlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgYXVkaW8gc291cmNlIGJhc2VkIG9uIHRoZSBzZWxlY3RlZCBzb3VuZCBmaWxlLlxuICAgICAqL1xuICAgIHVwZGF0ZUF1ZGlvU291cmNlKCkge1xuICAgICAgICBjb25zdCBhdWRpb0ZpbGVJZCA9ICQoJ2Zvcm0nKS5mb3JtKCdnZXQgdmFsdWUnLCB0aGlzLnNvdW5kU2VsZWN0b3JDbGFzcyk7XG4gICAgICAgIGlmIChhdWRpb0ZpbGVJZCAhPT0gJycgJiYgYXVkaW9GaWxlSWQgIT09IFwiLTFcIikge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UndmUgYWxyZWFkeSBsb2FkZWQgdGhpcyBmaWxlXG4gICAgICAgICAgICBpZiAodGhpcy5sYXN0TG9hZGVkRmlsZUlkID09PSBhdWRpb0ZpbGVJZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjsgLy8gU2tpcCBkdXBsaWNhdGUgbG9hZFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBfdGhpcyA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLmxhc3RMb2FkZWRGaWxlSWQgPSBhdWRpb0ZpbGVJZDsgLy8gUmVtZW1iZXIgdGhlIGxvYWRlZCBmaWxlXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSBSRVNUIEFQSSB0byBnZXQgc291bmQgZmlsZSBkZXRhaWxzXG4gICAgICAgICAgICBTb3VuZEZpbGVzQVBJLmdldFJlY29yZChhdWRpb0ZpbGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEucGF0aCkge1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5odG1sNUF1ZGlvLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzb3VyY2UnKVswXS5zcmNcbiAgICAgICAgICAgICAgICAgICAgICAgID0gYC9wYnhjb3JlL2FwaS9jZHIvdjIvcGxheWJhY2s/dmlldz0ke3Jlc3BvbnNlLmRhdGEucGF0aH1gO1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmh0bWw1QXVkaW8ubG9hZCgpO1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5odG1sNUF1ZGlvLm9uY2FucGxheXRocm91Z2ggPSBfdGhpcy5jYkNhblBsYXlUaHJvdWdoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUmVzZXQgd2hlbiBubyBmaWxlIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICB0aGlzLmxhc3RMb2FkZWRGaWxlSWQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIHdoZW4gdGhlIGF1ZGlvIGNhbiBwbGF5IHRocm91Z2guXG4gICAgICovXG4gICAgY2JDYW5QbGF5VGhyb3VnaCgpIHtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbjtcbiAgICAgICAgaWYgKHRoaXMuJHBCdXR0b24uaHRtbCgpID09PSAnPGkgY2xhc3M9XCJpY29uIHBhdXNlXCI+PC9pPicpIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgd2hlbiB0aGUgc2xpZGVyIHZhbHVlIGNoYW5nZXMuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG5ld1ZhbCAtIFRoZSBuZXcgdmFsdWUgb2YgdGhlIHNsaWRlci5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbWV0YSAtIEFkZGl0aW9uYWwgbWV0YWRhdGEgYWJvdXQgdGhlIHNsaWRlciBjaGFuZ2UuXG4gICAgICovXG4gICAgY2JPblNsaWRlckNoYW5nZShuZXdWYWwsIG1ldGEpIHtcbiAgICAgICAgaWYgKG1ldGEudHJpZ2dlcmVkQnlVc2VyICYmIE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgPSAodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uICogbmV3VmFsKSAvIDEwMDtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCB3aGVuIHRoZSBhdWRpbyB0aW1lIHVwZGF0ZXMuXG4gICAgICovXG4gICAgY2JUaW1lVXBkYXRlKCkge1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSB0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgLyB0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb247XG4gICAgICAgICAgICBjb25zdCByYW5nZVBvc2l0aW9uID0gTWF0aC5yb3VuZCgocGVyY2VudCkgKiAxMDApO1xuICAgICAgICAgICAgdGhpcy4kc2xpZGVyLnJhbmdlKCdzZXQgdmFsdWUnLCByYW5nZVBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgPT09IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwbGF5XCI+PC9pPicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIl19