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
 * Represents an index sound player.
 *
 * @class IndexSoundPlayer
 */
var IndexSoundPlayer = /*#__PURE__*/function () {
  /**
   * Constructs a new IndexSoundPlayer object.
   * @param {string} id - The ID of the audio player element.
   */
  function IndexSoundPlayer(id) {
    var _this = this;

    _classCallCheck(this, IndexSoundPlayer);

    this.id = id;
    this.html5Audio = document.getElementById("audio-player-".concat(id));
    var $row = $("#".concat(id));

    if ($row.hasClass('initialized')) {
      // Prevent double processing
      return;
    }

    this.$pButton = $row.find('button.play-button'); // play button

    this.$dButton = $row.find('button.download-button'); // download button

    this.$slider = $row.find('div.cdr-player');
    this.$spanDuration = $row.find('span.cdr-duration');
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

      var downloadUrl = _this.$dButton.attr('data-value');

      if (downloadUrl) {
        window.location = downloadUrl;
      }
    }); // Loaded metadata event listener

    this.html5Audio.addEventListener('loadedmetadata', this.cbOnMetadataLoaded, false); // Timeupdate event listener

    this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false); // Initialize range slider

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
   * Callback for metadata loaded event.
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
     * Callback function for the slider change event.
     * @param {number} newVal - The new value of the slider.
     * @param {Object} meta - Additional metadata for the slider.
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
     * Callback function for the timeupdate event.
     * Synchronizes playhead position with current point in audio
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
          $row.find('button.play-button i.pause').removeClass('pause').addClass('play');
        }
      }
    }
    /**
     * Plays or pauses the audio file when the play button is clicked.
     */

  }, {
    key: "play",
    value: function play() {
      if (this.html5Audio.paused && this.html5Audio.duration) {
        // Start playing the audio
        this.html5Audio.play(); // Update the play button icon to pause

        this.$pButton.find('i').removeClass('play').addClass('pause');
      } else {
        // Pause the audio
        this.html5Audio.pause(); // Update the play button icon to play

        this.$pButton.find('i').removeClass('pause').addClass('play');
      }
    }
  }]);

  return IndexSoundPlayer;
}();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LXBsYXllci5qcyJdLCJuYW1lcyI6WyJJbmRleFNvdW5kUGxheWVyIiwiaWQiLCJodG1sNUF1ZGlvIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIiRyb3ciLCIkIiwiaGFzQ2xhc3MiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicGxheSIsImRvd25sb2FkVXJsIiwiYXR0ciIsIndpbmRvdyIsImxvY2F0aW9uIiwiYWRkRXZlbnRMaXN0ZW5lciIsInJhbmdlIiwibWluIiwibWF4Iiwic3RhcnQiLCJvbkNoYW5nZSIsImNiT25TbGlkZXJDaGFuZ2UiLCJzcGFuRHVyYXRpb24iLCJhZGRDbGFzcyIsIk51bWJlciIsImlzRmluaXRlIiwiZHVyYXRpb24iLCJjbG9zZXN0IiwiZGF0ZSIsIkRhdGUiLCJzZXRTZWNvbmRzIiwiY3VycmVudFRpbWUiLCJ0b0lTT1N0cmluZyIsInN1YnN0ciIsInRleHQiLCJuZXdWYWwiLCJtZXRhIiwidHJpZ2dlcmVkQnlVc2VyIiwicGVyY2VudCIsInJhbmdlUG9zaXRpb24iLCJNYXRoIiwicm91bmQiLCJyZW1vdmVDbGFzcyIsInBhdXNlZCIsInBhdXNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxnQjtBQUVGO0FBQ0o7QUFDQTtBQUNBO0FBQ0ksNEJBQVlDLEVBQVosRUFBZ0I7QUFBQTs7QUFBQTs7QUFDWixTQUFLQSxFQUFM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eEIsQ0FBb0MsTUFBcEMsRUFBNENuQixRQUE1QyxDQUFxRCxPQUFyRDtBQUNILE9BTEQsTUFLTztBQUNIO0FBQ0EsYUFBSy9CLFVBQUwsQ0FBZ0JvRCxLQUFoQixHQUZHLENBR0g7O0FBQ0EsYUFBSzlDLFFBQUwsQ0FBY0MsSUFBZCxDQUFtQixHQUFuQixFQUF3QjJDLFdBQXhCLENBQW9DLE9BQXBDLEVBQTZDbkIsUUFBN0MsQ0FBc0QsTUFBdEQ7QUFDSDtBQUNKIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIGluZGV4IHNvdW5kIHBsYXllci5cbiAqXG4gKiBAY2xhc3MgSW5kZXhTb3VuZFBsYXllclxuICovXG5jbGFzcyBJbmRleFNvdW5kUGxheWVyIHtcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBuZXcgSW5kZXhTb3VuZFBsYXllciBvYmplY3QuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIElEIG9mIHRoZSBhdWRpbyBwbGF5ZXIgZWxlbWVudC5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihpZCkge1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMuaHRtbDVBdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBhdWRpby1wbGF5ZXItJHtpZH1gKTtcbiAgICAgICAgY29uc3QgJHJvdyA9ICQoYCMke2lkfWApO1xuICAgICAgICBpZiAoJHJvdy5oYXNDbGFzcygnaW5pdGlhbGl6ZWQnKSkge1xuICAgICAgICAgICAgLy8gUHJldmVudCBkb3VibGUgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJHBCdXR0b24gPSAkcm93LmZpbmQoJ2J1dHRvbi5wbGF5LWJ1dHRvbicpOyAvLyBwbGF5IGJ1dHRvblxuICAgICAgICB0aGlzLiRkQnV0dG9uID0gJHJvdy5maW5kKCdidXR0b24uZG93bmxvYWQtYnV0dG9uJyk7IC8vIGRvd25sb2FkIGJ1dHRvblxuICAgICAgICB0aGlzLiRzbGlkZXIgPSAkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJyk7XG4gICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbiA9ICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKTtcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZCwgZmFsc2UpO1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgICAgICB0aGlzLiRwQnV0dG9uLnVuYmluZCgpO1xuICAgICAgICB0aGlzLiRkQnV0dG9uLnVuYmluZCgpO1xuXG4gICAgICAgIC8vIFBsYXkgYnV0dG9uIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuJHBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMucGxheSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEb3dubG9hZCBidXR0b24gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy4kZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgZG93bmxvYWRVcmwgPSB0aGlzLiRkQnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIGlmIChkb3dubG9hZFVybCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGRvd25sb2FkVXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBMb2FkZWQgbWV0YWRhdGEgZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYk9uTWV0YWRhdGFMb2FkZWQsIGZhbHNlKTtcblxuICAgICAgICAvLyBUaW1ldXBkYXRlIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHJhbmdlIHNsaWRlclxuICAgICAgICB0aGlzLiRzbGlkZXIucmFuZ2Uoe1xuICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgbWF4OiAxMDAsXG4gICAgICAgICAgICBzdGFydDogMCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiB0aGlzLmNiT25TbGlkZXJDaGFuZ2UsXG4gICAgICAgICAgICBodG1sNUF1ZGlvOiB0aGlzLmh0bWw1QXVkaW8sXG4gICAgICAgICAgICBjYlRpbWVVcGRhdGU6IHRoaXMuY2JUaW1lVXBkYXRlLFxuICAgICAgICAgICAgc3BhbkR1cmF0aW9uOiB0aGlzLiRzcGFuRHVyYXRpb24sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFByZXZlbnQgZG91YmxlIHByb2Nlc3NpbmdcbiAgICAgICAgJHJvdy5hZGRDbGFzcygnaW5pdGlhbGl6ZWQnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3IgbWV0YWRhdGEgbG9hZGVkIGV2ZW50LlxuICAgICAqL1xuICAgIGNiT25NZXRhZGF0YUxvYWRlZCgpIHtcbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShudWxsKTtcbiAgICAgICAgICAgIGRhdGUuc2V0U2Vjb25kcyh0aGlzLmN1cnJlbnRUaW1lKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VGltZSA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKHRoaXMuZHVyYXRpb24pOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICAkcm93LmZpbmQoJ3NwYW4uY2RyLWR1cmF0aW9uJykudGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciB0aGUgc2xpZGVyIGNoYW5nZSBldmVudC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbmV3VmFsIC0gVGhlIG5ldyB2YWx1ZSBvZiB0aGUgc2xpZGVyLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBtZXRhIC0gQWRkaXRpb25hbCBtZXRhZGF0YSBmb3IgdGhlIHNsaWRlci5cbiAgICAgKi9cbiAgICBjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuICAgICAgICBpZiAobWV0YS50cmlnZ2VyZWRCeVVzZXIgJiYgTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSA9ICh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24gKiBuZXdWYWwpIC8gMTAwO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBuZXcgRGF0ZSh0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgKiAxMDAwKS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IG5ldyBEYXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIDEwMDApLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIHRoaXMuc3BhbkR1cmF0aW9uLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgdGhlIHRpbWV1cGRhdGUgZXZlbnQuXG4gICAgICogU3luY2hyb25pemVzIHBsYXloZWFkIHBvc2l0aW9uIHdpdGggY3VycmVudCBwb2ludCBpbiBhdWRpb1xuICAgICAqL1xuICAgIGNiVGltZVVwZGF0ZSgpIHtcbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKTtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICAkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJykucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuICAgICAgICAgICAgaWYgKHJhbmdlUG9zaXRpb24gPT09IDEwMCkge1xuICAgICAgICAgICAgICAgICRyb3cuZmluZCgnYnV0dG9uLnBsYXktYnV0dG9uIGkucGF1c2UnKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGxheXMgb3IgcGF1c2VzIHRoZSBhdWRpbyBmaWxlIHdoZW4gdGhlIHBsYXkgYnV0dG9uIGlzIGNsaWNrZWQuXG4gICAgICovXG4gICAgcGxheSgpIHtcbiAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQgJiYgdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICAvLyBTdGFydCBwbGF5aW5nIHRoZSBhdWRpb1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgcGxheSBidXR0b24gaWNvbiB0byBwYXVzZVxuICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFBhdXNlIHRoZSBhdWRpb1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHBsYXkgYnV0dG9uIGljb24gdG8gcGxheVxuICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgfVxuICAgIH1cbn0iXX0=