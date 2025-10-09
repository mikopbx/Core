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
 * Represents the sound player on modify page.
 * Uses the same structure as IndexSoundPlayer for consistency.
 *
 * @class ModifySoundPlayer
 */
var ModifySoundPlayer = /*#__PURE__*/function () {
  /**
   * Constructs a new ModifySoundPlayer object.
   */
  function ModifySoundPlayer() {
    _classCallCheck(this, ModifySoundPlayer);

    this.id = 'sound-file-player-row';
    this.html5Audio = document.getElementById('audio-player');
    this.$pButton = $('#audio-player-segment').find('button.play-button');
    this.$dButton = $('#audio-player-segment').find('button.download-button');
    this.$slider = $('#audio-player-segment').find('div.cdr-player');
    this.$spanDuration = $('#audio-player-segment').find('span.cdr-duration');
    this.$playerSegment = $('#audio-player-segment');
    this.currentFileUrl = '';
    this.initialize();
  }
  /**
   * Initializes the sound player with slider functionality.
   */


  _createClass(ModifySoundPlayer, [{
    key: "initialize",
    value: function initialize() {
      var _this = this;

      // Play button event listener
      this.$pButton.on('click', function (e) {
        e.preventDefault();

        _this.play();
      }); // Download button event listener

      this.$dButton.on('click', function (e) {
        e.preventDefault();

        if (_this.currentFileUrl) {
          _this.downloadFile(_this.currentFileUrl);
        }
      }); // Loaded metadata event listener

      this.html5Audio.addEventListener('loadedmetadata', this.cbOnMetadataLoaded.bind(this), false); // Timeupdate event listener

      this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate.bind(this), false); // Initialize range slider

      this.$slider.range({
        min: 0,
        max: 100,
        start: 0,
        onChange: this.cbOnSliderChange.bind(this),
        html5Audio: this.html5Audio,
        cbTimeUpdate: this.cbTimeUpdate.bind(this),
        spanDuration: this.$spanDuration
      });
    }
    /**
     * Updates the audio source.
     * @param {string} newSource - The new source for the audio.
     */

  }, {
    key: "UpdateSource",
    value: function UpdateSource(newSource) {
      // Pause current playback
      this.html5Audio.pause(); // Store the URL for downloading

      this.currentFileUrl = newSource; // Set data-src attribute for later loading

      this.html5Audio.setAttribute('data-src', newSource); // Show the player segment

      this.$playerSegment.show(); // Check if it's an API endpoint or blob URL

      if (newSource.includes('/pbxcore/api/')) {
        // Load metadata via HEAD request for API endpoints
        this.loadMetadata();
      } else {
        // For blob URLs (recorded audio), load directly
        this.html5Audio.src = newSource;
        this.html5Audio.load();
      }
    }
    /**
     * Load metadata (duration) without loading the full audio file.
     * Makes a HEAD request to get X-Audio-Duration header.
     */

  }, {
    key: "loadMetadata",
    value: function loadMetadata() {
      var _this2 = this;

      var sourceSrc = this.html5Audio.getAttribute('data-src');

      if (!sourceSrc || !sourceSrc.includes('/pbxcore/api/')) {
        return;
      } // Build full URL


      var fullUrl;

      if (sourceSrc.startsWith('http')) {
        fullUrl = sourceSrc;
      } else if (sourceSrc.startsWith('/pbxcore/')) {
        var baseUrl = window.location.origin;
        fullUrl = "".concat(baseUrl).concat(sourceSrc);
      } else {
        fullUrl = "".concat(globalRootUrl).concat(sourceSrc.replace(/^\//, ''));
      } // Prepare headers with Bearer token


      var headers = {
        'X-Requested-With': 'XMLHttpRequest'
      };

      if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
        headers['Authorization'] = "Bearer ".concat(TokenManager.accessToken);
      } // Make HEAD request to get only headers (no body download)


      fetch(fullUrl, {
        method: 'HEAD',
        headers: headers
      }).then(function (response) {
        if (!response.ok) {
          return;
        } // Extract duration from header


        var durationSeconds = response.headers.get('X-Audio-Duration');

        if (durationSeconds) {
          var duration = parseFloat(durationSeconds);

          if (duration > 0) {
            var date = new Date(duration * 1000);
            var formatted = date.toISOString().substr(14, 5);

            _this2.$spanDuration.text("00:00/".concat(formatted));
          }
        }
      })["catch"](function () {// Silently fail - metadata is not critical
      });
    }
    /**
     * Callback for metadata loaded event.
     */

  }, {
    key: "cbOnMetadataLoaded",
    value: function cbOnMetadataLoaded() {
      if (Number.isFinite(this.html5Audio.duration)) {
        var currentTime = new Date(this.html5Audio.currentTime * 1000).toISOString().substr(14, 5);
        var duration = new Date(this.html5Audio.duration * 1000).toISOString().substr(14, 5);
        this.$spanDuration.text("".concat(currentTime, "/").concat(duration));
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
        this.html5Audio.removeEventListener('timeupdate', this.cbTimeUpdate.bind(this), false);
        this.html5Audio.currentTime = this.html5Audio.duration * newVal / 100;
        this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate.bind(this), false);
      }

      if (Number.isFinite(this.html5Audio.duration)) {
        var currentTime = new Date(this.html5Audio.currentTime * 1000).toISOString().substr(14, 5);
        var duration = new Date(this.html5Audio.duration * 1000).toISOString().substr(14, 5);
        this.$spanDuration.text("".concat(currentTime, "/").concat(duration));
      }
    }
    /**
     * Callback function for the timeupdate event.
     * Synchronizes playhead position with current point in audio
     */

  }, {
    key: "cbTimeUpdate",
    value: function cbTimeUpdate() {
      if (Number.isFinite(this.html5Audio.duration)) {
        var percent = this.html5Audio.currentTime / this.html5Audio.duration;
        var rangePosition = Math.round(percent * 100); // Update slider position

        this.$slider.range('set value', rangePosition); // Update time display

        var currentTime = new Date(this.html5Audio.currentTime * 1000).toISOString().substr(14, 5);
        var duration = new Date(this.html5Audio.duration * 1000).toISOString().substr(14, 5);
        this.$spanDuration.text("".concat(currentTime, "/").concat(duration)); // Reset play button when finished

        if (rangePosition === 100) {
          this.$pButton.find('i').removeClass('pause').addClass('play');
        }
      }
    }
    /**
     * Plays or pauses the audio based on its current state.
     */

  }, {
    key: "play",
    value: function play() {
      // Check if audio already has a blob source loaded
      if (this.html5Audio.src && this.html5Audio.src.startsWith('blob:')) {
        // Blob already loaded, just toggle play/pause
        if (this.html5Audio.paused) {
          this.html5Audio.play();
          this.$pButton.find('i').removeClass('play').addClass('pause');
        } else {
          this.html5Audio.pause();
          this.$pButton.find('i').removeClass('pause').addClass('play');
        }

        return;
      } // Need to load source first


      var sourceSrc = this.html5Audio.getAttribute('data-src') || ''; // If source is an API endpoint, load with authentication

      if (sourceSrc && sourceSrc.includes('/pbxcore/api/')) {
        this.loadAuthenticatedSource(sourceSrc);
        return;
      } // Fallback for non-API sources


      if (this.html5Audio.paused && this.html5Audio.duration) {
        this.html5Audio.play();
        this.$pButton.find('i').removeClass('play').addClass('pause');
      } else {
        this.html5Audio.pause();
        this.$pButton.find('i').removeClass('pause').addClass('play');
      }
    }
    /**
     * Loads audio from authenticated API endpoint using fetch + Bearer token
     * @param {string} apiUrl - The API URL requiring authentication
     */

  }, {
    key: "loadAuthenticatedSource",
    value: function loadAuthenticatedSource(apiUrl) {
      var _this3 = this;

      // Build full URL
      var fullUrl;

      if (apiUrl.startsWith('http')) {
        fullUrl = apiUrl;
      } else if (apiUrl.startsWith('/pbxcore/')) {
        var baseUrl = window.location.origin;
        fullUrl = "".concat(baseUrl).concat(apiUrl);
      } else {
        fullUrl = "".concat(globalRootUrl).concat(apiUrl.replace(/^\//, ''));
      } // Prepare headers with Bearer token


      var headers = {
        'X-Requested-With': 'XMLHttpRequest'
      };

      if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
        headers['Authorization'] = "Bearer ".concat(TokenManager.accessToken);
      } // Fetch audio file with authentication


      fetch(fullUrl, {
        headers: headers
      }).then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP ".concat(response.status, ": ").concat(response.statusText));
        } // Extract duration from header if available


        var durationSeconds = response.headers.get('X-Audio-Duration');

        if (durationSeconds) {
          // Display duration immediately (before file loads)
          var duration = parseFloat(durationSeconds);

          if (duration > 0) {
            var date = new Date(duration * 1000);
            var formatted = date.toISOString().substr(14, 5);

            _this3.$spanDuration.text("00:00/".concat(formatted));
          }
        }

        return response.blob();
      }).then(function (blob) {
        // Create blob URL from response
        var blobUrl = URL.createObjectURL(blob); // Revoke previous blob URL if exists

        if (_this3.html5Audio.src && _this3.html5Audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(_this3.html5Audio.src);
        } // Set blob URL directly to audio element (not source)


        _this3.html5Audio.src = blobUrl;

        _this3.html5Audio.load(); // Show player and auto-play after loading


        _this3.$playerSegment.show();

        _this3.html5Audio.oncanplaythrough = function () {
          _this3.html5Audio.play();

          _this3.$pButton.find('i').removeClass('play').addClass('pause');

          _this3.html5Audio.oncanplaythrough = null;
        };
      })["catch"](function (error) {
        console.error('Failed to load audio file:', error);
        UserMessage.showMultiString(error.message, globalTranslate.sf_AudioFileLoadError);
      });
    }
    /**
     * Downloads the audio file with authentication
     * @param {string} apiUrl - The API URL for the file
     */

  }, {
    key: "downloadFile",
    value: function downloadFile(apiUrl) {
      // Build full URL with download flag
      var downloadUrl;

      if (apiUrl.includes('?')) {
        downloadUrl = "".concat(apiUrl, "&download=1");
      } else {
        downloadUrl = "".concat(apiUrl, "?download=1");
      } // Build full URL


      var fullUrl;

      if (downloadUrl.startsWith('http')) {
        fullUrl = downloadUrl;
      } else if (downloadUrl.startsWith('/pbxcore/')) {
        var baseUrl = window.location.origin;
        fullUrl = "".concat(baseUrl).concat(downloadUrl);
      } else {
        fullUrl = "".concat(globalRootUrl).concat(downloadUrl.replace(/^\//, ''));
      } // Prepare headers with Bearer token


      var headers = {
        'X-Requested-With': 'XMLHttpRequest'
      };

      if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
        headers['Authorization'] = "Bearer ".concat(TokenManager.accessToken);
      } // Fetch and download


      fetch(fullUrl, {
        headers: headers
      }).then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP ".concat(response.status, ": ").concat(response.statusText));
        } // Get filename from Content-Disposition header or URL


        var disposition = response.headers.get('Content-Disposition');
        var filename = 'audio.mp3';

        if (disposition && disposition.includes('filename=')) {
          var matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);

          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }

        return response.blob().then(function (blob) {
          return {
            blob: blob,
            filename: filename
          };
        });
      }).then(function (_ref) {
        var blob = _ref.blob,
            filename = _ref.filename;
        // Create download link
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })["catch"](function (error) {
        console.error('Failed to download file:', error);
        UserMessage.showMultiString(error.message, globalTranslate.sf_AudioFileDownloadError);
      });
    }
  }]);

  return ModifySoundPlayer;
}(); // Global variable to hold the player instance


var sndPlayer; // When the document is ready, initialize the sound player

$(document).ready(function () {
  sndPlayer = new ModifySoundPlayer();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LXBsYXllci5qcyJdLCJuYW1lcyI6WyJNb2RpZnlTb3VuZFBsYXllciIsImlkIiwiaHRtbDVBdWRpbyIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCIkcEJ1dHRvbiIsIiQiLCJmaW5kIiwiJGRCdXR0b24iLCIkc2xpZGVyIiwiJHNwYW5EdXJhdGlvbiIsIiRwbGF5ZXJTZWdtZW50IiwiY3VycmVudEZpbGVVcmwiLCJpbml0aWFsaXplIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJwbGF5IiwiZG93bmxvYWRGaWxlIiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImJpbmQiLCJjYlRpbWVVcGRhdGUiLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwic3BhbkR1cmF0aW9uIiwibmV3U291cmNlIiwicGF1c2UiLCJzZXRBdHRyaWJ1dGUiLCJzaG93IiwiaW5jbHVkZXMiLCJsb2FkTWV0YWRhdGEiLCJzcmMiLCJsb2FkIiwic291cmNlU3JjIiwiZ2V0QXR0cmlidXRlIiwiZnVsbFVybCIsInN0YXJ0c1dpdGgiLCJiYXNlVXJsIiwid2luZG93IiwibG9jYXRpb24iLCJvcmlnaW4iLCJnbG9iYWxSb290VXJsIiwicmVwbGFjZSIsImhlYWRlcnMiLCJUb2tlbk1hbmFnZXIiLCJhY2Nlc3NUb2tlbiIsImZldGNoIiwibWV0aG9kIiwidGhlbiIsInJlc3BvbnNlIiwib2siLCJkdXJhdGlvblNlY29uZHMiLCJnZXQiLCJkdXJhdGlvbiIsInBhcnNlRmxvYXQiLCJkYXRlIiwiRGF0ZSIsImZvcm1hdHRlZCIsInRvSVNPU3RyaW5nIiwic3Vic3RyIiwidGV4dCIsIk51bWJlciIsImlzRmluaXRlIiwiY3VycmVudFRpbWUiLCJuZXdWYWwiLCJtZXRhIiwidHJpZ2dlcmVkQnlVc2VyIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsInBlcmNlbnQiLCJyYW5nZVBvc2l0aW9uIiwiTWF0aCIsInJvdW5kIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInBhdXNlZCIsImxvYWRBdXRoZW50aWNhdGVkU291cmNlIiwiYXBpVXJsIiwiRXJyb3IiLCJzdGF0dXMiLCJzdGF0dXNUZXh0IiwiYmxvYiIsImJsb2JVcmwiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJyZXZva2VPYmplY3RVUkwiLCJvbmNhbnBsYXl0aHJvdWdoIiwiZXJyb3IiLCJjb25zb2xlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlIiwiZ2xvYmFsVHJhbnNsYXRlIiwic2ZfQXVkaW9GaWxlTG9hZEVycm9yIiwiZG93bmxvYWRVcmwiLCJkaXNwb3NpdGlvbiIsImZpbGVuYW1lIiwibWF0Y2hlcyIsImV4ZWMiLCJ1cmwiLCJhIiwiY3JlYXRlRWxlbWVudCIsInN0eWxlIiwiZGlzcGxheSIsImhyZWYiLCJkb3dubG9hZCIsImJvZHkiLCJhcHBlbmRDaGlsZCIsImNsaWNrIiwicmVtb3ZlQ2hpbGQiLCJzZl9BdWRpb0ZpbGVEb3dubG9hZEVycm9yIiwic25kUGxheWVyIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsaUI7QUFDRjtBQUNKO0FBQ0E7QUFDSSwrQkFBYztBQUFBOztBQUNWLFNBQUtDLEVBQUwsR0FBVSx1QkFBVjtBQUNBLFNBQUtDLFVBQUwsR0FBa0JDLFFBQVEsQ0FBQ0MsY0FBVCxDQUF3QixjQUF4QixDQUFsQjtBQUNBLFNBQUtDLFFBQUwsR0FBZ0JDLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCQyxJQUEzQixDQUFnQyxvQkFBaEMsQ0FBaEI7QUFDQSxTQUFLQyxRQUFMLEdBQWdCRixD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biAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBzb3VuZCBwbGF5ZXIgb24gbW9kaWZ5IHBhZ2UuXG4gKiBVc2VzIHRoZSBzYW1lIHN0cnVjdHVyZSBhcyBJbmRleFNvdW5kUGxheWVyIGZvciBjb25zaXN0ZW5jeS5cbiAqXG4gKiBAY2xhc3MgTW9kaWZ5U291bmRQbGF5ZXJcbiAqL1xuY2xhc3MgTW9kaWZ5U291bmRQbGF5ZXIge1xuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBuZXcgTW9kaWZ5U291bmRQbGF5ZXIgb2JqZWN0LlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmlkID0gJ3NvdW5kLWZpbGUtcGxheWVyLXJvdyc7XG4gICAgICAgIHRoaXMuaHRtbDVBdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhdWRpby1wbGF5ZXInKTtcbiAgICAgICAgdGhpcy4kcEJ1dHRvbiA9ICQoJyNhdWRpby1wbGF5ZXItc2VnbWVudCcpLmZpbmQoJ2J1dHRvbi5wbGF5LWJ1dHRvbicpO1xuICAgICAgICB0aGlzLiRkQnV0dG9uID0gJCgnI2F1ZGlvLXBsYXllci1zZWdtZW50JykuZmluZCgnYnV0dG9uLmRvd25sb2FkLWJ1dHRvbicpO1xuICAgICAgICB0aGlzLiRzbGlkZXIgPSAkKCcjYXVkaW8tcGxheWVyLXNlZ21lbnQnKS5maW5kKCdkaXYuY2RyLXBsYXllcicpO1xuICAgICAgICB0aGlzLiRzcGFuRHVyYXRpb24gPSAkKCcjYXVkaW8tcGxheWVyLXNlZ21lbnQnKS5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpO1xuICAgICAgICB0aGlzLiRwbGF5ZXJTZWdtZW50ID0gJCgnI2F1ZGlvLXBsYXllci1zZWdtZW50Jyk7XG4gICAgICAgIHRoaXMuY3VycmVudEZpbGVVcmwgPSAnJztcblxuICAgICAgICB0aGlzLmluaXRpYWxpemUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgc291bmQgcGxheWVyIHdpdGggc2xpZGVyIGZ1bmN0aW9uYWxpdHkuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gUGxheSBidXR0b24gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy4kcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERvd25sb2FkIGJ1dHRvbiBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLiRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50RmlsZVVybCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZG93bmxvYWRGaWxlKHRoaXMuY3VycmVudEZpbGVVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBMb2FkZWQgbWV0YWRhdGEgZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYk9uTWV0YWRhdGFMb2FkZWQuYmluZCh0aGlzKSwgZmFsc2UpO1xuXG4gICAgICAgIC8vIFRpbWV1cGRhdGUgZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZS5iaW5kKHRoaXMpLCBmYWxzZSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSByYW5nZSBzbGlkZXJcbiAgICAgICAgdGhpcy4kc2xpZGVyLnJhbmdlKHtcbiAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgIG1heDogMTAwLFxuICAgICAgICAgICAgc3RhcnQ6IDAsXG4gICAgICAgICAgICBvbkNoYW5nZTogdGhpcy5jYk9uU2xpZGVyQ2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgICAgICBodG1sNUF1ZGlvOiB0aGlzLmh0bWw1QXVkaW8sXG4gICAgICAgICAgICBjYlRpbWVVcGRhdGU6IHRoaXMuY2JUaW1lVXBkYXRlLmJpbmQodGhpcyksXG4gICAgICAgICAgICBzcGFuRHVyYXRpb246IHRoaXMuJHNwYW5EdXJhdGlvbixcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgYXVkaW8gc291cmNlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdTb3VyY2UgLSBUaGUgbmV3IHNvdXJjZSBmb3IgdGhlIGF1ZGlvLlxuICAgICAqL1xuICAgIFVwZGF0ZVNvdXJjZShuZXdTb3VyY2UpIHtcbiAgICAgICAgLy8gUGF1c2UgY3VycmVudCBwbGF5YmFja1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcblxuICAgICAgICAvLyBTdG9yZSB0aGUgVVJMIGZvciBkb3dubG9hZGluZ1xuICAgICAgICB0aGlzLmN1cnJlbnRGaWxlVXJsID0gbmV3U291cmNlO1xuXG4gICAgICAgIC8vIFNldCBkYXRhLXNyYyBhdHRyaWJ1dGUgZm9yIGxhdGVyIGxvYWRpbmdcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnNldEF0dHJpYnV0ZSgnZGF0YS1zcmMnLCBuZXdTb3VyY2UpO1xuXG4gICAgICAgIC8vIFNob3cgdGhlIHBsYXllciBzZWdtZW50XG4gICAgICAgIHRoaXMuJHBsYXllclNlZ21lbnQuc2hvdygpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgYW4gQVBJIGVuZHBvaW50IG9yIGJsb2IgVVJMXG4gICAgICAgIGlmIChuZXdTb3VyY2UuaW5jbHVkZXMoJy9wYnhjb3JlL2FwaS8nKSkge1xuICAgICAgICAgICAgLy8gTG9hZCBtZXRhZGF0YSB2aWEgSEVBRCByZXF1ZXN0IGZvciBBUEkgZW5kcG9pbnRzXG4gICAgICAgICAgICB0aGlzLmxvYWRNZXRhZGF0YSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIGJsb2IgVVJMcyAocmVjb3JkZWQgYXVkaW8pLCBsb2FkIGRpcmVjdGx5XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uc3JjID0gbmV3U291cmNlO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmxvYWQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgbWV0YWRhdGEgKGR1cmF0aW9uKSB3aXRob3V0IGxvYWRpbmcgdGhlIGZ1bGwgYXVkaW8gZmlsZS5cbiAgICAgKiBNYWtlcyBhIEhFQUQgcmVxdWVzdCB0byBnZXQgWC1BdWRpby1EdXJhdGlvbiBoZWFkZXIuXG4gICAgICovXG4gICAgbG9hZE1ldGFkYXRhKCkge1xuICAgICAgICBjb25zdCBzb3VyY2VTcmMgPSB0aGlzLmh0bWw1QXVkaW8uZ2V0QXR0cmlidXRlKCdkYXRhLXNyYycpO1xuICAgICAgICBpZiAoIXNvdXJjZVNyYyB8fCAhc291cmNlU3JjLmluY2x1ZGVzKCcvcGJ4Y29yZS9hcGkvJykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIGZ1bGwgVVJMXG4gICAgICAgIGxldCBmdWxsVXJsO1xuICAgICAgICBpZiAoc291cmNlU3JjLnN0YXJ0c1dpdGgoJ2h0dHAnKSkge1xuICAgICAgICAgICAgZnVsbFVybCA9IHNvdXJjZVNyYztcbiAgICAgICAgfSBlbHNlIGlmIChzb3VyY2VTcmMuc3RhcnRzV2l0aCgnL3BieGNvcmUvJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VVcmwgPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgICAgICAgICAgZnVsbFVybCA9IGAke2Jhc2VVcmx9JHtzb3VyY2VTcmN9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZ1bGxVcmwgPSBgJHtnbG9iYWxSb290VXJsfSR7c291cmNlU3JjLnJlcGxhY2UoL15cXC8vLCAnJyl9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXBhcmUgaGVhZGVycyB3aXRoIEJlYXJlciB0b2tlblxuICAgICAgICBjb25zdCBoZWFkZXJzID0ge1xuICAgICAgICAgICAgJ1gtUmVxdWVzdGVkLVdpdGgnOiAnWE1MSHR0cFJlcXVlc3QnXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWFrZSBIRUFEIHJlcXVlc3QgdG8gZ2V0IG9ubHkgaGVhZGVycyAobm8gYm9keSBkb3dubG9hZClcbiAgICAgICAgZmV0Y2goZnVsbFVybCwge1xuICAgICAgICAgICAgbWV0aG9kOiAnSEVBRCcsXG4gICAgICAgICAgICBoZWFkZXJzXG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgZHVyYXRpb24gZnJvbSBoZWFkZXJcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uU2Vjb25kcyA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdYLUF1ZGlvLUR1cmF0aW9uJyk7XG4gICAgICAgICAgICBpZiAoZHVyYXRpb25TZWNvbmRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBwYXJzZUZsb2F0KGR1cmF0aW9uU2Vjb25kcyk7XG4gICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoZHVyYXRpb24gKiAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi50ZXh0KGAwMDowMC8ke2Zvcm1hdHRlZH1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBTaWxlbnRseSBmYWlsIC0gbWV0YWRhdGEgaXMgbm90IGNyaXRpY2FsXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciBtZXRhZGF0YSBsb2FkZWQgZXZlbnQuXG4gICAgICovXG4gICAgY2JPbk1ldGFkYXRhTG9hZGVkKCkge1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gbmV3IERhdGUodGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lICogMTAwMCkudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBuZXcgRGF0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24gKiAxMDAwKS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICB0aGlzLiRzcGFuRHVyYXRpb24udGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciB0aGUgc2xpZGVyIGNoYW5nZSBldmVudC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbmV3VmFsIC0gVGhlIG5ldyB2YWx1ZSBvZiB0aGUgc2xpZGVyLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBtZXRhIC0gQWRkaXRpb25hbCBtZXRhZGF0YSBmb3IgdGhlIHNsaWRlci5cbiAgICAgKi9cbiAgICBjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuICAgICAgICBpZiAobWV0YS50cmlnZ2VyZWRCeVVzZXIgJiYgTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUuYmluZCh0aGlzKSwgZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID0gKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLmJpbmQodGhpcyksIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gbmV3IERhdGUodGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lICogMTAwMCkudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBuZXcgRGF0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24gKiAxMDAwKS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICB0aGlzLiRzcGFuRHVyYXRpb24udGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciB0aGUgdGltZXVwZGF0ZSBldmVudC5cbiAgICAgKiBTeW5jaHJvbml6ZXMgcGxheWhlYWQgcG9zaXRpb24gd2l0aCBjdXJyZW50IHBvaW50IGluIGF1ZGlvXG4gICAgICovXG4gICAgY2JUaW1lVXBkYXRlKCkge1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSB0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgLyB0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb247XG4gICAgICAgICAgICBjb25zdCByYW5nZVBvc2l0aW9uID0gTWF0aC5yb3VuZChwZXJjZW50ICogMTAwKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHNsaWRlciBwb3NpdGlvblxuICAgICAgICAgICAgdGhpcy4kc2xpZGVyLnJhbmdlKCdzZXQgdmFsdWUnLCByYW5nZVBvc2l0aW9uKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRpbWUgZGlzcGxheVxuICAgICAgICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBuZXcgRGF0ZSh0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgKiAxMDAwKS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IG5ldyBEYXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIDEwMDApLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuXG4gICAgICAgICAgICAvLyBSZXNldCBwbGF5IGJ1dHRvbiB3aGVuIGZpbmlzaGVkXG4gICAgICAgICAgICBpZiAocmFuZ2VQb3NpdGlvbiA9PT0gMTAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBsYXlzIG9yIHBhdXNlcyB0aGUgYXVkaW8gYmFzZWQgb24gaXRzIGN1cnJlbnQgc3RhdGUuXG4gICAgICovXG4gICAgcGxheSgpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgYXVkaW8gYWxyZWFkeSBoYXMgYSBibG9iIHNvdXJjZSBsb2FkZWRcbiAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5zcmMgJiYgdGhpcy5odG1sNUF1ZGlvLnNyYy5zdGFydHNXaXRoKCdibG9iOicpKSB7XG4gICAgICAgICAgICAvLyBCbG9iIGFscmVhZHkgbG9hZGVkLCBqdXN0IHRvZ2dsZSBwbGF5L3BhdXNlXG4gICAgICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnBhdXNlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG4gICAgICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5lZWQgdG8gbG9hZCBzb3VyY2UgZmlyc3RcbiAgICAgICAgbGV0IHNvdXJjZVNyYyA9IHRoaXMuaHRtbDVBdWRpby5nZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJykgfHwgJyc7XG5cbiAgICAgICAgLy8gSWYgc291cmNlIGlzIGFuIEFQSSBlbmRwb2ludCwgbG9hZCB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIGlmIChzb3VyY2VTcmMgJiYgc291cmNlU3JjLmluY2x1ZGVzKCcvcGJ4Y29yZS9hcGkvJykpIHtcbiAgICAgICAgICAgIHRoaXMubG9hZEF1dGhlbnRpY2F0ZWRTb3VyY2Uoc291cmNlU3JjKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrIGZvciBub24tQVBJIHNvdXJjZXNcbiAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQgJiYgdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wYXVzZSgpO1xuICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWRzIGF1ZGlvIGZyb20gYXV0aGVudGljYXRlZCBBUEkgZW5kcG9pbnQgdXNpbmcgZmV0Y2ggKyBCZWFyZXIgdG9rZW5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYXBpVXJsIC0gVGhlIEFQSSBVUkwgcmVxdWlyaW5nIGF1dGhlbnRpY2F0aW9uXG4gICAgICovXG4gICAgbG9hZEF1dGhlbnRpY2F0ZWRTb3VyY2UoYXBpVXJsKSB7XG4gICAgICAgIC8vIEJ1aWxkIGZ1bGwgVVJMXG4gICAgICAgIGxldCBmdWxsVXJsO1xuICAgICAgICBpZiAoYXBpVXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKSkge1xuICAgICAgICAgICAgZnVsbFVybCA9IGFwaVVybDtcbiAgICAgICAgfSBlbHNlIGlmIChhcGlVcmwuc3RhcnRzV2l0aCgnL3BieGNvcmUvJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VVcmwgPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgICAgICAgICAgZnVsbFVybCA9IGAke2Jhc2VVcmx9JHthcGlVcmx9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZ1bGxVcmwgPSBgJHtnbG9iYWxSb290VXJsfSR7YXBpVXJsLnJlcGxhY2UoL15cXC8vLCAnJyl9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXBhcmUgaGVhZGVycyB3aXRoIEJlYXJlciB0b2tlblxuICAgICAgICBjb25zdCBoZWFkZXJzID0ge1xuICAgICAgICAgICAgJ1gtUmVxdWVzdGVkLVdpdGgnOiAnWE1MSHR0cFJlcXVlc3QnXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmV0Y2ggYXVkaW8gZmlsZSB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIGZldGNoKGZ1bGxVcmwsIHsgaGVhZGVycyB9KVxuICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfTogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgZHVyYXRpb24gZnJvbSBoZWFkZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb25TZWNvbmRzID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ1gtQXVkaW8tRHVyYXRpb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb25TZWNvbmRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERpc3BsYXkgZHVyYXRpb24gaW1tZWRpYXRlbHkgKGJlZm9yZSBmaWxlIGxvYWRzKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHBhcnNlRmxvYXQoZHVyYXRpb25TZWNvbmRzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGR1cmF0aW9uICogMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWQgPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi50ZXh0KGAwMDowMC8ke2Zvcm1hdHRlZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5ibG9iKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oYmxvYiA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGJsb2IgVVJMIGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBjb25zdCBibG9iVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblxuICAgICAgICAgICAgICAgIC8vIFJldm9rZSBwcmV2aW91cyBibG9iIFVSTCBpZiBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnNyYyAmJiB0aGlzLmh0bWw1QXVkaW8uc3JjLnN0YXJ0c1dpdGgoJ2Jsb2I6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLmh0bWw1QXVkaW8uc3JjKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgYmxvYiBVUkwgZGlyZWN0bHkgdG8gYXVkaW8gZWxlbWVudCAobm90IHNvdXJjZSlcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uc3JjID0gYmxvYlVybDtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ubG9hZCgpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBwbGF5ZXIgYW5kIGF1dG8tcGxheSBhZnRlciBsb2FkaW5nXG4gICAgICAgICAgICAgICAgdGhpcy4kcGxheWVyU2VnbWVudC5zaG93KCk7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLm9uY2FucGxheXRocm91Z2ggPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBCdXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5vbmNhbnBsYXl0aHJvdWdoID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxvYWQgYXVkaW8gZmlsZTonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yLm1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZS5zZl9BdWRpb0ZpbGVMb2FkRXJyb3IpO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRG93bmxvYWRzIHRoZSBhdWRpbyBmaWxlIHdpdGggYXV0aGVudGljYXRpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYXBpVXJsIC0gVGhlIEFQSSBVUkwgZm9yIHRoZSBmaWxlXG4gICAgICovXG4gICAgZG93bmxvYWRGaWxlKGFwaVVybCkge1xuICAgICAgICAvLyBCdWlsZCBmdWxsIFVSTCB3aXRoIGRvd25sb2FkIGZsYWdcbiAgICAgICAgbGV0IGRvd25sb2FkVXJsO1xuICAgICAgICBpZiAoYXBpVXJsLmluY2x1ZGVzKCc/JykpIHtcbiAgICAgICAgICAgIGRvd25sb2FkVXJsID0gYCR7YXBpVXJsfSZkb3dubG9hZD0xYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRvd25sb2FkVXJsID0gYCR7YXBpVXJsfT9kb3dubG9hZD0xYDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIGZ1bGwgVVJMXG4gICAgICAgIGxldCBmdWxsVXJsO1xuICAgICAgICBpZiAoZG93bmxvYWRVcmwuc3RhcnRzV2l0aCgnaHR0cCcpKSB7XG4gICAgICAgICAgICBmdWxsVXJsID0gZG93bmxvYWRVcmw7XG4gICAgICAgIH0gZWxzZSBpZiAoZG93bmxvYWRVcmwuc3RhcnRzV2l0aCgnL3BieGNvcmUvJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VVcmwgPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgICAgICAgICAgZnVsbFVybCA9IGAke2Jhc2VVcmx9JHtkb3dubG9hZFVybH1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnVsbFVybCA9IGAke2dsb2JhbFJvb3RVcmx9JHtkb3dubG9hZFVybC5yZXBsYWNlKC9eXFwvLywgJycpfWA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmVwYXJlIGhlYWRlcnMgd2l0aCBCZWFyZXIgdG9rZW5cbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIGFuZCBkb3dubG9hZFxuICAgICAgICBmZXRjaChmdWxsVXJsLCB7IGhlYWRlcnMgfSlcbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c306ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBHZXQgZmlsZW5hbWUgZnJvbSBDb250ZW50LURpc3Bvc2l0aW9uIGhlYWRlciBvciBVUkxcbiAgICAgICAgICAgICAgICBjb25zdCBkaXNwb3NpdGlvbiA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdDb250ZW50LURpc3Bvc2l0aW9uJyk7XG4gICAgICAgICAgICAgICAgbGV0IGZpbGVuYW1lID0gJ2F1ZGlvLm1wMyc7XG4gICAgICAgICAgICAgICAgaWYgKGRpc3Bvc2l0aW9uICYmIGRpc3Bvc2l0aW9uLmluY2x1ZGVzKCdmaWxlbmFtZT0nKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRjaGVzID0gL2ZpbGVuYW1lW147PVxcbl0qPSgoWydcIl0pLio/XFwyfFteO1xcbl0qKS8uZXhlYyhkaXNwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXRjaGVzICE9IG51bGwgJiYgbWF0Y2hlc1sxXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWUgPSBtYXRjaGVzWzFdLnJlcGxhY2UoL1snXCJdL2csICcnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5ibG9iKCkudGhlbihibG9iID0+ICh7IGJsb2IsIGZpbGVuYW1lIH0pKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbigoeyBibG9iLCBmaWxlbmFtZSB9KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGRvd25sb2FkIGxpbmtcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgICAgICAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICAgICAgICAgIGEuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgICAgICBhLmhyZWYgPSB1cmw7XG4gICAgICAgICAgICAgICAgYS5kb3dubG9hZCA9IGZpbGVuYW1lO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7XG4gICAgICAgICAgICAgICAgYS5jbGljaygpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5VUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChhKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBkb3dubG9hZCBmaWxlOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3IubWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLnNmX0F1ZGlvRmlsZURvd25sb2FkRXJyb3IpO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxufVxuXG4vLyBHbG9iYWwgdmFyaWFibGUgdG8gaG9sZCB0aGUgcGxheWVyIGluc3RhbmNlXG5sZXQgc25kUGxheWVyO1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc291bmQgcGxheWVyXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgc25kUGxheWVyID0gbmV3IE1vZGlmeVNvdW5kUGxheWVyKCk7XG59KTtcbiJdfQ==