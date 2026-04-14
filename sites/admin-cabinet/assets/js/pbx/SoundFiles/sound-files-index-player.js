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
        // 410 Gone: backend tells us the audio file is missing on disk while the DB
        // record still exists. Mark the row as broken so the user gets a clear hint
        // (and disables the play button) instead of being confused by a generic 422.
        if (response.status === 410) {
          _this2.markAsMissing();

          return;
        }

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
     * Mark this player row as having a missing/broken audio file.
     * Disables the play button, shows a warning icon and a tooltip explaining what to do.
     */

  }, {
    key: "markAsMissing",
    value: function markAsMissing() {
      var $row = $("#".concat(this.id));

      if ($row.hasClass('audio-file-missing')) {
        return;
      }

      $row.addClass('audio-file-missing');
      var tooltipText = typeof globalTranslate !== 'undefined' && globalTranslate.sf_AudioFileMissingWarning ? globalTranslate.sf_AudioFileMissingWarning : 'Audio file is missing on disk, please re-upload';
      this.$pButton.prop('disabled', true).addClass('disabled').attr('title', tooltipText).find('i').removeClass('play pause').addClass('exclamation triangle');
      this.$spanDuration.text('--:--');
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
        if (response.status === 410) {
          _this3.markAsMissing();

          var friendly = typeof globalTranslate !== 'undefined' && globalTranslate.sf_AudioFileMissingWarning ? globalTranslate.sf_AudioFileMissingWarning : 'Audio file is missing on disk, please re-upload';
          throw new Error(friendly);
        }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LXBsYXllci5qcyJdLCJuYW1lcyI6WyJJbmRleFNvdW5kUGxheWVyIiwiaWQiLCJodG1sNUF1ZGlvIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIiRyb3ciLCIkIiwiaGFzQ2xhc3MiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicGxheSIsImRvd25sb2FkVXJsIiwiYXR0ciIsImRvd25sb2FkRmlsZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwic3BhbkR1cmF0aW9uIiwiYWRkQ2xhc3MiLCJsb2FkTWV0YWRhdGEiLCJzb3VyY2VTcmMiLCJnZXRBdHRyaWJ1dGUiLCJpbmNsdWRlcyIsImZ1bGxVcmwiLCJzdGFydHNXaXRoIiwiYmFzZVVybCIsIndpbmRvdyIsImxvY2F0aW9uIiwib3JpZ2luIiwiZ2xvYmFsUm9vdFVybCIsInJlcGxhY2UiLCJoZWFkZXJzIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJmZXRjaCIsIm1ldGhvZCIsInRoZW4iLCJyZXNwb25zZSIsInN0YXR1cyIsIm1hcmtBc01pc3NpbmciLCJvayIsImR1cmF0aW9uU2Vjb25kcyIsImdldCIsImR1cmF0aW9uIiwicGFyc2VGbG9hdCIsImRhdGUiLCJEYXRlIiwiZm9ybWF0dGVkIiwidG9JU09TdHJpbmciLCJzdWJzdHIiLCJ0ZXh0IiwidG9vbHRpcFRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZl9BdWRpb0ZpbGVNaXNzaW5nV2FybmluZyIsInByb3AiLCJyZW1vdmVDbGFzcyIsIk51bWJlciIsImlzRmluaXRlIiwiY2xvc2VzdCIsInNldFNlY29uZHMiLCJjdXJyZW50VGltZSIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJwZXJjZW50IiwicmFuZ2VQb3NpdGlvbiIsIk1hdGgiLCJyb3VuZCIsInNyYyIsInBhdXNlZCIsInBhdXNlIiwibG9hZEF1dGhlbnRpY2F0ZWRTb3VyY2UiLCJFcnJvciIsInN0YXR1c1RleHQiLCJibG9iIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwic3BsaXQiLCJmaWxlbmFtZSIsImJsb2JVcmwiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJhIiwiY3JlYXRlRWxlbWVudCIsImhyZWYiLCJkb3dubG9hZCIsImJvZHkiLCJhcHBlbmRDaGlsZCIsImNsaWNrIiwicmVtb3ZlQ2hpbGQiLCJzZXRUaW1lb3V0IiwicmV2b2tlT2JqZWN0VVJMIiwiZXJyb3IiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2UiLCJzZl9Eb3dubG9hZEVycm9yIiwiYXBpVXJsIiwiZnJpZW5kbHkiLCJsb2FkIiwib25jYW5wbGF5dGhyb3VnaCIsInNmX0F1ZGlvRmlsZUxvYWRFcnJvciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsZ0I7QUFFRjtBQUNKO0FBQ0E7QUFDQTtBQUNJLDRCQUFZQyxFQUFaLEVBQWdCO0FBQUE7O0FBQUE7O0FBQ1osU0FBS0EsRUFBTCxHQUFVQSxFQUFWO0FBQ0EsU0FBS0MsVUFBTCxHQUFrQkMsUUFBUSxDQUFDQyxjQUFULHdCQUF3Q0gsRUFBeEMsRUFBbEI7QUFDQSxRQUFNSSxJQUFJLEdBQUdDLENBQUMsWUFBS0wsRUFBTCxFQUFkOztBQUNBLFFBQUlJLElBQUksQ0FBQ0UsUUFBTCxDQUFjLGFB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LEdBQXBDO0FBQ0gsU0FQUyxDQVNWOzs7QUFDQSxRQUFBLE1BQUksQ0FBQ2hGLFVBQUwsQ0FBZ0JnRixHQUFoQixHQUFzQlcsT0FBdEI7O0FBQ0EsUUFBQSxNQUFJLENBQUMzRixVQUFMLENBQWdCK0csSUFBaEIsR0FYVSxDQWFWOzs7QUFDQSxRQUFBLE1BQUksQ0FBQy9HLFVBQUwsQ0FBZ0JnSCxnQkFBaEIsR0FBbUMsWUFBTTtBQUNyQyxVQUFBLE1BQUksQ0FBQ2hILFVBQUwsQ0FBZ0JrQixJQUFoQjs7QUFDQSxVQUFBLE1BQUksQ0FBQ1osUUFBTCxDQUFjQyxJQUFkLENBQW1CLEdBQW5CLEVBQXdCNEQsV0FBeEIsQ0FBb0MsTUFBcEMsRUFBNENyQyxRQUE1QyxDQUFxRCxPQUFyRDs7QUFDQSxVQUFBLE1BQUksQ0FBQzlCLFVBQUwsQ0FBZ0JnSCxnQkFBaEIsR0FBbUMsSUFBbkM7QUFDSCxTQUpEO0FBS0gsT0EvQ0wsV0FnRFcsVUFBQVIsS0FBSyxFQUFJO0FBQ1pDLFFBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QkYsS0FBSyxDQUFDRyxPQUFsQyxFQUEyQzNDLGVBQWUsQ0FBQ2lELHFCQUEzRDtBQUNILE9BbERMO0FBbURIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIGluZGV4IHNvdW5kIHBsYXllci5cbiAqXG4gKiBAY2xhc3MgSW5kZXhTb3VuZFBsYXllclxuICovXG5jbGFzcyBJbmRleFNvdW5kUGxheWVyIHtcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBuZXcgSW5kZXhTb3VuZFBsYXllciBvYmplY3QuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIElEIG9mIHRoZSBhdWRpbyBwbGF5ZXIgZWxlbWVudC5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihpZCkge1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMuaHRtbDVBdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBhdWRpby1wbGF5ZXItJHtpZH1gKTtcbiAgICAgICAgY29uc3QgJHJvdyA9ICQoYCMke2lkfWApO1xuICAgICAgICBpZiAoJHJvdy5oYXNDbGFzcygnaW5pdGlhbGl6ZWQnKSkge1xuICAgICAgICAgICAgLy8gUHJldmVudCBkb3VibGUgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJHBCdXR0b24gPSAkcm93LmZpbmQoJ2J1dHRvbi5wbGF5LWJ1dHRvbicpOyAvLyBwbGF5IGJ1dHRvblxuICAgICAgICB0aGlzLiRkQnV0dG9uID0gJHJvdy5maW5kKCdidXR0b24uZG93bmxvYWQtYnV0dG9uJyk7IC8vIGRvd25sb2FkIGJ1dHRvblxuICAgICAgICB0aGlzLiRzbGlkZXIgPSAkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJyk7XG4gICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbiA9ICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKTtcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZCwgZmFsc2UpO1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgICAgICB0aGlzLiRwQnV0dG9uLnVuYmluZCgpO1xuICAgICAgICB0aGlzLiRkQnV0dG9uLnVuYmluZCgpO1xuXG4gICAgICAgIC8vIFBsYXkgYnV0dG9uIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuJHBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMucGxheSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEb3dubG9hZCBidXR0b24gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy4kZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgZG93bmxvYWRVcmwgPSB0aGlzLiRkQnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIGlmIChkb3dubG9hZFVybCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZG93bmxvYWRGaWxlKGRvd25sb2FkVXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTG9hZGVkIG1ldGFkYXRhIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG5cbiAgICAgICAgLy8gVGltZXVwZGF0ZSBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSByYW5nZSBzbGlkZXJcbiAgICAgICAgdGhpcy4kc2xpZGVyLnJhbmdlKHtcbiAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgIG1heDogMTAwLFxuICAgICAgICAgICAgc3RhcnQ6IDAsXG4gICAgICAgICAgICBvbkNoYW5nZTogdGhpcy5jYk9uU2xpZGVyQ2hhbmdlLFxuICAgICAgICAgICAgaHRtbDVBdWRpbzogdGhpcy5odG1sNUF1ZGlvLFxuICAgICAgICAgICAgY2JUaW1lVXBkYXRlOiB0aGlzLmNiVGltZVVwZGF0ZSxcbiAgICAgICAgICAgIHNwYW5EdXJhdGlvbjogdGhpcy4kc3BhbkR1cmF0aW9uLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQcmV2ZW50IGRvdWJsZSBwcm9jZXNzaW5nXG4gICAgICAgICRyb3cuYWRkQ2xhc3MoJ2luaXRpYWxpemVkJyk7XG5cbiAgICAgICAgLy8gTG9hZCBtZXRhZGF0YSBvbiBpbml0aWFsaXphdGlvbiB0byBzaG93IGR1cmF0aW9uXG4gICAgICAgIHRoaXMubG9hZE1ldGFkYXRhKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBtZXRhZGF0YSAoZHVyYXRpb24pIHdpdGhvdXQgbG9hZGluZyB0aGUgZnVsbCBhdWRpbyBmaWxlLlxuICAgICAqIE1ha2VzIGEgSEVBRCByZXF1ZXN0IHRvIGdldCBYLUF1ZGlvLUR1cmF0aW9uIGhlYWRlci5cbiAgICAgKi9cbiAgICBsb2FkTWV0YWRhdGEoKSB7XG4gICAgICAgIGNvbnN0IHNvdXJjZVNyYyA9IHRoaXMuaHRtbDVBdWRpby5nZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJyk7XG4gICAgICAgIGlmICghc291cmNlU3JjIHx8ICFzb3VyY2VTcmMuaW5jbHVkZXMoJy9wYnhjb3JlL2FwaS8nKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgZnVsbCBVUkxcbiAgICAgICAgbGV0IGZ1bGxVcmw7XG4gICAgICAgIGlmIChzb3VyY2VTcmMuc3RhcnRzV2l0aCgnaHR0cCcpKSB7XG4gICAgICAgICAgICBmdWxsVXJsID0gc291cmNlU3JjO1xuICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZVNyYy5zdGFydHNXaXRoKCcvcGJ4Y29yZS8nKSkge1xuICAgICAgICAgICAgY29uc3QgYmFzZVVybCA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG4gICAgICAgICAgICBmdWxsVXJsID0gYCR7YmFzZVVybH0ke3NvdXJjZVNyY31gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnVsbFVybCA9IGAke2dsb2JhbFJvb3RVcmx9JHtzb3VyY2VTcmMucmVwbGFjZSgvXlxcLy8sICcnKX1gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJlcGFyZSBoZWFkZXJzIHdpdGggQmVhcmVyIHRva2VuXG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCdcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYWtlIEhFQUQgcmVxdWVzdCB0byBnZXQgb25seSBoZWFkZXJzIChubyBib2R5IGRvd25sb2FkKVxuICAgICAgICBmZXRjaChmdWxsVXJsLCB7XG4gICAgICAgICAgICBtZXRob2Q6ICdIRUFEJyxcbiAgICAgICAgICAgIGhlYWRlcnNcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgLy8gNDEwIEdvbmU6IGJhY2tlbmQgdGVsbHMgdXMgdGhlIGF1ZGlvIGZpbGUgaXMgbWlzc2luZyBvbiBkaXNrIHdoaWxlIHRoZSBEQlxuICAgICAgICAgICAgLy8gcmVjb3JkIHN0aWxsIGV4aXN0cy4gTWFyayB0aGUgcm93IGFzIGJyb2tlbiBzbyB0aGUgdXNlciBnZXRzIGEgY2xlYXIgaGludFxuICAgICAgICAgICAgLy8gKGFuZCBkaXNhYmxlcyB0aGUgcGxheSBidXR0b24pIGluc3RlYWQgb2YgYmVpbmcgY29uZnVzZWQgYnkgYSBnZW5lcmljIDQyMi5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQxMCkge1xuICAgICAgICAgICAgICAgIHRoaXMubWFya0FzTWlzc2luZygpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgZHVyYXRpb24gZnJvbSBoZWFkZXJcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uU2Vjb25kcyA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdYLUF1ZGlvLUR1cmF0aW9uJyk7XG4gICAgICAgICAgICBpZiAoZHVyYXRpb25TZWNvbmRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBwYXJzZUZsb2F0KGR1cmF0aW9uU2Vjb25kcyk7XG4gICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoZHVyYXRpb24gKiAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi50ZXh0KGAwMDowMC8ke2Zvcm1hdHRlZH1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBTaWxlbnRseSBmYWlsIC0gbWV0YWRhdGEgaXMgbm90IGNyaXRpY2FsXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1hcmsgdGhpcyBwbGF5ZXIgcm93IGFzIGhhdmluZyBhIG1pc3NpbmcvYnJva2VuIGF1ZGlvIGZpbGUuXG4gICAgICogRGlzYWJsZXMgdGhlIHBsYXkgYnV0dG9uLCBzaG93cyBhIHdhcm5pbmcgaWNvbiBhbmQgYSB0b29sdGlwIGV4cGxhaW5pbmcgd2hhdCB0byBkby5cbiAgICAgKi9cbiAgICBtYXJrQXNNaXNzaW5nKCkge1xuICAgICAgICBjb25zdCAkcm93ID0gJChgIyR7dGhpcy5pZH1gKTtcbiAgICAgICAgaWYgKCRyb3cuaGFzQ2xhc3MoJ2F1ZGlvLWZpbGUtbWlzc2luZycpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJHJvdy5hZGRDbGFzcygnYXVkaW8tZmlsZS1taXNzaW5nJyk7XG4gICAgICAgIGNvbnN0IHRvb2x0aXBUZXh0ID0gKHR5cGVvZiBnbG9iYWxUcmFuc2xhdGUgIT09ICd1bmRlZmluZWQnXG4gICAgICAgICAgICAmJiBnbG9iYWxUcmFuc2xhdGUuc2ZfQXVkaW9GaWxlTWlzc2luZ1dhcm5pbmcpXG4gICAgICAgICAgICA/IGdsb2JhbFRyYW5zbGF0ZS5zZl9BdWRpb0ZpbGVNaXNzaW5nV2FybmluZ1xuICAgICAgICAgICAgOiAnQXVkaW8gZmlsZSBpcyBtaXNzaW5nIG9uIGRpc2ssIHBsZWFzZSByZS11cGxvYWQnO1xuICAgICAgICB0aGlzLiRwQnV0dG9uXG4gICAgICAgICAgICAucHJvcCgnZGlzYWJsZWQnLCB0cnVlKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAuYXR0cigndGl0bGUnLCB0b29sdGlwVGV4dClcbiAgICAgICAgICAgIC5maW5kKCdpJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygncGxheSBwYXVzZScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2V4Y2xhbWF0aW9uIHRyaWFuZ2xlJyk7XG4gICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi50ZXh0KCctLTotLScpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciBtZXRhZGF0YSBsb2FkZWQgZXZlbnQuXG4gICAgICovXG4gICAgY2JPbk1ldGFkYXRhTG9hZGVkKCkge1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKG51bGwpO1xuICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKHRoaXMuY3VycmVudFRpbWUpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICBkYXRlLnNldFNlY29uZHModGhpcy5kdXJhdGlvbik7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKS50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZm9yIHRoZSBzbGlkZXIgY2hhbmdlIGV2ZW50LlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBuZXdWYWwgLSBUaGUgbmV3IHZhbHVlIG9mIHRoZSBzbGlkZXIuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG1ldGEgLSBBZGRpdGlvbmFsIG1ldGFkYXRhIGZvciB0aGUgc2xpZGVyLlxuICAgICAqL1xuICAgIGNiT25TbGlkZXJDaGFuZ2UobmV3VmFsLCBtZXRhKSB7XG4gICAgICAgIGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID0gKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VGltZSA9IG5ldyBEYXRlKHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSAqIDEwMDApLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gbmV3IERhdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uICogMTAwMCkudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgdGhpcy5zcGFuRHVyYXRpb24udGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciB0aGUgdGltZXVwZGF0ZSBldmVudC5cbiAgICAgKiBTeW5jaHJvbml6ZXMgcGxheWhlYWQgcG9zaXRpb24gd2l0aCBjdXJyZW50IHBvaW50IGluIGF1ZGlvXG4gICAgICovXG4gICAgY2JUaW1lVXBkYXRlKCkge1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gdGhpcy5jdXJyZW50VGltZSAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICBjb25zdCByYW5nZVBvc2l0aW9uID0gTWF0aC5yb3VuZCgocGVyY2VudCkgKiAxMDApO1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgICRyb3cuZmluZCgnZGl2LmNkci1wbGF5ZXInKS5yYW5nZSgnc2V0IHZhbHVlJywgcmFuZ2VQb3NpdGlvbik7XG4gICAgICAgICAgICBpZiAocmFuZ2VQb3NpdGlvbiA9PT0gMTAwKSB7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCdidXR0b24ucGxheS1idXR0b24gaS5wYXVzZScpLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQbGF5cyBvciBwYXVzZXMgdGhlIGF1ZGlvIGZpbGUgd2hlbiB0aGUgcGxheSBidXR0b24gaXMgY2xpY2tlZC5cbiAgICAgKi9cbiAgICBwbGF5KCkge1xuICAgICAgICAvLyBDaGVjayBpZiBhdWRpbyBhbHJlYWR5IGhhcyBhIGJsb2Igc291cmNlIGxvYWRlZFxuICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnNyYyAmJiB0aGlzLmh0bWw1QXVkaW8uc3JjLnN0YXJ0c1dpdGgoJ2Jsb2I6JykpIHtcbiAgICAgICAgICAgIC8vIEJsb2IgYWxyZWFkeSBsb2FkZWQsIGp1c3QgdG9nZ2xlIHBsYXkvcGF1c2VcbiAgICAgICAgICAgIGlmICh0aGlzLmh0bWw1QXVkaW8ucGF1c2VkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRwQnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRwQnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTmVlZCB0byBsb2FkIHNvdXJjZSBmaXJzdFxuICAgICAgICBsZXQgc291cmNlU3JjID0gdGhpcy5odG1sNUF1ZGlvLmdldEF0dHJpYnV0ZSgnZGF0YS1zcmMnKSB8fCAnJztcblxuICAgICAgICAvLyBJZiBzb3VyY2UgaXMgYW4gQVBJIGVuZHBvaW50LCBsb2FkIHdpdGggYXV0aGVudGljYXRpb25cbiAgICAgICAgaWYgKHNvdXJjZVNyYyAmJiBzb3VyY2VTcmMuaW5jbHVkZXMoJy9wYnhjb3JlL2FwaS8nKSkge1xuICAgICAgICAgICAgdGhpcy5sb2FkQXV0aGVudGljYXRlZFNvdXJjZShzb3VyY2VTcmMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmFsbGJhY2sgZm9yIG5vbi1BUEkgc291cmNlc1xuICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnBhdXNlZCAmJiB0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG4gICAgICAgICAgICB0aGlzLiRwQnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG4gICAgICAgICAgICB0aGlzLiRwQnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRG93bmxvYWQgZmlsZSB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZG93bmxvYWRVcmwgLSBEb3dubG9hZCBVUkwgKG1heSByZXF1aXJlIEJlYXJlciB0b2tlbilcbiAgICAgKi9cbiAgICBkb3dubG9hZEZpbGUoZG93bmxvYWRVcmwpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQncyBhbiBBUEkgVVJMIHRoYXQgcmVxdWlyZXMgYXV0aGVudGljYXRpb25cbiAgICAgICAgaWYgKGRvd25sb2FkVXJsLmluY2x1ZGVzKCcvcGJ4Y29yZS9hcGkvJykpIHtcbiAgICAgICAgICAgIC8vIEJ1aWxkIGZ1bGwgVVJMXG4gICAgICAgICAgICBsZXQgZnVsbFVybDtcbiAgICAgICAgICAgIGlmIChkb3dubG9hZFVybC5zdGFydHNXaXRoKCdodHRwJykpIHtcbiAgICAgICAgICAgICAgICBmdWxsVXJsID0gZG93bmxvYWRVcmw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRvd25sb2FkVXJsLnN0YXJ0c1dpdGgoJy9wYnhjb3JlLycpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYmFzZVVybCA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG4gICAgICAgICAgICAgICAgZnVsbFVybCA9IGAke2Jhc2VVcmx9JHtkb3dubG9hZFVybH1gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmdWxsVXJsID0gYCR7Z2xvYmFsUm9vdFVybH0ke2Rvd25sb2FkVXJsLnJlcGxhY2UoL15cXC8vLCAnJyl9YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUHJlcGFyZSBoZWFkZXJzIHdpdGggQmVhcmVyIHRva2VuXG4gICAgICAgICAgICBjb25zdCBoZWFkZXJzID0ge1xuICAgICAgICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmV0Y2ggZmlsZSB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICBmZXRjaChmdWxsVXJsLCB7IGhlYWRlcnMgfSlcbiAgICAgICAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c306ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuYmxvYigpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnRoZW4oYmxvYiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgZmlsZW5hbWUgZnJvbSBVUkwgb3IgdXNlIGRlZmF1bHRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhkb3dubG9hZFVybC5zcGxpdCgnPycpWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZW5hbWUgPSB1cmxQYXJhbXMuZ2V0KCdmaWxlbmFtZScpIHx8ICdhdWRpby5tcDMnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBkb3dubG9hZCBsaW5rXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJsb2JVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICAgICAgICAgICAgICBhLmhyZWYgPSBibG9iVXJsO1xuICAgICAgICAgICAgICAgICAgICBhLmRvd25sb2FkID0gZmlsZW5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7XG4gICAgICAgICAgICAgICAgICAgIGEuY2xpY2soKTtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChhKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhbiB1cCBibG9iIFVSTFxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IFVSTC5yZXZva2VPYmplY3RVUkwoYmxvYlVybCksIDEwMCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3IubWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLnNmX0Rvd25sb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGVnYWN5IGRpcmVjdCBmaWxlIFVSTCAobm8gYXV0aCBuZWVkZWQpXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBkb3dubG9hZFVybDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgYXVkaW8gZnJvbSBhdXRoZW50aWNhdGVkIEFQSSBlbmRwb2ludFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFwaVVybCAtIEFQSSBVUkwgcmVxdWlyaW5nIEJlYXJlciB0b2tlblxuICAgICAqL1xuICAgIGxvYWRBdXRoZW50aWNhdGVkU291cmNlKGFwaVVybCkge1xuICAgICAgICAvLyBCdWlsZCBmdWxsIFVSTFxuICAgICAgICBsZXQgZnVsbFVybDtcbiAgICAgICAgaWYgKGFwaVVybC5zdGFydHNXaXRoKCdodHRwJykpIHtcbiAgICAgICAgICAgIGZ1bGxVcmwgPSBhcGlVcmw7XG4gICAgICAgIH0gZWxzZSBpZiAoYXBpVXJsLnN0YXJ0c1dpdGgoJy9wYnhjb3JlLycpKSB7XG4gICAgICAgICAgICAvLyBBUEkgcGF0aCAtIHVzZSBiYXNlIFVSTCB3aXRob3V0IGFkbWluLWNhYmluZXQgcGF0aFxuICAgICAgICAgICAgY29uc3QgYmFzZVVybCA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG4gICAgICAgICAgICBmdWxsVXJsID0gYCR7YmFzZVVybH0ke2FwaVVybH1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnVsbFVybCA9IGAke2dsb2JhbFJvb3RVcmx9JHthcGlVcmwucmVwbGFjZSgvXlxcLy8sICcnKX1gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJlcGFyZSBoZWFkZXJzIHdpdGggQmVhcmVyIHRva2VuXG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCdcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGZXRjaCBhdWRpbyBmaWxlIHdpdGggYXV0aGVudGljYXRpb25cbiAgICAgICAgZmV0Y2goZnVsbFVybCwgeyBoZWFkZXJzIH0pXG4gICAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDEwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWFya0FzTWlzc2luZygpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmcmllbmRseSA9ICh0eXBlb2YgZ2xvYmFsVHJhbnNsYXRlICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgJiYgZ2xvYmFsVHJhbnNsYXRlLnNmX0F1ZGlvRmlsZU1pc3NpbmdXYXJuaW5nKVxuICAgICAgICAgICAgICAgICAgICAgICAgPyBnbG9iYWxUcmFuc2xhdGUuc2ZfQXVkaW9GaWxlTWlzc2luZ1dhcm5pbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIDogJ0F1ZGlvIGZpbGUgaXMgbWlzc2luZyBvbiBkaXNrLCBwbGVhc2UgcmUtdXBsb2FkJztcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGZyaWVuZGx5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9OiAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBkdXJhdGlvbiBmcm9tIGhlYWRlciBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvblNlY29uZHMgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnWC1BdWRpby1EdXJhdGlvbicpO1xuICAgICAgICAgICAgICAgIGlmIChkdXJhdGlvblNlY29uZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGlzcGxheSBkdXJhdGlvbiBpbW1lZGlhdGVseSAoYmVmb3JlIGZpbGUgbG9hZHMpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gcGFyc2VGbG9hdChkdXJhdGlvblNlY29uZHMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb24gPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoZHVyYXRpb24gKiAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZCA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kc3BhbkR1cmF0aW9uLnRleHQoYDAwOjAwLyR7Zm9ybWF0dGVkfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmJsb2IoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbihibG9iID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYmxvYiBVUkwgZnJvbSByZXNwb25zZVxuICAgICAgICAgICAgICAgIGNvbnN0IGJsb2JVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXG4gICAgICAgICAgICAgICAgLy8gUmV2b2tlIHByZXZpb3VzIGJsb2IgVVJMIGlmIGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmh0bWw1QXVkaW8uc3JjICYmIHRoaXMuaHRtbDVBdWRpby5zcmMuc3RhcnRzV2l0aCgnYmxvYjonKSkge1xuICAgICAgICAgICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHRoaXMuaHRtbDVBdWRpby5zcmMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNldCBibG9iIFVSTCBkaXJlY3RseSB0byBhdWRpbyBlbGVtZW50IChub3Qgc291cmNlKVxuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5zcmMgPSBibG9iVXJsO1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5sb2FkKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBBdXRvLXBsYXkgYWZ0ZXIgbG9hZGluZ1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5vbmNhbnBsYXl0aHJvdWdoID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRwQnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ub25jYW5wbGF5dGhyb3VnaCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhlcnJvci5tZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuc2ZfQXVkaW9GaWxlTG9hZEVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cbn0iXX0=