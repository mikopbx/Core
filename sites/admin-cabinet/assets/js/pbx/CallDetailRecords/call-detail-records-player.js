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
    }); // Add tooltip to slider

    this.initializeTooltip(); // Mark as initialized

    $row.addClass('initialized'); // Load metadata on initialization

    this.loadMetadata();
  }
  /**
   * Initialize tooltip for slider
   */


  _createClass(CDRPlayer, [{
    key: "initializeTooltip",
    value: function initializeTooltip() {
      var _this2 = this;

      // Add tooltip element to slider
      var $tooltip = $('<div class="cdr-slider-tooltip">00:00</div>');
      this.$slider.append($tooltip);
      this.$tooltip = $tooltip; // Update tooltip on mouse move over slider

      this.$slider.on('mousemove', function (e) {
        _this2.updateTooltipPosition(e);
      }); // Show tooltip on mouse enter

      this.$slider.on('mouseenter', function () {
        _this2.$tooltip.css('opacity', '1');
      }); // Hide tooltip on mouse leave (unless dragging)

      this.$slider.on('mouseleave', function () {
        if (!_this2.$slider.hasClass('dragging')) {
          _this2.$tooltip.css('opacity', '0');
        }
      }); // Track dragging state

      this.$slider.on('mousedown', function () {
        _this2.$slider.addClass('dragging');

        _this2.$tooltip.css('opacity', '1');
      });
      $(document).on('mouseup', function () {
        if (_this2.$slider.hasClass('dragging')) {
          _this2.$slider.removeClass('dragging');

          _this2.$tooltip.css('opacity', '0');
        }
      });
    }
    /**
     * Update tooltip position and content
     * @param {Event} e - Mouse event
     */

  }, {
    key: "updateTooltipPosition",
    value: function updateTooltipPosition(e) {
      var sliderOffset = this.$slider.offset();
      var sliderWidth = this.$slider.width();
      var mouseX = e.pageX - sliderOffset.left;
      var percent = Math.max(0, Math.min(100, mouseX / sliderWidth * 100)); // Calculate time at this position

      var duration = this.html5Audio.duration;

      if (Number.isFinite(duration)) {
        var timeSeconds = duration * percent / 100;
        var formattedTime = this.formatTime(timeSeconds);
        this.$tooltip.text(formattedTime);
      } // Position tooltip at mouse position


      this.$tooltip.css('left', "".concat(percent, "%"));
    }
    /**
     * Format time in seconds to MM:SS or HH:MM:SS
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */

  }, {
    key: "formatTime",
    value: function formatTime(seconds) {
      var date = new Date(null);
      date.setSeconds(parseInt(seconds, 10));
      var dateStr = date.toISOString();
      var hours = parseInt(dateStr.substr(11, 2), 10);

      if (hours === 0) {
        return dateStr.substr(14, 5);
      } else if (hours < 10) {
        return dateStr.substr(12, 7);
      } else {
        return dateStr.substr(11, 8);
      }
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
      var _this3 = this;

      var sourceSrc = this.html5Audio.getAttribute('data-src');

      if (!sourceSrc || !sourceSrc.includes('/pbxcore/api/')) {
        return;
      } // Build full URL (REST API paths always start with /pbxcore/)


      var fullUrl = sourceSrc.startsWith('http') ? sourceSrc : "".concat(window.location.origin).concat(sourceSrc); // Prepare headers with Bearer token

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
          // File not found (422) or other error - disable player controls
          _this3.disablePlayer();

          return;
        } // Extract duration from header


        var durationSeconds = response.headers.get('X-Audio-Duration');

        if (durationSeconds) {
          var duration = parseFloat(durationSeconds);

          if (duration > 0) {
            // Set duration on audio element for tooltip functionality
            Object.defineProperty(_this3.html5Audio, 'duration', {
              value: duration,
              writable: false,
              configurable: true
            });
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
      })["catch"](function () {
        // Network error or other failure - disable player controls
        _this3.disablePlayer();
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
      var _this4 = this;

      // Build full URL (REST API paths always start with /pbxcore/)
      var fullUrl = apiUrl.startsWith('http') ? apiUrl : "".concat(window.location.origin).concat(apiUrl); // Prepare headers with Bearer token

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

            _this4.$spanDuration.text("00:00/".concat(formatted));
          }
        }

        return response.blob();
      }).then(function (blob) {
        // Create blob URL from response
        var blobUrl = URL.createObjectURL(blob); // Revoke previous blob URL if exists

        if (_this4.html5Audio.src && _this4.html5Audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(_this4.html5Audio.src);
        } // Set blob URL directly to audio element


        _this4.html5Audio.src = blobUrl;

        _this4.html5Audio.load(); // Auto-play after loading


        _this4.html5Audio.oncanplaythrough = function () {
          _this4.html5Audio.play();

          _this4.$pButton.removeClass('play').addClass('pause');

          _this4.html5Audio.oncanplaythrough = null;
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
        // Build full URL (REST API paths always start with /pbxcore/)
        var fullUrl = downloadUrl.startsWith('http') ? downloadUrl : "".concat(window.location.origin).concat(downloadUrl); // Prepare headers with Bearer token

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
    /**
     * Disable player controls when file is not available
     * Hides play and download buttons, disables only player cells (not entire row)
     */

  }, {
    key: "disablePlayer",
    value: function disablePlayer() {
      // Hide play button
      this.$pButton.hide(); // Hide download button

      this.$dButton.hide(); // Show placeholder in duration span

      this.$spanDuration.text('--:--/--:--').addClass('disabled'); // Disable slider and its parent cell

      this.$slider.addClass('disabled');
      this.$slider.closest('td').addClass('disabled'); // Disable duration cell

      this.$spanDuration.closest('td').addClass('disabled');
    }
  }]);

  return CDRPlayer;
}();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLXBsYXllci5qcyJdLCJuYW1lcyI6WyJDRFJQbGF5ZXIiLCJpZCIsImh0bWw1QXVkaW8iLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiJHJvdyIsIiQiLCJoYXNDbGFzcyIsIiRwQnV0dG9uIiwiZmluZCIsIiRkQnV0dG9uIiwiJHNsaWRlciIsIiRzcGFuRHVyYXRpb24iLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiY2JPbk1ldGFkYXRhTG9hZGVkIiwiY2JUaW1lVXBkYXRlIiwidW5iaW5kIiwib3JpZ2luYWxTcmMiLCJnZXRBdHRyaWJ1dGUiLCJpbmNsdWRlcyIsInNldEF0dHJpYnV0ZSIsInJlbW92ZUF0dHJpYnV0ZSIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicGxheSIsImRvd25sb2FkVXJsIiwidGFyZ2V0IiwiYXR0ciIsImRvd25sb2FkRmlsZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJiaW5kIiwiY2JPblNyY01lZGlhRXJyb3IiLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwic3BhbkR1cmF0aW9uIiwiaW5pdGlhbGl6ZVRvb2x0aXAiLCJhZGRDbGFzcyIsImxvYWRNZXRhZGF0YSIsIiR0b29sdGlwIiwiYXBwZW5kIiwidXBkYXRlVG9vbHRpcFBvc2l0aW9uIiwiY3NzIiwicmVtb3ZlQ2xhc3MiLCJzbGlkZXJPZmZzZXQiLCJvZmZzZXQiLCJzbGlkZXJXaWR0aCIsIndpZHRoIiwibW91c2VYIiwicGFnZVgiLCJsZWZ0IiwicGVyY2VudCIsIk1hdGgiLCJkdXJhdGlvbiIsIk51bWJlciIsImlzRmluaXRlIiwidGltZVNlY29uZHMiLCJmb3JtYXR0ZWRUaW1lIiwiZm9ybWF0VGltZSIsInRleHQiLCJzZWNvbmRzIiwiZGF0ZSIsIkRhdGUiLCJzZXRTZWNvbmRzIiwicGFyc2VJbnQiLCJkYXRlU3RyIiwidG9JU09TdHJpbmciLCJob3VycyIsInN1YnN0ciIsImNsb3Nlc3QiLCJjdXJyZW50VGltZSIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJkYXRlQ3VycmVudCIsImRhdGVEdXJhdGlvbiIsInJhbmdlUG9zaXRpb24iLCJyb3VuZCIsInNvdXJjZVNyYyIsImZ1bGxVcmwiLCJzdGFydHNXaXRoIiwid2luZG93IiwibG9jYXRpb24iLCJvcmlnaW4iLCJoZWFkZXJzIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJmZXRjaCIsIm1ldGhvZCIsInRoZW4iLCJyZXNwb25zZSIsIm9rIiwiZGlzYWJsZVBsYXllciIsImR1cmF0aW9uU2Vjb25kcyIsImdldCIsInBhcnNlRmxvYXQiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsInZhbHVlIiwid3JpdGFibGUiLCJjb25maWd1cmFibGUiLCJmb3JtYXR0ZWQiLCJzcmMiLCJwYXVzZWQiLCJwYXVzZSIsImxvYWRBdXRoZW50aWNhdGVkU291cmNlIiwiYXBpVXJsIiwiRXJyb3IiLCJzdGF0dXMiLCJzdGF0dXNUZXh0IiwiYmxvYiIsImJsb2JVcmwiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJyZXZva2VPYmplY3RVUkwiLCJsb2FkIiwib25jYW5wbGF5dGhyb3VnaCIsImVycm9yIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2RyX0F1ZGlvRmlsZUxvYWRFcnJvciIsImRpc3Bvc2l0aW9uIiwiZmlsZW5hbWUiLCJtYXRjaGVzIiwiZXhlYyIsInJlcGxhY2UiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzcGxpdCIsImZpbGVuYW1lUGFyYW0iLCJ1cmwiLCJhIiwiY3JlYXRlRWxlbWVudCIsInN0eWxlIiwiZGlzcGxheSIsImhyZWYiLCJkb3dubG9hZCIsImJvZHkiLCJhcHBlbmRDaGlsZCIsImNsaWNrIiwicmVtb3ZlQ2hpbGQiLCJjZHJfQXVkaW9G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ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qKlxuICogQ0RSUGxheWVyIGNsYXNzLlxuICovXG5jbGFzcyBDRFJQbGF5ZXIge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBpbnN0YW5jZSBvZiBDRFJQbGF5ZXIuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIElEIG9mIHRoZSBwbGF5ZXIuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoaWQpIHtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgYXVkaW8tcGxheWVyLSR7aWR9YCk7XG4gICAgICAgIGNvbnN0ICRyb3cgPSAkKGAjJHtpZH1gKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluaXRpYWxpemVkIHRvIHByZXZlbnQgZG91YmxlIHByb2Nlc3NpbmdcbiAgICAgICAgaWYgKCRyb3cuaGFzQ2xhc3MoJ2luaXRpYWxpemVkJykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuJHBCdXR0b24gPSAkcm93LmZpbmQoJ2kucGxheScpOyAvLyBQbGF5IGJ1dHRvblxuICAgICAgICB0aGlzLiRkQnV0dG9uID0gJHJvdy5maW5kKCdpLmRvd25sb2FkJyk7IC8vIERvd25sb2FkIGJ1dHRvblxuICAgICAgICB0aGlzLiRzbGlkZXIgPSAkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJyk7IC8vIFNsaWRlciBlbGVtZW50XG4gICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbiA9ICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKTsgLy8gRHVyYXRpb24gc3BhbiBlbGVtZW50XG5cbiAgICAgICAgLy8gQ2xlYW4gdXAgcHJldmlvdXMgZXZlbnQgbGlzdGVuZXJzXG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYk9uTWV0YWRhdGFMb2FkZWQsIGZhbHNlKTtcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICAgICAgdGhpcy4kcEJ1dHRvbi51bmJpbmQoKTtcbiAgICAgICAgdGhpcy4kZEJ1dHRvbi51bmJpbmQoKTtcblxuICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBzcmMgaW4gZGF0YS1zcmMgYXR0cmlidXRlIGZvciBhdXRoZW50aWNhdGVkIGxvYWRpbmdcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxTcmMgPSB0aGlzLmh0bWw1QXVkaW8uZ2V0QXR0cmlidXRlKCdzcmMnKTtcbiAgICAgICAgaWYgKG9yaWdpbmFsU3JjICYmIG9yaWdpbmFsU3JjLmluY2x1ZGVzKCcvcGJ4Y29yZS9hcGkvJykpIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5zZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJywgb3JpZ2luYWxTcmMpO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUF0dHJpYnV0ZSgnc3JjJyk7IC8vIFJlbW92ZSBkaXJlY3Qgc3JjXG4gICAgICAgIH1cblxuICAgICAgICAvLyBQbGF5IGJ1dHRvbiBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLiRwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLnBsYXkoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRG93bmxvYWQgYnV0dG9uIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuJGRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IGRvd25sb2FkVXJsID0gJChlLnRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKGRvd25sb2FkVXJsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kb3dubG9hZEZpbGUoZG93bmxvYWRVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBMb2FkZWQgbWV0YWRhdGEgZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYk9uTWV0YWRhdGFMb2FkZWQuYmluZCh0aGlzKSwgZmFsc2UpO1xuXG4gICAgICAgIC8vIHRpbWV1cGRhdGUgZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXG4gICAgICAgIC8vIG5vIHNyYyBoYW5kbGVyXG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIHRoaXMuY2JPblNyY01lZGlhRXJyb3IsIGZhbHNlKTtcblxuICAgICAgICB0aGlzLiRzbGlkZXIucmFuZ2Uoe1xuICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgbWF4OiAxMDAsXG4gICAgICAgICAgICBzdGFydDogMCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiB0aGlzLmNiT25TbGlkZXJDaGFuZ2UsXG4gICAgICAgICAgICBodG1sNUF1ZGlvOiB0aGlzLmh0bWw1QXVkaW8sXG4gICAgICAgICAgICBjYlRpbWVVcGRhdGU6IHRoaXMuY2JUaW1lVXBkYXRlLFxuICAgICAgICAgICAgc3BhbkR1cmF0aW9uOiB0aGlzLiRzcGFuRHVyYXRpb24sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCB0b29sdGlwIHRvIHNsaWRlclxuICAgICAgICB0aGlzLmluaXRpYWxpemVUb29sdGlwKCk7XG5cbiAgICAgICAgLy8gTWFyayBhcyBpbml0aWFsaXplZFxuICAgICAgICAkcm93LmFkZENsYXNzKCdpbml0aWFsaXplZCcpO1xuXG4gICAgICAgIC8vIExvYWQgbWV0YWRhdGEgb24gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdGhpcy5sb2FkTWV0YWRhdGEoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXAgZm9yIHNsaWRlclxuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwKCkge1xuICAgICAgICAvLyBBZGQgdG9vbHRpcCBlbGVtZW50IHRvIHNsaWRlclxuICAgICAgICBjb25zdCAkdG9vbHRpcCA9ICQoJzxkaXYgY2xhc3M9XCJjZHItc2xpZGVyLXRvb2x0aXBcIj4wMDowMDwvZGl2PicpO1xuICAgICAgICB0aGlzLiRzbGlkZXIuYXBwZW5kKCR0b29sdGlwKTtcbiAgICAgICAgdGhpcy4kdG9vbHRpcCA9ICR0b29sdGlwO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB0b29sdGlwIG9uIG1vdXNlIG1vdmUgb3ZlciBzbGlkZXJcbiAgICAgICAgdGhpcy4kc2xpZGVyLm9uKCdtb3VzZW1vdmUnLCAoZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVUb29sdGlwUG9zaXRpb24oZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNob3cgdG9vbHRpcCBvbiBtb3VzZSBlbnRlclxuICAgICAgICB0aGlzLiRzbGlkZXIub24oJ21vdXNlZW50ZXInLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiR0b29sdGlwLmNzcygnb3BhY2l0eScsICcxJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhpZGUgdG9vbHRpcCBvbiBtb3VzZSBsZWF2ZSAodW5sZXNzIGRyYWdnaW5nKVxuICAgICAgICB0aGlzLiRzbGlkZXIub24oJ21vdXNlbGVhdmUnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuJHNsaWRlci5oYXNDbGFzcygnZHJhZ2dpbmcnKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuJHRvb2x0aXAuY3NzKCdvcGFjaXR5JywgJzAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVHJhY2sgZHJhZ2dpbmcgc3RhdGVcbiAgICAgICAgdGhpcy4kc2xpZGVyLm9uKCdtb3VzZWRvd24nLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRzbGlkZXIuYWRkQ2xhc3MoJ2RyYWdnaW5nJyk7XG4gICAgICAgICAgICB0aGlzLiR0b29sdGlwLmNzcygnb3BhY2l0eScsICcxJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdtb3VzZXVwJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuJHNsaWRlci5oYXNDbGFzcygnZHJhZ2dpbmcnKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuJHNsaWRlci5yZW1vdmVDbGFzcygnZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgICAgICB0aGlzLiR0b29sdGlwLmNzcygnb3BhY2l0eScsICcwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0b29sdGlwIHBvc2l0aW9uIGFuZCBjb250ZW50XG4gICAgICogQHBhcmFtIHtFdmVudH0gZSAtIE1vdXNlIGV2ZW50XG4gICAgICovXG4gICAgdXBkYXRlVG9vbHRpcFBvc2l0aW9uKGUpIHtcbiAgICAgICAgY29uc3Qgc2xpZGVyT2Zmc2V0ID0gdGhpcy4kc2xpZGVyLm9mZnNldCgpO1xuICAgICAgICBjb25zdCBzbGlkZXJXaWR0aCA9IHRoaXMuJHNsaWRlci53aWR0aCgpO1xuICAgICAgICBjb25zdCBtb3VzZVggPSBlLnBhZ2VYIC0gc2xpZGVyT2Zmc2V0LmxlZnQ7XG4gICAgICAgIGNvbnN0IHBlcmNlbnQgPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxMDAsIChtb3VzZVggLyBzbGlkZXJXaWR0aCkgKiAxMDApKTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgdGltZSBhdCB0aGlzIHBvc2l0aW9uXG4gICAgICAgIGNvbnN0IGR1cmF0aW9uID0gdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uO1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKGR1cmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgdGltZVNlY29uZHMgPSAoZHVyYXRpb24gKiBwZXJjZW50KSAvIDEwMDtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFRpbWUgPSB0aGlzLmZvcm1hdFRpbWUodGltZVNlY29uZHMpO1xuICAgICAgICAgICAgdGhpcy4kdG9vbHRpcC50ZXh0KGZvcm1hdHRlZFRpbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUG9zaXRpb24gdG9vbHRpcCBhdCBtb3VzZSBwb3NpdGlvblxuICAgICAgICB0aGlzLiR0b29sdGlwLmNzcygnbGVmdCcsIGAke3BlcmNlbnR9JWApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB0aW1lIGluIHNlY29uZHMgdG8gTU06U1Mgb3IgSEg6TU06U1NcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2Vjb25kcyAtIFRpbWUgaW4gc2Vjb25kc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdHRlZCB0aW1lIHN0cmluZ1xuICAgICAqL1xuICAgIGZvcm1hdFRpbWUoc2Vjb25kcykge1xuICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG4gICAgICAgIGRhdGUuc2V0U2Vjb25kcyhwYXJzZUludChzZWNvbmRzLCAxMCkpO1xuICAgICAgICBjb25zdCBkYXRlU3RyID0gZGF0ZS50b0lTT1N0cmluZygpO1xuICAgICAgICBjb25zdCBob3VycyA9IHBhcnNlSW50KGRhdGVTdHIuc3Vic3RyKDExLCAyKSwgMTApO1xuXG4gICAgICAgIGlmIChob3VycyA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGVTdHIuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgfSBlbHNlIGlmIChob3VycyA8IDEwKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0ZVN0ci5zdWJzdHIoMTIsIDcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGVTdHIuc3Vic3RyKDExLCA4KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciBtZXRhZGF0YSBsb2FkZWQgZXZlbnQuXG4gICAgICovXG4gICAgY2JPbk1ldGFkYXRhTG9hZGVkKCkge1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKG51bGwpO1xuICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKHBhcnNlSW50KHRoaXMuY3VycmVudFRpbWUsIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuICAgICAgICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIGRhdGUuc2V0U2Vjb25kcyhwYXJzZUludCh0aGlzLmR1cmF0aW9uLCAxMCkpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcbiAgICAgICAgICAgIGNvbnN0IGRhdGVTdHIgPSBkYXRlLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICBjb25zdCBob3VycyA9IHBhcnNlSW50KGRhdGVTdHIuc3Vic3RyKDExLCAyKSwgMTApO1xuICAgICAgICAgICAgbGV0IGR1cmF0aW9uO1xuICAgICAgICAgICAgaWYgKGhvdXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhvdXJzIDwgMTApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDEyLCA3KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPj0gMTApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDExLCA4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKS50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIHNsaWRlciBjaGFuZ2UgZXZlbnQuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG5ld1ZhbCAtIFRoZSBuZXcgdmFsdWUgb2YgdGhlIHNsaWRlci5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbWV0YSAtIEFkZGl0aW9uYWwgbWV0YWRhdGEuXG4gICAgICovXG4gICAgY2JPblNsaWRlckNoYW5nZShuZXdWYWwsIG1ldGEpIHtcbiAgICAgICAgaWYgKG1ldGEudHJpZ2dlcmVkQnlVc2VyICYmIE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgPSAodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uICogbmV3VmFsKSAvIDEwMDtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVDdXJyZW50ID0gbmV3IERhdGUobnVsbCk7XG4gICAgICAgICAgICBkYXRlQ3VycmVudC5zZXRTZWNvbmRzKHBhcnNlSW50KHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSwgMTApKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VGltZSA9IGRhdGVDdXJyZW50LnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVEdXJhdGlvbiA9IG5ldyBEYXRlKG51bGwpO1xuICAgICAgICAgICAgZGF0ZUR1cmF0aW9uLnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uLCAxMCkpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcbiAgICAgICAgICAgIGNvbnN0IGRhdGVTdHIgPSBkYXRlRHVyYXRpb24udG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gcGFyc2VJbnQoZGF0ZVN0ci5zdWJzdHIoMTEsIDIpLCAxMCk7XG4gICAgICAgICAgICBsZXQgZHVyYXRpb247XG4gICAgICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTIsIDcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChob3VycyA+PSAxMCkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTEsIDgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zcGFuRHVyYXRpb24udGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciB0aW1lIHVwZGF0ZSBldmVudC5cbiAgICAgKi9cbiAgICBjYlRpbWVVcGRhdGUoKSB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSB0aGlzLmN1cnJlbnRUaW1lIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlUG9zaXRpb24gPSBNYXRoLm1pbihNYXRoLnJvdW5kKChwZXJjZW50KSAqIDEwMCksIDEwMCk7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgJHJvdy5maW5kKCdkaXYuY2RyLXBsYXllcicpLnJhbmdlKCdzZXQgdmFsdWUnLCByYW5nZVBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRUaW1lID09PSB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCdpLnBhdXNlJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgbWV0YWRhdGEgKGR1cmF0aW9uKSB3aXRob3V0IGxvYWRpbmcgdGhlIGZ1bGwgYXVkaW8gZmlsZS5cbiAgICAgKiBNYWtlcyBhIEhFQUQgcmVxdWVzdCB0byBnZXQgWC1BdWRpby1EdXJhdGlvbiBoZWFkZXIuXG4gICAgICovXG4gICAgbG9hZE1ldGFkYXRhKCkge1xuICAgICAgICBjb25zdCBzb3VyY2VTcmMgPSB0aGlzLmh0bWw1QXVkaW8uZ2V0QXR0cmlidXRlKCdkYXRhLXNyYycpO1xuICAgICAgICBpZiAoIXNvdXJjZVNyYyB8fCAhc291cmNlU3JjLmluY2x1ZGVzKCcvcGJ4Y29yZS9hcGkvJykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIGZ1bGwgVVJMIChSRVNUIEFQSSBwYXRocyBhbHdheXMgc3RhcnQgd2l0aCAvcGJ4Y29yZS8pXG4gICAgICAgIGNvbnN0IGZ1bGxVcmwgPSBzb3VyY2VTcmMuc3RhcnRzV2l0aCgnaHR0cCcpXG4gICAgICAgICAgICA/IHNvdXJjZVNyY1xuICAgICAgICAgICAgOiBgJHt3aW5kb3cubG9jYXRpb24ub3JpZ2lufSR7c291cmNlU3JjfWA7XG5cbiAgICAgICAgLy8gUHJlcGFyZSBoZWFkZXJzIHdpdGggQmVhcmVyIHRva2VuXG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCdcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYWtlIEhFQUQgcmVxdWVzdCB0byBnZXQgb25seSBoZWFkZXJzIChubyBib2R5IGRvd25sb2FkKVxuICAgICAgICBmZXRjaChmdWxsVXJsLCB7XG4gICAgICAgICAgICBtZXRob2Q6ICdIRUFEJyxcbiAgICAgICAgICAgIGhlYWRlcnNcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgIC8vIEZpbGUgbm90IGZvdW5kICg0MjIpIG9yIG90aGVyIGVycm9yIC0gZGlzYWJsZSBwbGF5ZXIgY29udHJvbHNcbiAgICAgICAgICAgICAgICB0aGlzLmRpc2FibGVQbGF5ZXIoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgZHVyYXRpb24gZnJvbSBoZWFkZXJcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uU2Vjb25kcyA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdYLUF1ZGlvLUR1cmF0aW9uJyk7XG4gICAgICAgICAgICBpZiAoZHVyYXRpb25TZWNvbmRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBwYXJzZUZsb2F0KGR1cmF0aW9uU2Vjb25kcyk7XG4gICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZHVyYXRpb24gb24gYXVkaW8gZWxlbWVudCBmb3IgdG9vbHRpcCBmdW5jdGlvbmFsaXR5XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLmh0bWw1QXVkaW8sICdkdXJhdGlvbicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBkdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIGRhdGUuc2V0U2Vjb25kcyhwYXJzZUludChkdXJhdGlvbiwgMTApKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGRhdGUudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZvcm1hdHRlZDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhvdXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWQgPSBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkID0gZGF0ZVN0ci5zdWJzdHIoMTIsIDcpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkID0gZGF0ZVN0ci5zdWJzdHIoMTEsIDgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi50ZXh0KGAwMDowMC8ke2Zvcm1hdHRlZH1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBOZXR3b3JrIGVycm9yIG9yIG90aGVyIGZhaWx1cmUgLSBkaXNhYmxlIHBsYXllciBjb250cm9sc1xuICAgICAgICAgICAgdGhpcy5kaXNhYmxlUGxheWVyKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBsYXlzIG9yIHBhdXNlcyB0aGUgYXVkaW8gZmlsZS5cbiAgICAgKi9cbiAgICBwbGF5KCkge1xuICAgICAgICAvLyBDaGVjayBpZiBhdWRpbyBhbHJlYWR5IGhhcyBhIGJsb2Igc291cmNlIGxvYWRlZFxuICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnNyYyAmJiB0aGlzLmh0bWw1QXVkaW8uc3JjLnN0YXJ0c1dpdGgoJ2Jsb2I6JykpIHtcbiAgICAgICAgICAgIC8vIEJsb2IgYWxyZWFkeSBsb2FkZWQsIGp1c3QgdG9nZ2xlIHBsYXkvcGF1c2VcbiAgICAgICAgICAgIGlmICh0aGlzLmh0bWw1QXVkaW8ucGF1c2VkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wYXVzZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5lZWQgdG8gbG9hZCBzb3VyY2UgZmlyc3RcbiAgICAgICAgbGV0IHNvdXJjZVNyYyA9IHRoaXMuaHRtbDVBdWRpby5nZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJykgfHwgJyc7XG5cbiAgICAgICAgLy8gSWYgc291cmNlIGlzIGFuIEFQSSBlbmRwb2ludCwgbG9hZCB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIGlmIChzb3VyY2VTcmMgJiYgc291cmNlU3JjLmluY2x1ZGVzKCcvcGJ4Y29yZS9hcGkvJykpIHtcbiAgICAgICAgICAgIHRoaXMubG9hZEF1dGhlbnRpY2F0ZWRTb3VyY2Uoc291cmNlU3JjKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrIGZvciBub24tQVBJIHNvdXJjZXMgb3IgYWxyZWFkeSBsb2FkZWRcbiAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQgJiYgdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLmh0bWw1QXVkaW8ucGF1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcbiAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgYXVkaW8gZnJvbSBhdXRoZW50aWNhdGVkIEFQSSBlbmRwb2ludCB1c2luZyBmZXRjaCArIEJlYXJlciB0b2tlblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhcGlVcmwgLSBUaGUgQVBJIFVSTCByZXF1aXJpbmcgYXV0aGVudGljYXRpb25cbiAgICAgKi9cbiAgICBsb2FkQXV0aGVudGljYXRlZFNvdXJjZShhcGlVcmwpIHtcbiAgICAgICAgLy8gQnVpbGQgZnVsbCBVUkwgKFJFU1QgQVBJIHBhdGhzIGFsd2F5cyBzdGFydCB3aXRoIC9wYnhjb3JlLylcbiAgICAgICAgY29uc3QgZnVsbFVybCA9IGFwaVVybC5zdGFydHNXaXRoKCdodHRwJylcbiAgICAgICAgICAgID8gYXBpVXJsXG4gICAgICAgICAgICA6IGAke3dpbmRvdy5sb2NhdGlvbi5vcmlnaW59JHthcGlVcmx9YDtcblxuICAgICAgICAvLyBQcmVwYXJlIGhlYWRlcnMgd2l0aCBCZWFyZXIgdG9rZW5cbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIGF1ZGlvIGZpbGUgd2l0aCBhdXRoZW50aWNhdGlvblxuICAgICAgICBmZXRjaChmdWxsVXJsLCB7IGhlYWRlcnMgfSlcbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c306ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IGR1cmF0aW9uIGZyb20gaGVhZGVyIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uU2Vjb25kcyA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdYLUF1ZGlvLUR1cmF0aW9uJyk7XG4gICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uU2Vjb25kcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHBhcnNlRmxvYXQoZHVyYXRpb25TZWNvbmRzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKHBhcnNlSW50KGR1cmF0aW9uLCAxMCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGRhdGUudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gcGFyc2VJbnQoZGF0ZVN0ci5zdWJzdHIoMTEsIDIpLCAxMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZm9ybWF0dGVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhvdXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkID0gZGF0ZVN0ci5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChob3VycyA8IDEwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkID0gZGF0ZVN0ci5zdWJzdHIoMTIsIDcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWQgPSBkYXRlU3RyLnN1YnN0cigxMSwgOCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRzcGFuRHVyYXRpb24udGV4dChgMDA6MDAvJHtmb3JtYXR0ZWR9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuYmxvYigpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKGJsb2IgPT4ge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBibG9iIFVSTCBmcm9tIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgY29uc3QgYmxvYlVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cbiAgICAgICAgICAgICAgICAvLyBSZXZva2UgcHJldmlvdXMgYmxvYiBVUkwgaWYgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5zcmMgJiYgdGhpcy5odG1sNUF1ZGlvLnNyYy5zdGFydHNXaXRoKCdibG9iOicpKSB7XG4gICAgICAgICAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodGhpcy5odG1sNUF1ZGlvLnNyYyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IGJsb2IgVVJMIGRpcmVjdGx5IHRvIGF1ZGlvIGVsZW1lbnRcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uc3JjID0gYmxvYlVybDtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ubG9hZCgpO1xuXG4gICAgICAgICAgICAgICAgLy8gQXV0by1wbGF5IGFmdGVyIGxvYWRpbmdcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ub25jYW5wbGF5dGhyb3VnaCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ub25jYW5wbGF5dGhyb3VnaCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhlcnJvci5tZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuY2RyX0F1ZGlvRmlsZUxvYWRFcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEb3dubG9hZCBmaWxlIHdpdGggYXV0aGVudGljYXRpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZG93bmxvYWRVcmwgLSBEb3dubG9hZCBVUkwgcmVxdWlyaW5nIEJlYXJlciB0b2tlblxuICAgICAqL1xuICAgIGRvd25sb2FkRmlsZShkb3dubG9hZFVybCkge1xuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIGFuIEFQSSBVUkwgdGhhdCByZXF1aXJlcyBhdXRoZW50aWNhdGlvblxuICAgICAgICBpZiAoZG93bmxvYWRVcmwuaW5jbHVkZXMoJy9wYnhjb3JlL2FwaS8nKSkge1xuICAgICAgICAgICAgLy8gQnVpbGQgZnVsbCBVUkwgKFJFU1QgQVBJIHBhdGhzIGFsd2F5cyBzdGFydCB3aXRoIC9wYnhjb3JlLylcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxVcmwgPSBkb3dubG9hZFVybC5zdGFydHNXaXRoKCdodHRwJylcbiAgICAgICAgICAgICAgICA/IGRvd25sb2FkVXJsXG4gICAgICAgICAgICAgICAgOiBgJHt3aW5kb3cubG9jYXRpb24ub3JpZ2lufSR7ZG93bmxvYWRVcmx9YDtcblxuICAgICAgICAgICAgLy8gUHJlcGFyZSBoZWFkZXJzIHdpdGggQmVhcmVyIHRva2VuXG4gICAgICAgICAgICBjb25zdCBoZWFkZXJzID0ge1xuICAgICAgICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmV0Y2ggZmlsZSB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICBmZXRjaChmdWxsVXJsLCB7IGhlYWRlcnMgfSlcbiAgICAgICAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c306ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCBmaWxlbmFtZSBmcm9tIENvbnRlbnQtRGlzcG9zaXRpb24gaGVhZGVyIG9yIFVSTFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXNwb3NpdGlvbiA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdDb250ZW50LURpc3Bvc2l0aW9uJyk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBmaWxlbmFtZSA9ICdjYWxsLXJlY29yZC5tcDMnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlzcG9zaXRpb24gJiYgZGlzcG9zaXRpb24uaW5jbHVkZXMoJ2ZpbGVuYW1lPScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRjaGVzID0gL2ZpbGVuYW1lW147PVxcbl0qPSgoWydcIl0pLio/XFwyfFteO1xcbl0qKS8uZXhlYyhkaXNwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWF0Y2hlcyAhPSBudWxsICYmIG1hdGNoZXNbMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZSA9IG1hdGNoZXNbMV0ucmVwbGFjZSgvWydcIl0vZywgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGV4dHJhY3QgZnJvbSBVUkwgcGFyYW1ldGVyc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhkb3dubG9hZFVybC5zcGxpdCgnPycpWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lUGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdmaWxlbmFtZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVuYW1lUGFyYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZSA9IGZpbGVuYW1lUGFyYW07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuYmxvYigpLnRoZW4oYmxvYiA9PiAoeyBibG9iLCBmaWxlbmFtZSB9KSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAudGhlbigoeyBibG9iLCBmaWxlbmFtZSB9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBkb3dubG9hZCBsaW5rXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICAgICAgICAgICAgICBhLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgICAgIGEuaHJlZiA9IHVybDtcbiAgICAgICAgICAgICAgICAgICAgYS5kb3dubG9hZCA9IGZpbGVuYW1lO1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xuICAgICAgICAgICAgICAgICAgICBhLmNsaWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5VUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoYSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3IubWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmNkcl9BdWRpb0ZpbGVEb3dubG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExlZ2FjeSBkaXJlY3QgZmlsZSBVUkwgKG5vIGF1dGggbmVlZGVkKVxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZG93bmxvYWRVcmw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3Igc3JjIG1lZGlhIGVycm9yIGV2ZW50LlxuICAgICAqL1xuICAgIGNiT25TcmNNZWRpYUVycm9yKCkge1xuICAgICAgICAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGlzYWJsZSBwbGF5ZXIgY29udHJvbHMgd2hlbiBmaWxlIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgKiBIaWRlcyBwbGF5IGFuZCBkb3dubG9hZCBidXR0b25zLCBkaXNhYmxlcyBvbmx5IHBsYXllciBjZWxscyAobm90IGVudGlyZSByb3cpXG4gICAgICovXG4gICAgZGlzYWJsZVBsYXllcigpIHtcbiAgICAgICAgLy8gSGlkZSBwbGF5IGJ1dHRvblxuICAgICAgICB0aGlzLiRwQnV0dG9uLmhpZGUoKTtcblxuICAgICAgICAvLyBIaWRlIGRvd25sb2FkIGJ1dHRvblxuICAgICAgICB0aGlzLiRkQnV0dG9uLmhpZGUoKTtcblxuICAgICAgICAvLyBTaG93IHBsYWNlaG9sZGVyIGluIGR1cmF0aW9uIHNwYW5cbiAgICAgICAgdGhpcy4kc3BhbkR1cmF0aW9uLnRleHQoJy0tOi0tLy0tOi0tJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgLy8gRGlzYWJsZSBzbGlkZXIgYW5kIGl0cyBwYXJlbnQgY2VsbFxuICAgICAgICB0aGlzLiRzbGlkZXIuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuJHNsaWRlci5jbG9zZXN0KCd0ZCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgIC8vIERpc2FibGUgZHVyYXRpb24gY2VsbFxuICAgICAgICB0aGlzLiRzcGFuRHVyYXRpb24uY2xvc2VzdCgndGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9XG59Il19