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

/**
 * CDRPlayer class.
 */
var CDRPlayer = /*#__PURE__*/function () {
  /**
   * Creates an instance of CDRPlayer.
   * @param {string} id - The ID of the player.
   */
  function CDRPlayer(id) {
    var _this = this;

    _classCallCheck(this, CDRPlayer);

    this.id = id;
    this.html5Audio = document.getElementById("audio-player-".concat(id));
    var $row = $("#".concat(id));
    this.$pButton = $row.find('i.play'); // Play button

    this.$dButton = $row.find('i.download'); // Download button

    this.$slider = $row.find('div.cdr-player'); // Slider element

    this.$spanDuration = $row.find('span.cdr-duration'); // Duration span element

    this.html5Audio.removeEventListener('timeupdate', this.cbOnMetadataLoaded, false);
    this.html5Audio.removeEventListener('loadedmetadata', this.cbTimeUpdate, false);
    this.$pButton.unbind();
    this.$dButton.unbind(); // Play button event listener

    this.$pButton.on('click', function (e) {
      e.preventDefault();

      _this.play();
    }); // Download button event listener

    this.$dButton.on('click', function (e) {
      e.preventDefault();
      window.location = $(e.target).attr('data-value');
    });
    this.html5Audio.addEventListener('loadedmetadata', this.cbOnMetadataLoaded, false); // timeupdate event listener

    this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false); // no src handler

    this.html5Audio.addEventListener('error', this.cbOnSrcMediaError, false);
    this.$slider.range({
      min: 0,
      max: 100,
      start: 0,
      onChange: this.cbOnSliderChange,
      html5Audio: this.html5Audio,
      cbTimeUpdate: this.cbTimeUpdate,
      spanDuration: this.$spanDuration
    });
  }
  /**
   * Callback for metadata loaded event.
   */


  _createClass(CDRPlayer, [{
    key: "cbOnMetadataLoaded",
    value: function cbOnMetadataLoaded() {
      if (Number.isFinite(this.duration)) {
        var $row = $(this).closest('tr');
        var date = new Date(null);
        date.setSeconds(parseInt(this.currentTime, 10)); // specify value for SECONDS here

        var currentTime = date.toISOString().substr(14, 5);
        date.setSeconds(parseInt(this.duration, 10)); // specify value for SECONDS here

        var dateStr = date.toISOString();
        var hours = parseInt(dateStr.substr(11, 2), 10);
        var duration;

        if (hours === 0) {
          duration = dateStr.substr(14, 5);
        } else if (hours < 10) {
          duration = dateStr.substr(12, 7);
        } else if (hours >= 10) {
          duration = dateStr.substr(11, 8);
        }

        $row.find('span.cdr-duration').text("".concat(currentTime, "/").concat(duration));
      }
    }
    /**
     * Callback for slider change event.
     * @param {number} newVal - The new value of the slider.
     * @param {object} meta - Additional metadata.
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
        var dateCurrent = new Date(null);
        dateCurrent.setSeconds(parseInt(this.html5Audio.currentTime, 10)); // specify value for SECONDS here

        var currentTime = dateCurrent.toISOString().substr(14, 5);
        var dateDuration = new Date(null);
        dateDuration.setSeconds(parseInt(this.html5Audio.duration, 10)); // specify value for SECONDS here

        var dateStr = dateDuration.toISOString();
        var hours = parseInt(dateStr.substr(11, 2), 10);
        var duration;

        if (hours === 0) {
          duration = dateStr.substr(14, 5);
        } else if (hours < 10) {
          duration = dateStr.substr(12, 7);
        } else if (hours >= 10) {
          duration = dateStr.substr(11, 8);
        }

        this.spanDuration.text("".concat(currentTime, "/").concat(duration));
      }
    }
    /**
     * Callback for time update event.
     */

  }, {
    key: "cbTimeUpdate",
    value: function cbTimeUpdate() {
      if (Number.isFinite(this.duration)) {
        var percent = this.currentTime / this.duration;
        var rangePosition = Math.min(Math.round(percent * 100), 100);
        var $row = $(this).closest('tr');
        $row.find('div.cdr-player').range('set value', rangePosition);

        if (this.currentTime === this.duration) {
          $row.find('i.pause').removeClass('pause').addClass('play');
        }
      }
    }
    /**
     * Plays or pauses the audio file.
     */

  }, {
    key: "play",
    value: function play() {
      // start music
      if (this.html5Audio.paused) {
        this.html5Audio.play(); // remove play, add pause

        this.$pButton.removeClass('play').addClass('pause');
      } else {
        // pause music
        this.html5Audio.pause(); // remove pause, add play

        this.$pButton.removeClass('pause').addClass('play');
      }
    }
    /**
     * Callback for src media error event.
     */

  }, {
    key: "cbOnSrcMediaError",
    value: function cbOnSrcMediaError() {
      $(this).closest('tr').addClass('disabled');
    }
  }]);

  return CDRPlayer;
}();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLXBsYXllci5qcyJdLCJuYW1lcyI6WyJDRFJQbGF5ZXIiLCJpZCIsImh0bWw1QXVkaW8iLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiJHJvdyIsIiQiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicGxheSIsIndpbmRvdyIsImxvY2F0aW9uIiwidGFyZ2V0IiwiYXR0ciIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uU3JjTWVkaWFFcnJvciIsInJhbmdlIiwibWluIiwibWF4Iiwic3RhcnQiLCJvbkNoYW5nZSIsImNiT25TbGlkZXJDaGFuZ2UiLCJzcGFuRHVyYXRpb24iLCJOdW1iZXIiLCJpc0Zpbml0ZSIsImR1cmF0aW9uIiwiY2xvc2VzdCIsImRhdGUiLCJEYXRlIiwic2V0U2Vjb25kcyIsInBhcnNlSW50IiwiY3VycmVudFRpbWUiLCJ0b0lTT1N0cmluZyIsInN1YnN0ciIsImRhdGVTdHIiLCJob3VycyIsInRleHQiLCJuZXdWYWwiLCJtZXRhIiwidHJpZ2dlcmVkQnlVc2VyIiwiZGF0ZUN1cnJlbnQiLCJkYXRlRHVyYXRpb24iLCJwZXJjZW50IiwicmFuZ2VQb3NpdGlvbiIsIk1hdGgiLCJyb3VuZCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJwYXVzZWQiLCJwYXVzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtJQUNNQSxTO0FBRUY7QUFDSjtBQUNBO0FB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Z0JBQU87QUFDSDtBQUNBLFVBQUksS0FBS3ZELFVBQUwsQ0FBZ0J3RCxNQUFwQixFQUE0QjtBQUN4QixhQUFLeEQsVUFBTCxDQUFnQmlCLElBQWhCLEdBRHdCLENBRXhCOztBQUNBLGFBQUtaLFFBQUwsQ0FBY2lELFdBQWQsQ0FBMEIsTUFBMUIsRUFBa0NDLFFBQWxDLENBQTJDLE9BQTNDO0FBQ0gsT0FKRCxNQUlPO0FBQUU7QUFDTCxhQUFLdkQsVUFBTCxDQUFnQnlELEtBQWhCLEdBREcsQ0FFSDs7QUFDQSxhQUFLcEQsUUFBTCxDQUFjaUQsV0FBZCxDQUEwQixPQUExQixFQUFtQ0MsUUFBbkMsQ0FBNEMsTUFBNUM7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksNkJBQW9CO0FBQ2hCbkQsTUFBQUEsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFROEIsT0FBUixDQUFnQixJQUFoQixFQUFzQnFCLFFBQXRCLENBQStCLFVBQS9CO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKipcbiAqIENEUlBsYXllciBjbGFzcy5cbiAqL1xuY2xhc3MgQ0RSUGxheWVyIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgQ0RSUGxheWVyLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFRoZSBJRCBvZiB0aGUgcGxheWVyLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGlkKSB7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGF1ZGlvLXBsYXllci0ke2lkfWApO1xuICAgICAgICBjb25zdCAkcm93ID0gJChgIyR7aWR9YCk7XG4gICAgICAgIHRoaXMuJHBCdXR0b24gPSAkcm93LmZpbmQoJ2kucGxheScpOyAvLyBQbGF5IGJ1dHRvblxuICAgICAgICB0aGlzLiRkQnV0dG9uID0gJHJvdy5maW5kKCdpLmRvd25sb2FkJyk7IC8vIERvd25sb2FkIGJ1dHRvblxuICAgICAgICB0aGlzLiRzbGlkZXIgPSAkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJyk7IC8vIFNsaWRlciBlbGVtZW50XG4gICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbiA9ICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKTsgLy8gRHVyYXRpb24gc3BhbiBlbGVtZW50XG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYk9uTWV0YWRhdGFMb2FkZWQsIGZhbHNlKTtcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICAgICAgdGhpcy4kcEJ1dHRvbi51bmJpbmQoKTtcbiAgICAgICAgdGhpcy4kZEJ1dHRvbi51bmJpbmQoKTtcblxuICAgICAgICAvLyBQbGF5IGJ1dHRvbiBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLiRwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLnBsYXkoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRG93bmxvYWQgYnV0dG9uIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuJGRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYk9uTWV0YWRhdGFMb2FkZWQsIGZhbHNlKTtcblxuICAgICAgICAvLyB0aW1ldXBkYXRlIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblxuICAgICAgICAvLyBubyBzcmMgaGFuZGxlclxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzLmNiT25TcmNNZWRpYUVycm9yLCBmYWxzZSk7XG5cbiAgICAgICAgdGhpcy4kc2xpZGVyLnJhbmdlKHtcbiAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgIG1heDogMTAwLFxuICAgICAgICAgICAgc3RhcnQ6IDAsXG4gICAgICAgICAgICBvbkNoYW5nZTogdGhpcy5jYk9uU2xpZGVyQ2hhbmdlLFxuICAgICAgICAgICAgaHRtbDVBdWRpbzogdGhpcy5odG1sNUF1ZGlvLFxuICAgICAgICAgICAgY2JUaW1lVXBkYXRlOiB0aGlzLmNiVGltZVVwZGF0ZSxcbiAgICAgICAgICAgIHNwYW5EdXJhdGlvbjogdGhpcy4kc3BhbkR1cmF0aW9uLFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3IgbWV0YWRhdGEgbG9hZGVkIGV2ZW50LlxuICAgICAqL1xuICAgIGNiT25NZXRhZGF0YUxvYWRlZCgpIHtcbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShudWxsKTtcbiAgICAgICAgICAgIGRhdGUuc2V0U2Vjb25kcyhwYXJzZUludCh0aGlzLmN1cnJlbnRUaW1lLCAxMCkpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICBkYXRlLnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5kdXJhdGlvbiwgMTApKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG4gICAgICAgICAgICBjb25zdCBkYXRlU3RyID0gZGF0ZS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgY29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcbiAgICAgICAgICAgIGxldCBkdXJhdGlvbjtcbiAgICAgICAgICAgIGlmIChob3VycyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChob3VycyA8IDEwKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMiwgNyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID49IDEwKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMSwgOCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkcm93LmZpbmQoJ3NwYW4uY2RyLWR1cmF0aW9uJykudGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciBzbGlkZXIgY2hhbmdlIGV2ZW50LlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBuZXdWYWwgLSBUaGUgbmV3IHZhbHVlIG9mIHRoZSBzbGlkZXIuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG1ldGEgLSBBZGRpdGlvbmFsIG1ldGFkYXRhLlxuICAgICAqL1xuICAgIGNiT25TbGlkZXJDaGFuZ2UobmV3VmFsLCBtZXRhKSB7XG4gICAgICAgIGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID0gKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRlQ3VycmVudCA9IG5ldyBEYXRlKG51bGwpO1xuICAgICAgICAgICAgZGF0ZUN1cnJlbnQuc2V0U2Vjb25kcyhwYXJzZUludCh0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUsIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuICAgICAgICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBkYXRlQ3VycmVudC50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICBjb25zdCBkYXRlRHVyYXRpb24gPSBuZXcgRGF0ZShudWxsKTtcbiAgICAgICAgICAgIGRhdGVEdXJhdGlvbi5zZXRTZWNvbmRzKHBhcnNlSW50KHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiwgMTApKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG4gICAgICAgICAgICBjb25zdCBkYXRlU3RyID0gZGF0ZUR1cmF0aW9uLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICBjb25zdCBob3VycyA9IHBhcnNlSW50KGRhdGVTdHIuc3Vic3RyKDExLCAyKSwgMTApO1xuICAgICAgICAgICAgbGV0IGR1cmF0aW9uO1xuICAgICAgICAgICAgaWYgKGhvdXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhvdXJzIDwgMTApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDEyLCA3KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPj0gMTApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDExLCA4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3BhbkR1cmF0aW9uLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3IgdGltZSB1cGRhdGUgZXZlbnQuXG4gICAgICovXG4gICAgY2JUaW1lVXBkYXRlKCkge1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gdGhpcy5jdXJyZW50VGltZSAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICBjb25zdCByYW5nZVBvc2l0aW9uID0gTWF0aC5taW4oTWF0aC5yb3VuZCgocGVyY2VudCkgKiAxMDApLCAxMDApO1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgICRyb3cuZmluZCgnZGl2LmNkci1wbGF5ZXInKS5yYW5nZSgnc2V0IHZhbHVlJywgcmFuZ2VQb3NpdGlvbik7XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50VGltZSA9PT0gdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgICAgICRyb3cuZmluZCgnaS5wYXVzZScpLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQbGF5cyBvciBwYXVzZXMgdGhlIGF1ZGlvIGZpbGUuXG4gICAgICovXG4gICAgcGxheSgpIHtcbiAgICAgICAgLy8gc3RhcnQgbXVzaWNcbiAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQpIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG4gICAgICAgICAgICAvLyByZW1vdmUgcGxheSwgYWRkIHBhdXNlXG4gICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG4gICAgICAgIH0gZWxzZSB7IC8vIHBhdXNlIG11c2ljXG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcbiAgICAgICAgICAgIC8vIHJlbW92ZSBwYXVzZSwgYWRkIHBsYXlcbiAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciBzcmMgbWVkaWEgZXJyb3IgZXZlbnQuXG4gICAgICovXG4gICAgY2JPblNyY01lZGlhRXJyb3IoKSB7XG4gICAgICAgICQodGhpcykuY2xvc2VzdCgndHInKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9XG59Il19