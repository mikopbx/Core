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
    var $row = $("#".concat(id)); // Check if already initialized to prevent double processing

    if ($row.hasClass('initialized')) {
      return;
    }

    this.$pButton = $row.find('i.play'); // Play button

    this.$dButton = $row.find('i.download'); // Download button

    this.$slider = $row.find('div.cdr-player'); // Slider element

    this.$spanDuration = $row.find('span.cdr-duration'); // Duration span element
    // Clean up previous event listeners

    this.html5Audio.removeEventListener('timeupdate', this.cbOnMetadataLoaded, false);
    this.html5Audio.removeEventListener('loadedmetadata', this.cbTimeUpdate, false);
    this.$pButton.unbind();
    this.$dButton.unbind(); // Store original src in data-src attribute for authenticated loading

    var originalSrc = this.html5Audio.getAttribute('src');

    if (originalSrc && originalSrc.includes('/pbxcore/api/')) {
      this.html5Audio.setAttribute('data-src', originalSrc);
      this.html5Audio.removeAttribute('src'); // Remove direct src
    } // Play button event listener


    this.$pButton.on('click', function (e) {
      e.preventDefault();

      _this.play();
    }); // Download button event listener

    this.$dButton.on('click', function (e) {
      e.preventDefault();
      var downloadUrl = $(e.target).attr('data-value');

      if (downloadUrl) {
        _this.downloadFile(downloadUrl);
      }
    }); // Loaded metadata event listener

    this.html5Audio.addEventListener('loadedmetadata', this.cbOnMetadataLoaded.bind(this), false); // timeupdate event listener

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
    }); // Mark as initialized

    $row.addClass('initialized'); // Load metadata on initialization

    this.loadMetadata();
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
            var date = new Date(null);
            date.setSeconds(parseInt(duration, 10));
            var dateStr = date.toISOString();
            var hours = parseInt(dateStr.substr(11, 2), 10);
            var formatted;

            if (hours === 0) {
              formatted = dateStr.substr(14, 5);
            } else if (hours < 10) {
              formatted = dateStr.substr(12, 7);
            } else {
              formatted = dateStr.substr(11, 8);
            }

            _this2.$spanDuration.text("00:00/".concat(formatted));
          }
        }
      })["catch"](function () {// Silently fail - metadata is not critical
      });
    }
    /**
     * Plays or pauses the audio file.
     */

  }, {
    key: "play",
    value: function play() {
      // Check if audio already has a blob source loaded
      if (this.html5Audio.src && this.html5Audio.src.startsWith('blob:')) {
        // Blob already loaded, just toggle play/pause
        if (this.html5Audio.paused) {
          this.html5Audio.play();
          this.$pButton.removeClass('play').addClass('pause');
        } else {
          this.html5Audio.pause();
          this.$pButton.removeClass('pause').addClass('play');
        }

        return;
      } // Need to load source first


      var sourceSrc = this.html5Audio.getAttribute('data-src') || ''; // If source is an API endpoint, load with authentication

      if (sourceSrc && sourceSrc.includes('/pbxcore/api/')) {
        this.loadAuthenticatedSource(sourceSrc);
        return;
      } // Fallback for non-API sources or already loaded


      if (this.html5Audio.paused && this.html5Audio.duration) {
        this.html5Audio.play();
        this.$pButton.removeClass('play').addClass('pause');
      } else if (!this.html5Audio.paused) {
        this.html5Audio.pause();
        this.$pButton.removeClass('pause').addClass('play');
      }
    }
    /**
     * Load audio from authenticated API endpoint using fetch + Bearer token
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
          var duration = parseFloat(durationSeconds);

          if (duration > 0) {
            var date = new Date(null);
            date.setSeconds(parseInt(duration, 10));
            var dateStr = date.toISOString();
            var hours = parseInt(dateStr.substr(11, 2), 10);
            var formatted;

            if (hours === 0) {
              formatted = dateStr.substr(14, 5);
            } else if (hours < 10) {
              formatted = dateStr.substr(12, 7);
            } else {
              formatted = dateStr.substr(11, 8);
            }

            _this3.$spanDuration.text("00:00/".concat(formatted));
          }
        }

        return response.blob();
      }).then(function (blob) {
        // Create blob URL from response
        var blobUrl = URL.createObjectURL(blob); // Revoke previous blob URL if exists

        if (_this3.html5Audio.src && _this3.html5Audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(_this3.html5Audio.src);
        } // Set blob URL directly to audio element


        _this3.html5Audio.src = blobUrl;

        _this3.html5Audio.load(); // Auto-play after loading


        _this3.html5Audio.oncanplaythrough = function () {
          _this3.html5Audio.play();

          _this3.$pButton.removeClass('play').addClass('pause');

          _this3.html5Audio.oncanplaythrough = null;
        };
      })["catch"](function (error) {
        UserMessage.showMultiString(error.message, globalTranslate.cdr_AudioFileLoadError);
      });
    }
    /**
     * Download file with authentication
     * @param {string} downloadUrl - Download URL requiring Bearer token
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
          } // Get filename from Content-Disposition header or URL


          var disposition = response.headers.get('Content-Disposition');
          var filename = 'call-record.mp3';

          if (disposition && disposition.includes('filename=')) {
            var matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);

            if (matches != null && matches[1]) {
              filename = matches[1].replace(/['"]/g, '');
            }
          } else {
            // Try to extract from URL parameters
            var urlParams = new URLSearchParams(downloadUrl.split('?')[1]);
            var filenameParam = urlParams.get('filename');

            if (filenameParam) {
              filename = filenameParam;
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
          UserMessage.showMultiString(error.message, globalTranslate.cdr_AudioFileDownloadError);
        });
      } else {
        // Legacy direct file URL (no auth needed)
        window.location = downloadUrl;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLXBsYXllci5qcyJdLCJuYW1lcyI6WyJDRFJQbGF5ZXIiLCJpZCIsImh0bWw1QXVkaW8iLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiJHJvdyIsIiQiLCJoYXNDbGFzcyIsIiRwQnV0dG9uIiwiZmluZCIsIiRkQnV0dG9uIiwiJHNsaWRlciIsIiRzcGFuRHVyYXRpb24iLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiY2JPbk1ldGFkYXRhTG9hZGVkIiwiY2JUaW1lVXBkYXRlIiwidW5iaW5kIiwib3JpZ2luYWxTcmMiLCJnZXRBdHRyaWJ1dGUiLCJpbmNsdWRlcyIsInNldEF0dHJpYnV0ZSIsInJlbW92ZUF0dHJpYnV0ZSIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicGxheSIsImRvd25sb2FkVXJsIiwidGFyZ2V0IiwiYXR0ciIsImRvd25sb2FkRmlsZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJiaW5kIiwiY2JPblNyY01lZGlhRXJyb3IiLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwic3BhbkR1cmF0aW9uIiwiYWRkQ2xhc3MiLCJsb2FkTWV0YWRhdGEiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsImR1cmF0aW9uIiwiY2xvc2VzdCIsImRhdGUiLCJEYXRlIiwic2V0U2Vjb25kcyIsInBhcnNlSW50IiwiY3VycmVudFRpbWUiLCJ0b0lTT1N0cmluZyIsInN1YnN0ciIsImRhdGVTdHIiLCJob3VycyIsInRleHQiLCJuZXdWYWwiLCJtZXRhIiwidHJpZ2dlcmVkQnlVc2VyIiwiZGF0ZUN1cnJlbnQiLCJkYXRlRHVyYXRpb24iLCJwZXJjZW50IiwicmFuZ2VQb3NpdGlvbiIsIk1hdGgiLCJyb3VuZCIsInJlbW92ZUNsYXNzIiwic291cmNlU3JjIiwiZnVsbFVybCIsInN0YXJ0c1dpdGgiLCJiYXNlVXJsIiwid2luZG93IiwibG9jYXRpb24iLCJvcmlnaW4iLCJnbG9iYWxSb290VXJsIiwicmVwbGFjZSIsImhlYWRlcnMiLCJUb2tlbk1hbmFnZXIiLCJhY2Nlc3NUb2tlbiIsImZldGNoIiwibWV0aG9kIiwidGhlbiIsInJlc3BvbnNlIiwib2siLCJkdXJhdGlvblNlY29uZHMiLCJnZXQiLCJwYXJzZUZsb2F0IiwiZm9ybWF0dGVkIiwic3JjIiwicGF1c2VkIiwicGF1c2UiLCJsb2FkQXV0aGVudGljYXRlZFNvdXJjZSIsImFwaVVybCIsIkVycm9yIiwic3RhdHVzIiwic3RhdHVzVGV4dCIsImJsb2IiLCJibG9iVXJsIiwiVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwicmV2b2tlT2JqZWN0VVJMIiwibG9hZCIsIm9uY2FucGxheXRocm91Z2giLCJlcnJvciIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZSIsImdsb2JhbFRyYW5zbGF0ZSIsImNkcl9BdWRpb0ZpbGVMb2FkRXJyb3IiLCJkaXNwb3NpdGlvbiIsImZpbGVuYW1lIiwibWF0Y2hlcyIsImV4ZWMiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzcGxpdCIsImZpbGVuYW1lUGFyYW0iLCJ1cmwiLCJhIiwiY3JlYXRlRWxlbWVudCIsInN0eWxlIiwiZGlzcGxheSIsImhyZWYiLCJkb3dubG9hZCIsImJvZHkiLCJhcHBlbmRDaGlsZCIsImNsaWNrIiwicmVtb3ZlQ2hpbGQiLCJjZHJfQXVkaW9GaWxlRG93bmxvYWRFcnJvciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtJQUNNQSxTO0FBRUY7QUFDSjtBQUNBO0FBQ0E7QUFDSSxxQkFBWUMsRUFBWixFQUFnQjtBQUFBOztBQUFBOztBQUNaLFNBQUtBLEVBQUwsR0FBVUEsRUFBVjtBQUNBLFNBQUtDLFVB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QixRQUFyQkEsSUFBcUI7QUFBQSxjQUFmYyxRQUFlLFFBQWZBLFFBQWU7QUFDMUI7QUFDQSxjQUFNTyxHQUFHLEdBQUc5QyxNQUFNLENBQUMyQixHQUFQLENBQVdDLGVBQVgsQ0FBMkJILElBQTNCLENBQVo7QUFDQSxjQUFNc0IsQ0FBQyxHQUFHbEgsUUFBUSxDQUFDbUgsYUFBVCxDQUF1QixHQUF2QixDQUFWO0FBQ0FELFVBQUFBLENBQUMsQ0FBQ0UsS0FBRixDQUFRQyxPQUFSLEdBQWtCLE1BQWxCO0FBQ0FILFVBQUFBLENBQUMsQ0FBQ0ksSUFBRixHQUFTTCxHQUFUO0FBQ0FDLFVBQUFBLENBQUMsQ0FBQ0ssUUFBRixHQUFhYixRQUFiO0FBQ0ExRyxVQUFBQSxRQUFRLENBQUN3SCxJQUFULENBQWNDLFdBQWQsQ0FBMEJQLENBQTFCO0FBQ0FBLFVBQUFBLENBQUMsQ0FBQ1EsS0FBRjtBQUNBdkQsVUFBQUEsTUFBTSxDQUFDMkIsR0FBUCxDQUFXRSxlQUFYLENBQTJCaUIsR0FBM0I7QUFDQWpILFVBQUFBLFFBQVEsQ0FBQ3dILElBQVQsQ0FBY0csV0FBZCxDQUEwQlQsQ0FBMUI7QUFDSCxTQXBDTCxXQXFDVyxVQUFBZixLQUFLLEVBQUk7QUFDWkMsVUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCRixLQUFLLENBQUNHLE9BQWxDLEVBQTJDQyxlQUFlLENBQUNxQiwwQkFBM0Q7QUFDSCxTQXZDTDtBQXdDSCxPQXRERCxNQXNETztBQUNIO0FBQ0F6RCxRQUFBQSxNQUFNLENBQUNDLFFBQVAsR0FBa0I3QyxXQUFsQjtBQUNIO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSw2QkFBb0I7QUFDaEJwQixNQUFBQSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVF1QyxPQUFSLENBQWdCLElBQWhCLEVBQXNCTCxRQUF0QixDQUErQixVQUEvQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBDRFJQbGF5ZXIgY2xhc3MuXG4gKi9cbmNsYXNzIENEUlBsYXllciB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGluc3RhbmNlIG9mIENEUlBsYXllci5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBUaGUgSUQgb2YgdGhlIHBsYXllci5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihpZCkge1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMuaHRtbDVBdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBhdWRpby1wbGF5ZXItJHtpZH1gKTtcbiAgICAgICAgY29uc3QgJHJvdyA9ICQoYCMke2lkfWApO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5pdGlhbGl6ZWQgdG8gcHJldmVudCBkb3VibGUgcHJvY2Vzc2luZ1xuICAgICAgICBpZiAoJHJvdy5oYXNDbGFzcygnaW5pdGlhbGl6ZWQnKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy4kcEJ1dHRvbiA9ICRyb3cuZmluZCgnaS5wbGF5Jyk7IC8vIFBsYXkgYnV0dG9uXG4gICAgICAgIHRoaXMuJGRCdXR0b24gPSAkcm93LmZpbmQoJ2kuZG93bmxvYWQnKTsgLy8gRG93bmxvYWQgYnV0dG9uXG4gICAgICAgIHRoaXMuJHNsaWRlciA9ICRyb3cuZmluZCgnZGl2LmNkci1wbGF5ZXInKTsgLy8gU2xpZGVyIGVsZW1lbnRcbiAgICAgICAgdGhpcy4kc3BhbkR1cmF0aW9uID0gJHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpOyAvLyBEdXJhdGlvbiBzcGFuIGVsZW1lbnRcblxuICAgICAgICAvLyBDbGVhbiB1cCBwcmV2aW91cyBldmVudCBsaXN0ZW5lcnNcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZCwgZmFsc2UpO1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgICAgICB0aGlzLiRwQnV0dG9uLnVuYmluZCgpO1xuICAgICAgICB0aGlzLiRkQnV0dG9uLnVuYmluZCgpO1xuXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHNyYyBpbiBkYXRhLXNyYyBhdHRyaWJ1dGUgZm9yIGF1dGhlbnRpY2F0ZWQgbG9hZGluZ1xuICAgICAgICBjb25zdCBvcmlnaW5hbFNyYyA9IHRoaXMuaHRtbDVBdWRpby5nZXRBdHRyaWJ1dGUoJ3NyYycpO1xuICAgICAgICBpZiAob3JpZ2luYWxTcmMgJiYgb3JpZ2luYWxTcmMuaW5jbHVkZXMoJy9wYnhjb3JlL2FwaS8nKSkge1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnNldEF0dHJpYnV0ZSgnZGF0YS1zcmMnLCBvcmlnaW5hbFNyYyk7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlQXR0cmlidXRlKCdzcmMnKTsgLy8gUmVtb3ZlIGRpcmVjdCBzcmNcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFBsYXkgYnV0dG9uIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuJHBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMucGxheSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEb3dubG9hZCBidXR0b24gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy4kZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgZG93bmxvYWRVcmwgPSAkKGUudGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBpZiAoZG93bmxvYWRVcmwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRvd25sb2FkRmlsZShkb3dubG9hZFVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIExvYWRlZCBtZXRhZGF0YSBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZC5iaW5kKHRoaXMpLCBmYWxzZSk7XG5cbiAgICAgICAgLy8gdGltZXVwZGF0ZSBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cbiAgICAgICAgLy8gbm8gc3JjIGhhbmRsZXJcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5jYk9uU3JjTWVkaWFFcnJvciwgZmFsc2UpO1xuXG4gICAgICAgIHRoaXMuJHNsaWRlci5yYW5nZSh7XG4gICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICBtYXg6IDEwMCxcbiAgICAgICAgICAgIHN0YXJ0OiAwLFxuICAgICAgICAgICAgb25DaGFuZ2U6IHRoaXMuY2JPblNsaWRlckNoYW5nZSxcbiAgICAgICAgICAgIGh0bWw1QXVkaW86IHRoaXMuaHRtbDVBdWRpbyxcbiAgICAgICAgICAgIGNiVGltZVVwZGF0ZTogdGhpcy5jYlRpbWVVcGRhdGUsXG4gICAgICAgICAgICBzcGFuRHVyYXRpb246IHRoaXMuJHNwYW5EdXJhdGlvbixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTWFyayBhcyBpbml0aWFsaXplZFxuICAgICAgICAkcm93LmFkZENsYXNzKCdpbml0aWFsaXplZCcpO1xuXG4gICAgICAgIC8vIExvYWQgbWV0YWRhdGEgb24gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdGhpcy5sb2FkTWV0YWRhdGEoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3IgbWV0YWRhdGEgbG9hZGVkIGV2ZW50LlxuICAgICAqL1xuICAgIGNiT25NZXRhZGF0YUxvYWRlZCgpIHtcbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShudWxsKTtcbiAgICAgICAgICAgIGRhdGUuc2V0U2Vjb25kcyhwYXJzZUludCh0aGlzLmN1cnJlbnRUaW1lLCAxMCkpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICBkYXRlLnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5kdXJhdGlvbiwgMTApKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG4gICAgICAgICAgICBjb25zdCBkYXRlU3RyID0gZGF0ZS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgY29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcbiAgICAgICAgICAgIGxldCBkdXJhdGlvbjtcbiAgICAgICAgICAgIGlmIChob3VycyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChob3VycyA8IDEwKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMiwgNyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID49IDEwKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMSwgOCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkcm93LmZpbmQoJ3NwYW4uY2RyLWR1cmF0aW9uJykudGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciBzbGlkZXIgY2hhbmdlIGV2ZW50LlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBuZXdWYWwgLSBUaGUgbmV3IHZhbHVlIG9mIHRoZSBzbGlkZXIuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG1ldGEgLSBBZGRpdGlvbmFsIG1ldGFkYXRhLlxuICAgICAqL1xuICAgIGNiT25TbGlkZXJDaGFuZ2UobmV3VmFsLCBtZXRhKSB7XG4gICAgICAgIGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lID0gKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRlQ3VycmVudCA9IG5ldyBEYXRlKG51bGwpO1xuICAgICAgICAgICAgZGF0ZUN1cnJlbnQuc2V0U2Vjb25kcyhwYXJzZUludCh0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUsIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuICAgICAgICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBkYXRlQ3VycmVudC50b0lTT1N0cmluZygpLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICBjb25zdCBkYXRlRHVyYXRpb24gPSBuZXcgRGF0ZShudWxsKTtcbiAgICAgICAgICAgIGRhdGVEdXJhdGlvbi5zZXRTZWNvbmRzKHBhcnNlSW50KHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbiwgMTApKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG4gICAgICAgICAgICBjb25zdCBkYXRlU3RyID0gZGF0ZUR1cmF0aW9uLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICBjb25zdCBob3VycyA9IHBhcnNlSW50KGRhdGVTdHIuc3Vic3RyKDExLCAyKSwgMTApO1xuICAgICAgICAgICAgbGV0IGR1cmF0aW9uO1xuICAgICAgICAgICAgaWYgKGhvdXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhvdXJzIDwgMTApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDEyLCA3KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPj0gMTApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDExLCA4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3BhbkR1cmF0aW9uLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3IgdGltZSB1cGRhdGUgZXZlbnQuXG4gICAgICovXG4gICAgY2JUaW1lVXBkYXRlKCkge1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gdGhpcy5jdXJyZW50VGltZSAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICBjb25zdCByYW5nZVBvc2l0aW9uID0gTWF0aC5taW4oTWF0aC5yb3VuZCgocGVyY2VudCkgKiAxMDApLCAxMDApO1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgICRyb3cuZmluZCgnZGl2LmNkci1wbGF5ZXInKS5yYW5nZSgnc2V0IHZhbHVlJywgcmFuZ2VQb3NpdGlvbik7XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50VGltZSA9PT0gdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgICAgICRyb3cuZmluZCgnaS5wYXVzZScpLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1ldGFkYXRhIChkdXJhdGlvbikgd2l0aG91dCBsb2FkaW5nIHRoZSBmdWxsIGF1ZGlvIGZpbGUuXG4gICAgICogTWFrZXMgYSBIRUFEIHJlcXVlc3QgdG8gZ2V0IFgtQXVkaW8tRHVyYXRpb24gaGVhZGVyLlxuICAgICAqL1xuICAgIGxvYWRNZXRhZGF0YSgpIHtcbiAgICAgICAgY29uc3Qgc291cmNlU3JjID0gdGhpcy5odG1sNUF1ZGlvLmdldEF0dHJpYnV0ZSgnZGF0YS1zcmMnKTtcbiAgICAgICAgaWYgKCFzb3VyY2VTcmMgfHwgIXNvdXJjZVNyYy5pbmNsdWRlcygnL3BieGNvcmUvYXBpLycpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBmdWxsIFVSTFxuICAgICAgICBsZXQgZnVsbFVybDtcbiAgICAgICAgaWYgKHNvdXJjZVNyYy5zdGFydHNXaXRoKCdodHRwJykpIHtcbiAgICAgICAgICAgIGZ1bGxVcmwgPSBzb3VyY2VTcmM7XG4gICAgICAgIH0gZWxzZSBpZiAoc291cmNlU3JjLnN0YXJ0c1dpdGgoJy9wYnhjb3JlLycpKSB7XG4gICAgICAgICAgICBjb25zdCBiYXNlVXJsID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcbiAgICAgICAgICAgIGZ1bGxVcmwgPSBgJHtiYXNlVXJsfSR7c291cmNlU3JjfWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmdWxsVXJsID0gYCR7Z2xvYmFsUm9vdFVybH0ke3NvdXJjZVNyYy5yZXBsYWNlKC9eXFwvLywgJycpfWA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmVwYXJlIGhlYWRlcnMgd2l0aCBCZWFyZXIgdG9rZW5cbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1ha2UgSEVBRCByZXF1ZXN0IHRvIGdldCBvbmx5IGhlYWRlcnMgKG5vIGJvZHkgZG93bmxvYWQpXG4gICAgICAgIGZldGNoKGZ1bGxVcmwsIHtcbiAgICAgICAgICAgIG1ldGhvZDogJ0hFQUQnLFxuICAgICAgICAgICAgaGVhZGVyc1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IGR1cmF0aW9uIGZyb20gaGVhZGVyXG4gICAgICAgICAgICBjb25zdCBkdXJhdGlvblNlY29uZHMgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnWC1BdWRpby1EdXJhdGlvbicpO1xuICAgICAgICAgICAgaWYgKGR1cmF0aW9uU2Vjb25kcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gcGFyc2VGbG9hdChkdXJhdGlvblNlY29uZHMpO1xuICAgICAgICAgICAgICAgIGlmIChkdXJhdGlvbiA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICBkYXRlLnNldFNlY29uZHMocGFyc2VJbnQoZHVyYXRpb24sIDEwKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVTdHIgPSBkYXRlLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gcGFyc2VJbnQoZGF0ZVN0ci5zdWJzdHIoMTEsIDIpLCAxMCk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBmb3JtYXR0ZWQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChob3VycyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkID0gZGF0ZVN0ci5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGhvdXJzIDwgMTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZCA9IGRhdGVTdHIuc3Vic3RyKDEyLCA3KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZCA9IGRhdGVTdHIuc3Vic3RyKDExLCA4KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRzcGFuRHVyYXRpb24udGV4dChgMDA6MDAvJHtmb3JtYXR0ZWR9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgLy8gU2lsZW50bHkgZmFpbCAtIG1ldGFkYXRhIGlzIG5vdCBjcml0aWNhbFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQbGF5cyBvciBwYXVzZXMgdGhlIGF1ZGlvIGZpbGUuXG4gICAgICovXG4gICAgcGxheSgpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgYXVkaW8gYWxyZWFkeSBoYXMgYSBibG9iIHNvdXJjZSBsb2FkZWRcbiAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5zcmMgJiYgdGhpcy5odG1sNUF1ZGlvLnNyYy5zdGFydHNXaXRoKCdibG9iOicpKSB7XG4gICAgICAgICAgICAvLyBCbG9iIGFscmVhZHkgbG9hZGVkLCBqdXN0IHRvZ2dsZSBwbGF5L3BhdXNlXG4gICAgICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnBhdXNlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG4gICAgICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZWVkIHRvIGxvYWQgc291cmNlIGZpcnN0XG4gICAgICAgIGxldCBzb3VyY2VTcmMgPSB0aGlzLmh0bWw1QXVkaW8uZ2V0QXR0cmlidXRlKCdkYXRhLXNyYycpIHx8ICcnO1xuXG4gICAgICAgIC8vIElmIHNvdXJjZSBpcyBhbiBBUEkgZW5kcG9pbnQsIGxvYWQgd2l0aCBhdXRoZW50aWNhdGlvblxuICAgICAgICBpZiAoc291cmNlU3JjICYmIHNvdXJjZVNyYy5pbmNsdWRlcygnL3BieGNvcmUvYXBpLycpKSB7XG4gICAgICAgICAgICB0aGlzLmxvYWRBdXRoZW50aWNhdGVkU291cmNlKHNvdXJjZVNyYyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGYWxsYmFjayBmb3Igbm9uLUFQSSBzb3VyY2VzIG9yIGFscmVhZHkgbG9hZGVkXG4gICAgICAgIGlmICh0aGlzLmh0bWw1QXVkaW8ucGF1c2VkICYmIHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikge1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcbiAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgfSBlbHNlIGlmICghdGhpcy5odG1sNUF1ZGlvLnBhdXNlZCkge1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG4gICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGF1ZGlvIGZyb20gYXV0aGVudGljYXRlZCBBUEkgZW5kcG9pbnQgdXNpbmcgZmV0Y2ggKyBCZWFyZXIgdG9rZW5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYXBpVXJsIC0gVGhlIEFQSSBVUkwgcmVxdWlyaW5nIGF1dGhlbnRpY2F0aW9uXG4gICAgICovXG4gICAgbG9hZEF1dGhlbnRpY2F0ZWRTb3VyY2UoYXBpVXJsKSB7XG4gICAgICAgIC8vIEJ1aWxkIGZ1bGwgVVJMXG4gICAgICAgIGxldCBmdWxsVXJsO1xuICAgICAgICBpZiAoYXBpVXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKSkge1xuICAgICAgICAgICAgZnVsbFVybCA9IGFwaVVybDtcbiAgICAgICAgfSBlbHNlIGlmIChhcGlVcmwuc3RhcnRzV2l0aCgnL3BieGNvcmUvJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VVcmwgPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgICAgICAgICAgZnVsbFVybCA9IGAke2Jhc2VVcmx9JHthcGlVcmx9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZ1bGxVcmwgPSBgJHtnbG9iYWxSb290VXJsfSR7YXBpVXJsLnJlcGxhY2UoL15cXC8vLCAnJyl9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXBhcmUgaGVhZGVycyB3aXRoIEJlYXJlciB0b2tlblxuICAgICAgICBjb25zdCBoZWFkZXJzID0ge1xuICAgICAgICAgICAgJ1gtUmVxdWVzdGVkLVdpdGgnOiAnWE1MSHR0cFJlcXVlc3QnXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmV0Y2ggYXVkaW8gZmlsZSB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIGZldGNoKGZ1bGxVcmwsIHsgaGVhZGVycyB9KVxuICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfTogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgZHVyYXRpb24gZnJvbSBoZWFkZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb25TZWNvbmRzID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ1gtQXVkaW8tRHVyYXRpb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb25TZWNvbmRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gcGFyc2VGbG9hdChkdXJhdGlvblNlY29uZHMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb24gPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlLnNldFNlY29uZHMocGFyc2VJbnQoZHVyYXRpb24sIDEwKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlU3RyID0gZGF0ZS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmb3JtYXR0ZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWQgPSBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGhvdXJzIDwgMTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWQgPSBkYXRlU3RyLnN1YnN0cigxMiwgNyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZCA9IGRhdGVTdHIuc3Vic3RyKDExLCA4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi50ZXh0KGAwMDowMC8ke2Zvcm1hdHRlZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5ibG9iKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oYmxvYiA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGJsb2IgVVJMIGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBjb25zdCBibG9iVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblxuICAgICAgICAgICAgICAgIC8vIFJldm9rZSBwcmV2aW91cyBibG9iIFVSTCBpZiBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnNyYyAmJiB0aGlzLmh0bWw1QXVkaW8uc3JjLnN0YXJ0c1dpdGgoJ2Jsb2I6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLmh0bWw1QXVkaW8uc3JjKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgYmxvYiBVUkwgZGlyZWN0bHkgdG8gYXVkaW8gZWxlbWVudFxuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5zcmMgPSBibG9iVXJsO1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5sb2FkKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBBdXRvLXBsYXkgYWZ0ZXIgbG9hZGluZ1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5vbmNhbnBsYXl0aHJvdWdoID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5vbmNhbnBsYXl0aHJvdWdoID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yLm1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZS5jZHJfQXVkaW9GaWxlTG9hZEVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERvd25sb2FkIGZpbGUgd2l0aCBhdXRoZW50aWNhdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkb3dubG9hZFVybCAtIERvd25sb2FkIFVSTCByZXF1aXJpbmcgQmVhcmVyIHRva2VuXG4gICAgICovXG4gICAgZG93bmxvYWRGaWxlKGRvd25sb2FkVXJsKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgYW4gQVBJIFVSTCB0aGF0IHJlcXVpcmVzIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIGlmIChkb3dubG9hZFVybC5pbmNsdWRlcygnL3BieGNvcmUvYXBpLycpKSB7XG4gICAgICAgICAgICAvLyBCdWlsZCBmdWxsIFVSTFxuICAgICAgICAgICAgY29uc3QgZnVsbFVybCA9IGRvd25sb2FkVXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKSA/IGRvd25sb2FkVXJsIDogYCR7Z2xvYmFsUm9vdFVybH0ke2Rvd25sb2FkVXJsLnJlcGxhY2UoL15cXC8vLCAnJyl9YDtcblxuICAgICAgICAgICAgLy8gUHJlcGFyZSBoZWFkZXJzIHdpdGggQmVhcmVyIHRva2VuXG4gICAgICAgICAgICBjb25zdCBoZWFkZXJzID0ge1xuICAgICAgICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmV0Y2ggZmlsZSB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICBmZXRjaChmdWxsVXJsLCB7IGhlYWRlcnMgfSlcbiAgICAgICAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c306ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCBmaWxlbmFtZSBmcm9tIENvbnRlbnQtRGlzcG9zaXRpb24gaGVhZGVyIG9yIFVSTFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXNwb3NpdGlvbiA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdDb250ZW50LURpc3Bvc2l0aW9uJyk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBmaWxlbmFtZSA9ICdjYWxsLXJlY29yZC5tcDMnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlzcG9zaXRpb24gJiYgZGlzcG9zaXRpb24uaW5jbHVkZXMoJ2ZpbGVuYW1lPScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRjaGVzID0gL2ZpbGVuYW1lW147PVxcbl0qPSgoWydcIl0pLio/XFwyfFteO1xcbl0qKS8uZXhlYyhkaXNwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWF0Y2hlcyAhPSBudWxsICYmIG1hdGNoZXNbMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZSA9IG1hdGNoZXNbMV0ucmVwbGFjZSgvWydcIl0vZywgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGV4dHJhY3QgZnJvbSBVUkwgcGFyYW1ldGVyc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhkb3dubG9hZFVybC5zcGxpdCgnPycpWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lUGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdmaWxlbmFtZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVuYW1lUGFyYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZSA9IGZpbGVuYW1lUGFyYW07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuYmxvYigpLnRoZW4oYmxvYiA9PiAoeyBibG9iLCBmaWxlbmFtZSB9KSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAudGhlbigoeyBibG9iLCBmaWxlbmFtZSB9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBkb3dubG9hZCBsaW5rXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICAgICAgICAgICAgICBhLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgICAgIGEuaHJlZiA9IHVybDtcbiAgICAgICAgICAgICAgICAgICAgYS5kb3dubG9hZCA9IGZpbGVuYW1lO1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xuICAgICAgICAgICAgICAgICAgICBhLmNsaWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5VUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoYSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3IubWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmNkcl9BdWRpb0ZpbGVEb3dubG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExlZ2FjeSBkaXJlY3QgZmlsZSBVUkwgKG5vIGF1dGggbmVlZGVkKVxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZG93bmxvYWRVcmw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3Igc3JjIG1lZGlhIGVycm9yIGV2ZW50LlxuICAgICAqL1xuICAgIGNiT25TcmNNZWRpYUVycm9yKCkge1xuICAgICAgICAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfVxufSJdfQ==