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
        var fullUrl = downloadUrl.startsWith('http') ? downloadUrl : "".concat(globalRootUrl).concat(downloadUrl.replace(/^\//, '')); // Prepare headers with Bearer token

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LXBsYXllci5qcyJdLCJuYW1lcyI6WyJJbmRleFNvdW5kUGxheWVyIiwiaWQiLCJodG1sNUF1ZGlvIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIiRyb3ciLCIkIiwiaGFzQ2xhc3MiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicGxheSIsImRvd25sb2FkVXJsIiwiYXR0ciIsImRvd25sb2FkRmlsZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwic3BhbkR1cmF0aW9uIiwiYWRkQ2xhc3MiLCJsb2FkTWV0YWRhdGEiLCJzb3VyY2VTcmMiLCJnZXRBdHRyaWJ1dGUiLCJpbmNsdWRlcyIsImZ1bGxVcmwiLCJzdGFydHNXaXRoIiwiYmFzZVVybCIsIndpbmRvdyIsImxvY2F0aW9uIiwib3JpZ2luIiwiZ2xvYmFsUm9vdFVybCIsInJlcGxhY2UiLCJoZWFkZXJzIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJmZXRjaCIsIm1ldGhvZCIsInRoZW4iLCJyZXNwb25zZSIsIm9rIiwiZHVyYXRpb25TZWNvbmRzIiwiZ2V0IiwiZHVyYXRpb24iLCJwYXJzZUZsb2F0IiwiZGF0ZSIsIkRhdGUiLCJmb3JtYXR0ZWQiLCJ0b0lTT1N0cmluZyIsInN1YnN0ciIsInRleHQiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsImNsb3Nlc3QiLCJzZXRTZWNvbmRzIiwiY3VycmVudFRpbWUiLCJuZXdWYWwiLCJtZXRhIiwidHJpZ2dlcmVkQnlVc2VyIiwicGVyY2VudCIsInJhbmdlUG9zaXRpb24iLCJNYXRoIiwicm91bmQiLCJyZW1vdmVDbGFzcyIsInNyYyIsInBhdXNlZCIsInBhdXNlIiwibG9hZEF1dGhlbnRpY2F0ZWRTb3VyY2UiLCJFcnJvciIsInN0YXR1cyIsInN0YXR1c1RleHQiLCJibG9iIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwic3BsaXQiLCJmaWxlbmFtZSIsImJsb2JVcmwiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJhIiwiY3JlYXRlRWxlbWVudCIsImhyZWYiLCJkb3dubG9hZCIsImJvZHkiLCJhcHBlbmRDaGlsZCIsImNsaWNrIiwicmVtb3ZlQ2hpbGQiLCJzZXRUaW1lb3V0IiwicmV2b2tlT2JqZWN0VVJMIiwiZXJyb3IiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2UiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZl9Eb3dubG9hZEVycm9yIiwiYXBpVXJsIiwibG9hZCIsIm9uY2FucGxheXRocm91Z2giLCJzZl9BdWRpb0ZpbGVMb2FkRXJyb3IiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLGdCO0FBRUY7QUFDSjtBQUNBO0FBQ0E7QUFDSSw0QkFBWUMsRUFBWixFQUFnQjtBQUFBOztBQUFBOztBQUNaLFNBQUtBLEVBQUwsR0FBVUEsRUFBVjtBQUNBLFNBQUtDLFVBQUwsR0FBa0JDLFFBQVEsQ0FBQ0MsY0FBVCx3QkFBd0NILEVBQXhDLEVBQWxCO0FBQ0EsUUFBTUksSUFBSSxHQUFHQyxDQUFDLFlBQUtMLEVBQUwsRUFBZDs7QUFDQSxRQUFJSSxJQUFJLENBQUNFLFFBQUwsQ0FBYyxhQUFkLENBQUosRUFBa0M7QUFDOUI7QUFDQTtBQUNIOztBQUNELFNBQUtDLFFBQUwsR0FBZ0JILElBQUksQ0FBQ0ksSUFBTCxDQUFVLG9C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WixRQUFMLENBQWNDLElBQWQsQ0FBbUIsR0FBbkIsRUFBd0JrRSxXQUF4QixDQUFvQyxNQUFwQyxFQUE0QzNDLFFBQTVDLENBQXFELE9BQXJEOztBQUNBLFVBQUEsTUFBSSxDQUFDOUIsVUFBTCxDQUFnQjJHLGdCQUFoQixHQUFtQyxJQUFuQztBQUNILFNBSkQ7QUFLSCxPQXZDTCxXQXdDVyxVQUFBUixLQUFLLEVBQUk7QUFDWkMsUUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCRixLQUFLLENBQUNHLE9BQWxDLEVBQTJDQyxlQUFlLENBQUNLLHFCQUEzRDtBQUNILE9BMUNMO0FBMkNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIGluZGV4IHNvdW5kIHBsYXllci5cbiAqXG4gKiBAY2xhc3MgSW5kZXhTb3VuZFBsYXllclxuICovXG5jbGFzcyBJbmRleFNvdW5kUGxheWVyIHtcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBuZXcgSW5kZXhTb3VuZFBsYXllciBvYmplY3QuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIElEIG9mIHRoZSBhdWRpbyBwbGF5ZXIgZWxlbWVudC5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihpZCkge1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMuaHRtbDVBdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBhdWRpby1wbGF5ZXItJHtpZH1gKTtcbiAgICAgICAgY29uc3QgJHJvdyA9ICQoYCMke2lkfWApO1xuICAgICAgICBpZiAoJHJvdy5oYXNDbGFzcygnaW5pdGlhbGl6ZWQnKSkge1xuICAgICAgICAgICAgLy8gUHJldmVudCBkb3VibGUgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJHBCdXR0b24gPSAkcm93LmZpbmQoJ2J1dHRvbi5wbGF5LWJ1dHRvbicpOyAvLyBwbGF5IGJ1dHRvblxuICAgICAgICB0aGlzLiRkQnV0dG9uID0gJHJvdy5maW5kKCdidXR0b24uZG93bmxvYWQtYnV0dG9uJyk7IC8vIGRvd25sb2FkIGJ1dHRvblxuICAgICAgICB0aGlzLiRzbGlkZXIgPSAkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJyk7XG4gICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbiA9ICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKTtcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZCwgZmFsc2UpO1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgICAgICB0aGlzLiRwQnV0dG9uLnVuYmluZCgpO1xuICAgICAgICB0aGlzLiRkQnV0dG9uLnVuYmluZCgpO1xuXG4gICAgICAgIC8vIFBsYXkgYnV0dG9uIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuJHBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMucGxheSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEb3dubG9hZCBidXR0b24gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy4kZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgZG93bmxvYWRVcmwgPSB0aGlzLiRkQnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIGlmIChkb3dubG9hZFVybCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZG93bmxvYWRGaWxlKGRvd25sb2FkVXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTG9hZGVkIG1ldGFkYXRhIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG5cbiAgICAgICAgLy8gVGltZXVwZGF0ZSBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSByYW5nZSBzbGlkZXJcbiAgICAgICAgdGhpcy4kc2xpZGVyLnJhbmdlKHtcbiAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgIG1heDogMTAwLFxuICAgICAgICAgICAgc3RhcnQ6IDAsXG4gICAgICAgICAgICBvbkNoYW5nZTogdGhpcy5jYk9uU2xpZGVyQ2hhbmdlLFxuICAgICAgICAgICAgaHRtbDVBdWRpbzogdGhpcy5odG1sNUF1ZGlvLFxuICAgICAgICAgICAgY2JUaW1lVXBkYXRlOiB0aGlzLmNiVGltZVVwZGF0ZSxcbiAgICAgICAgICAgIHNwYW5EdXJhdGlvbjogdGhpcy4kc3BhbkR1cmF0aW9uLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQcmV2ZW50IGRvdWJsZSBwcm9jZXNzaW5nXG4gICAgICAgICRyb3cuYWRkQ2xhc3MoJ2luaXRpYWxpemVkJyk7XG5cbiAgICAgICAgLy8gTG9hZCBtZXRhZGF0YSBvbiBpbml0aWFsaXphdGlvbiB0byBzaG93IGR1cmF0aW9uXG4gICAgICAgIHRoaXMubG9hZE1ldGFkYXRhKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBtZXRhZGF0YSAoZHVyYXRpb24pIHdpdGhvdXQgbG9hZGluZyB0aGUgZnVsbCBhdWRpbyBmaWxlLlxuICAgICAqIE1ha2VzIGEgSEVBRCByZXF1ZXN0IHRvIGdldCBYLUF1ZGlvLUR1cmF0aW9uIGhlYWRlci5cbiAgICAgKi9cbiAgICBsb2FkTWV0YWRhdGEoKSB7XG4gICAgICAgIGNvbnN0IHNvdXJjZVNyYyA9IHRoaXMuaHRtbDVBdWRpby5nZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJyk7XG4gICAgICAgIGlmICghc291cmNlU3JjIHx8ICFzb3VyY2VTcmMuaW5jbHVkZXMoJy9wYnhjb3JlL2FwaS8nKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgZnVsbCBVUkxcbiAgICAgICAgbGV0IGZ1bGxVcmw7XG4gICAgICAgIGlmIChzb3VyY2VTcmMuc3RhcnRzV2l0aCgnaHR0cCcpKSB7XG4gICAgICAgICAgICBmdWxsVXJsID0gc291cmNlU3JjO1xuICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZVNyYy5zdGFydHNXaXRoKCcvcGJ4Y29yZS8nKSkge1xuICAgICAgICAgICAgY29uc3QgYmFzZVVybCA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG4gICAgICAgICAgICBmdWxsVXJsID0gYCR7YmFzZVVybH0ke3NvdXJjZVNyY31gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnVsbFVybCA9IGAke2dsb2JhbFJvb3RVcmx9JHtzb3VyY2VTcmMucmVwbGFjZSgvXlxcLy8sICcnKX1gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJlcGFyZSBoZWFkZXJzIHdpdGggQmVhcmVyIHRva2VuXG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCdcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYWtlIEhFQUQgcmVxdWVzdCB0byBnZXQgb25seSBoZWFkZXJzIChubyBib2R5IGRvd25sb2FkKVxuICAgICAgICBmZXRjaChmdWxsVXJsLCB7XG4gICAgICAgICAgICBtZXRob2Q6ICdIRUFEJyxcbiAgICAgICAgICAgIGhlYWRlcnNcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRXh0cmFjdCBkdXJhdGlvbiBmcm9tIGhlYWRlclxuICAgICAgICAgICAgY29uc3QgZHVyYXRpb25TZWNvbmRzID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ1gtQXVkaW8tRHVyYXRpb24nKTtcbiAgICAgICAgICAgIGlmIChkdXJhdGlvblNlY29uZHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHBhcnNlRmxvYXQoZHVyYXRpb25TZWNvbmRzKTtcbiAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb24gPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShkdXJhdGlvbiAqIDEwMDApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWQgPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kc3BhbkR1cmF0aW9uLnRleHQoYDAwOjAwLyR7Zm9ybWF0dGVkfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgIC8vIFNpbGVudGx5IGZhaWwgLSBtZXRhZGF0YSBpcyBub3QgY3JpdGljYWxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIG1ldGFkYXRhIGxvYWRlZCBldmVudC5cbiAgICAgKi9cbiAgICBjYk9uTWV0YWRhdGFMb2FkZWQoKSB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG4gICAgICAgICAgICBkYXRlLnNldFNlY29uZHModGhpcy5jdXJyZW50VGltZSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuICAgICAgICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIGRhdGUuc2V0U2Vjb25kcyh0aGlzLmR1cmF0aW9uKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG4gICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgJHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgdGhlIHNsaWRlciBjaGFuZ2UgZXZlbnQuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG5ld1ZhbCAtIFRoZSBuZXcgdmFsdWUgb2YgdGhlIHNsaWRlci5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gbWV0YSAtIEFkZGl0aW9uYWwgbWV0YWRhdGEgZm9yIHRoZSBzbGlkZXIuXG4gICAgICovXG4gICAgY2JPblNsaWRlckNoYW5nZShuZXdWYWwsIG1ldGEpIHtcbiAgICAgICAgaWYgKG1ldGEudHJpZ2dlcmVkQnlVc2VyICYmIE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgPSAodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uICogbmV3VmFsKSAvIDEwMDtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gbmV3IERhdGUodGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lICogMTAwMCkudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBuZXcgRGF0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24gKiAxMDAwKS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICB0aGlzLnNwYW5EdXJhdGlvbi50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZm9yIHRoZSB0aW1ldXBkYXRlIGV2ZW50LlxuICAgICAqIFN5bmNocm9uaXplcyBwbGF5aGVhZCBwb3NpdGlvbiB3aXRoIGN1cnJlbnQgcG9pbnQgaW4gYXVkaW9cbiAgICAgKi9cbiAgICBjYlRpbWVVcGRhdGUoKSB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSB0aGlzLmN1cnJlbnRUaW1lIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlUG9zaXRpb24gPSBNYXRoLnJvdW5kKChwZXJjZW50KSAqIDEwMCk7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgJHJvdy5maW5kKCdkaXYuY2RyLXBsYXllcicpLnJhbmdlKCdzZXQgdmFsdWUnLCByYW5nZVBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmIChyYW5nZVBvc2l0aW9uID09PSAxMDApIHtcbiAgICAgICAgICAgICAgICAkcm93LmZpbmQoJ2J1dHRvbi5wbGF5LWJ1dHRvbiBpLnBhdXNlJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBsYXlzIG9yIHBhdXNlcyB0aGUgYXVkaW8gZmlsZSB3aGVuIHRoZSBwbGF5IGJ1dHRvbiBpcyBjbGlja2VkLlxuICAgICAqL1xuICAgIHBsYXkoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGF1ZGlvIGFscmVhZHkgaGFzIGEgYmxvYiBzb3VyY2UgbG9hZGVkXG4gICAgICAgIGlmICh0aGlzLmh0bWw1QXVkaW8uc3JjICYmIHRoaXMuaHRtbDVBdWRpby5zcmMuc3RhcnRzV2l0aCgnYmxvYjonKSkge1xuICAgICAgICAgICAgLy8gQmxvYiBhbHJlYWR5IGxvYWRlZCwganVzdCB0b2dnbGUgcGxheS9wYXVzZVxuICAgICAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHBCdXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wYXVzZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHBCdXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZWVkIHRvIGxvYWQgc291cmNlIGZpcnN0XG4gICAgICAgIGxldCBzb3VyY2VTcmMgPSB0aGlzLmh0bWw1QXVkaW8uZ2V0QXR0cmlidXRlKCdkYXRhLXNyYycpIHx8ICcnO1xuXG4gICAgICAgIC8vIElmIHNvdXJjZSBpcyBhbiBBUEkgZW5kcG9pbnQsIGxvYWQgd2l0aCBhdXRoZW50aWNhdGlvblxuICAgICAgICBpZiAoc291cmNlU3JjICYmIHNvdXJjZVNyYy5pbmNsdWRlcygnL3BieGNvcmUvYXBpLycpKSB7XG4gICAgICAgICAgICB0aGlzLmxvYWRBdXRoZW50aWNhdGVkU291cmNlKHNvdXJjZVNyYyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGYWxsYmFjayBmb3Igbm9uLUFQSSBzb3VyY2VzXG4gICAgICAgIGlmICh0aGlzLmh0bWw1QXVkaW8ucGF1c2VkICYmIHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikge1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcbiAgICAgICAgICAgIHRoaXMuJHBCdXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcbiAgICAgICAgICAgIHRoaXMuJHBCdXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEb3dubG9hZCBmaWxlIHdpdGggYXV0aGVudGljYXRpb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkb3dubG9hZFVybCAtIERvd25sb2FkIFVSTCAobWF5IHJlcXVpcmUgQmVhcmVyIHRva2VuKVxuICAgICAqL1xuICAgIGRvd25sb2FkRmlsZShkb3dubG9hZFVybCkge1xuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIGFuIEFQSSBVUkwgdGhhdCByZXF1aXJlcyBhdXRoZW50aWNhdGlvblxuICAgICAgICBpZiAoZG93bmxvYWRVcmwuaW5jbHVkZXMoJy9wYnhjb3JlL2FwaS8nKSkge1xuICAgICAgICAgICAgLy8gQnVpbGQgZnVsbCBVUkxcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxVcmwgPSBkb3dubG9hZFVybC5zdGFydHNXaXRoKCdodHRwJykgPyBkb3dubG9hZFVybCA6IGAke2dsb2JhbFJvb3RVcmx9JHtkb3dubG9hZFVybC5yZXBsYWNlKC9eXFwvLywgJycpfWA7XG5cbiAgICAgICAgICAgIC8vIFByZXBhcmUgaGVhZGVycyB3aXRoIEJlYXJlciB0b2tlblxuICAgICAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCdcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZldGNoIGZpbGUgd2l0aCBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgZmV0Y2goZnVsbFVybCwgeyBoZWFkZXJzIH0pXG4gICAgICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9OiAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmJsb2IoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC50aGVuKGJsb2IgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IGZpbGVuYW1lIGZyb20gVVJMIG9yIHVzZSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoZG93bmxvYWRVcmwuc3BsaXQoJz8nKVsxXSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lID0gdXJsUGFyYW1zLmdldCgnZmlsZW5hbWUnKSB8fCAnYXVkaW8ubXAzJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgZG93bmxvYWQgbGlua1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBibG9iVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgICAgICAgICAgICAgYS5ocmVmID0gYmxvYlVybDtcbiAgICAgICAgICAgICAgICAgICAgYS5kb3dubG9hZCA9IGZpbGVuYW1lO1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xuICAgICAgICAgICAgICAgICAgICBhLmNsaWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoYSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYW4gdXAgYmxvYiBVUkxcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBVUkwucmV2b2tlT2JqZWN0VVJMKGJsb2JVcmwpLCAxMDApO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yLm1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZS5zZl9Eb3dubG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExlZ2FjeSBkaXJlY3QgZmlsZSBVUkwgKG5vIGF1dGggbmVlZGVkKVxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZG93bmxvYWRVcmw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGF1ZGlvIGZyb20gYXV0aGVudGljYXRlZCBBUEkgZW5kcG9pbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhcGlVcmwgLSBBUEkgVVJMIHJlcXVpcmluZyBCZWFyZXIgdG9rZW5cbiAgICAgKi9cbiAgICBsb2FkQXV0aGVudGljYXRlZFNvdXJjZShhcGlVcmwpIHtcbiAgICAgICAgLy8gQnVpbGQgZnVsbCBVUkxcbiAgICAgICAgbGV0IGZ1bGxVcmw7XG4gICAgICAgIGlmIChhcGlVcmwuc3RhcnRzV2l0aCgnaHR0cCcpKSB7XG4gICAgICAgICAgICBmdWxsVXJsID0gYXBpVXJsO1xuICAgICAgICB9IGVsc2UgaWYgKGFwaVVybC5zdGFydHNXaXRoKCcvcGJ4Y29yZS8nKSkge1xuICAgICAgICAgICAgLy8gQVBJIHBhdGggLSB1c2UgYmFzZSBVUkwgd2l0aG91dCBhZG1pbi1jYWJpbmV0IHBhdGhcbiAgICAgICAgICAgIGNvbnN0IGJhc2VVcmwgPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgICAgICAgICAgZnVsbFVybCA9IGAke2Jhc2VVcmx9JHthcGlVcmx9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZ1bGxVcmwgPSBgJHtnbG9iYWxSb290VXJsfSR7YXBpVXJsLnJlcGxhY2UoL15cXC8vLCAnJyl9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXBhcmUgaGVhZGVycyB3aXRoIEJlYXJlciB0b2tlblxuICAgICAgICBjb25zdCBoZWFkZXJzID0ge1xuICAgICAgICAgICAgJ1gtUmVxdWVzdGVkLVdpdGgnOiAnWE1MSHR0cFJlcXVlc3QnXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmV0Y2ggYXVkaW8gZmlsZSB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIGZldGNoKGZ1bGxVcmwsIHsgaGVhZGVycyB9KVxuICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfTogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgZHVyYXRpb24gZnJvbSBoZWFkZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb25TZWNvbmRzID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ1gtQXVkaW8tRHVyYXRpb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb25TZWNvbmRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERpc3BsYXkgZHVyYXRpb24gaW1tZWRpYXRlbHkgKGJlZm9yZSBmaWxlIGxvYWRzKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHBhcnNlRmxvYXQoZHVyYXRpb25TZWNvbmRzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGR1cmF0aW9uICogMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWQgPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi50ZXh0KGAwMDowMC8ke2Zvcm1hdHRlZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5ibG9iKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oYmxvYiA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGJsb2IgVVJMIGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBjb25zdCBibG9iVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblxuICAgICAgICAgICAgICAgIC8vIFJldm9rZSBwcmV2aW91cyBibG9iIFVSTCBpZiBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnNyYyAmJiB0aGlzLmh0bWw1QXVkaW8uc3JjLnN0YXJ0c1dpdGgoJ2Jsb2I6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLmh0bWw1QXVkaW8uc3JjKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgYmxvYiBVUkwgZGlyZWN0bHkgdG8gYXVkaW8gZWxlbWVudCAobm90IHNvdXJjZSlcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uc3JjID0gYmxvYlVybDtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ubG9hZCgpO1xuXG4gICAgICAgICAgICAgICAgLy8gQXV0by1wbGF5IGFmdGVyIGxvYWRpbmdcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ub25jYW5wbGF5dGhyb3VnaCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLm9uY2FucGxheXRocm91Z2ggPSBudWxsO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3IubWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLnNmX0F1ZGlvRmlsZUxvYWRFcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG59Il19