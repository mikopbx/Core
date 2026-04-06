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
        _this.downloadFile(downloadUrl);
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

    $row.addClass('initialized'); // Load metadata on initialization to show duration

    this.loadMetadata();
  }
  /**
   * Load metadata (duration) without loading the full audio file.
   * Makes a HEAD request to get X-Audio-Duration header.
   */


  _createClass(IndexSoundPlayer, [{
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
     * Download file with authentication
     *
     * @param {string} downloadUrl - Download URL (may require Bearer token)
     */

  }, {
    key: "downloadFile",
    value: function downloadFile(downloadUrl) {
      // Check if it's an API URL that requires authentication
      if (downloadUrl.includes('/pbxcore/api/')) {
        // Build full URL
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
        } // Fetch file with authentication


        fetch(fullUrl, {
          headers: headers
        }).then(function (response) {
          if (!response.ok) {
            throw new Error("HTTP ".concat(response.status, ": ").concat(response.statusText));
          }

          return response.blob();
        }).then(function (blob) {
          // Extract filename from URL or use default
          var urlParams = new URLSearchParams(downloadUrl.split('?')[1]);
          var filename = urlParams.get('filename') || 'audio.mp3'; // Create download link

          var blobUrl = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a); // Clean up blob URL

          setTimeout(function () {
            return URL.revokeObjectURL(blobUrl);
          }, 100);
        })["catch"](function (error) {
          UserMessage.showMultiString(error.message, globalTranslate.sf_DownloadError);
        });
      } else {
        // Legacy direct file URL (no auth needed)
        window.location = downloadUrl;
      }
    }
    /**
     * Load audio from authenticated API endpoint
     *
     * @param {string} apiUrl - API URL requiring Bearer token
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
        // API path - use base URL without admin-cabinet path
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

        _this3.html5Audio.load(); // Auto-play after loading


        _this3.html5Audio.oncanplaythrough = function () {
          _this3.html5Audio.play();

          _this3.$pButton.find('i').removeClass('play').addClass('pause');

          _this3.html5Audio.oncanplaythrough = null;
        };
      })["catch"](function (error) {
        UserMessage.showMultiString(error.message, globalTranslate.sf_AudioFileLoadError);
      });
    }
  }]);

  return IndexSoundPlayer;
}();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LXBsYXllci5qcyJdLCJuYW1lcyI6WyJJbmRleFNvdW5kUGxheWVyIiwiaWQiLCJodG1sNUF1ZGlvIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIiRyb3ciLCIkIiwiaGFzQ2xhc3MiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicGxheSIsImRvd25sb2FkVXJsIiwiYXR0ciIsImRvd25sb2FkRmlsZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwic3BhbkR1cmF0aW9uIiwiYWRkQ2xhc3MiLCJsb2FkTWV0YWRhdGEiLCJzb3VyY2VTcmMiLCJnZXRBdHRyaWJ1dGUiLCJpbmNsdWRlcyIsImZ1bGxVcmwiLCJzdGFydHNXaXRoIiwiYmFzZVVybCIsIndpbmRvdyIsImxvY2F0aW9uIiwib3JpZ2luIiwiZ2xvYmFsUm9vdFVybCIsInJlcGxhY2UiLCJoZWFkZXJzIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJmZXRjaCIsIm1ldGhvZCIsInRoZW4iLCJyZXNwb25zZSIsIm9rIiwiZHVyYXRpb25TZWNvbmRzIiwiZ2V0IiwiZHVyYXRpb24iLCJwYXJzZUZsb2F0IiwiZGF0ZSIsIkRhdGUiLCJmb3JtYXR0ZWQiLCJ0b0lTT1N0cmluZyIsInN1YnN0ciIsInRleHQiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsImNsb3Nlc3QiLCJzZXRTZWNvbmRzIiwiY3VycmVudFRpbWUiLCJuZXdWYWwiLCJtZXRhIiwidHJpZ2dlcmVkQnlVc2VyIiwicGVyY2VudCIsInJhbmdlUG9zaXRpb24iLCJNYXRoIiwicm91bmQiLCJyZW1vdmVDbGFzcyIsInNyYyIsInBhdXNlZCIsInBhdXNlIiwibG9hZEF1dGhlbnRpY2F0ZWRTb3VyY2UiLCJFcnJvciIsInN0YXR1cyIsInN0YXR1c1RleHQiLCJibG9iIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwic3BsaXQiLCJmaWxlbmFtZSIsImJsb2JVcmwiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJhIiwiY3JlYXRlRWxlbWVudCIsImhyZWYiLCJkb3dubG9hZCIsImJvZHkiLCJhcHBlbmRDaGlsZCIsImNsaWNrIiwicmVtb3ZlQ2hpbGQiLCJzZXRUaW1lb3V0IiwicmV2b2tlT2JqZWN0VVJMIiwiZXJyb3IiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2UiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZl9Eb3dubG9hZEVycm9yIiwiYXBpVXJsIiwibG9hZCIsIm9uY2FucGxheXRocm91Z2giLCJzZl9BdWRpb0ZpbGVMb2FkRXJyb3IiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLGdCO0FBRUY7QUFDSjtBQUNBO0FBQ0E7QUFDSSw0QkFBWUMsRUFBWixFQUFnQjtBQUFBOztBQUFBOztBQUNaLFNBQUtBLEVBQUwsR0FBVUEsRUFBVjtBQUNBLFNBQUtDLFVBQUwsR0FBa0JDLFFBQVEsQ0FBQ0MsY0FBVCx3QkFBd0NILEVBQXhDLEVBQWxCO0FBQ0EsUUFBTUksSUFBSSxHQUFHQyxDQUFDLFlBQUtMLEVBQUwsRUFBZDs7QUFDQSxRQUFJSSxJQUFJLENBQUNFLFFBQUwsQ0FBYyxhQUFkLENBQUosRUFBa0M7QUFDOUI7QUFDQTtBQUNIOztBQUNELFNBQUtDLFFBQUwsR0FBZ0JILElBQUksQ0FBQ0ksSUFBTCxDQUFVLG9C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Q0FTVjs7O0FBQ0EsUUFBQSxNQUFJLENBQUMxRSxVQUFMLENBQWdCMEUsR0FBaEIsR0FBc0JZLE9BQXRCOztBQUNBLFFBQUEsTUFBSSxDQUFDdEYsVUFBTCxDQUFnQjBHLElBQWhCLEdBWFUsQ0FhVjs7O0FBQ0EsUUFBQSxNQUFJLENBQUMxRyxVQUFMLENBQWdCMkcsZ0JBQWhCLEdBQW1DLFlBQU07QUFDckMsVUFBQSxNQUFJLENBQUMzRyxVQUFMLENBQWdCa0IsSUFBaEI7O0FBQ0EsVUFBQSxNQUFJLENBQUNaLFFBQUwsQ0FBY0MsSUFBZCxDQUFtQixHQUFuQixFQUF3QmtFLFdBQXhCLENBQW9DLE1BQXBDLEVBQTRDM0MsUUFBNUMsQ0FBcUQsT0FBckQ7O0FBQ0EsVUFBQSxNQUFJLENBQUM5QixVQUFMLENBQWdCMkcsZ0JBQWhCLEdBQW1DLElBQW5DO0FBQ0gsU0FKRDtBQUtILE9BdkNMLFdBd0NXLFVBQUFSLEtBQUssRUFBSTtBQUNaQyxRQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJGLEtBQUssQ0FBQ0csT0FBbEMsRUFBMkNDLGVBQWUsQ0FBQ0sscUJBQTNEO0FBQ0gsT0ExQ0w7QUEyQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gaW5kZXggc291bmQgcGxheWVyLlxuICpcbiAqIEBjbGFzcyBJbmRleFNvdW5kUGxheWVyXG4gKi9cbmNsYXNzIEluZGV4U291bmRQbGF5ZXIge1xuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBJbmRleFNvdW5kUGxheWVyIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBUaGUgSUQgb2YgdGhlIGF1ZGlvIHBsYXllciBlbGVtZW50LlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGlkKSB7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGF1ZGlvLXBsYXllci0ke2lkfWApO1xuICAgICAgICBjb25zdCAkcm93ID0gJChgIyR7aWR9YCk7XG4gICAgICAgIGlmICgkcm93Lmhhc0NsYXNzKCdpbml0aWFsaXplZCcpKSB7XG4gICAgICAgICAgICAvLyBQcmV2ZW50IGRvdWJsZSBwcm9jZXNzaW5nXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kcEJ1dHRvbiA9ICRyb3cuZmluZCgnYnV0dG9uLnBsYXktYnV0dG9uJyk7IC8vIHBsYXkgYnV0dG9uXG4gICAgICAgIHRoaXMuJGRCdXR0b24gPSAkcm93LmZpbmQoJ2J1dHRvbi5kb3dubG9hZC1idXR0b24nKTsgLy8gZG93bmxvYWQgYnV0dG9uXG4gICAgICAgIHRoaXMuJHNsaWRlciA9ICRyb3cuZmluZCgnZGl2LmNkci1wbGF5ZXInKTtcbiAgICAgICAgdGhpcy4kc3BhbkR1cmF0aW9uID0gJHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpO1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgICAgIHRoaXMuJHBCdXR0b24udW5iaW5kKCk7XG4gICAgICAgIHRoaXMuJGRCdXR0b24udW5iaW5kKCk7XG5cbiAgICAgICAgLy8gUGxheSBidXR0b24gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy4kcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERvd25sb2FkIGJ1dHRvbiBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLiRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCBkb3dubG9hZFVybCA9IHRoaXMuJGRCdXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKGRvd25sb2FkVXJsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kb3dubG9hZEZpbGUoZG93bmxvYWRVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBMb2FkZWQgbWV0YWRhdGEgZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYk9uTWV0YWRhdGFMb2FkZWQsIGZhbHNlKTtcblxuICAgICAgICAvLyBUaW1ldXBkYXRlIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHJhbmdlIHNsaWRlclxuICAgICAgICB0aGlzLiRzbGlkZXIucmFuZ2Uoe1xuICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgbWF4OiAxMDAsXG4gICAgICAgICAgICBzdGFydDogMCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiB0aGlzLmNiT25TbGlkZXJDaGFuZ2UsXG4gICAgICAgICAgICBodG1sNUF1ZGlvOiB0aGlzLmh0bWw1QXVkaW8sXG4gICAgICAgICAgICBjYlRpbWVVcGRhdGU6IHRoaXMuY2JUaW1lVXBkYXRlLFxuICAgICAgICAgICAgc3BhbkR1cmF0aW9uOiB0aGlzLiRzcGFuRHVyYXRpb24sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFByZXZlbnQgZG91YmxlIHByb2Nlc3NpbmdcbiAgICAgICAgJHJvdy5hZGRDbGFzcygnaW5pdGlhbGl6ZWQnKTtcblxuICAgICAgICAvLyBMb2FkIG1ldGFkYXRhIG9uIGluaXRpYWxpemF0aW9uIHRvIHNob3cgZHVyYXRpb25cbiAgICAgICAgdGhpcy5sb2FkTWV0YWRhdGEoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1ldGFkYXRhIChkdXJhdGlvbikgd2l0aG91dCBsb2FkaW5nIHRoZSBmdWxsIGF1ZGlvIGZpbGUuXG4gICAgICogTWFrZXMgYSBIRUFEIHJlcXVlc3QgdG8gZ2V0IFgtQXVkaW8tRHVyYXRpb24gaGVhZGVyLlxuICAgICAqL1xuICAgIGxvYWRNZXRhZGF0YSgpIHtcbiAgICAgICAgY29uc3Qgc291cmNlU3JjID0gdGhpcy5odG1sNUF1ZGlvLmdldEF0dHJpYnV0ZSgnZGF0YS1zcmMnKTtcbiAgICAgICAgaWYgKCFzb3VyY2VTcmMgfHwgIXNvdXJjZVNyYy5pbmNsdWRlcygnL3BieGNvcmUvYXBpLycpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBmdWxsIFVSTFxuICAgICAgICBsZXQgZnVsbFVybDtcbiAgICAgICAgaWYgKHNvdXJjZVNyYy5zdGFydHNXaXRoKCdodHRwJykpIHtcbiAgICAgICAgICAgIGZ1bGxVcmwgPSBzb3VyY2VTcmM7XG4gICAgICAgIH0gZWxzZSBpZiAoc291cmNlU3JjLnN0YXJ0c1dpdGgoJy9wYnhjb3JlLycpKSB7XG4gICAgICAgICAgICBjb25zdCBiYXNlVXJsID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcbiAgICAgICAgICAgIGZ1bGxVcmwgPSBgJHtiYXNlVXJsfSR7c291cmNlU3JjfWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmdWxsVXJsID0gYCR7Z2xvYmFsUm9vdFVybH0ke3NvdXJjZVNyYy5yZXBsYWNlKC9eXFwvLywgJycpfWA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmVwYXJlIGhlYWRlcnMgd2l0aCBCZWFyZXIgdG9rZW5cbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1ha2UgSEVBRCByZXF1ZXN0IHRvIGdldCBvbmx5IGhlYWRlcnMgKG5vIGJvZHkgZG93bmxvYWQpXG4gICAgICAgIGZldGNoKGZ1bGxVcmwsIHtcbiAgICAgICAgICAgIG1ldGhvZDogJ0hFQUQnLFxuICAgICAgICAgICAgaGVhZGVyc1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IGR1cmF0aW9uIGZyb20gaGVhZGVyXG4gICAgICAgICAgICBjb25zdCBkdXJhdGlvblNlY29uZHMgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnWC1BdWRpby1EdXJhdGlvbicpO1xuICAgICAgICAgICAgaWYgKGR1cmF0aW9uU2Vjb25kcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gcGFyc2VGbG9hdChkdXJhdGlvblNlY29uZHMpO1xuICAgICAgICAgICAgICAgIGlmIChkdXJhdGlvbiA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGR1cmF0aW9uICogMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZCA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRzcGFuRHVyYXRpb24udGV4dChgMDA6MDAvJHtmb3JtYXR0ZWR9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgLy8gU2lsZW50bHkgZmFpbCAtIG1ldGFkYXRhIGlzIG5vdCBjcml0aWNhbFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3IgbWV0YWRhdGEgbG9hZGVkIGV2ZW50LlxuICAgICAqL1xuICAgIGNiT25NZXRhZGF0YUxvYWRlZCgpIHtcbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShudWxsKTtcbiAgICAgICAgICAgIGRhdGUuc2V0U2Vjb25kcyh0aGlzLmN1cnJlbnRUaW1lKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VGltZSA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKHRoaXMuZHVyYXRpb24pOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICAkcm93LmZpbmQoJ3NwYW4uY2RyLWR1cmF0aW9uJykudGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciB0aGUgc2xpZGVyIGNoYW5nZSBldmVudC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbmV3VmFsIC0gVGhlIG5ldyB2YWx1ZSBvZiB0aGUgc2xpZGVyLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBtZXRhIC0gQWRkaXRpb25hbCBtZXRhZGF0YSBmb3IgdGhlIHNsaWRlci5cbiAgICAgKi9cbiAgICBjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuICAgICAgICBpZiAobWV0YS50cmlnZ2VyZWRCeVVzZXIgJiYgTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSA9ICh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24gKiBuZXdWYWwpIC8gMTAwO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBuZXcgRGF0ZSh0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgKiAxMDAwKS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IG5ldyBEYXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIDEwMDApLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIHRoaXMuc3BhbkR1cmF0aW9uLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgdGhlIHRpbWV1cGRhdGUgZXZlbnQuXG4gICAgICogU3luY2hyb25pemVzIHBsYXloZWFkIHBvc2l0aW9uIHdpdGggY3VycmVudCBwb2ludCBpbiBhdWRpb1xuICAgICAqL1xuICAgIGNiVGltZVVwZGF0ZSgpIHtcbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKTtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICAkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJykucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuICAgICAgICAgICAgaWYgKHJhbmdlUG9zaXRpb24gPT09IDEwMCkge1xuICAgICAgICAgICAgICAgICRyb3cuZmluZCgnYnV0dG9uLnBsYXktYnV0dG9uIGkucGF1c2UnKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGxheXMgb3IgcGF1c2VzIHRoZSBhdWRpbyBmaWxlIHdoZW4gdGhlIHBsYXkgYnV0dG9uIGlzIGNsaWNrZWQuXG4gICAgICovXG4gICAgcGxheSgpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgYXVkaW8gYWxyZWFkeSBoYXMgYSBibG9iIHNvdXJjZSBsb2FkZWRcbiAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5zcmMgJiYgdGhpcy5odG1sNUF1ZGlvLnNyYy5zdGFydHNXaXRoKCdibG9iOicpKSB7XG4gICAgICAgICAgICAvLyBCbG9iIGFscmVhZHkgbG9hZGVkLCBqdXN0IHRvZ2dsZSBwbGF5L3BhdXNlXG4gICAgICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnBhdXNlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG4gICAgICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5lZWQgdG8gbG9hZCBzb3VyY2UgZmlyc3RcbiAgICAgICAgbGV0IHNvdXJjZVNyYyA9IHRoaXMuaHRtbDVBdWRpby5nZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJykgfHwgJyc7XG5cbiAgICAgICAgLy8gSWYgc291cmNlIGlzIGFuIEFQSSBlbmRwb2ludCwgbG9hZCB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIGlmIChzb3VyY2VTcmMgJiYgc291cmNlU3JjLmluY2x1ZGVzKCcvcGJ4Y29yZS9hcGkvJykpIHtcbiAgICAgICAgICAgIHRoaXMubG9hZEF1dGhlbnRpY2F0ZWRTb3VyY2Uoc291cmNlU3JjKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrIGZvciBub24tQVBJIHNvdXJjZXNcbiAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQgJiYgdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wYXVzZSgpO1xuICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERvd25sb2FkIGZpbGUgd2l0aCBhdXRoZW50aWNhdGlvblxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRvd25sb2FkVXJsIC0gRG93bmxvYWQgVVJMIChtYXkgcmVxdWlyZSBCZWFyZXIgdG9rZW4pXG4gICAgICovXG4gICAgZG93bmxvYWRGaWxlKGRvd25sb2FkVXJsKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgYW4gQVBJIFVSTCB0aGF0IHJlcXVpcmVzIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIGlmIChkb3dubG9hZFVybC5pbmNsdWRlcygnL3BieGNvcmUvYXBpLycpKSB7XG4gICAgICAgICAgICAvLyBCdWlsZCBmdWxsIFVSTFxuICAgICAgICAgICAgbGV0IGZ1bGxVcmw7XG4gICAgICAgICAgICBpZiAoZG93bmxvYWRVcmwuc3RhcnRzV2l0aCgnaHR0cCcpKSB7XG4gICAgICAgICAgICAgICAgZnVsbFVybCA9IGRvd25sb2FkVXJsO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkb3dubG9hZFVybC5zdGFydHNXaXRoKCcvcGJ4Y29yZS8nKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VVcmwgPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgICAgICAgICAgICAgIGZ1bGxVcmwgPSBgJHtiYXNlVXJsfSR7ZG93bmxvYWRVcmx9YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZnVsbFVybCA9IGAke2dsb2JhbFJvb3RVcmx9JHtkb3dubG9hZFVybC5yZXBsYWNlKC9eXFwvLywgJycpfWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFByZXBhcmUgaGVhZGVycyB3aXRoIEJlYXJlciB0b2tlblxuICAgICAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCdcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZldGNoIGZpbGUgd2l0aCBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgZmV0Y2goZnVsbFVybCwgeyBoZWFkZXJzIH0pXG4gICAgICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9OiAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmJsb2IoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC50aGVuKGJsb2IgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IGZpbGVuYW1lIGZyb20gVVJMIG9yIHVzZSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoZG93bmxvYWRVcmwuc3BsaXQoJz8nKVsxXSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lID0gdXJsUGFyYW1zLmdldCgnZmlsZW5hbWUnKSB8fCAnYXVkaW8ubXAzJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgZG93bmxvYWQgbGlua1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBibG9iVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgICAgICAgICAgICAgYS5ocmVmID0gYmxvYlVybDtcbiAgICAgICAgICAgICAgICAgICAgYS5kb3dubG9hZCA9IGZpbGVuYW1lO1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xuICAgICAgICAgICAgICAgICAgICBhLmNsaWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoYSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYW4gdXAgYmxvYiBVUkxcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBVUkwucmV2b2tlT2JqZWN0VVJMKGJsb2JVcmwpLCAxMDApO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yLm1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZS5zZl9Eb3dubG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExlZ2FjeSBkaXJlY3QgZmlsZSBVUkwgKG5vIGF1dGggbmVlZGVkKVxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZG93bmxvYWRVcmw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGF1ZGlvIGZyb20gYXV0aGVudGljYXRlZCBBUEkgZW5kcG9pbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhcGlVcmwgLSBBUEkgVVJMIHJlcXVpcmluZyBCZWFyZXIgdG9rZW5cbiAgICAgKi9cbiAgICBsb2FkQXV0aGVudGljYXRlZFNvdXJjZShhcGlVcmwpIHtcbiAgICAgICAgLy8gQnVpbGQgZnVsbCBVUkxcbiAgICAgICAgbGV0IGZ1bGxVcmw7XG4gICAgICAgIGlmIChhcGlVcmwuc3RhcnRzV2l0aCgnaHR0cCcpKSB7XG4gICAgICAgICAgICBmdWxsVXJsID0gYXBpVXJsO1xuICAgICAgICB9IGVsc2UgaWYgKGFwaVVybC5zdGFydHNXaXRoKCcvcGJ4Y29yZS8nKSkge1xuICAgICAgICAgICAgLy8gQVBJIHBhdGggLSB1c2UgYmFzZSBVUkwgd2l0aG91dCBhZG1pbi1jYWJpbmV0IHBhdGhcbiAgICAgICAgICAgIGNvbnN0IGJhc2VVcmwgPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgICAgICAgICAgZnVsbFVybCA9IGAke2Jhc2VVcmx9JHthcGlVcmx9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZ1bGxVcmwgPSBgJHtnbG9iYWxSb290VXJsfSR7YXBpVXJsLnJlcGxhY2UoL15cXC8vLCAnJyl9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXBhcmUgaGVhZGVycyB3aXRoIEJlYXJlciB0b2tlblxuICAgICAgICBjb25zdCBoZWFkZXJzID0ge1xuICAgICAgICAgICAgJ1gtUmVxdWVzdGVkLVdpdGgnOiAnWE1MSHR0cFJlcXVlc3QnXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmV0Y2ggYXVkaW8gZmlsZSB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIGZldGNoKGZ1bGxVcmwsIHsgaGVhZGVycyB9KVxuICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfTogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgZHVyYXRpb24gZnJvbSBoZWFkZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb25TZWNvbmRzID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ1gtQXVkaW8tRHVyYXRpb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb25TZWNvbmRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERpc3BsYXkgZHVyYXRpb24gaW1tZWRpYXRlbHkgKGJlZm9yZSBmaWxlIGxvYWRzKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHBhcnNlRmxvYXQoZHVyYXRpb25TZWNvbmRzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGR1cmF0aW9uICogMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWQgPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi50ZXh0KGAwMDowMC8ke2Zvcm1hdHRlZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5ibG9iKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oYmxvYiA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGJsb2IgVVJMIGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBjb25zdCBibG9iVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblxuICAgICAgICAgICAgICAgIC8vIFJldm9rZSBwcmV2aW91cyBibG9iIFVSTCBpZiBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnNyYyAmJiB0aGlzLmh0bWw1QXVkaW8uc3JjLnN0YXJ0c1dpdGgoJ2Jsb2I6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLmh0bWw1QXVkaW8uc3JjKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgYmxvYiBVUkwgZGlyZWN0bHkgdG8gYXVkaW8gZWxlbWVudCAobm90IHNvdXJjZSlcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uc3JjID0gYmxvYlVybDtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ubG9hZCgpO1xuXG4gICAgICAgICAgICAgICAgLy8gQXV0by1wbGF5IGFmdGVyIGxvYWRpbmdcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ub25jYW5wbGF5dGhyb3VnaCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLm9uY2FucGxheXRocm91Z2ggPSBudWxsO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3IubWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLnNmX0F1ZGlvRmlsZUxvYWRFcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG59Il19