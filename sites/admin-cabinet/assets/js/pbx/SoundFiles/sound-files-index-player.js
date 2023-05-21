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

    this.$pButton = $row.find('i.play'); // play button

    this.$dButton = $row.find('i.download'); // download button

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
      window.location = $(e.target).attr('data-value');
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
          $row.find('i.pause').removeClass('pause').addClass('play');
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

        this.$pButton.removeClass('play').addClass('pause');
      } else {
        // Pause the audio
        this.html5Audio.pause(); // Update the play button icon to play

        this.$pButton.removeClass('pause').addClass('play');
      }
    }
  }]);

  return IndexSoundPlayer;
}();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LXBsYXllci5qcyJdLCJuYW1lcyI6WyJJbmRleFNvdW5kUGxheWVyIiwiaWQiLCJodG1sNUF1ZGlvIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIiRyb3ciLCIkIiwiaGFzQ2xhc3MiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicGxheSIsIndpbmRvdyIsImxvY2F0aW9uIiwidGFyZ2V0IiwiYXR0ciIsImFkZEV2ZW50TGlzdGVuZXIiLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwic3BhbkR1cmF0aW9uIiwiYWRkQ2xhc3MiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsImR1cmF0aW9uIiwiY2xvc2VzdCIsImRhdGUiLCJEYXRlIiwic2V0U2Vjb25kcyIsImN1cnJlbnRUaW1lIiwidG9JU09TdHJpbmciLCJzdWJzdHIiLCJ0ZXh0IiwibmV3VmFsIiwibWV0YSIsInRyaWdnZXJlZEJ5VXNlciIsInBlcmNlbnQiLCJyYW5nZVBvc2l0aW9uIiwiTWF0aCIsInJvdW5kIiwicmVtb3ZlQ2xhc3MiLCJwYXVzZWQiLCJwYXVzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsZ0I7QUFFRjtBQUNKO0FBQ0E7QUFDQTtBQUNJLDRCQUFZQyxFQUFaLEVBQWdCO0FBQUE7O0FBQUE7O0FBQ1osU0FBS0EsRUFBTCxHQUFV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LFVBQUwsQ0FBZ0JvRCxLQUFoQixHQUZHLENBR0g7O0FBQ0EsYUFBSzlDLFFBQUwsQ0FBYzRDLFdBQWQsQ0FBMEIsT0FBMUIsRUFBbUNuQixRQUFuQyxDQUE0QyxNQUE1QztBQUNIO0FBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gaW5kZXggc291bmQgcGxheWVyLlxuICpcbiAqIEBjbGFzcyBJbmRleFNvdW5kUGxheWVyXG4gKi9cbmNsYXNzIEluZGV4U291bmRQbGF5ZXIge1xuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBJbmRleFNvdW5kUGxheWVyIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBUaGUgSUQgb2YgdGhlIGF1ZGlvIHBsYXllciBlbGVtZW50LlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGlkKSB7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGF1ZGlvLXBsYXllci0ke2lkfWApO1xuICAgICAgICBjb25zdCAkcm93ID0gJChgIyR7aWR9YCk7XG4gICAgICAgIGlmICgkcm93Lmhhc0NsYXNzKCdpbml0aWFsaXplZCcpKSB7XG4gICAgICAgICAgICAvLyBQcmV2ZW50IGRvdWJsZSBwcm9jZXNzaW5nXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kcEJ1dHRvbiA9ICRyb3cuZmluZCgnaS5wbGF5Jyk7IC8vIHBsYXkgYnV0dG9uXG4gICAgICAgIHRoaXMuJGRCdXR0b24gPSAkcm93LmZpbmQoJ2kuZG93bmxvYWQnKTsgLy8gZG93bmxvYWQgYnV0dG9uXG4gICAgICAgIHRoaXMuJHNsaWRlciA9ICRyb3cuZmluZCgnZGl2LmNkci1wbGF5ZXInKTtcbiAgICAgICAgdGhpcy4kc3BhbkR1cmF0aW9uID0gJHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpO1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgICAgIHRoaXMuJHBCdXR0b24udW5iaW5kKCk7XG4gICAgICAgIHRoaXMuJGRCdXR0b24udW5iaW5kKCk7XG5cbiAgICAgICAgLy8gUGxheSBidXR0b24gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy4kcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERvd25sb2FkIGJ1dHRvbiBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLiRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSAkKGUudGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIExvYWRlZCBtZXRhZGF0YSBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZCwgZmFsc2UpO1xuXG4gICAgICAgIC8vIFRpbWV1cGRhdGUgZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcmFuZ2Ugc2xpZGVyXG4gICAgICAgIHRoaXMuJHNsaWRlci5yYW5nZSh7XG4gICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICBtYXg6IDEwMCxcbiAgICAgICAgICAgIHN0YXJ0OiAwLFxuICAgICAgICAgICAgb25DaGFuZ2U6IHRoaXMuY2JPblNsaWRlckNoYW5nZSxcbiAgICAgICAgICAgIGh0bWw1QXVkaW86IHRoaXMuaHRtbDVBdWRpbyxcbiAgICAgICAgICAgIGNiVGltZVVwZGF0ZTogdGhpcy5jYlRpbWVVcGRhdGUsXG4gICAgICAgICAgICBzcGFuRHVyYXRpb246IHRoaXMuJHNwYW5EdXJhdGlvbixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUHJldmVudCBkb3VibGUgcHJvY2Vzc2luZ1xuICAgICAgICAkcm93LmFkZENsYXNzKCdpbml0aWFsaXplZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciBtZXRhZGF0YSBsb2FkZWQgZXZlbnQuXG4gICAgICovXG4gICAgY2JPbk1ldGFkYXRhTG9hZGVkKCkge1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKG51bGwpO1xuICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKHRoaXMuY3VycmVudFRpbWUpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICBkYXRlLnNldFNlY29uZHModGhpcy5kdXJhdGlvbik7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKS50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZm9yIHRoZSBzbGlkZXIgY2hhbmdlIGV2ZW50LlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBuZXdWYWwgLSBUaGUgbmV3IHZhbHVlIG9mIHRoZSBzbGlkZXIuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG1ldGEgLSBBZGRpdGlvbmFsIG1ldGFkYXRhIGZvciB0aGUgc2xpZGVyLlxuICAgICAqL1xuICAgIGNiT25TbGlkZXJDaGFuZ2UobmV3VmFsLCBtZXRhKSB7XG4gICAgICAgIGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID0gKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VGltZSA9IG5ldyBEYXRlKHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSAqIDEwMDApLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gbmV3IERhdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uICogMTAwMCkudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgdGhpcy5zcGFuRHVyYXRpb24udGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciB0aGUgdGltZXVwZGF0ZSBldmVudC5cbiAgICAgKiBTeW5jaHJvbml6ZXMgcGxheWhlYWQgcG9zaXRpb24gd2l0aCBjdXJyZW50IHBvaW50IGluIGF1ZGlvXG4gICAgICovXG4gICAgY2JUaW1lVXBkYXRlKCkge1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gdGhpcy5jdXJyZW50VGltZSAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICBjb25zdCByYW5nZVBvc2l0aW9uID0gTWF0aC5yb3VuZCgocGVyY2VudCkgKiAxMDApO1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgICRyb3cuZmluZCgnZGl2LmNkci1wbGF5ZXInKS5yYW5nZSgnc2V0IHZhbHVlJywgcmFuZ2VQb3NpdGlvbik7XG4gICAgICAgICAgICBpZiAocmFuZ2VQb3NpdGlvbiA9PT0gMTAwKSB7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCdpLnBhdXNlJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBsYXlzIG9yIHBhdXNlcyB0aGUgYXVkaW8gZmlsZSB3aGVuIHRoZSBwbGF5IGJ1dHRvbiBpcyBjbGlja2VkLlxuICAgICAqL1xuICAgIHBsYXkoKSB7XG4gICAgICAgIGlmICh0aGlzLmh0bWw1QXVkaW8ucGF1c2VkICYmIHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikge1xuICAgICAgICAgICAgLy8gU3RhcnQgcGxheWluZyB0aGUgYXVkaW9cbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHBsYXkgYnV0dG9uIGljb24gdG8gcGF1c2VcbiAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFBhdXNlIHRoZSBhdWRpb1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHBsYXkgYnV0dG9uIGljb24gdG8gcGxheVxuICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICB9XG4gICAgfVxufSJdfQ==