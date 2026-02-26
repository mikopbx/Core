"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
    var $row = $("#".concat(id)); // Track current audio format (webm, mp3, wav)

    this.currentFormat = null; // Web Audio API for mono mixing
    // WHY: Automatically mix stereo recordings (left=external, right=internal) to mono
    // This makes both speakers audible in single channel for easier listening

    this.audioContext = null;
    this.sourceNode = null;
    this.gainNode = null; // Check if already initialized to prevent double processing

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
    }); // Initialize download format dropdown

    var $downloadDropdown = $row.find('.download-format-dropdown');

    if ($downloadDropdown.length > 0) {
      $downloadDropdown.dropdown({
        action: 'hide',
        onChange: function onChange(value, text, $choice) {
          var format = $choice.data('format');
          var downloadUrl = $downloadDropdown.data('download-url');

          if (downloadUrl && format) {
            _this.downloadFile(downloadUrl, format);
          }
        }
      });
    } // Legacy: Download button event listener (for old UI without dropdown)


    this.$dButton.on('click', function (e) {
      e.preventDefault();
      var downloadUrl = $(e.target).attr('data-value');

      if (downloadUrl) {
        // Download in WebM format by default
        _this.downloadFile(downloadUrl, 'webm');
      }
    }); // Loaded metadata event listener

    this.html5Audio.addEventListener('loadedmetadata', this.cbOnMetadataLoaded.bind(this), false); // timeupdate event listener

    this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false); // ended event listener - clear currently playing reference

    this.html5Audio.addEventListener('ended', function () {
      if (CDRPlayer.currentlyPlaying === _this) {
        CDRPlayer.currentlyPlaying = null;
      }
    }, false); // no src handler

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
     * Detect audio format from Content-Type header
     * @param {string} contentType - Content-Type header value
     * @returns {string} Format identifier: 'webm', 'mp3', 'wav', or 'unknown'
     */

  }, {
    key: "detectAudioFormat",
    value: function detectAudioFormat(contentType) {
      if (!contentType) return 'unknown';
      var lowerType = contentType.toLowerCase();
      if (lowerType.includes('audio/webm')) return 'webm';
      if (lowerType.includes('audio/mpeg') || lowerType.includes('audio/mp3')) return 'mp3';
      if (lowerType.includes('audio/wav') || lowerType.includes('audio/x-wav')) return 'wav';
      return 'unknown';
    }
    /**
     * Update format badge display
     * @param {string} format - Audio format (webm, mp3, wav)
     */

  }, {
    key: "updateFormatBadge",
    value: function updateFormatBadge(format) {
      var $row = $("#".concat(this.id));
      var $badge = $row.find('.audio-format-badge'); // Create badge if doesn't exist

      if ($badge.length === 0) {
        $badge = $('<span class="ui mini label audio-format-badge"></span>');
        this.$spanDuration.before($badge);
      } // Update badge content and style


      var formatUpper = format.toUpperCase();
      $badge.text(formatUpper); // Remove previous format classes

      $badge.removeClass('green orange blue grey'); // Apply color based on format

      switch (format) {
        case 'webm':
          $badge.addClass('green'); // Modern format

          break;

        case 'mp3':
          $badge.addClass('orange'); // Legacy compressed

          break;

        case 'wav':
          $badge.addClass('blue'); // Uncompressed

          break;

        default:
          $badge.addClass('grey');
        // Unknown
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
        } // Detect format from Content-Type header (moved from loadAuthenticatedSource)


        var contentType = response.headers.get('Content-Type');
        _this3.currentFormat = _this3.detectAudioFormat(contentType);

        if (_this3.currentFormat && _this3.currentFormat !== 'unknown') {
          _this3.updateFormatBadge(_this3.currentFormat);
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
     * Stop playback (called from static stopOthers method)
     */

  }, {
    key: "stopPlayback",
    value: function stopPlayback() {
      if (!this.html5Audio.paused) {
        this.html5Audio.pause();
        this.$pButton.removeClass('pause').addClass('play');
      }
    }
    /**
     * Clean up Web Audio API nodes
     */

  }, {
    key: "cleanupAudioNodes",
    value: function cleanupAudioNodes() {
      if (this.scriptProcessor) {
        try {
          // Disconnect all nodes
          this.scriptProcessor.disconnect();
          this.scriptProcessor.onaudioprocess = null;
          this.scriptProcessor = null;
        } catch (e) {// Ignore cleanup errors
        }
      }

      if (this.sourceNode) {
        try {
          this.sourceNode.disconnect();
        } catch (e) {// Ignore cleanup errors
        }
      }

      if (this.gainNode) {
        try {
          this.gainNode.disconnect();
        } catch (e) {// Ignore cleanup errors
        }
      }
    }
    /**
     * Plays or pauses the audio file.
     */

  }, {
    key: "play",
    value: function play() {
      // Check if audio already has a source loaded (direct URL or blob)
      var currentSrc = this.html5Audio.getAttribute('src');

      if (currentSrc) {
        // Source already loaded, just toggle play/pause
        if (this.html5Audio.paused) {
          // Stop all other players before playing this one
          CDRPlayer.stopOthers(this);
          this.html5Audio.play();
          this.$pButton.removeClass('play').addClass('pause');
        } else {
          // Pausing - clear currently playing reference
          this.html5Audio.pause();
          this.$pButton.removeClass('pause').addClass('play');

          if (CDRPlayer.currentlyPlaying === this) {
            CDRPlayer.currentlyPlaying = null;
          }
        }

        return;
      } // Need to load source first


      var sourceSrc = this.html5Audio.getAttribute('data-src') || ''; // If source is an API endpoint with token, load it directly
      // WHY: Token-based URLs already contain all necessary information

      if (sourceSrc && sourceSrc.includes('/pbxcore/api/')) {
        // Stop all other players before loading new source
        CDRPlayer.stopOthers(this);
        this.loadAuthenticatedSource(sourceSrc);
        return;
      } // Fallback for non-API sources or already loaded


      if (this.html5Audio.paused && this.html5Audio.duration) {
        CDRPlayer.stopOthers(this);
        this.html5Audio.play();
        this.$pButton.removeClass('play').addClass('pause');
      } else if (!this.html5Audio.paused) {
        this.html5Audio.pause();
        this.$pButton.removeClass('pause').addClass('play');

        if (CDRPlayer.currentlyPlaying === this) {
          CDRPlayer.currentlyPlaying = null;
        }
      }
    }
    /**
     * Initialize Web Audio API for mono mixing
     * WHY: Stereo call recordings have external channel (left) and internal channel (right)
     * Mixing to mono makes both speakers audible in single channel for easier listening
     *
     * APPROACH: Use simple gain-based downmixing
     * Most reliable method that works with all audio formats including WebM/Opus
     */

  }, {
    key: "setupMonoMixer",
    value: function setupMonoMixer() {
      try {
        // Create audio context if not exists
        if (!this.audioContext) {
          var AudioContext = window.AudioContext || window.webkitAudioContext;
          this.audioContext = new AudioContext();
        } // Create source node from audio element (can only be created once!)


        if (!this.sourceNode) {
          this.sourceNode = this.audioContext.createMediaElementSource(this.html5Audio);
        } // Disconnect previous connections if they exist


        if (this.gainNode) {
          try {
            this.sourceNode.disconnect();
            this.gainNode.disconnect();
          } catch (e) {// Ignore disconnect errors
          }
        } // Create a ScriptProcessorNode with 2 input channels and 2 output channels
        // Buffer size of 4096 for good balance between latency and performance


        var bufferSize = 4096;
        var scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 2, 2); // Store reference for cleanup

        this.scriptProcessor = scriptProcessor; // Process audio with 65/35 channel mixing for better transcription listening
        // Left ear: 65% left + 35% right, Right ear: 35% left + 65% right

        scriptProcessor.onaudioprocess = function (audioProcessingEvent) {
          var inputBuffer = audioProcessingEvent.inputBuffer;
          var outputBuffer = audioProcessingEvent.outputBuffer; // Get number of channels in the buffer

          var inputChannelCount = inputBuffer.numberOfChannels;
          var outputChannelCount = outputBuffer.numberOfChannels; // Handle different channel configurations

          if (inputChannelCount === 1) {
            // Input is already mono - copy to both output channels
            var inputMono = inputBuffer.getChannelData(0);
            var outputL = outputBuffer.getChannelData(0);
            var outputR = outputChannelCount > 1 ? outputBuffer.getChannelData(1) : null;

            for (var i = 0; i < inputMono.length; i++) {
              outputL[i] = inputMono[i];

              if (outputR) {
                outputR[i] = inputMono[i];
              }
            }
          } else if (inputChannelCount >= 2) {
            // Input is stereo or multi-channel - apply 65/35 mixing
            var inputL = inputBuffer.getChannelData(0);
            var inputR = inputBuffer.getChannelData(1);

            var _outputL = outputBuffer.getChannelData(0);

            var _outputR = outputChannelCount > 1 ? outputBuffer.getChannelData(1) : null; // Apply 65/35 mixing for near-mono experience with subtle directional cues


            for (var _i = 0; _i < inputL.length; _i++) {
              // Left ear receives 65% left + 35% right
              _outputL[_i] = inputL[_i] * 0.65 + inputR[_i] * 0.35; // Right ear receives 35% left + 65% right

              if (_outputR) {
                _outputR[_i] = inputL[_i] * 0.35 + inputR[_i] * 0.65;
              }
            }
          }
        }; // Create gain node for volume control


        this.gainNode = this.audioContext.createGain(); // Connect the audio graph:
        // source → scriptProcessor → gain → destination

        this.sourceNode.connect(scriptProcessor);
        scriptProcessor.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
      } catch (error) {// Fallback: audio will play as stereo through normal HTML5 audio
      }
    }
    /**
     * Load audio from API endpoint using direct src assignment for streaming playback
     * @param {string} apiUrl - The API URL (token-based, no auth header needed)
     */

  }, {
    key: "loadAuthenticatedSource",
    value: function loadAuthenticatedSource(apiUrl) {
      var _this4 = this;

      var fullUrl = apiUrl.startsWith('http') ? apiUrl : "".concat(window.location.origin).concat(apiUrl); // Revoke previous blob URL if exists (cleanup from older code path)

      if (this.html5Audio.src && this.html5Audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.html5Audio.src);
      } // Set source directly — browser handles streaming + Range requests natively
      // WHY: Previous fetch().blob() downloaded ENTIRE file before playback (15-40s for large files)


      this.html5Audio.src = fullUrl;
      this.html5Audio.load(); // Setup mono mixer on first playback only
      // WHY: Web Audio API requires user interaction before creating AudioContext
      // MediaElementSource can only be created once per audio element

      if (!this.sourceNode) {
        this.setupMonoMixer();
      } // Auto-play after enough data is buffered


      this.html5Audio.oncanplaythrough = function () {
        _this4.html5Audio.play();

        _this4.$pButton.removeClass('play').addClass('pause');

        _this4.html5Audio.oncanplaythrough = null;
      }; // Handle loading errors


      this.html5Audio.onerror = function () {
        var error = _this4.html5Audio.error;
        var message = error ? "Audio error: ".concat(error.message || error.code) : 'Audio load failed';
        UserMessage.showMultiString(message, globalTranslate.cdr_AudioFileLoadError);
        _this4.html5Audio.onerror = null;
      };
    }
    /**
     * Download file with authentication and optional format conversion
     * @param {string} downloadUrl - Download URL requiring Bearer token
     * @param {string} format - Desired audio format (original, mp3, wav, webm, ogg)
     */

  }, {
    key: "downloadFile",
    value: function downloadFile(downloadUrl) {
      var format = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'webm';

      // Check if it's an API URL that requires authentication
      if (downloadUrl.includes('/pbxcore/api/')) {
        // Add format parameter to URL if not 'original'
        var urlWithFormat = downloadUrl;

        if (format !== 'original') {
          var separator = downloadUrl.includes('?') ? '&' : '?';
          urlWithFormat = "".concat(downloadUrl).concat(separator, "format=").concat(encodeURIComponent(format));
        } // Build full URL (REST API paths always start with /pbxcore/)


        var fullUrl = urlWithFormat.startsWith('http') ? urlWithFormat : "".concat(window.location.origin).concat(urlWithFormat); // Prepare headers with Bearer token

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
          var filename = "call-record.".concat(format || 'mp3');

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
  }], [{
    key: "stopOthers",
    value: // Static property to track currently playing instance

    /**
     * Stop all other players except the given one
     * @param {CDRPlayer} exceptPlayer - The player that should continue playing
     */
    function stopOthers(exceptPlayer) {
      if (CDRPlayer.currentlyPlaying && CDRPlayer.currentlyPlaying !== exceptPlayer) {
        CDRPlayer.currentlyPlaying.stopPlayback();
      }

      CDRPlayer.currentlyPlaying = exceptPlayer;
    }
  }]);

  return CDRPlayer;
}();

_defineProperty(CDRPlayer, "currentlyPlaying", null);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLXBsYXllci5qcyJdLCJuYW1lcyI6WyJDRFJQbGF5ZXIiLCJpZCIsImh0bWw1QXVkaW8iLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiJHJvdyIsIiQiLCJjdXJyZW50Rm9ybWF0IiwiYXVkaW9Db250ZXh0Iiwic291cmNlTm9kZSIsImdhaW5Ob2RlIiwiaGFzQ2xhc3MiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9yaWdpbmFsU3JjIiwiZ2V0QXR0cmlidXRlIiwiaW5jbHVkZXMiLCJzZXRBdHRyaWJ1dGUiLCJyZW1vdmVBdHRyaWJ1dGUiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInBsYXkiLCIkZG93bmxvYWREcm9wZG93biIsImxlbmd0aCIsImRyb3Bkb3duIiwiYWN0aW9uIiwib25DaGFuZ2UiLCJ2YWx1ZSIsInRleHQiLCIkY2hvaWNlIiwiZm9ybWF0IiwiZGF0YSIsImRvd25sb2FkVXJsIiwiZG93bmxvYWRGaWxlIiwidGFyZ2V0IiwiYXR0ciIsImFkZEV2ZW50TGlzdGVuZXIiLCJiaW5kIiwiY3VycmVudGx5UGxheWluZyIsImNiT25TcmNNZWRpYUVycm9yIiwicmFuZ2UiLCJtaW4iLCJtYXgiLCJzdGFydCIsImNiT25TbGlkZXJDaGFuZ2UiLCJzcGFuRHVyYXRpb24iLCJpbml0aWFsaXplVG9vbHRpcCIsImFkZENsYXNzIiwibG9hZE1ldGFkYXRhIiwiJHRvb2x0aXAiLCJhcHBlbmQiLCJ1cGRhdGVUb29sdGlwUG9zaXRpb24iLCJjc3MiLCJyZW1vdmVDbGFzcyIsInNsaWRlck9mZnNldCIsIm9mZnNldCIsInNsaWRlcldpZHRoIiwid2lkdGgiLCJtb3VzZVgiLCJwYWdlWCIsImxlZnQiLCJwZXJjZW50IiwiTWF0aCIsImR1cmF0aW9uIiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJ0aW1lU2Vjb25kcyIsImZvcm1hdHRlZFRpbWUiLCJmb3JtYXRUaW1lIiwic2Vjb25kcyIsImRhdGUiLCJEYXRlIiwic2V0U2Vjb25kcyIsInBhcnNlSW50IiwiZGF0ZVN0ciIsInRvSVNPU3RyaW5nIiwiaG91cnMiLCJzdWJzdHIiLCJjb250ZW50VHlwZSIsImxvd2VyVHlwZSIsInRvTG93ZXJDYXNlIiwiJGJhZGdlIiwiYmVmb3JlIiwiZm9ybWF0VXBwZXIiLCJ0b1VwcGVyQ2FzZSIsImNsb3Nlc3QiLCJjdXJyZW50VGltZSIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJkYXRlQ3VycmVudCIsImRhdGVEdXJhdGlvbiIsInJhbmdlUG9zaXRpb24iLCJyb3VuZCIsInNvdXJjZVNyYyIsImZ1bGxVcmwiLCJzdGFydHNXaXRoIiwid2luZG93IiwibG9jYXRpb24iLCJvcmlnaW4iLCJoZWFkZXJzIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJmZXRjaCIsIm1ldGhvZCIsInRoZW4iLCJyZXNwb25zZSIsIm9rIiwiZGlzYWJsZVBsYXllciIsImdldCIsImRldGVjdEF1ZGlvRm9ybWF0IiwidXBkYXRlRm9ybWF0QmFkZ2UiLCJkdXJhdGlvblNlY29uZHMiLCJwYXJzZUZsb2F0IiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJ3cml0YWJsZSIsImNvbmZpZ3VyYWJsZSIsImZvcm1hdHRlZCIsInBhdXNlZCIsInBhdXNlIiwic2NyaXB0UHJvY2Vzc29yIiwiZGlzY29ubmVjdCIsIm9uYXVkaW9wcm9jZXNzIiwiY3VycmVudFNyYyIsInN0b3BPdGhlcnMiLCJsb2FkQXV0aGVudGljYXRlZFNvdXJjZSIsIkF1ZGlvQ29udGV4dCIsIndlYmtpdEF1ZGlvQ29udGV4dCIsImNyZWF0ZU1lZGlhRWxlbWVudFNvdXJjZSIsImJ1ZmZlclNpemUiLCJjcmVhdGVTY3JpcHRQcm9jZXNzb3IiLCJhdWRpb1Byb2Nlc3NpbmdFdmVudCIsImlucHV0QnVmZmVyIiwib3V0cHV0QnVmZmVyIiwiaW5wdXRDaGFubmVsQ291bnQiLCJudW1iZXJPZkNoYW5uZWxzIiwib3V0cHV0Q2hhbm5lbENvdW50IiwiaW5wdXRNb25vIiwiZ2V0Q2hhbm5lbERhdGEiLCJvdXRwdXRMIiwib3V0cHV0UiIsImkiLCJpbnB1dEwiLCJpbnB1dFIiLCJjcmVhdGVHYWluIiwiY29ubmVjdCIsImRlc3RpbmF0aW9uIiwiZXJyb3IiLCJhcGlVcmwiLCJzcmMiLCJVUkwiLCJyZXZva2VPYmplY3RVUkwiLCJsb2FkIiwic2V0dXBNb25vTWl4ZXIiLCJvbmNhbnBsYXl0aHJvdWdoIiwib25lcnJvciIsIm1lc3NhZ2UiLCJjb2RlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJnbG9iYWxUcmFuc2xhdGUiLCJjZHJfQXVkaW9GaWxlTG9hZEVycm9yIiwidXJsV2l0aEZvcm1hdCIsInNlcGFyYXRvciIsImVuY29kZVVSSUNvbXBvbmVudCIsIkVycm9yIiwic3RhdHVzIiwic3RhdHVzVGV4dCIsImRpc3Bvc2l0aW9uIiwiZmlsZW5hbWUiLCJtYXRjaGVzIiwiZXhlYyIsInJlcGxhY2UiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzcGxpdCIsImZpbGVuYW1lUGFyYW0iLCJibG9iIiwidXJsIiwiY3JlYXRlT2JqZWN0VVJMIiwiYSIsImNyZWF0ZUVsZW1lbnQiLCJzdHlsZSIsImRpc3BsYXkiLCJocmVmIiwiZG93bmxvYWQiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJjbGljayIsInJlbW92ZUNoaWxkIiwiY2RyX0F1ZGlvRmlsZURvd25sb2FkRXJyb3IiLCJoaWRlIiwiZXhjZXB0UGxheWVyIiwic3RvcFBsYXliYWNrIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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Q21CLFFBQXZDLENBQWdELFVBQWhELEVBUlksQ0FVWjs7QUFDQSxXQUFLeEMsT0FBTCxDQUFhd0MsUUFBYixDQUFzQixVQUF0QjtBQUNBLFdBQUt4QyxPQUFMLENBQWE4RSxPQUFiLENBQXFCLElBQXJCLEVBQTJCdEMsUUFBM0IsQ0FBb0MsVUFBcEMsRUFaWSxDQWNaOztBQUNBLFdBQUt2QyxhQUFMLENBQW1CNkUsT0FBbkIsQ0FBMkIsSUFBM0IsRUFBaUN0QyxRQUFqQyxDQUEwQyxVQUExQztBQUNIOzs7V0FsdUJEOztBQUdBO0FBQ0o7QUFDQTtBQUNBO0FBQ0ksd0JBQWtCa0osWUFBbEIsRUFBZ0M7QUFDNUIsVUFBSXpNLFNBQVMsQ0FBQzhDLGdCQUFWLElBQThCOUMsU0FBUyxDQUFDOEMsZ0JBQVYsS0FBK0IySixZQUFqRSxFQUErRTtBQUMzRXpNLFFBQUFBLFNBQVMsQ0FBQzhDLGdCQUFWLENBQTJCNEosWUFBM0I7QUFDSDs7QUFDRDFNLE1BQUFBLFNBQVMsQ0FBQzhDLGdCQUFWLEdBQTZCMkosWUFBN0I7QUFDSDs7Ozs7O2dCQWRDek0sUyxzQkFHd0IsSSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qKlxuICogQ0RSUGxheWVyIGNsYXNzLlxuICovXG5jbGFzcyBDRFJQbGF5ZXIge1xuXG4gICAgLy8gU3RhdGljIHByb3BlcnR5IHRvIHRyYWNrIGN1cnJlbnRseSBwbGF5aW5nIGluc3RhbmNlXG4gICAgc3RhdGljIGN1cnJlbnRseVBsYXlpbmcgPSBudWxsO1xuXG4gICAgLyoqXG4gICAgICogU3RvcCBhbGwgb3RoZXIgcGxheWVycyBleGNlcHQgdGhlIGdpdmVuIG9uZVxuICAgICAqIEBwYXJhbSB7Q0RSUGxheWVyfSBleGNlcHRQbGF5ZXIgLSBUaGUgcGxheWVyIHRoYXQgc2hvdWxkIGNvbnRpbnVlIHBsYXlpbmdcbiAgICAgKi9cbiAgICBzdGF0aWMgc3RvcE90aGVycyhleGNlcHRQbGF5ZXIpIHtcbiAgICAgICAgaWYgKENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nICYmIENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nICE9PSBleGNlcHRQbGF5ZXIpIHtcbiAgICAgICAgICAgIENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nID0gZXhjZXB0UGxheWVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgQ0RSUGxheWVyLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFRoZSBJRCBvZiB0aGUgcGxheWVyLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGlkKSB7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGF1ZGlvLXBsYXllci0ke2lkfWApO1xuICAgICAgICBjb25zdCAkcm93ID0gJChgIyR7aWR9YCk7XG5cbiAgICAgICAgLy8gVHJhY2sgY3VycmVudCBhdWRpbyBmb3JtYXQgKHdlYm0sIG1wMywgd2F2KVxuICAgICAgICB0aGlzLmN1cnJlbnRGb3JtYXQgPSBudWxsO1xuXG4gICAgICAgIC8vIFdlYiBBdWRpbyBBUEkgZm9yIG1vbm8gbWl4aW5nXG4gICAgICAgIC8vIFdIWTogQXV0b21hdGljYWxseSBtaXggc3RlcmVvIHJlY29yZGluZ3MgKGxlZnQ9ZXh0ZXJuYWwsIHJpZ2h0PWludGVybmFsKSB0byBtb25vXG4gICAgICAgIC8vIFRoaXMgbWFrZXMgYm90aCBzcGVha2VycyBhdWRpYmxlIGluIHNpbmdsZSBjaGFubmVsIGZvciBlYXNpZXIgbGlzdGVuaW5nXG4gICAgICAgIHRoaXMuYXVkaW9Db250ZXh0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5zb3VyY2VOb2RlID0gbnVsbDtcbiAgICAgICAgdGhpcy5nYWluTm9kZSA9IG51bGw7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBpbml0aWFsaXplZCB0byBwcmV2ZW50IGRvdWJsZSBwcm9jZXNzaW5nXG4gICAgICAgIGlmICgkcm93Lmhhc0NsYXNzKCdpbml0aWFsaXplZCcpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLiRwQnV0dG9uID0gJHJvdy5maW5kKCdpLnBsYXknKTsgLy8gUGxheSBidXR0b25cbiAgICAgICAgdGhpcy4kZEJ1dHRvbiA9ICRyb3cuZmluZCgnaS5kb3dubG9hZCcpOyAvLyBEb3dubG9hZCBidXR0b25cbiAgICAgICAgdGhpcy4kc2xpZGVyID0gJHJvdy5maW5kKCdkaXYuY2RyLXBsYXllcicpOyAvLyBTbGlkZXIgZWxlbWVudFxuICAgICAgICB0aGlzLiRzcGFuRHVyYXRpb24gPSAkcm93LmZpbmQoJ3NwYW4uY2RyLWR1cmF0aW9uJyk7IC8vIER1cmF0aW9uIHNwYW4gZWxlbWVudFxuXG4gICAgICAgIC8vIENsZWFuIHVwIHByZXZpb3VzIGV2ZW50IGxpc3RlbmVyc1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgICAgIHRoaXMuJHBCdXR0b24udW5iaW5kKCk7XG4gICAgICAgIHRoaXMuJGRCdXR0b24udW5iaW5kKCk7XG5cbiAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgc3JjIGluIGRhdGEtc3JjIGF0dHJpYnV0ZSBmb3IgYXV0aGVudGljYXRlZCBsb2FkaW5nXG4gICAgICAgIGNvbnN0IG9yaWdpbmFsU3JjID0gdGhpcy5odG1sNUF1ZGlvLmdldEF0dHJpYnV0ZSgnc3JjJyk7XG4gICAgICAgIGlmIChvcmlnaW5hbFNyYyAmJiBvcmlnaW5hbFNyYy5pbmNsdWRlcygnL3BieGNvcmUvYXBpLycpKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uc2V0QXR0cmlidXRlKCdkYXRhLXNyYycsIG9yaWdpbmFsU3JjKTtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVBdHRyaWJ1dGUoJ3NyYycpOyAvLyBSZW1vdmUgZGlyZWN0IHNyY1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUGxheSBidXR0b24gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy4kcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZG93bmxvYWQgZm9ybWF0IGRyb3Bkb3duXG4gICAgICAgIGNvbnN0ICRkb3dubG9hZERyb3Bkb3duID0gJHJvdy5maW5kKCcuZG93bmxvYWQtZm9ybWF0LWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZG93bmxvYWREcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkZG93bmxvYWREcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnaGlkZScsXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSwgdGV4dCwgJGNob2ljZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXQgPSAkY2hvaWNlLmRhdGEoJ2Zvcm1hdCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkb3dubG9hZFVybCA9ICRkb3dubG9hZERyb3Bkb3duLmRhdGEoJ2Rvd25sb2FkLXVybCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZG93bmxvYWRVcmwgJiYgZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRvd25sb2FkRmlsZShkb3dubG9hZFVybCwgZm9ybWF0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTGVnYWN5OiBEb3dubG9hZCBidXR0b24gZXZlbnQgbGlzdGVuZXIgKGZvciBvbGQgVUkgd2l0aG91dCBkcm9wZG93bilcbiAgICAgICAgdGhpcy4kZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgZG93bmxvYWRVcmwgPSAkKGUudGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBpZiAoZG93bmxvYWRVcmwpIHtcbiAgICAgICAgICAgICAgICAvLyBEb3dubG9hZCBpbiBXZWJNIGZvcm1hdCBieSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgdGhpcy5kb3dubG9hZEZpbGUoZG93bmxvYWRVcmwsICd3ZWJtJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIExvYWRlZCBtZXRhZGF0YSBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZC5iaW5kKHRoaXMpLCBmYWxzZSk7XG5cbiAgICAgICAgLy8gdGltZXVwZGF0ZSBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cbiAgICAgICAgLy8gZW5kZWQgZXZlbnQgbGlzdGVuZXIgLSBjbGVhciBjdXJyZW50bHkgcGxheWluZyByZWZlcmVuY2VcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nID09PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBmYWxzZSk7XG5cbiAgICAgICAgLy8gbm8gc3JjIGhhbmRsZXJcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5jYk9uU3JjTWVkaWFFcnJvciwgZmFsc2UpO1xuXG4gICAgICAgIHRoaXMuJHNsaWRlci5yYW5nZSh7XG4gICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICBtYXg6IDEwMCxcbiAgICAgICAgICAgIHN0YXJ0OiAwLFxuICAgICAgICAgICAgb25DaGFuZ2U6IHRoaXMuY2JPblNsaWRlckNoYW5nZSxcbiAgICAgICAgICAgIGh0bWw1QXVkaW86IHRoaXMuaHRtbDVBdWRpbyxcbiAgICAgICAgICAgIGNiVGltZVVwZGF0ZTogdGhpcy5jYlRpbWVVcGRhdGUsXG4gICAgICAgICAgICBzcGFuRHVyYXRpb246IHRoaXMuJHNwYW5EdXJhdGlvbixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIHRvb2x0aXAgdG8gc2xpZGVyXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRvb2x0aXAoKTtcblxuICAgICAgICAvLyBNYXJrIGFzIGluaXRpYWxpemVkXG4gICAgICAgICRyb3cuYWRkQ2xhc3MoJ2luaXRpYWxpemVkJyk7XG5cbiAgICAgICAgLy8gTG9hZCBtZXRhZGF0YSBvbiBpbml0aWFsaXphdGlvblxuICAgICAgICB0aGlzLmxvYWRNZXRhZGF0YSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcCBmb3Igc2xpZGVyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXAoKSB7XG4gICAgICAgIC8vIEFkZCB0b29sdGlwIGVsZW1lbnQgdG8gc2xpZGVyXG4gICAgICAgIGNvbnN0ICR0b29sdGlwID0gJCgnPGRpdiBjbGFzcz1cImNkci1zbGlkZXItdG9vbHRpcFwiPjAwOjAwPC9kaXY+Jyk7XG4gICAgICAgIHRoaXMuJHNsaWRlci5hcHBlbmQoJHRvb2x0aXApO1xuICAgICAgICB0aGlzLiR0b29sdGlwID0gJHRvb2x0aXA7XG5cbiAgICAgICAgLy8gVXBkYXRlIHRvb2x0aXAgb24gbW91c2UgbW92ZSBvdmVyIHNsaWRlclxuICAgICAgICB0aGlzLiRzbGlkZXIub24oJ21vdXNlbW92ZScsIChlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVRvb2x0aXBQb3NpdGlvbihlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2hvdyB0b29sdGlwIG9uIG1vdXNlIGVudGVyXG4gICAgICAgIHRoaXMuJHNsaWRlci5vbignbW91c2VlbnRlcicsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuJHRvb2x0aXAuY3NzKCdvcGFjaXR5JywgJzEnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGlkZSB0b29sdGlwIG9uIG1vdXNlIGxlYXZlICh1bmxlc3MgZHJhZ2dpbmcpXG4gICAgICAgIHRoaXMuJHNsaWRlci5vbignbW91c2VsZWF2ZScsICgpID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy4kc2xpZGVyLmhhc0NsYXNzKCdkcmFnZ2luZycpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kdG9vbHRpcC5jc3MoJ29wYWNpdHknLCAnMCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUcmFjayBkcmFnZ2luZyBzdGF0ZVxuICAgICAgICB0aGlzLiRzbGlkZXIub24oJ21vdXNlZG93bicsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuJHNsaWRlci5hZGRDbGFzcygnZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgIHRoaXMuJHRvb2x0aXAuY3NzKCdvcGFjaXR5JywgJzEnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJChkb2N1bWVudCkub24oJ21vdXNldXAnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy4kc2xpZGVyLmhhc0NsYXNzKCdkcmFnZ2luZycpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kc2xpZGVyLnJlbW92ZUNsYXNzKCdkcmFnZ2luZycpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHRvb2x0aXAuY3NzKCdvcGFjaXR5JywgJzAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRvb2x0aXAgcG9zaXRpb24gYW5kIGNvbnRlbnRcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gTW91c2UgZXZlbnRcbiAgICAgKi9cbiAgICB1cGRhdGVUb29sdGlwUG9zaXRpb24oZSkge1xuICAgICAgICBjb25zdCBzbGlkZXJPZmZzZXQgPSB0aGlzLiRzbGlkZXIub2Zmc2V0KCk7XG4gICAgICAgIGNvbnN0IHNsaWRlcldpZHRoID0gdGhpcy4kc2xpZGVyLndpZHRoKCk7XG4gICAgICAgIGNvbnN0IG1vdXNlWCA9IGUucGFnZVggLSBzbGlkZXJPZmZzZXQubGVmdDtcbiAgICAgICAgY29uc3QgcGVyY2VudCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDEwMCwgKG1vdXNlWCAvIHNsaWRlcldpZHRoKSAqIDEwMCkpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aW1lIGF0IHRoaXMgcG9zaXRpb25cbiAgICAgICAgY29uc3QgZHVyYXRpb24gPSB0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb247XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUoZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCB0aW1lU2Vjb25kcyA9IChkdXJhdGlvbiAqIHBlcmNlbnQpIC8gMTAwO1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkVGltZSA9IHRoaXMuZm9ybWF0VGltZSh0aW1lU2Vjb25kcyk7XG4gICAgICAgICAgICB0aGlzLiR0b29sdGlwLnRleHQoZm9ybWF0dGVkVGltZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQb3NpdGlvbiB0b29sdGlwIGF0IG1vdXNlIHBvc2l0aW9uXG4gICAgICAgIHRoaXMuJHRvb2x0aXAuY3NzKCdsZWZ0JywgYCR7cGVyY2VudH0lYCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0IHRpbWUgaW4gc2Vjb25kcyB0byBNTTpTUyBvciBISDpNTTpTU1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzZWNvbmRzIC0gVGltZSBpbiBzZWNvbmRzXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0dGVkIHRpbWUgc3RyaW5nXG4gICAgICovXG4gICAgZm9ybWF0VGltZShzZWNvbmRzKSB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShudWxsKTtcbiAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKHBhcnNlSW50KHNlY29uZHMsIDEwKSk7XG4gICAgICAgIGNvbnN0IGRhdGVTdHIgPSBkYXRlLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gcGFyc2VJbnQoZGF0ZVN0ci5zdWJzdHIoMTEsIDIpLCAxMCk7XG5cbiAgICAgICAgaWYgKGhvdXJzID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0ZVN0ci5zdWJzdHIoMTQsIDUpO1xuICAgICAgICB9IGVsc2UgaWYgKGhvdXJzIDwgMTApIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRlU3RyLnN1YnN0cigxMiwgNyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0ZVN0ci5zdWJzdHIoMTEsIDgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGV0ZWN0IGF1ZGlvIGZvcm1hdCBmcm9tIENvbnRlbnQtVHlwZSBoZWFkZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGVudFR5cGUgLSBDb250ZW50LVR5cGUgaGVhZGVyIHZhbHVlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0IGlkZW50aWZpZXI6ICd3ZWJtJywgJ21wMycsICd3YXYnLCBvciAndW5rbm93bidcbiAgICAgKi9cbiAgICBkZXRlY3RBdWRpb0Zvcm1hdChjb250ZW50VHlwZSkge1xuICAgICAgICBpZiAoIWNvbnRlbnRUeXBlKSByZXR1cm4gJ3Vua25vd24nO1xuXG4gICAgICAgIGNvbnN0IGxvd2VyVHlwZSA9IGNvbnRlbnRUeXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmIChsb3dlclR5cGUuaW5jbHVkZXMoJ2F1ZGlvL3dlYm0nKSkgcmV0dXJuICd3ZWJtJztcbiAgICAgICAgaWYgKGxvd2VyVHlwZS5pbmNsdWRlcygnYXVkaW8vbXBlZycpIHx8IGxvd2VyVHlwZS5pbmNsdWRlcygnYXVkaW8vbXAzJykpIHJldHVybiAnbXAzJztcbiAgICAgICAgaWYgKGxvd2VyVHlwZS5pbmNsdWRlcygnYXVkaW8vd2F2JykgfHwgbG93ZXJUeXBlLmluY2x1ZGVzKCdhdWRpby94LXdhdicpKSByZXR1cm4gJ3dhdic7XG5cbiAgICAgICAgcmV0dXJuICd1bmtub3duJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZm9ybWF0IGJhZGdlIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybWF0IC0gQXVkaW8gZm9ybWF0ICh3ZWJtLCBtcDMsIHdhdilcbiAgICAgKi9cbiAgICB1cGRhdGVGb3JtYXRCYWRnZShmb3JtYXQpIHtcbiAgICAgICAgY29uc3QgJHJvdyA9ICQoYCMke3RoaXMuaWR9YCk7XG4gICAgICAgIGxldCAkYmFkZ2UgPSAkcm93LmZpbmQoJy5hdWRpby1mb3JtYXQtYmFkZ2UnKTtcblxuICAgICAgICAvLyBDcmVhdGUgYmFkZ2UgaWYgZG9lc24ndCBleGlzdFxuICAgICAgICBpZiAoJGJhZGdlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJGJhZGdlID0gJCgnPHNwYW4gY2xhc3M9XCJ1aSBtaW5pIGxhYmVsIGF1ZGlvLWZvcm1hdC1iYWRnZVwiPjwvc3Bhbj4nKTtcbiAgICAgICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi5iZWZvcmUoJGJhZGdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBiYWRnZSBjb250ZW50IGFuZCBzdHlsZVxuICAgICAgICBjb25zdCBmb3JtYXRVcHBlciA9IGZvcm1hdC50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAkYmFkZ2UudGV4dChmb3JtYXRVcHBlcik7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHByZXZpb3VzIGZvcm1hdCBjbGFzc2VzXG4gICAgICAgICRiYWRnZS5yZW1vdmVDbGFzcygnZ3JlZW4gb3JhbmdlIGJsdWUgZ3JleScpO1xuXG4gICAgICAgIC8vIEFwcGx5IGNvbG9yIGJhc2VkIG9uIGZvcm1hdFxuICAgICAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgICAgICAgY2FzZSAnd2VibSc6XG4gICAgICAgICAgICAgICAgJGJhZGdlLmFkZENsYXNzKCdncmVlbicpOyAvLyBNb2Rlcm4gZm9ybWF0XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdtcDMnOlxuICAgICAgICAgICAgICAgICRiYWRnZS5hZGRDbGFzcygnb3JhbmdlJyk7IC8vIExlZ2FjeSBjb21wcmVzc2VkXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd3YXYnOlxuICAgICAgICAgICAgICAgICRiYWRnZS5hZGRDbGFzcygnYmx1ZScpOyAvLyBVbmNvbXByZXNzZWRcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgJGJhZGdlLmFkZENsYXNzKCdncmV5Jyk7IC8vIFVua25vd25cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciBtZXRhZGF0YSBsb2FkZWQgZXZlbnQuXG4gICAgICovXG4gICAgY2JPbk1ldGFkYXRhTG9hZGVkKCkge1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKG51bGwpO1xuICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKHBhcnNlSW50KHRoaXMuY3VycmVudFRpbWUsIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuICAgICAgICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIGRhdGUuc2V0U2Vjb25kcyhwYXJzZUludCh0aGlzLmR1cmF0aW9uLCAxMCkpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcbiAgICAgICAgICAgIGNvbnN0IGRhdGVTdHIgPSBkYXRlLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICBjb25zdCBob3VycyA9IHBhcnNlSW50KGRhdGVTdHIuc3Vic3RyKDExLCAyKSwgMTApO1xuICAgICAgICAgICAgbGV0IGR1cmF0aW9uO1xuICAgICAgICAgICAgaWYgKGhvdXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhvdXJzIDwgMTApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDEyLCA3KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPj0gMTApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDExLCA4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKS50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIHNsaWRlciBjaGFuZ2UgZXZlbnQuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG5ld1ZhbCAtIFRoZSBuZXcgdmFsdWUgb2YgdGhlIHNsaWRlci5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbWV0YSAtIEFkZGl0aW9uYWwgbWV0YWRhdGEuXG4gICAgICovXG4gICAgY2JPblNsaWRlckNoYW5nZShuZXdWYWwsIG1ldGEpIHtcbiAgICAgICAgaWYgKG1ldGEudHJpZ2dlcmVkQnlVc2VyICYmIE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgPSAodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uICogbmV3VmFsKSAvIDEwMDtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVDdXJyZW50ID0gbmV3IERhdGUobnVsbCk7XG4gICAgICAgICAgICBkYXRlQ3VycmVudC5zZXRTZWNvbmRzKHBhcnNlSW50KHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSwgMTApKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VGltZSA9IGRhdGVDdXJyZW50LnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVEdXJhdGlvbiA9IG5ldyBEYXRlKG51bGwpO1xuICAgICAgICAgICAgZGF0ZUR1cmF0aW9uLnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uLCAxMCkpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcbiAgICAgICAgICAgIGNvbnN0IGRhdGVTdHIgPSBkYXRlRHVyYXRpb24udG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gcGFyc2VJbnQoZGF0ZVN0ci5zdWJzdHIoMTEsIDIpLCAxMCk7XG4gICAgICAgICAgICBsZXQgZHVyYXRpb247XG4gICAgICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTIsIDcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChob3VycyA+PSAxMCkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTEsIDgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zcGFuRHVyYXRpb24udGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciB0aW1lIHVwZGF0ZSBldmVudC5cbiAgICAgKi9cbiAgICBjYlRpbWVVcGRhdGUoKSB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSB0aGlzLmN1cnJlbnRUaW1lIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlUG9zaXRpb24gPSBNYXRoLm1pbihNYXRoLnJvdW5kKChwZXJjZW50KSAqIDEwMCksIDEwMCk7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgJHJvdy5maW5kKCdkaXYuY2RyLXBsYXllcicpLnJhbmdlKCdzZXQgdmFsdWUnLCByYW5nZVBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRUaW1lID09PSB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCdpLnBhdXNlJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgbWV0YWRhdGEgKGR1cmF0aW9uKSB3aXRob3V0IGxvYWRpbmcgdGhlIGZ1bGwgYXVkaW8gZmlsZS5cbiAgICAgKiBNYWtlcyBhIEhFQUQgcmVxdWVzdCB0byBnZXQgWC1BdWRpby1EdXJhdGlvbiBoZWFkZXIuXG4gICAgICovXG4gICAgbG9hZE1ldGFkYXRhKCkge1xuICAgICAgICBjb25zdCBzb3VyY2VTcmMgPSB0aGlzLmh0bWw1QXVkaW8uZ2V0QXR0cmlidXRlKCdkYXRhLXNyYycpO1xuICAgICAgICBpZiAoIXNvdXJjZVNyYyB8fCAhc291cmNlU3JjLmluY2x1ZGVzKCcvcGJ4Y29yZS9hcGkvJykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIGZ1bGwgVVJMIChSRVNUIEFQSSBwYXRocyBhbHdheXMgc3RhcnQgd2l0aCAvcGJ4Y29yZS8pXG4gICAgICAgIGNvbnN0IGZ1bGxVcmwgPSBzb3VyY2VTcmMuc3RhcnRzV2l0aCgnaHR0cCcpXG4gICAgICAgICAgICA/IHNvdXJjZVNyY1xuICAgICAgICAgICAgOiBgJHt3aW5kb3cubG9jYXRpb24ub3JpZ2lufSR7c291cmNlU3JjfWA7XG5cbiAgICAgICAgLy8gUHJlcGFyZSBoZWFkZXJzIHdpdGggQmVhcmVyIHRva2VuXG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCdcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYWtlIEhFQUQgcmVxdWVzdCB0byBnZXQgb25seSBoZWFkZXJzIChubyBib2R5IGRvd25sb2FkKVxuICAgICAgICBmZXRjaChmdWxsVXJsLCB7XG4gICAgICAgICAgICBtZXRob2Q6ICdIRUFEJyxcbiAgICAgICAgICAgIGhlYWRlcnNcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgIC8vIEZpbGUgbm90IGZvdW5kICg0MjIpIG9yIG90aGVyIGVycm9yIC0gZGlzYWJsZSBwbGF5ZXIgY29udHJvbHNcbiAgICAgICAgICAgICAgICB0aGlzLmRpc2FibGVQbGF5ZXIoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERldGVjdCBmb3JtYXQgZnJvbSBDb250ZW50LVR5cGUgaGVhZGVyIChtb3ZlZCBmcm9tIGxvYWRBdXRoZW50aWNhdGVkU291cmNlKVxuICAgICAgICAgICAgY29uc3QgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJyk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRGb3JtYXQgPSB0aGlzLmRldGVjdEF1ZGlvRm9ybWF0KGNvbnRlbnRUeXBlKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRGb3JtYXQgJiYgdGhpcy5jdXJyZW50Rm9ybWF0ICE9PSAndW5rbm93bicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUZvcm1hdEJhZGdlKHRoaXMuY3VycmVudEZvcm1hdCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgZHVyYXRpb24gZnJvbSBoZWFkZXJcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uU2Vjb25kcyA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdYLUF1ZGlvLUR1cmF0aW9uJyk7XG4gICAgICAgICAgICBpZiAoZHVyYXRpb25TZWNvbmRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBwYXJzZUZsb2F0KGR1cmF0aW9uU2Vjb25kcyk7XG4gICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZHVyYXRpb24gb24gYXVkaW8gZWxlbWVudCBmb3IgdG9vbHRpcCBmdW5jdGlvbmFsaXR5XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLmh0bWw1QXVkaW8sICdkdXJhdGlvbicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBkdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIGRhdGUuc2V0U2Vjb25kcyhwYXJzZUludChkdXJhdGlvbiwgMTApKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGRhdGUudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZvcm1hdHRlZDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhvdXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWQgPSBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkID0gZGF0ZVN0ci5zdWJzdHIoMTIsIDcpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkID0gZGF0ZVN0ci5zdWJzdHIoMTEsIDgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi50ZXh0KGAwMDowMC8ke2Zvcm1hdHRlZH1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBOZXR3b3JrIGVycm9yIG9yIG90aGVyIGZhaWx1cmUgLSBkaXNhYmxlIHBsYXllciBjb250cm9sc1xuICAgICAgICAgICAgdGhpcy5kaXNhYmxlUGxheWVyKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN0b3AgcGxheWJhY2sgKGNhbGxlZCBmcm9tIHN0YXRpYyBzdG9wT3RoZXJzIG1ldGhvZClcbiAgICAgKi9cbiAgICBzdG9wUGxheWJhY2soKSB7XG4gICAgICAgIGlmICghdGhpcy5odG1sNUF1ZGlvLnBhdXNlZCkge1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG4gICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDbGVhbiB1cCBXZWIgQXVkaW8gQVBJIG5vZGVzXG4gICAgICovXG4gICAgY2xlYW51cEF1ZGlvTm9kZXMoKSB7XG4gICAgICAgIGlmICh0aGlzLnNjcmlwdFByb2Nlc3Nvcikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBEaXNjb25uZWN0IGFsbCBub2Rlc1xuICAgICAgICAgICAgICAgIHRoaXMuc2NyaXB0UHJvY2Vzc29yLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcmlwdFByb2Nlc3Nvci5vbmF1ZGlvcHJvY2VzcyA9IG51bGw7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JpcHRQcm9jZXNzb3IgPSBudWxsO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBjbGVhbnVwIGVycm9yc1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc291cmNlTm9kZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZU5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBjbGVhbnVwIGVycm9yc1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuZ2Fpbk5vZGUpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhpcy5nYWluTm9kZS5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIGNsZWFudXAgZXJyb3JzXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQbGF5cyBvciBwYXVzZXMgdGhlIGF1ZGlvIGZpbGUuXG4gICAgICovXG4gICAgcGxheSgpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgYXVkaW8gYWxyZWFkeSBoYXMgYSBzb3VyY2UgbG9hZGVkIChkaXJlY3QgVVJMIG9yIGJsb2IpXG4gICAgICAgIGNvbnN0IGN1cnJlbnRTcmMgPSB0aGlzLmh0bWw1QXVkaW8uZ2V0QXR0cmlidXRlKCdzcmMnKTtcbiAgICAgICAgaWYgKGN1cnJlbnRTcmMpIHtcbiAgICAgICAgICAgIC8vIFNvdXJjZSBhbHJlYWR5IGxvYWRlZCwganVzdCB0b2dnbGUgcGxheS9wYXVzZVxuICAgICAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBTdG9wIGFsbCBvdGhlciBwbGF5ZXJzIGJlZm9yZSBwbGF5aW5nIHRoaXMgb25lXG4gICAgICAgICAgICAgICAgQ0RSUGxheWVyLnN0b3BPdGhlcnModGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFBhdXNpbmcgLSBjbGVhciBjdXJyZW50bHkgcGxheWluZyByZWZlcmVuY2VcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgICAgICAgICAgaWYgKENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nID09PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZWVkIHRvIGxvYWQgc291cmNlIGZpcnN0XG4gICAgICAgIGxldCBzb3VyY2VTcmMgPSB0aGlzLmh0bWw1QXVkaW8uZ2V0QXR0cmlidXRlKCdkYXRhLXNyYycpIHx8ICcnO1xuXG4gICAgICAgIC8vIElmIHNvdXJjZSBpcyBhbiBBUEkgZW5kcG9pbnQgd2l0aCB0b2tlbiwgbG9hZCBpdCBkaXJlY3RseVxuICAgICAgICAvLyBXSFk6IFRva2VuLWJhc2VkIFVSTHMgYWxyZWFkeSBjb250YWluIGFsbCBuZWNlc3NhcnkgaW5mb3JtYXRpb25cbiAgICAgICAgaWYgKHNvdXJjZVNyYyAmJiBzb3VyY2VTcmMuaW5jbHVkZXMoJy9wYnhjb3JlL2FwaS8nKSkge1xuICAgICAgICAgICAgLy8gU3RvcCBhbGwgb3RoZXIgcGxheWVycyBiZWZvcmUgbG9hZGluZyBuZXcgc291cmNlXG4gICAgICAgICAgICBDRFJQbGF5ZXIuc3RvcE90aGVycyh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMubG9hZEF1dGhlbnRpY2F0ZWRTb3VyY2Uoc291cmNlU3JjKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrIGZvciBub24tQVBJIHNvdXJjZXMgb3IgYWxyZWFkeSBsb2FkZWRcbiAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQgJiYgdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICBDRFJQbGF5ZXIuc3RvcE90aGVycyh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG4gICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuaHRtbDVBdWRpby5wYXVzZWQpIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wYXVzZSgpO1xuICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICAgICAgaWYgKENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nID09PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBXZWIgQXVkaW8gQVBJIGZvciBtb25vIG1peGluZ1xuICAgICAqIFdIWTogU3RlcmVvIGNhbGwgcmVjb3JkaW5ncyBoYXZlIGV4dGVybmFsIGNoYW5uZWwgKGxlZnQpIGFuZCBpbnRlcm5hbCBjaGFubmVsIChyaWdodClcbiAgICAgKiBNaXhpbmcgdG8gbW9ubyBtYWtlcyBib3RoIHNwZWFrZXJzIGF1ZGlibGUgaW4gc2luZ2xlIGNoYW5uZWwgZm9yIGVhc2llciBsaXN0ZW5pbmdcbiAgICAgKlxuICAgICAqIEFQUFJPQUNIOiBVc2Ugc2ltcGxlIGdhaW4tYmFzZWQgZG93bm1peGluZ1xuICAgICAqIE1vc3QgcmVsaWFibGUgbWV0aG9kIHRoYXQgd29ya3Mgd2l0aCBhbGwgYXVkaW8gZm9ybWF0cyBpbmNsdWRpbmcgV2ViTS9PcHVzXG4gICAgICovXG4gICAgc2V0dXBNb25vTWl4ZXIoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYXVkaW8gY29udGV4dCBpZiBub3QgZXhpc3RzXG4gICAgICAgICAgICBpZiAoIXRoaXMuYXVkaW9Db250ZXh0KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9Db250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDcmVhdGUgc291cmNlIG5vZGUgZnJvbSBhdWRpbyBlbGVtZW50IChjYW4gb25seSBiZSBjcmVhdGVkIG9uY2UhKVxuICAgICAgICAgICAgaWYgKCF0aGlzLnNvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZU5vZGUgPSB0aGlzLmF1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYUVsZW1lbnRTb3VyY2UodGhpcy5odG1sNUF1ZGlvKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGlzY29ubmVjdCBwcmV2aW91cyBjb25uZWN0aW9ucyBpZiB0aGV5IGV4aXN0XG4gICAgICAgICAgICBpZiAodGhpcy5nYWluTm9kZSkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc291cmNlTm9kZS5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2Fpbk5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWdub3JlIGRpc2Nvbm5lY3QgZXJyb3JzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBTY3JpcHRQcm9jZXNzb3JOb2RlIHdpdGggMiBpbnB1dCBjaGFubmVscyBhbmQgMiBvdXRwdXQgY2hhbm5lbHNcbiAgICAgICAgICAgIC8vIEJ1ZmZlciBzaXplIG9mIDQwOTYgZm9yIGdvb2QgYmFsYW5jZSBiZXR3ZWVuIGxhdGVuY3kgYW5kIHBlcmZvcm1hbmNlXG4gICAgICAgICAgICBjb25zdCBidWZmZXJTaXplID0gNDA5NjtcbiAgICAgICAgICAgIGNvbnN0IHNjcmlwdFByb2Nlc3NvciA9IHRoaXMuYXVkaW9Db250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCAyLCAyKTtcblxuICAgICAgICAgICAgLy8gU3RvcmUgcmVmZXJlbmNlIGZvciBjbGVhbnVwXG4gICAgICAgICAgICB0aGlzLnNjcmlwdFByb2Nlc3NvciA9IHNjcmlwdFByb2Nlc3NvcjtcblxuICAgICAgICAgICAgLy8gUHJvY2VzcyBhdWRpbyB3aXRoIDY1LzM1IGNoYW5uZWwgbWl4aW5nIGZvciBiZXR0ZXIgdHJhbnNjcmlwdGlvbiBsaXN0ZW5pbmdcbiAgICAgICAgICAgIC8vIExlZnQgZWFyOiA2NSUgbGVmdCArIDM1JSByaWdodCwgUmlnaHQgZWFyOiAzNSUgbGVmdCArIDY1JSByaWdodFxuICAgICAgICAgICAgc2NyaXB0UHJvY2Vzc29yLm9uYXVkaW9wcm9jZXNzID0gKGF1ZGlvUHJvY2Vzc2luZ0V2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5wdXRCdWZmZXIgPSBhdWRpb1Byb2Nlc3NpbmdFdmVudC5pbnB1dEJ1ZmZlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBvdXRwdXRCdWZmZXIgPSBhdWRpb1Byb2Nlc3NpbmdFdmVudC5vdXRwdXRCdWZmZXI7XG5cbiAgICAgICAgICAgICAgICAvLyBHZXQgbnVtYmVyIG9mIGNoYW5uZWxzIGluIHRoZSBidWZmZXJcbiAgICAgICAgICAgICAgICBjb25zdCBpbnB1dENoYW5uZWxDb3VudCA9IGlucHV0QnVmZmVyLm51bWJlck9mQ2hhbm5lbHM7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0Q2hhbm5lbENvdW50ID0gb3V0cHV0QnVmZmVyLm51bWJlck9mQ2hhbm5lbHM7XG5cbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZGlmZmVyZW50IGNoYW5uZWwgY29uZmlndXJhdGlvbnNcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXRDaGFubmVsQ291bnQgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5wdXQgaXMgYWxyZWFkeSBtb25vIC0gY29weSB0byBib3RoIG91dHB1dCBjaGFubmVsc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dE1vbm8gPSBpbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0TCA9IG91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0UiA9IG91dHB1dENoYW5uZWxDb3VudCA+IDEgPyBvdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkgOiBudWxsO1xuXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRNb25vLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXRMW2ldID0gaW5wdXRNb25vW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG91dHB1dFIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXRSW2ldID0gaW5wdXRNb25vW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbnB1dENoYW5uZWxDb3VudCA+PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElucHV0IGlzIHN0ZXJlbyBvciBtdWx0aS1jaGFubmVsIC0gYXBwbHkgNjUvMzUgbWl4aW5nXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0TCA9IGlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dFIgPSBpbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0TCA9IG91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0UiA9IG91dHB1dENoYW5uZWxDb3VudCA+IDEgPyBvdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkgOiBudWxsO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5IDY1LzM1IG1peGluZyBmb3IgbmVhci1tb25vIGV4cGVyaWVuY2Ugd2l0aCBzdWJ0bGUgZGlyZWN0aW9uYWwgY3Vlc1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0TC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTGVmdCBlYXIgcmVjZWl2ZXMgNjUlIGxlZnQgKyAzNSUgcmlnaHRcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dExbaV0gPSAoaW5wdXRMW2ldICogMC42NSkgKyAoaW5wdXRSW2ldICogMC4zNSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJpZ2h0IGVhciByZWNlaXZlcyAzNSUgbGVmdCArIDY1JSByaWdodFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG91dHB1dFIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXRSW2ldID0gKGlucHV0TFtpXSAqIDAuMzUpICsgKGlucHV0UltpXSAqIDAuNjUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIGdhaW4gbm9kZSBmb3Igdm9sdW1lIGNvbnRyb2xcbiAgICAgICAgICAgIHRoaXMuZ2Fpbk5vZGUgPSB0aGlzLmF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG5cbiAgICAgICAgICAgIC8vIENvbm5lY3QgdGhlIGF1ZGlvIGdyYXBoOlxuICAgICAgICAgICAgLy8gc291cmNlIOKGkiBzY3JpcHRQcm9jZXNzb3Ig4oaSIGdhaW4g4oaSIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICB0aGlzLnNvdXJjZU5vZGUuY29ubmVjdChzY3JpcHRQcm9jZXNzb3IpO1xuICAgICAgICAgICAgc2NyaXB0UHJvY2Vzc29yLmNvbm5lY3QodGhpcy5nYWluTm9kZSk7XG4gICAgICAgICAgICB0aGlzLmdhaW5Ob2RlLmNvbm5lY3QodGhpcy5hdWRpb0NvbnRleHQuZGVzdGluYXRpb24pO1xuXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjazogYXVkaW8gd2lsbCBwbGF5IGFzIHN0ZXJlbyB0aHJvdWdoIG5vcm1hbCBIVE1MNSBhdWRpb1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBhdWRpbyBmcm9tIEFQSSBlbmRwb2ludCB1c2luZyBkaXJlY3Qgc3JjIGFzc2lnbm1lbnQgZm9yIHN0cmVhbWluZyBwbGF5YmFja1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhcGlVcmwgLSBUaGUgQVBJIFVSTCAodG9rZW4tYmFzZWQsIG5vIGF1dGggaGVhZGVyIG5lZWRlZClcbiAgICAgKi9cbiAgICBsb2FkQXV0aGVudGljYXRlZFNvdXJjZShhcGlVcmwpIHtcbiAgICAgICAgY29uc3QgZnVsbFVybCA9IGFwaVVybC5zdGFydHNXaXRoKCdodHRwJylcbiAgICAgICAgICAgID8gYXBpVXJsXG4gICAgICAgICAgICA6IGAke3dpbmRvdy5sb2NhdGlvbi5vcmlnaW59JHthcGlVcmx9YDtcblxuICAgICAgICAvLyBSZXZva2UgcHJldmlvdXMgYmxvYiBVUkwgaWYgZXhpc3RzIChjbGVhbnVwIGZyb20gb2xkZXIgY29kZSBwYXRoKVxuICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnNyYyAmJiB0aGlzLmh0bWw1QXVkaW8uc3JjLnN0YXJ0c1dpdGgoJ2Jsb2I6JykpIHtcbiAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodGhpcy5odG1sNUF1ZGlvLnNyYyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgc291cmNlIGRpcmVjdGx5IOKAlCBicm93c2VyIGhhbmRsZXMgc3RyZWFtaW5nICsgUmFuZ2UgcmVxdWVzdHMgbmF0aXZlbHlcbiAgICAgICAgLy8gV0hZOiBQcmV2aW91cyBmZXRjaCgpLmJsb2IoKSBkb3dubG9hZGVkIEVOVElSRSBmaWxlIGJlZm9yZSBwbGF5YmFjayAoMTUtNDBzIGZvciBsYXJnZSBmaWxlcylcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnNyYyA9IGZ1bGxVcmw7XG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5sb2FkKCk7XG5cbiAgICAgICAgLy8gU2V0dXAgbW9ubyBtaXhlciBvbiBmaXJzdCBwbGF5YmFjayBvbmx5XG4gICAgICAgIC8vIFdIWTogV2ViIEF1ZGlvIEFQSSByZXF1aXJlcyB1c2VyIGludGVyYWN0aW9uIGJlZm9yZSBjcmVhdGluZyBBdWRpb0NvbnRleHRcbiAgICAgICAgLy8gTWVkaWFFbGVtZW50U291cmNlIGNhbiBvbmx5IGJlIGNyZWF0ZWQgb25jZSBwZXIgYXVkaW8gZWxlbWVudFxuICAgICAgICBpZiAoIXRoaXMuc291cmNlTm9kZSkge1xuICAgICAgICAgICAgdGhpcy5zZXR1cE1vbm9NaXhlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXV0by1wbGF5IGFmdGVyIGVub3VnaCBkYXRhIGlzIGJ1ZmZlcmVkXG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5vbmNhbnBsYXl0aHJvdWdoID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcbiAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5vbmNhbnBsYXl0aHJvdWdoID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBIYW5kbGUgbG9hZGluZyBlcnJvcnNcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBlcnJvciA9IHRoaXMuaHRtbDVBdWRpby5lcnJvcjtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciA/IGBBdWRpbyBlcnJvcjogJHtlcnJvci5tZXNzYWdlIHx8IGVycm9yLmNvZGV9YCA6ICdBdWRpbyBsb2FkIGZhaWxlZCc7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcobWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmNkcl9BdWRpb0ZpbGVMb2FkRXJyb3IpO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLm9uZXJyb3IgPSBudWxsO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERvd25sb2FkIGZpbGUgd2l0aCBhdXRoZW50aWNhdGlvbiBhbmQgb3B0aW9uYWwgZm9ybWF0IGNvbnZlcnNpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZG93bmxvYWRVcmwgLSBEb3dubG9hZCBVUkwgcmVxdWlyaW5nIEJlYXJlciB0b2tlblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmb3JtYXQgLSBEZXNpcmVkIGF1ZGlvIGZvcm1hdCAob3JpZ2luYWwsIG1wMywgd2F2LCB3ZWJtLCBvZ2cpXG4gICAgICovXG4gICAgZG93bmxvYWRGaWxlKGRvd25sb2FkVXJsLCBmb3JtYXQgPSAnd2VibScpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQncyBhbiBBUEkgVVJMIHRoYXQgcmVxdWlyZXMgYXV0aGVudGljYXRpb25cbiAgICAgICAgaWYgKGRvd25sb2FkVXJsLmluY2x1ZGVzKCcvcGJ4Y29yZS9hcGkvJykpIHtcbiAgICAgICAgICAgIC8vIEFkZCBmb3JtYXQgcGFyYW1ldGVyIHRvIFVSTCBpZiBub3QgJ29yaWdpbmFsJ1xuICAgICAgICAgICAgbGV0IHVybFdpdGhGb3JtYXQgPSBkb3dubG9hZFVybDtcbiAgICAgICAgICAgIGlmIChmb3JtYXQgIT09ICdvcmlnaW5hbCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZXBhcmF0b3IgPSBkb3dubG9hZFVybC5pbmNsdWRlcygnPycpID8gJyYnIDogJz8nO1xuICAgICAgICAgICAgICAgIHVybFdpdGhGb3JtYXQgPSBgJHtkb3dubG9hZFVybH0ke3NlcGFyYXRvcn1mb3JtYXQ9JHtlbmNvZGVVUklDb21wb25lbnQoZm9ybWF0KX1gO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBCdWlsZCBmdWxsIFVSTCAoUkVTVCBBUEkgcGF0aHMgYWx3YXlzIHN0YXJ0IHdpdGggL3BieGNvcmUvKVxuICAgICAgICAgICAgY29uc3QgZnVsbFVybCA9IHVybFdpdGhGb3JtYXQuc3RhcnRzV2l0aCgnaHR0cCcpXG4gICAgICAgICAgICAgICAgPyB1cmxXaXRoRm9ybWF0XG4gICAgICAgICAgICAgICAgOiBgJHt3aW5kb3cubG9jYXRpb24ub3JpZ2lufSR7dXJsV2l0aEZvcm1hdH1gO1xuXG4gICAgICAgICAgICAvLyBQcmVwYXJlIGhlYWRlcnMgd2l0aCBCZWFyZXIgdG9rZW5cbiAgICAgICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgICAgICAgICAgICAgJ1gtUmVxdWVzdGVkLVdpdGgnOiAnWE1MSHR0cFJlcXVlc3QnXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGZXRjaCBmaWxlIHdpdGggYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIGZldGNoKGZ1bGxVcmwsIHsgaGVhZGVycyB9KVxuICAgICAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfTogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gR2V0IGZpbGVuYW1lIGZyb20gQ29udGVudC1EaXNwb3NpdGlvbiBoZWFkZXIgb3IgVVJMXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc3Bvc2l0aW9uID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ0NvbnRlbnQtRGlzcG9zaXRpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZpbGVuYW1lID0gYGNhbGwtcmVjb3JkLiR7Zm9ybWF0IHx8ICdtcDMnfWA7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaXNwb3NpdGlvbiAmJiBkaXNwb3NpdGlvbi5pbmNsdWRlcygnZmlsZW5hbWU9JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoZXMgPSAvZmlsZW5hbWVbXjs9XFxuXSo9KChbJ1wiXSkuKj9cXDJ8W147XFxuXSopLy5leGVjKGRpc3Bvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtYXRjaGVzICE9IG51bGwgJiYgbWF0Y2hlc1sxXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVuYW1lID0gbWF0Y2hlc1sxXS5yZXBsYWNlKC9bJ1wiXS9nLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZXh0cmFjdCBmcm9tIFVSTCBwYXJhbWV0ZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGRvd25sb2FkVXJsLnNwbGl0KCc/JylbMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZW5hbWVQYXJhbSA9IHVybFBhcmFtcy5nZXQoJ2ZpbGVuYW1lJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZW5hbWVQYXJhbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVuYW1lID0gZmlsZW5hbWVQYXJhbTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5ibG9iKCkudGhlbihibG9iID0+ICh7IGJsb2IsIGZpbGVuYW1lIH0pKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC50aGVuKCh7IGJsb2IsIGZpbGVuYW1lIH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGRvd25sb2FkIGxpbmtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgICAgICAgICAgICAgIGEuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgICAgICAgICAgYS5ocmVmID0gdXJsO1xuICAgICAgICAgICAgICAgICAgICBhLmRvd25sb2FkID0gZmlsZW5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7XG4gICAgICAgICAgICAgICAgICAgIGEuY2xpY2soKTtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LlVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChhKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhlcnJvci5tZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuY2RyX0F1ZGlvRmlsZURvd25sb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGVnYWN5IGRpcmVjdCBmaWxlIFVSTCAobm8gYXV0aCBuZWVkZWQpXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBkb3dubG9hZFVybDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciBzcmMgbWVkaWEgZXJyb3IgZXZlbnQuXG4gICAgICovXG4gICAgY2JPblNyY01lZGlhRXJyb3IoKSB7XG4gICAgICAgICQodGhpcykuY2xvc2VzdCgndHInKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEaXNhYmxlIHBsYXllciBjb250cm9scyB3aGVuIGZpbGUgaXMgbm90IGF2YWlsYWJsZVxuICAgICAqIEhpZGVzIHBsYXkgYW5kIGRvd25sb2FkIGJ1dHRvbnMsIGRpc2FibGVzIG9ubHkgcGxheWVyIGNlbGxzIChub3QgZW50aXJlIHJvdylcbiAgICAgKi9cbiAgICBkaXNhYmxlUGxheWVyKCkge1xuICAgICAgICAvLyBIaWRlIHBsYXkgYnV0dG9uXG4gICAgICAgIHRoaXMuJHBCdXR0b24uaGlkZSgpO1xuXG4gICAgICAgIC8vIEhpZGUgZG93bmxvYWQgYnV0dG9uXG4gICAgICAgIHRoaXMuJGRCdXR0b24uaGlkZSgpO1xuXG4gICAgICAgIC8vIFNob3cgcGxhY2Vob2xkZXIgaW4gZHVyYXRpb24gc3BhblxuICAgICAgICB0aGlzLiRzcGFuRHVyYXRpb24udGV4dCgnLS06LS0vLS06LS0nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICAvLyBEaXNhYmxlIHNsaWRlciBhbmQgaXRzIHBhcmVudCBjZWxsXG4gICAgICAgIHRoaXMuJHNsaWRlci5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgdGhpcy4kc2xpZGVyLmNsb3Nlc3QoJ3RkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgLy8gRGlzYWJsZSBkdXJhdGlvbiBjZWxsXG4gICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi5jbG9zZXN0KCd0ZCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH1cbn0iXX0=