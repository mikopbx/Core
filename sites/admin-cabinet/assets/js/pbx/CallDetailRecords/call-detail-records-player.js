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
    this.$downloadDropdown = $downloadDropdown;
    this.$downloadProgress = $('<span class="ui tiny basic label cdr-download-progress"></span>').hide().insertAfter($downloadDropdown);

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
      var _this5 = this;

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
        }

        var startedAt = performance.now();
        this.$downloadDropdown.addClass('disabled');
        this.$downloadDropdown.find('i.download').addClass('loading spinner').removeClass('download');
        this.$downloadProgress.text('0%').show(); // Fetch file with authentication

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

          return CDRPlayer.readResponseBody(response, function (loaded, total) {
            var progressText = CDRPlayer.formatDownloadProgress(loaded, total, performance.now() - startedAt);

            _this5.$downloadProgress.text(progressText);
          }).then(function (blob) {
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

          _this5.resetDownloadProgress();
        })["catch"](function (error) {
          _this5.resetDownloadProgress();

          UserMessage.showMultiString(error.message, globalTranslate.cdr_AudioFileDownloadError);
        });
      } else {
        // Legacy direct file URL (no auth needed)
        window.location = downloadUrl;
      }
    }
    /**
     * Restore the download control after completion or failure.
     */

  }, {
    key: "resetDownloadProgress",
    value: function resetDownloadProgress() {
      this.$downloadDropdown.removeClass('disabled');
      this.$downloadDropdown.find('i.spinner').removeClass('loading spinner').addClass('download');
      this.$downloadProgress.hide().text('');
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
    /**
     * Read a response stream while reporting cumulative byte counts.
     * Falls back to Response.blob() for browsers without ReadableStream support.
     *
     * @param {Response} response
     * @param {Function} onProgress
     * @returns {Promise<Blob>}
     */

  }, {
    key: "readResponseBody",
    value: function readResponseBody(response, onProgress) {
      var total = Number.parseInt(response.headers.get('Content-Length'), 10) || 0;
      var contentType = response.headers.get('Content-Type') || 'application/octet-stream';

      if (!response.body || typeof response.body.getReader !== 'function') {
        return response.blob().then(function (blob) {
          onProgress(blob.size, total || blob.size);
          return blob;
        });
      }

      var reader = response.body.getReader();
      var chunks = [];
      var loaded = 0;

      var readNextChunk = function readNextChunk() {
        return reader.read().then(function (_ref2) {
          var done = _ref2.done,
              value = _ref2.value;

          if (done) {
            return new Blob(chunks, {
              type: contentType
            });
          }

          chunks.push(value);
          loaded += value.byteLength;
          onProgress(loaded, total);
          return readNextChunk();
        });
      };

      return readNextChunk();
    }
    /**
     * Build a compact, language-neutral download progress label.
     *
     * @param {number} loaded
     * @param {number} total
     * @param {number} elapsedMs
     * @returns {string}
     */

  }, {
    key: "formatDownloadProgress",
    value: function formatDownloadProgress(loaded, total, elapsedMs) {
      var bytesPerSecond = elapsedMs > 0 ? loaded / (elapsedMs / 1000) : 0;
      var rate = bytesPerSecond >= 1024 * 1024 ? "".concat((bytesPerSecond / (1024 * 1024)).toFixed(1), " MB/s") : "".concat(Math.round(bytesPerSecond / 1024), " KB/s");

      if (total <= 0) {
        return "".concat((loaded / (1024 * 1024)).toFixed(1), " MB \xB7 ").concat(rate);
      }

      var percent = Math.min(100, Math.round(loaded / total * 100));
      var remainingSeconds = bytesPerSecond > 0 ? Math.max(0, Math.round((total - loaded) / bytesPerSecond)) : 0;
      return "".concat(percent, "% \xB7 ").concat(rate, " \xB7 ").concat(remainingSeconds, " sec");
    }
  }]);

  return CDRPlayer;
}();

_defineProperty(CDRPlayer, "currentlyPlaying", null);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLXBsYXllci5qcyJdLCJuYW1lcyI6WyJDRFJQbGF5ZXIiLCJpZCIsImh0bWw1QXVkaW8iLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiJHJvdyIsIiQiLCJjdXJyZW50Rm9ybWF0IiwiYXVkaW9Db250ZXh0Iiwic291cmNlTm9kZSIsImdhaW5Ob2RlIiwiaGFzQ2xhc3MiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9yaWdpbmFsU3JjIiwiZ2V0QXR0cmlidXRlIiwiaW5jbHVkZXMiLCJzZXRBdHRyaWJ1dGUiLCJyZW1vdmVBdHRyaWJ1dGUiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInBsYXkiLCIkZG93bmxvYWREcm9wZG93biIsIiRkb3dubG9hZFByb2dyZXNzIiwiaGlkZSIsImluc2VydEFmdGVyIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJhY3Rpb24iLCJvbkNoYW5nZSIsInZhbHVlIiwidGV4dCIsIiRjaG9pY2UiLCJmb3JtYXQiLCJkYXRhIiwiZG93bmxvYWRVcmwiLCJkb3dubG9hZEZpbGUiLCJ0YXJnZXQiLCJhdHRyIiwiYWRkRXZlbnRMaXN0ZW5lciIsImJpbmQiLCJjdXJyZW50bHlQbGF5aW5nIiwiY2JPblNyY01lZGlhRXJyb3IiLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0IiwiY2JPblNsaWRlckNoYW5nZSIsInNwYW5EdXJhdGlvbiIsImluaXRpYWxpemVUb29sdGlwIiwiYWRkQ2xhc3MiLCJsb2FkTWV0YWRhdGEiLCIkdG9vbHRpcCIsImFwcGVuZCIsInVwZGF0ZVRvb2x0aXBQb3NpdGlvbiIsImNzcyIsInJlbW92ZUNsYXNzIiwic2xpZGVyT2Zmc2V0Iiwib2Zmc2V0Iiwic2xpZGVyV2lkdGgiLCJ3aWR0aCIsIm1vdXNlWCIsInBhZ2VYIiwibGVmdCIsInBlcmNlbnQiLCJNYXRoIiwiZHVyYXRpb24iLCJOdW1iZXIiLCJpc0Zpbml0ZSIsInRpbWVTZWNvbmRzIiwiZm9ybWF0dGVkVGltZSIsImZvcm1hdFRpbWUiLCJzZWNvbmRzIiwiZGF0ZSIsIkRhdGUiLCJzZXRTZWNvbmRzIiwicGFyc2VJbnQiLCJkYXRlU3RyIiwidG9JU09TdHJpbmciLCJob3VycyIsInN1YnN0ciIsImNvbnRlbnRUeXBlIiwibG93ZXJUeXBlIiwidG9Mb3dlckNhc2UiLCIkYmFkZ2UiLCJiZWZvcmUiLCJmb3JtYXRVcHBlciIsInRvVXBwZXJDYXNlIiwiY2xvc2VzdCIsImN1cnJlbnRUaW1lIiwibmV3VmFsIiwibWV0YSIsInRyaWdnZXJlZEJ5VXNlciIsImRhdGVDdXJyZW50IiwiZGF0ZUR1cmF0aW9uIiwicmFuZ2VQb3NpdGlvbiIsInJvdW5kIiwic291cmNlU3JjIiwiZnVsbFVybCIsInN0YXJ0c1dpdGgiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsIm9yaWdpbiIsImhlYWRlcnMiLCJUb2tlbk1hbmFnZXIiLCJhY2Nlc3NUb2tlbiIsImZldGNoIiwibWV0aG9kIiwidGhlbiIsInJlc3BvbnNlIiwib2siLCJkaXNhYmxlUGxheWVyIiwiZ2V0IiwiZGV0ZWN0QXVkaW9Gb3JtYXQiLCJ1cGRhdGVGb3JtYXRCYWRnZSIsImR1cmF0aW9uU2Vjb25kcyIsInBhcnNlRmxvYXQiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsIndyaXRhYmxlIiwiY29uZmlndXJhYmxlIiwiZm9ybWF0dGVkIiwicGF1c2VkIiwicGF1c2UiLCJzY3JpcHRQcm9jZXNzb3IiLCJkaXNjb25uZWN0Iiwib25hdWRpb3Byb2Nlc3MiLCJjdXJyZW50U3JjIiwic3RvcE90aGVycyIsImxvYWRBdXRoZW50aWNhdGVkU291cmNlIiwiQXVkaW9Db250ZXh0Iiwid2Via2l0QXVkaW9Db250ZXh0IiwiY3JlYXRlTWVkaWFFbGVtZW50U291cmNlIiwiYnVmZmVyU2l6ZSIsImNyZWF0ZVNjcmlwdFByb2Nlc3NvciIsImF1ZGlvUHJvY2Vzc2luZ0V2ZW50IiwiaW5wdXRCdWZmZXIiLCJvdXRwdXRCdWZmZXIiLCJpbnB1dENoYW5uZWxDb3VudCIsIm51bWJlck9mQ2hhbm5lbHMiLCJvdXRwdXRDaGFubmVsQ291bnQiLCJpbnB1dE1vbm8iLCJnZXRDaGFubmVsRGF0YSIsIm91dHB1dEwiLCJvdXRwdXRSIiwiaSIsImlucHV0TCIsImlucHV0UiIsImNyZWF0ZUdhaW4iLCJjb25uZWN0IiwiZGVzdGluYXRpb24iLCJlcnJvciIsImFwaVVybCIsInNyYyIsIlVSTCIsInJldm9rZU9iamVjdFVSTCIsImxvYWQiLCJzZXR1cE1vbm9NaXhlciIsIm9uY2FucGxheXRocm91Z2giLCJvbmVycm9yIiwibWVzc2FnZSIsImNvZGUiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImdsb2JhbFRyYW5zbGF0ZSIsImNkcl9BdWRpb0ZpbGVMb2FkRXJyb3IiLCJ1cmxXaXRoRm9ybWF0Iiwic2VwYXJhdG9yIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwic3RhcnRlZEF0IiwicGVyZm9ybWFuY2UiLCJub3ciLCJzaG93IiwiRXJyb3IiLCJzdGF0dXMiLCJzdGF0dXNUZXh0IiwiZGlzcG9zaXRpb24iLCJmaWxlbmFtZSIsIm1hdGNoZXMiLCJleGVjIiwicmVwbGFjZSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsInNwbGl0IiwiZmlsZW5hbWVQYXJhbSIsInJlYWRSZXNwb25zZUJvZHkiLCJsb2FkZWQiLCJ0b3RhbCIsInByb2dyZXNzVGV4dCIsImZvcm1hdERvd25sb2FkUHJvZ3Jlc3MiLCJibG9iIiwidXJsIiwiY3JlYXRlT2JqZWN0VVJMIiwiYSIsImNyZWF0ZUVsZW1lbnQiLCJzdHlsZSIsImRpc3BsYXkiLCJocmVmIiwiZG93bmxvYWQiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJjbGljayIsInJlbW92ZUNoaWxkIiwicmVzZXREb3dubG9hZFByb2dyZXNzIiwiY2RyX0F1ZGlvRmlsZURvd25sb2FkRXJyb3IiLCJleGNlcHRQbGF5ZXIiLCJzdG9wUGxheWJhY2siLCJvblByb2dyZXNzIiwiZ2V0UmVhZGVyIiwic2l6ZSIsInJlYWRlciIsImNodW5rcyIsInJlYWROZXh0Q2h1bmsiLCJyZWFkIiwiZG9uZSIsIkJsb2IiLCJ0eXBlIiwicHVzaCIsImJ5dGVMZW5ndGgiLCJlbGFwc2VkTXMiLCJieXRlc1BlclNlY29uZCIsInJhdGUiLCJ0b0ZpeGVkIiwicmVtYWluaW5nU2Vjb25kcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0lBQ01BLFM7QUErRUY7QUFDSjtBQUNBO0FBQ0E7QUFDSSxxQkFBWUMsRUFBWixFQUFnQjtBQUFBOztBQUFBOztBQUNaLFNBQUtBLEVBQUwsR0FBVUEsRUFBVjtBQUNBLFNBQUtDLFVBQUwsR0FBa0JDLFFBQVEsQ0FBQ0MsY0FBVCx3QkFBd0NILEVBQXhDLEVBQWxCO0FBQ0EsUUFBTUksSUFBSSxHQUFHQyxDQUFDLFlBQUtMLEVBQUwsRUFBZCxDQUhZLENBS1o7O0FBQ0EsU0FBS00sYUFBTCxHQUFxQixJQUFyQixDQU5ZLENBUVo7QUFDQTtBQUNBOztBQUNBLFNBQUtDLFlBQUwsR0FBb0IsSUFBcEI7QUFDQSxTQUFLQyxVQUFMLEdBQWtCLElBQWxCO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQixJQUFoQixDQWJZLENBZVo7O0FBQ0EsUUFBSUwsSUFBSSxDQUFDTSxRQUFMLENBQWMsYUFBZCxDQUFKLEVBQWtDO0FBQzlCO0FBQ0g7O0FBRUQsU0FBS0MsUUFBTCxHQUFnQlAsSUFBSSxDQUFDUSxJQUFMLENBQVUsUUFBVixDQUFoQixDQXBCWSxDQW9CeUI7O0FBQ3JDLFNBQUtDLFFBQUwsR0FBZ0JULElBQUksQ0FBQ1EsSUFBTCxDQUFVLFlBQVYsQ0FBaEIsQ0FyQlksQ0FxQjZCOztBQUN6QyxTQUFLRSxPQUFMLEdBQWVWLElBQUksQ0FBQ1EsSUFBTCxDQUFVLGdCQUFWLENBQWYsQ0F0QlksQ0FzQmdDOztBQUM1QyxTQUFLRyxhQUFMLEdBQXFCWCxJQUFJLENBQUNRLElBQUwsQ0FBVSxtQkFBVixDQUFyQixDQXZCWSxDQXVCeUM7QUFFckQ7O0FBQ0EsU0FBS1gsVUFBTCxDQUFnQmUsbUJBQWhCLENBQW9DLFlBQXBDLEVBQWtELEtBQUtDLGtCQUF2RCxFQUEyRSxLQUEzRTtBQUNBLFNBQUtoQixVQUFMLENBQWdCZSxtQkFBaEIsQ0FBb0MsZ0JBQXBDLEVBQXNELEtBQUtFLFlBQTNELEVBQXlFLEtBQXpFO0FBQ0EsU0FBS1AsUUFBTCxDQUFjUSxNQUFkO0FBQ0EsU0FBS04sUUFBTCxDQUFjTSxNQUFkLEdBN0JZLENBK0JaOztBQUNBLFFBQU1DLFdBQVcsR0FBRyxLQUFLbkIsVUFBTCxDQUFnQm9CLFlBQWhCLENBQTZCLEtBQTdCLENBQXBCOztBQUNBLFFBQUlELFdBQVcsSUFBSUEsV0FBVyxDQUFDRSxRQUFaLENBQXFCLGVBQXJCLENBQW5CLEVBQTBEO0FBQ3RELFdBQUtyQixVQUFMLENBQWdCc0IsWUFBaEIsQ0FBNkIsVUFBN0IsRUFBeUNILFdBQXpDO0FBQ0EsV0FBS25CLFVBQUwsQ0FBZ0J1QixlQUFoQixDQUFnQyxLQUFoQyxFQUZzRCxDQUVkO0FBQzNDLEtBcENXLENBc0NaOzs7QUFDQSxTQUFLYixRQUFMLENBQWNjLEVBQWQsQ0FBaUIsT0FBakIsRUFBMEIsVUFBQ0MsQ0FBRCxFQUFPO0FBQzdCQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7O0FBQ0EsTUFBQSxLQUFJLENBQUNDLElBQUw7QUFDSCxLQUhELEVBdkNZLENBNENaOztBQUNBLFFBQU1DLGlCQUFpQixHQUFHekIsSUFBSSxDQUFDUSxJQUFMLENBQVUsMkJBQVYsQ0FBMUI7QUFDQSxTQUFLaUIsaUJBQUwsR0FBeUJBLGlCQUF6QjtBQUNBLFNBQUtDLGlCQUFMLEdBQXlCekIsQ0FBQyxDQUFDLGlFQUFELENBQUQsQ0FDcEIwQixJQURvQixHQUVwQkMsV0FGb0IsQ0FFUkgsaUJBRlEsQ0FBekI7O0FBR0EsUUFBSUEsaUJBQWlCLENBQUNJLE1BQWxCLEdBQTJCLENBQS9CLEVBQWtDO0FBQzlCSixNQUFBQSxpQkFBaUIsQ0FBQ0ssUUFBbEIsQ0FBMkI7QUFDdkJDLFFBQUFBLE1BQU0sRUFBRSxNQURlO0FBRXZCQyxRQUFBQSxRQUFRLEVBQUUsa0JBQUNDLEtBQUQsRUFBUUMsSUFBUixFQUFjQyxPQUFkLEVBQTBCO0FBQ2hDLGNBQU1DLE1BQU0sR0FBR0QsT0FBTyxDQUFDRSxJQUFSLENBQWEsUUFBYixDQUFmO0FBQ0EsY0FBTUMsV0FBVyxHQUFHYixpQkFBaUIsQ0FBQ1ksSUFBbEIsQ0FBdUIsY0FBdkIsQ0FBcEI7O0FBQ0EsY0FBSUMsV0FBVyxJQUFJRixNQUFuQixFQUEyQjtBQUN2QixZQUFBLEtBQUksQ0FBQ0csWUFBTCxDQUFrQkQsV0FBbEIsRUFBK0JGLE1BQS9CO0FBQ0g7QUFDSjtBQVJzQixPQUEzQjtBQVVILEtBN0RXLENBK0RaOzs7QUFDQSxTQUFLM0IsUUFBTCxDQUFjWSxFQUFkLENBQWlCLE9BQWpCLEVBQTBCLFVBQUNDLENBQUQsRUFBTztBQUM3QkEsTUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsVUFBTWUsV0FBVyxHQUFHckMsQ0FBQyxDQUFDcUIsQ0FBQyxDQUFDa0IsTUFBSCxDQUFELENBQVlDLElBQVosQ0FBaUIsWUFBakIsQ0FBcEI7O0FBQ0EsVUFBSUgsV0FBSixFQUFpQjtBQUNiO0FBQ0EsUUFBQSxLQUFJLENBQUNDLFlBQUwsQ0FBa0JELFdBQWxCLEVBQStCLE1BQS9CO0FBQ0g7QUFDSixLQVBELEVBaEVZLENBeUVaOztBQUNBLFNBQUt6QyxVQUFMLENBQWdCNkMsZ0JBQWhCLENBQWlDLGdCQUFqQyxFQUFtRCxLQUFLN0Isa0JBQUwsQ0FBd0I4QixJQUF4QixDQUE2QixJQUE3QixDQUFuRCxFQUF1RixLQUF2RixFQTFFWSxDQTRFWjs7QUFDQSxTQUFLOUMsVUFBTCxDQUFnQjZDLGdCQUFoQixDQUFpQyxZQUFqQyxFQUErQyxLQUFLNUIsWUFBcEQsRUFBa0UsS0FBbEUsRUE3RVksQ0ErRVo7O0FBQ0EsU0FBS2pCLFVBQUwsQ0FBZ0I2QyxnQkFBaEIsQ0FBaUMsT0FBakMsRUFBMEMsWUFBTTtBQUM1QyxVQUFJL0MsU0FBUyxDQUFDaUQsZ0JBQVYsS0FBK0IsS0FBbkMsRUFBeUM7QUFDckNqRCxRQUFBQSxTQUFTLENBQUNpRCxnQkFBVixHQUE2QixJQUE3QjtBQUNIO0FBQ0osS0FKRCxFQUlHLEtBSkgsRUFoRlksQ0FzRlo7O0FBQ0EsU0FBSy9DLFVBQUwsQ0FBZ0I2QyxnQkFBaEIsQ0FBaUMsT0FBakMsRUFBMEMsS0FBS0csaUJBQS9DLEVBQWtFLEtBQWxFO0FBRUEsU0FBS25DLE9BQUwsQ0FBYW9DLEtBQWIsQ0FBbUI7QUFDZkMsTUFBQUEsR0FBRyxFQUFFLENBRFU7QUFFZkMsTUFBQUEsR0FBRyxFQUFFLEdBRlU7QUFHZkMsTUFBQUEsS0FBSyxFQUFFLENBSFE7QUFJZmpCLE1BQUFBLFFBQVEsRUFBRSxLQUFLa0IsZ0JBSkE7QUFLZnJELE1BQUFBLFVBQVUsRUFBRSxLQUFLQSxVQUxGO0FBTWZpQixNQUFBQSxZQUFZLEVBQUUsS0FBS0EsWUFOSjtBQU9mcUMsTUFBQUEsWUFBWSxFQUFFLEtBQUt4QztBQVBKLEtBQW5CLEVBekZZLENBbUdaOztBQUNBLFNBQUt5QyxpQkFBTCxHQXBHWSxDQXNHWjs7QUFDQXBELElBQUFBLElBQUksQ0FBQ3FELFFBQUwsQ0FBYyxhQUFkLEVBdkdZLENBeUdaOztBQUNBLFNBQUtDLFlBQUw7QUFDSDtBQUVEO0FBQ0o7QUFDQTs7Ozs7V0FDSSw2QkFBb0I7QUFBQTs7QUFDaEI7QUFDQSxVQUFNQyxRQUFRLEdBQUd0RCxDQUFDLENBQUMsNkNBQUQsQ0FBbEI7QUFDQSxXQUFLUyxPQUFMLENBQWE4QyxNQUFiLENBQW9CRCxRQUFwQjtBQUNBLFdBQUtBLFFBQUwsR0FBZ0JBLFFBQWhCLENBSmdCLENBTWhCOztBQUNBLFdBQUs3QyxPQUFMLENBQWFXLEVBQWIsQ0FBZ0IsV0FBaEIsRUFBNkIsVUFBQ0MsQ0FBRCxFQUFPO0FBQ2hDLFFBQUEsTUFBSSxDQUFDbUMscUJBQUwsQ0FBMkJuQyxDQUEzQjtBQUNILE9BRkQsRUFQZ0IsQ0FXaEI7O0FBQ0EsV0FBS1osT0FBTCxDQUFhVyxFQUFiLENBQWdCLFlBQWhCLEVBQThCLFlBQU07QUFDaEMsUUFBQSxNQUFJLENBQUNrQyxRQUFMLENBQWNHLEdBQWQsQ0FBa0IsU0FBbEIsRUFBNkIsR0FBN0I7QUFDSCxPQUZELEVBWmdCLENBZ0JoQjs7QUFDQSxXQUFLaEQsT0FBTCxDQUFhVyxFQUFiLENBQWdCLFlBQWhCLEVBQThCLFlBQU07QUFDaEMsWUFBSSxDQUFDLE1BQUksQ0FBQ1gsT0FBTCxDQUFhSixRQUFiLENBQXNCLFVBQXRCLENBQUwsRUFBd0M7QUFDcEMsVUFBQSxNQUFJLENBQUNpRCxRQUFMLENBQWNHLEdBQWQsQ0FBa0IsU0FBbEIsRUFBNkIsR0FBN0I7QUFDSDtBQUNKLE9BSkQsRUFqQmdCLENBdUJoQjs7QUFDQSxXQUFLaEQsT0FBTCxDQUFhVyxFQUFiLENBQWdCLFdBQWhCLEVBQTZCLFlBQU07QUFDL0IsUUFBQSxNQUFJLENBQUNYLE9BQUwsQ0FBYTJDLFFBQWIsQ0FBc0IsVUFBdEI7O0FBQ0EsUUFBQSxNQUFJLENBQUNFLFFBQUwsQ0FBY0csR0FBZCxDQUFrQixTQUFsQixFQUE2QixHQUE3QjtBQUNILE9BSEQ7QUFLQXpELE1BQUFBLENBQUMsQ0FBQ0gsUUFBRCxDQUFELENBQVl1QixFQUFaLENBQWUsU0FBZixFQUEwQixZQUFNO0FBQzVCLFlBQUksTUFBSSxDQUFDWCxPQUFMLENBQWFKLFFBQWIsQ0FBc0IsVUFBdEIsQ0FBSixFQUF1QztBQUNuQyxVQUFBLE1BQUksQ0FBQ0ksT0FBTCxDQUFhaUQsV0FBYixDQUF5QixVQUF6Qjs7QUFDQSxVQUFBLE1BQUksQ0FBQ0osUUFBTCxDQUFjRyxHQUFkLENBQWtCLFNBQWxCLEVBQTZCLEdBQTdCO0FBQ0g7QUFDSixPQUxEO0FBTUg7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7OztXQUNJLCtCQUFzQnBDLENBQXRCLEVBQXlCO0FBQ3JCLFVBQU1zQyxZQUFZLEdBQUcsS0FBS2xELE9BQUwsQ0FBYW1ELE1BQWIsRUFBckI7QUFDQSxVQUFNQyxXQUFXLEdBQUcsS0FBS3BELE9BQUwsQ0FBYXFELEtBQWIsRUFBcEI7QUFDQSxVQUFNQyxNQUFNLEdBQUcxQyxDQUFDLENBQUMyQyxLQUFGLEdBQVVMLFlBQVksQ0FBQ00sSUFBdEM7QUFDQSxVQUFNQyxPQUFPLEdBQUdDLElBQUksQ0FBQ3BCLEdBQUwsQ0FBUyxDQUFULEVBQVlvQixJQUFJLENBQUNyQixHQUFMLENBQVMsR0FBVCxFQUFlaUIsTUFBTSxHQUFHRixXQUFWLEdBQXlCLEdBQXZDLENBQVosQ0FBaEIsQ0FKcUIsQ0FNckI7O0FBQ0EsVUFBTU8sUUFBUSxHQUFHLEtBQUt4RSxVQUFMLENBQWdCd0UsUUFBakM7O0FBQ0EsVUFBSUMsTUFBTSxDQUFDQyxRQUFQLENBQWdCRixRQUFoQixDQUFKLEVBQStCO0FBQzNCLFlBQU1HLFdBQVcsR0FBSUgsUUFBUSxHQUFHRixPQUFaLEdBQXVCLEdBQTNDO0FBQ0EsWUFBTU0sYUFBYSxHQUFHLEtBQUtDLFVBQUwsQ0FBZ0JGLFdBQWhCLENBQXRCO0FBQ0EsYUFBS2pCLFFBQUwsQ0FBY3JCLElBQWQsQ0FBbUJ1QyxhQUFuQjtBQUNILE9BWm9CLENBY3JCOzs7QUFDQSxXQUFLbEIsUUFBTCxDQUFjRyxHQUFkLENBQWtCLE1BQWxCLFlBQTZCUyxPQUE3QjtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLG9CQUFXUSxPQUFYLEVBQW9CO0FBQ2hCLFVBQU1DLElBQUksR0FBRyxJQUFJQyxJQUFKLENBQVMsSUFBVCxDQUFiO0FBQ0FELE1BQUFBLElBQUksQ0FBQ0UsVUFBTCxDQUFnQkMsUUFBUSxDQUFDSixPQUFELEVBQVUsRUFBVixDQUF4QjtBQUNBLFVBQU1LLE9BQU8sR0FBR0osSUFBSSxDQUFDSyxXQUFMLEVBQWhCO0FBQ0EsVUFBTUMsS0FBSyxHQUFHSCxRQUFRLENBQUNDLE9BQU8sQ0FBQ0csTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBRCxFQUF3QixFQUF4QixDQUF0Qjs7QUFFQSxVQUFJRCxLQUFLLEtBQUssQ0FBZCxFQUFpQjtBQUNiLGVBQU9GLE9BQU8sQ0FBQ0csTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBUDtBQUNILE9BRkQsTUFFTyxJQUFJRCxLQUFLLEdBQUcsRUFBWixFQUFnQjtBQUNuQixlQUFPRixPQUFPLENBQUNHLE1BQVIsQ0FBZSxFQUFmLEVBQW1CLENBQW5CLENBQVA7QUFDSCxPQUZNLE1BRUE7QUFDSCxlQUFPSCxPQUFPLENBQUNHLE1BQVIsQ0FBZSxFQUFmLEVBQW1CLENBQW5CLENBQVA7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLDJCQUFrQkMsV0FBbEIsRUFBK0I7QUFDM0IsVUFBSSxDQUFDQSxXQUFMLEVBQWtCLE9BQU8sU0FBUDtBQUVsQixVQUFNQyxTQUFTLEdBQUdELFdBQVcsQ0FBQ0UsV0FBWixFQUFsQjtBQUNBLFVBQUlELFNBQVMsQ0FBQ25FLFFBQVYsQ0FBbUIsWUFBbkIsQ0FBSixFQUFzQyxPQUFPLE1BQVA7QUFDdEMsVUFBSW1FLFNBQVMsQ0FBQ25FLFFBQVYsQ0FBbUIsWUFBbkIsS0FBb0NtRSxTQUFTLENBQUNuRSxRQUFWLENBQW1CLFdBQW5CLENBQXhDLEVBQXlFLE9BQU8sS0FBUDtBQUN6RSxVQUFJbUUsU0FBUyxDQUFDbkUsUUFBVixDQUFtQixXQUFuQixLQUFtQ21FLFNBQVMsQ0FBQ25FLFFBQVYsQ0FBbUIsYUFBbkIsQ0FBdkMsRUFBMEUsT0FBTyxLQUFQO0FBRTFFLGFBQU8sU0FBUDtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7Ozs7V0FDSSwyQkFBa0JrQixNQUFsQixFQUEwQjtBQUN0QixVQUFNcEMsSUFBSSxHQUFHQyxDQUFDLFlBQUssS0FBS0wsRUFBVixFQUFkO0FBQ0EsVUFBSTJGLE1BQU0sR0FBR3ZGLElBQUksQ0FBQ1EsSUFBTCxDQUFVLHFCQUFWLENBQWIsQ0FGc0IsQ0FJdEI7O0FBQ0EsVUFBSStFLE1BQU0sQ0FBQzFELE1BQVAsS0FBa0IsQ0FBdEIsRUFBeUI7QUFDckIwRCxRQUFBQSxNQUFNLEdBQUd0RixDQUFDLENBQUMsd0RBQUQsQ0FBVjtBQUNBLGFBQUtVLGFBQUwsQ0FBbUI2RSxNQUFuQixDQUEwQkQsTUFBMUI7QUFDSCxPQVJxQixDQVV0Qjs7O0FBQ0EsVUFBTUUsV0FBVyxHQUFHckQsTUFBTSxDQUFDc0QsV0FBUCxFQUFwQjtBQUNBSCxNQUFBQSxNQUFNLENBQUNyRCxJQUFQLENBQVl1RCxXQUFaLEVBWnNCLENBY3RCOztBQUNBRixNQUFBQSxNQUFNLENBQUM1QixXQUFQLENBQW1CLHdCQUFuQixFQWZzQixDQWlCdEI7O0FBQ0EsY0FBUXZCLE1BQVI7QUFDSSxhQUFLLE1BQUw7QUFDSW1ELFVBQUFBLE1BQU0sQ0FBQ2xDLFFBQVAsQ0FBZ0IsT0FBaEIsRUFESixDQUM4Qjs7QUFDMUI7O0FBQ0osYUFBSyxLQUFMO0FBQ0lrQyxVQUFBQSxNQUFNLENBQUNsQyxRQUFQLENBQWdCLFFBQWhCLEVBREosQ0FDK0I7O0FBQzNCOztBQUNKLGFBQUssS0FBTDtBQUNJa0MsVUFBQUEsTUFBTSxDQUFDbEMsUUFBUCxDQUFnQixNQUFoQixFQURKLENBQzZCOztBQUN6Qjs7QUFDSjtBQUNJa0MsVUFBQUEsTUFBTSxDQUFDbEMsUUFBUCxDQUFnQixNQUFoQjtBQUF5QjtBQVhqQztBQWFIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksOEJBQXFCO0FBQ2pCLFVBQUlpQixNQUFNLENBQUNDLFFBQVAsQ0FBZ0IsS0FBS0YsUUFBckIsQ0FBSixFQUFvQztBQUNoQyxZQUFNckUsSUFBSSxHQUFHQyxDQUFDLENBQUMsSUFBRCxDQUFELENBQVEwRixPQUFSLENBQWdCLElBQWhCLENBQWI7QUFDQSxZQUFNZixJQUFJLEdBQUcsSUFBSUMsSUFBSixDQUFTLElBQVQsQ0FBYjtBQUNBRCxRQUFBQSxJQUFJLENBQUNFLFVBQUwsQ0FBZ0JDLFFBQVEsQ0FBQyxLQUFLYSxXQUFOLEVBQW1CLEVBQW5CLENBQXhCLEVBSGdDLENBR2lCOztBQUNqRCxZQUFNQSxXQUFXLEdBQUdoQixJQUFJLENBQUNLLFdBQUwsR0FBbUJFLE1BQW5CLENBQTBCLEVBQTFCLEVBQThCLENBQTlCLENBQXBCO0FBQ0FQLFFBQUFBLElBQUksQ0FBQ0UsVUFBTCxDQUFnQkMsUUFBUSxDQUFDLEtBQUtWLFFBQU4sRUFBZ0IsRUFBaEIsQ0FBeEIsRUFMZ0MsQ0FLYzs7QUFDOUMsWUFBTVcsT0FBTyxHQUFHSixJQUFJLENBQUNLLFdBQUwsRUFBaEI7QUFDQSxZQUFNQyxLQUFLLEdBQUdILFFBQVEsQ0FBQ0MsT0FBTyxDQUFDRyxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFELEVBQXdCLEVBQXhCLENBQXRCO0FBQ0EsWUFBSWQsUUFBSjs7QUFDQSxZQUFJYSxLQUFLLEtBQUssQ0FBZCxFQUFpQjtBQUNiYixVQUFBQSxRQUFRLEdBQUdXLE9BQU8sQ0FBQ0csTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBWDtBQUNILFNBRkQsTUFFTyxJQUFJRCxLQUFLLEdBQUcsRUFBWixFQUFnQjtBQUNuQmIsVUFBQUEsUUFBUSxHQUFHVyxPQUFPLENBQUNHLE1BQVIsQ0FBZSxFQUFmLEVBQW1CLENBQW5CLENBQVg7QUFDSCxTQUZNLE1BRUEsSUFBSUQsS0FBSyxJQUFJLEVBQWIsRUFBaUI7QUFDcEJiLFVBQUFBLFFBQVEsR0FBR1csT0FBTyxDQUFDRyxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFYO0FBQ0g7O0FBQ0RuRixRQUFBQSxJQUFJLENBQUNRLElBQUwsQ0FBVSxtQkFBVixFQUErQjBCLElBQS9CLFdBQXVDMEQsV0FBdkMsY0FBc0R2QixRQUF0RDtBQUNIO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksMEJBQWlCd0IsTUFBakIsRUFBeUJDLElBQXpCLEVBQStCO0FBQzNCLFVBQUlBLElBQUksQ0FBQ0MsZUFBTCxJQUF3QnpCLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQixLQUFLMUUsVUFBTCxDQUFnQndFLFFBQWhDLENBQTVCLEVBQXVFO0FBQ25FLGFBQUt4RSxVQUFMLENBQWdCZSxtQkFBaEIsQ0FBb0MsWUFBcEMsRUFBa0QsS0FBS0UsWUFBdkQsRUFBcUUsS0FBckU7QUFDQSxhQUFLakIsVUFBTCxDQUFnQitGLFdBQWhCLEdBQStCLEtBQUsvRixVQUFMLENBQWdCd0UsUUFBaEIsR0FBMkJ3QixNQUE1QixHQUFzQyxHQUFwRTtBQUNBLGFBQUtoRyxVQUFMLENBQWdCNkMsZ0JBQWhCLENBQWlDLFlBQWpDLEVBQStDLEtBQUs1QixZQUFwRCxFQUFrRSxLQUFsRTtBQUNIOztBQUNELFVBQUl3RCxNQUFNLENBQUNDLFFBQVAsQ0FBZ0IsS0FBSzFFLFVBQUwsQ0FBZ0J3RSxRQUFoQyxDQUFKLEVBQStDO0FBQzNDLFlBQU0yQixXQUFXLEdBQUcsSUFBSW5CLElBQUosQ0FBUyxJQUFULENBQXBCO0FBQ0FtQixRQUFBQSxXQUFXLENBQUNsQixVQUFaLENBQXVCQyxRQUFRLENBQUMsS0FBS2xGLFVBQUwsQ0FBZ0IrRixXQUFqQixFQUE4QixFQUE5QixDQUEvQixFQUYyQyxDQUV3Qjs7QUFDbkUsWUFBTUEsV0FBVyxHQUFHSSxXQUFXLENBQUNmLFdBQVosR0FBMEJFLE1BQTFCLENBQWlDLEVBQWpDLEVBQXFDLENBQXJDLENBQXBCO0FBQ0EsWUFBTWMsWUFBWSxHQUFHLElBQUlwQixJQUFKLENBQVMsSUFBVCxDQUFyQjtBQUNBb0IsUUFBQUEsWUFBWSxDQUFDbkIsVUFBYixDQUF3QkMsUUFBUSxDQUFDLEtBQUtsRixVQUFMLENBQWdCd0UsUUFBakIsRUFBMkIsRUFBM0IsQ0FBaEMsRUFMMkMsQ0FLc0I7O0FBQ2pFLFlBQU1XLE9BQU8sR0FBR2lCLFlBQVksQ0FBQ2hCLFdBQWIsRUFBaEI7QUFDQSxZQUFNQyxLQUFLLEdBQUdILFFBQVEsQ0FBQ0MsT0FBTyxDQUFDRyxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFELEVBQXdCLEVBQXhCLENBQXRCO0FBQ0EsWUFBSWQsUUFBSjs7QUFDQSxZQUFJYSxLQUFLLEtBQUssQ0FBZCxFQUFpQjtBQUNiYixVQUFBQSxRQUFRLEdBQUdXLE9BQU8sQ0FBQ0csTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBWDtBQUNILFNBRkQsTUFFTyxJQUFJRCxLQUFLLEdBQUcsRUFBWixFQUFnQjtBQUNuQmIsVUFBQUEsUUFBUSxHQUFHVyxPQUFPLENBQUNHLE1BQVIsQ0FBZSxFQUFmLEVBQW1CLENBQW5CLENBQVg7QUFDSCxTQUZNLE1BRUEsSUFBSUQsS0FBSyxJQUFJLEVBQWIsRUFBaUI7QUFDcEJiLFVBQUFBLFFBQVEsR0FBR1csT0FBTyxDQUFDRyxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFYO0FBQ0g7O0FBQ0QsYUFBS2hDLFlBQUwsQ0FBa0JqQixJQUFsQixXQUEwQjBELFdBQTFCLGNBQXlDdkIsUUFBekM7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksd0JBQWU7QUFDWCxVQUFJQyxNQUFNLENBQUNDLFFBQVAsQ0FBZ0IsS0FBS0YsUUFBckIsQ0FBSixFQUFvQztBQUNoQyxZQUFNRixPQUFPLEdBQUcsS0FBS3lCLFdBQUwsR0FBbUIsS0FBS3ZCLFFBQXhDO0FBQ0EsWUFBTTZCLGFBQWEsR0FBRzlCLElBQUksQ0FBQ3JCLEdBQUwsQ0FBU3FCLElBQUksQ0FBQytCLEtBQUwsQ0FBWWhDLE9BQUQsR0FBWSxHQUF2QixDQUFULEVBQXNDLEdBQXRDLENBQXRCO0FBQ0EsWUFBTW5FLElBQUksR0FBR0MsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRMEYsT0FBUixDQUFnQixJQUFoQixDQUFiO0FBQ0EzRixRQUFBQSxJQUFJLENBQUNRLElBQUwsQ0FBVSxnQkFBVixFQUE0QnNDLEtBQTVCLENBQWtDLFdBQWxDLEVBQStDb0QsYUFBL0M7O0FBQ0EsWUFBSSxLQUFLTixXQUFMLEtBQXFCLEtBQUt2QixRQUE5QixFQUF3QztBQUNwQ3JFLFVBQUFBLElBQUksQ0FBQ1EsSUFBTCxDQUFVLFNBQVYsRUFBcUJtRCxXQUFyQixDQUFpQyxPQUFqQyxFQUEwQ04sUUFBMUMsQ0FBbUQsTUFBbkQ7QUFDSDtBQUNKO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7OztXQUNJLHdCQUFlO0FBQUE7O0FBQ1gsVUFBTStDLFNBQVMsR0FBRyxLQUFLdkcsVUFBTCxDQUFnQm9CLFlBQWhCLENBQTZCLFVBQTdCLENBQWxCOztBQUNBLFVBQUksQ0FBQ21GLFNBQUQsSUFBYyxDQUFDQSxTQUFTLENBQUNsRixRQUFWLENBQW1CLGVBQW5CLENBQW5CLEVBQXdEO0FBQ3BEO0FBQ0gsT0FKVSxDQU1YOzs7QUFDQSxVQUFNbUYsT0FBTyxHQUFHRCxTQUFTLENBQUNFLFVBQVYsQ0FBcUIsTUFBckIsSUFDVkYsU0FEVSxhQUVQRyxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLE1BRlQsU0FFa0JMLFNBRmxCLENBQWhCLENBUFcsQ0FXWDs7QUFDQSxVQUFNTSxPQUFPLEdBQUc7QUFDWiw0QkFBb0I7QUFEUixPQUFoQjs7QUFJQSxVQUFJLE9BQU9DLFlBQVAsS0FBd0IsV0FBeEIsSUFBdUNBLFlBQVksQ0FBQ0MsV0FBeEQsRUFBcUU7QUFDakVGLFFBQUFBLE9BQU8sQ0FBQyxlQUFELENBQVAsb0JBQXFDQyxZQUFZLENBQUNDLFdBQWxEO0FBQ0gsT0FsQlUsQ0FvQlg7OztBQUNBQyxNQUFBQSxLQUFLLENBQUNSLE9BQUQsRUFBVTtBQUNYUyxRQUFBQSxNQUFNLEVBQUUsTUFERztBQUVYSixRQUFBQSxPQUFPLEVBQVBBO0FBRlcsT0FBVixDQUFMLENBSUNLLElBSkQsQ0FJTSxVQUFBQyxRQUFRLEVBQUk7QUFDZCxZQUFJLENBQUNBLFFBQVEsQ0FBQ0MsRUFBZCxFQUFrQjtBQUNkO0FBQ0EsVUFBQSxNQUFJLENBQUNDLGFBQUw7O0FBQ0E7QUFDSCxTQUxhLENBT2Q7OztBQUNBLFlBQU05QixXQUFXLEdBQUc0QixRQUFRLENBQUNOLE9BQVQsQ0FBaUJTLEdBQWpCLENBQXFCLGNBQXJCLENBQXBCO0FBQ0EsUUFBQSxNQUFJLENBQUNqSCxhQUFMLEdBQXFCLE1BQUksQ0FBQ2tILGlCQUFMLENBQXVCaEMsV0FBdkIsQ0FBckI7O0FBQ0EsWUFBSSxNQUFJLENBQUNsRixhQUFMLElBQXNCLE1BQUksQ0FBQ0EsYUFBTCxLQUF1QixTQUFqRCxFQUE0RDtBQUN4RCxVQUFBLE1BQUksQ0FBQ21ILGlCQUFMLENBQXVCLE1BQUksQ0FBQ25ILGFBQTVCO0FBQ0gsU0FaYSxDQWNkOzs7QUFDQSxZQUFNb0gsZUFBZSxHQUFHTixRQUFRLENBQUNOLE9BQVQsQ0FBaUJTLEdBQWpCLENBQXFCLGtCQUFyQixDQUF4Qjs7QUFDQSxZQUFJRyxlQUFKLEVBQXFCO0FBQ2pCLGNBQU1qRCxRQUFRLEdBQUdrRCxVQUFVLENBQUNELGVBQUQsQ0FBM0I7O0FBQ0EsY0FBSWpELFFBQVEsR0FBRyxDQUFmLEVBQWtCO0FBQ2Q7QUFDQW1ELFlBQUFBLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQixNQUFJLENBQUM1SCxVQUEzQixFQUF1QyxVQUF2QyxFQUFtRDtBQUMvQ29DLGNBQUFBLEtBQUssRUFBRW9DLFFBRHdDO0FBRS9DcUQsY0FBQUEsUUFBUSxFQUFFLEtBRnFDO0FBRy9DQyxjQUFBQSxZQUFZLEVBQUU7QUFIaUMsYUFBbkQ7QUFNQSxnQkFBTS9DLElBQUksR0FBRyxJQUFJQyxJQUFKLENBQVMsSUFBVCxDQUFiO0FBQ0FELFlBQUFBLElBQUksQ0FBQ0UsVUFBTCxDQUFnQkMsUUFBUSxDQUFDVixRQUFELEVBQVcsRUFBWCxDQUF4QjtBQUNBLGdCQUFNVyxPQUFPLEdBQUdKLElBQUksQ0FBQ0ssV0FBTCxFQUFoQjtBQUNBLGdCQUFNQyxLQUFLLEdBQUdILFFBQVEsQ0FBQ0MsT0FBTyxDQUFDRyxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFELEVBQXdCLEVBQXhCLENBQXRCO0FBQ0EsZ0JBQUl5QyxTQUFKOztBQUNBLGdCQUFJMUMsS0FBSyxLQUFLLENBQWQsRUFBaUI7QUFDYjBDLGNBQUFBLFNBQVMsR0FBRzVDLE9BQU8sQ0FBQ0csTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBWjtBQUNILGFBRkQsTUFFTyxJQUFJRCxLQUFLLEdBQUcsRUFBWixFQUFnQjtBQUNuQjBDLGNBQUFBLFNBQVMsR0FBRzVDLE9BQU8sQ0FBQ0csTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBWjtBQUNILGFBRk0sTUFFQTtBQUNIeUMsY0FBQUEsU0FBUyxHQUFHNUMsT0FBTyxDQUFDRyxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFaO0FBQ0g7O0FBQ0QsWUFBQSxNQUFJLENBQUN4RSxhQUFMLENBQW1CdUIsSUFBbkIsaUJBQWlDMEYsU0FBakM7QUFDSDtBQUNKO0FBQ0osT0E3Q0QsV0E4Q08sWUFBTTtBQUNUO0FBQ0EsUUFBQSxNQUFJLENBQUNWLGFBQUw7QUFDSCxPQWpERDtBQWtESDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLHdCQUFlO0FBQ1gsVUFBSSxDQUFDLEtBQUtySCxVQUFMLENBQWdCZ0ksTUFBckIsRUFBNkI7QUFDekIsYUFBS2hJLFVBQUwsQ0FBZ0JpSSxLQUFoQjtBQUNBLGFBQUt2SCxRQUFMLENBQWNvRCxXQUFkLENBQTBCLE9BQTFCLEVBQW1DTixRQUFuQyxDQUE0QyxNQUE1QztBQUNIO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSw2QkFBb0I7QUFDaEIsVUFBSSxLQUFLMEUsZUFBVCxFQUEwQjtBQUN0QixZQUFJO0FBQ0E7QUFDQSxlQUFLQSxlQUFMLENBQXFCQyxVQUFyQjtBQUNBLGVBQUtELGVBQUwsQ0FBcUJFLGNBQXJCLEdBQXNDLElBQXRDO0FBQ0EsZUFBS0YsZUFBTCxHQUF1QixJQUF2QjtBQUNILFNBTEQsQ0FLRSxPQUFPekcsQ0FBUCxFQUFVLENBQ1I7QUFDSDtBQUNKOztBQUVELFVBQUksS0FBS2xCLFVBQVQsRUFBcUI7QUFDakIsWUFBSTtBQUNBLGVBQUtBLFVBQUwsQ0FBZ0I0SCxVQUFoQjtBQUNILFNBRkQsQ0FFRSxPQUFPMUcsQ0FBUCxFQUFVLENBQ1I7QUFDSDtBQUNKOztBQUVELFVBQUksS0FBS2pCLFFBQVQsRUFBbUI7QUFDZixZQUFJO0FBQ0EsZUFBS0EsUUFBTCxDQUFjMkgsVUFBZDtBQUNILFNBRkQsQ0FFRSxPQUFPMUcsQ0FBUCxFQUFVLENBQ1I7QUFDSDtBQUNKO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSxnQkFBTztBQUNIO0FBQ0EsVUFBTTRHLFVBQVUsR0FBRyxLQUFLckksVUFBTCxDQUFnQm9CLFlBQWhCLENBQTZCLEtBQTdCLENBQW5COztBQUNBLFVBQUlpSCxVQUFKLEVBQWdCO0FBQ1o7QUFDQSxZQUFJLEtBQUtySSxVQUFMLENBQWdCZ0ksTUFBcEIsRUFBNEI7QUFDeEI7QUFDQWxJLFVBQUFBLFNBQVMsQ0FBQ3dJLFVBQVYsQ0FBcUIsSUFBckI7QUFDQSxlQUFLdEksVUFBTCxDQUFnQjJCLElBQWhCO0FBQ0EsZUFBS2pCLFFBQUwsQ0FBY29ELFdBQWQsQ0FBMEIsTUFBMUIsRUFBa0NOLFFBQWxDLENBQTJDLE9BQTNDO0FBQ0gsU0FMRCxNQUtPO0FBQ0g7QUFDQSxlQUFLeEQsVUFBTCxDQUFnQmlJLEtBQWhCO0FBQ0EsZUFBS3ZILFFBQUwsQ0FBY29ELFdBQWQsQ0FBMEIsT0FBMUIsRUFBbUNOLFFBQW5DLENBQTRDLE1BQTVDOztBQUNBLGNBQUkxRCxTQUFTLENBQUNpRCxnQkFBVixLQUErQixJQUFuQyxFQUF5QztBQUNyQ2pELFlBQUFBLFNBQVMsQ0FBQ2lELGdCQUFWLEdBQTZCLElBQTdCO0FBQ0g7QUFDSjs7QUFDRDtBQUNILE9BbkJFLENBcUJIOzs7QUFDQSxVQUFJd0QsU0FBUyxHQUFHLEtBQUt2RyxVQUFMLENBQWdCb0IsWUFBaEIsQ0FBNkIsVUFBN0IsS0FBNEMsRUFBNUQsQ0F0QkcsQ0F3Qkg7QUFDQTs7QUFDQSxVQUFJbUYsU0FBUyxJQUFJQSxTQUFTLENBQUNsRixRQUFWLENBQW1CLGVBQW5CLENBQWpCLEVBQXNEO0FBQ2xEO0FBQ0F2QixRQUFBQSxTQUFTLENBQUN3SSxVQUFWLENBQXFCLElBQXJCO0FBQ0EsYUFBS0MsdUJBQUwsQ0FBNkJoQyxTQUE3QjtBQUNBO0FBQ0gsT0EvQkUsQ0FpQ0g7OztBQUNBLFVBQUksS0FBS3ZHLFVBQUwsQ0FBZ0JnSSxNQUFoQixJQUEwQixLQUFLaEksVUFBTCxDQUFnQndFLFFBQTlDLEVBQXdEO0FBQ3BEMUUsUUFBQUEsU0FBUyxDQUFDd0ksVUFBVixDQUFxQixJQUFyQjtBQUNBLGFBQUt0SSxVQUFMLENBQWdCMkIsSUFBaEI7QUFDQSxhQUFLakIsUUFBTCxDQUFjb0QsV0FBZCxDQUEwQixNQUExQixFQUFrQ04sUUFBbEMsQ0FBMkMsT0FBM0M7QUFDSCxPQUpELE1BSU8sSUFBSSxDQUFDLEtBQUt4RCxVQUFMLENBQWdCZ0ksTUFBckIsRUFBNkI7QUFDaEMsYUFBS2hJLFVBQUwsQ0FBZ0JpSSxLQUFoQjtBQUNBLGFBQUt2SCxRQUFMLENBQWNvRCxXQUFkLENBQTBCLE9BQTFCLEVBQW1DTixRQUFuQyxDQUE0QyxNQUE1Qzs7QUFDQSxZQUFJMUQsU0FBUyxDQUFDaUQsZ0JBQVYsS0FBK0IsSUFBbkMsRUFBeUM7QUFDckNqRCxVQUFBQSxTQUFTLENBQUNpRCxnQkFBVixHQUE2QixJQUE3QjtBQUNIO0FBQ0o7QUFDSjtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSwwQkFBaUI7QUFDYixVQUFJO0FBQ0E7QUFDQSxZQUFJLENBQUMsS0FBS3pDLFlBQVYsRUFBd0I7QUFDcEIsY0FBTWtJLFlBQVksR0FBRzlCLE1BQU0sQ0FBQzhCLFlBQVAsSUFBdUI5QixNQUFNLENBQUMrQixrQkFBbkQ7QUFDQSxlQUFLbkksWUFBTCxHQUFvQixJQUFJa0ksWUFBSixFQUFwQjtBQUNILFNBTEQsQ0FPQTs7O0FBQ0EsWUFBSSxDQUFDLEtBQUtqSSxVQUFWLEVBQXNCO0FBQ2xCLGVBQUtBLFVBQUwsR0FBa0IsS0FBS0QsWUFBTCxDQUFrQm9JLHdCQUFsQixDQUEyQyxLQUFLMUksVUFBaEQsQ0FBbEI7QUFDSCxTQVZELENBWUE7OztBQUNBLFlBQUksS0FBS1EsUUFBVCxFQUFtQjtBQUNmLGNBQUk7QUFDQSxpQkFBS0QsVUFBTCxDQUFnQjRILFVBQWhCO0FBQ0EsaUJBQUszSCxRQUFMLENBQWMySCxVQUFkO0FBQ0gsV0FIRCxDQUdFLE9BQU8xRyxDQUFQLEVBQVUsQ0FDUjtBQUNIO0FBQ0osU0FwQkQsQ0FzQkE7QUFDQTs7O0FBQ0EsWUFBTWtILFVBQVUsR0FBRyxJQUFuQjtBQUNBLFlBQU1ULGVBQWUsR0FBRyxLQUFLNUgsWUFBTCxDQUFrQnNJLHFCQUFsQixDQUF3Q0QsVUFBeEMsRUFBb0QsQ0FBcEQsRUFBdUQsQ0FBdkQsQ0FBeEIsQ0F6QkEsQ0EyQkE7O0FBQ0EsYUFBS1QsZUFBTCxHQUF1QkEsZUFBdkIsQ0E1QkEsQ0E4QkE7QUFDQTs7QUFDQUEsUUFBQUEsZUFBZSxDQUFDRSxjQUFoQixHQUFpQyxVQUFDUyxvQkFBRCxFQUEwQjtBQUN2RCxjQUFNQyxXQUFXLEdBQUdELG9CQUFvQixDQUFDQyxXQUF6QztBQUNBLGNBQU1DLFlBQVksR0FBR0Ysb0JBQW9CLENBQUNFLFlBQTFDLENBRnVELENBSXZEOztBQUNBLGNBQU1DLGlCQUFpQixHQUFHRixXQUFXLENBQUNHLGdCQUF0QztBQUNBLGNBQU1DLGtCQUFrQixHQUFHSCxZQUFZLENBQUNFLGdCQUF4QyxDQU51RCxDQVF2RDs7QUFDQSxjQUFJRCxpQkFBaUIsS0FBSyxDQUExQixFQUE2QjtBQUN6QjtBQUNBLGdCQUFNRyxTQUFTLEdBQUdMLFdBQVcsQ0FBQ00sY0FBWixDQUEyQixDQUEzQixDQUFsQjtBQUNBLGdCQUFNQyxPQUFPLEdBQUdOLFlBQVksQ0FBQ0ssY0FBYixDQUE0QixDQUE1QixDQUFoQjtBQUNBLGdCQUFNRSxPQUFPLEdBQUdKLGtCQUFrQixHQUFHLENBQXJCLEdBQXlCSCxZQUFZLENBQUNLLGNBQWIsQ0FBNEIsQ0FBNUIsQ0FBekIsR0FBMEQsSUFBMUU7O0FBRUEsaUJBQUssSUFBSUcsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBR0osU0FBUyxDQUFDbkgsTUFBOUIsRUFBc0N1SCxDQUFDLEVBQXZDLEVBQTJDO0FBQ3ZDRixjQUFBQSxPQUFPLENBQUNFLENBQUQsQ0FBUCxHQUFhSixTQUFTLENBQUNJLENBQUQsQ0FBdEI7O0FBQ0Esa0JBQUlELE9BQUosRUFBYTtBQUNUQSxnQkFBQUEsT0FBTyxDQUFDQyxDQUFELENBQVAsR0FBYUosU0FBUyxDQUFDSSxDQUFELENBQXRCO0FBQ0g7QUFDSjtBQUNKLFdBWkQsTUFZTyxJQUFJUCxpQkFBaUIsSUFBSSxDQUF6QixFQUE0QjtBQUMvQjtBQUNBLGdCQUFNUSxNQUFNLEdBQUdWLFdBQVcsQ0FBQ00sY0FBWixDQUEyQixDQUEzQixDQUFmO0FBQ0EsZ0JBQU1LLE1BQU0sR0FBR1gsV0FBVyxDQUFDTSxjQUFaLENBQTJCLENBQTNCLENBQWY7O0FBQ0EsZ0JBQU1DLFFBQU8sR0FBR04sWUFBWSxDQUFDSyxjQUFiLENBQTRCLENBQTVCLENBQWhCOztBQUNBLGdCQUFNRSxRQUFPLEdBQUdKLGtCQUFrQixHQUFHLENBQXJCLEdBQXlCSCxZQUFZLENBQUNLLGNBQWIsQ0FBNEIsQ0FBNUIsQ0FBekIsR0FBMEQsSUFBMUUsQ0FMK0IsQ0FPL0I7OztBQUNBLGlCQUFLLElBQUlHLEVBQUMsR0FBRyxDQUFiLEVBQWdCQSxFQUFDLEdBQUdDLE1BQU0sQ0FBQ3hILE1BQTNCLEVBQW1DdUgsRUFBQyxFQUFwQyxFQUF3QztBQUNwQztBQUNBRixjQUFBQSxRQUFPLENBQUNFLEVBQUQsQ0FBUCxHQUFjQyxNQUFNLENBQUNELEVBQUQsQ0FBTixHQUFZLElBQWIsR0FBc0JFLE1BQU0sQ0FBQ0YsRUFBRCxDQUFOLEdBQVksSUFBL0MsQ0FGb0MsQ0FJcEM7O0FBQ0Esa0JBQUlELFFBQUosRUFBYTtBQUNUQSxnQkFBQUEsUUFBTyxDQUFDQyxFQUFELENBQVAsR0FBY0MsTUFBTSxDQUFDRCxFQUFELENBQU4sR0FBWSxJQUFiLEdBQXNCRSxNQUFNLENBQUNGLEVBQUQsQ0FBTixHQUFZLElBQS9DO0FBQ0g7QUFDSjtBQUNKO0FBQ0osU0F2Q0QsQ0FoQ0EsQ0F5RUE7OztBQUNBLGFBQUsvSSxRQUFMLEdBQWdCLEtBQUtGLFlBQUwsQ0FBa0JvSixVQUFsQixFQUFoQixDQTFFQSxDQTRFQTtBQUNBOztBQUNBLGFBQUtuSixVQUFMLENBQWdCb0osT0FBaEIsQ0FBd0J6QixlQUF4QjtBQUNBQSxRQUFBQSxlQUFlLENBQUN5QixPQUFoQixDQUF3QixLQUFLbkosUUFBN0I7QUFDQSxhQUFLQSxRQUFMLENBQWNtSixPQUFkLENBQXNCLEtBQUtySixZQUFMLENBQWtCc0osV0FBeEM7QUFFSCxPQWxGRCxDQWtGRSxPQUFPQyxLQUFQLEVBQWMsQ0FDWjtBQUNIO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7OztXQUNJLGlDQUF3QkMsTUFBeEIsRUFBZ0M7QUFBQTs7QUFDNUIsVUFBTXRELE9BQU8sR0FBR3NELE1BQU0sQ0FBQ3JELFVBQVAsQ0FBa0IsTUFBbEIsSUFDVnFELE1BRFUsYUFFUHBELE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsTUFGVCxTQUVrQmtELE1BRmxCLENBQWhCLENBRDRCLENBSzVCOztBQUNBLFVBQUksS0FBSzlKLFVBQUwsQ0FBZ0IrSixHQUFoQixJQUF1QixLQUFLL0osVUFBTCxDQUFnQitKLEdBQWhCLENBQW9CdEQsVUFBcEIsQ0FBK0IsT0FBL0IsQ0FBM0IsRUFBb0U7QUFDaEV1RCxRQUFBQSxHQUFHLENBQUNDLGVBQUosQ0FBb0IsS0FBS2pLLFVBQUwsQ0FBZ0IrSixHQUFwQztBQUNILE9BUjJCLENBVTVCO0FBQ0E7OztBQUNBLFdBQUsvSixVQUFMLENBQWdCK0osR0FBaEIsR0FBc0J2RCxPQUF0QjtBQUNBLFdBQUt4RyxVQUFMLENBQWdCa0ssSUFBaEIsR0FiNEIsQ0FlNUI7QUFDQTtBQUNBOztBQUNBLFVBQUksQ0FBQyxLQUFLM0osVUFBVixFQUFzQjtBQUNsQixhQUFLNEosY0FBTDtBQUNILE9BcEIyQixDQXNCNUI7OztBQUNBLFdBQUtuSyxVQUFMLENBQWdCb0ssZ0JBQWhCLEdBQW1DLFlBQU07QUFDckMsUUFBQSxNQUFJLENBQUNwSyxVQUFMLENBQWdCMkIsSUFBaEI7O0FBQ0EsUUFBQSxNQUFJLENBQUNqQixRQUFMLENBQWNvRCxXQUFkLENBQTBCLE1BQTFCLEVBQWtDTixRQUFsQyxDQUEyQyxPQUEzQzs7QUFDQSxRQUFBLE1BQUksQ0FBQ3hELFVBQUwsQ0FBZ0JvSyxnQkFBaEIsR0FBbUMsSUFBbkM7QUFDSCxPQUpELENBdkI0QixDQTZCNUI7OztBQUNBLFdBQUtwSyxVQUFMLENBQWdCcUssT0FBaEIsR0FBMEIsWUFBTTtBQUM1QixZQUFNUixLQUFLLEdBQUcsTUFBSSxDQUFDN0osVUFBTCxDQUFnQjZKLEtBQTlCO0FBQ0EsWUFBTVMsT0FBTyxHQUFHVCxLQUFLLDBCQUFtQkEsS0FBSyxDQUFDUyxPQUFOLElBQWlCVCxLQUFLLENBQUNVLElBQTFDLElBQW1ELG1CQUF4RTtBQUNBQyxRQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJILE9BQTVCLEVBQXFDSSxlQUFlLENBQUNDLHNCQUFyRDtBQUNBLFFBQUEsTUFBSSxDQUFDM0ssVUFBTCxDQUFnQnFLLE9BQWhCLEdBQTBCLElBQTFCO0FBQ0gsT0FMRDtBQU1IO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLHNCQUFhNUgsV0FBYixFQUEyQztBQUFBOztBQUFBLFVBQWpCRixNQUFpQix1RUFBUixNQUFROztBQUN2QztBQUNBLFVBQUlFLFdBQVcsQ0FBQ3BCLFFBQVosQ0FBcUIsZUFBckIsQ0FBSixFQUEyQztBQUN2QztBQUNBLFlBQUl1SixhQUFhLEdBQUduSSxXQUFwQjs7QUFDQSxZQUFJRixNQUFNLEtBQUssVUFBZixFQUEyQjtBQUN2QixjQUFNc0ksU0FBUyxHQUFHcEksV0FBVyxDQUFDcEIsUUFBWixDQUFxQixHQUFyQixJQUE0QixHQUE1QixHQUFrQyxHQUFwRDtBQUNBdUosVUFBQUEsYUFBYSxhQUFNbkksV0FBTixTQUFvQm9JLFNBQXBCLG9CQUF1Q0Msa0JBQWtCLENBQUN2SSxNQUFELENBQXpELENBQWI7QUFDSCxTQU5zQyxDQVF2Qzs7O0FBQ0EsWUFBTWlFLE9BQU8sR0FBR29FLGFBQWEsQ0FBQ25FLFVBQWQsQ0FBeUIsTUFBekIsSUFDVm1FLGFBRFUsYUFFUGxFLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsTUFGVCxTQUVrQmdFLGFBRmxCLENBQWhCLENBVHVDLENBYXZDOztBQUNBLFlBQU0vRCxPQUFPLEdBQUc7QUFDWiw4QkFBb0I7QUFEUixTQUFoQjs7QUFJQSxZQUFJLE9BQU9DLFlBQVAsS0FBd0IsV0FBeEIsSUFBdUNBLFlBQVksQ0FBQ0MsV0FBeEQsRUFBcUU7QUFDakVGLFVBQUFBLE9BQU8sQ0FBQyxlQUFELENBQVAsb0JBQXFDQyxZQUFZLENBQUNDLFdBQWxEO0FBQ0g7O0FBRUQsWUFBTWdFLFNBQVMsR0FBR0MsV0FBVyxDQUFDQyxHQUFaLEVBQWxCO0FBQ0EsYUFBS3JKLGlCQUFMLENBQXVCNEIsUUFBdkIsQ0FBZ0MsVUFBaEM7QUFDQSxhQUFLNUIsaUJBQUwsQ0FBdUJqQixJQUF2QixDQUE0QixZQUE1QixFQUEwQzZDLFFBQTFDLENBQW1ELGlCQUFuRCxFQUFzRU0sV0FBdEUsQ0FBa0YsVUFBbEY7QUFDQSxhQUFLakMsaUJBQUwsQ0FBdUJRLElBQXZCLENBQTRCLElBQTVCLEVBQWtDNkksSUFBbEMsR0F6QnVDLENBMkJ2Qzs7QUFDQWxFLFFBQUFBLEtBQUssQ0FBQ1IsT0FBRCxFQUFVO0FBQUVLLFVBQUFBLE9BQU8sRUFBUEE7QUFBRixTQUFWLENBQUwsQ0FDS0ssSUFETCxDQUNVLFVBQUFDLFFBQVEsRUFBSTtBQUNkLGNBQUksQ0FBQ0EsUUFBUSxDQUFDQyxFQUFkLEVBQWtCO0FBQ2Qsa0JBQU0sSUFBSStELEtBQUosZ0JBQWtCaEUsUUFBUSxDQUFDaUUsTUFBM0IsZUFBc0NqRSxRQUFRLENBQUNrRSxVQUEvQyxFQUFOO0FBQ0gsV0FIYSxDQUtkOzs7QUFDQSxjQUFNQyxXQUFXLEdBQUduRSxRQUFRLENBQUNOLE9BQVQsQ0FBaUJTLEdBQWpCLENBQXFCLHFCQUFyQixDQUFwQjtBQUNBLGNBQUlpRSxRQUFRLHlCQUFrQmhKLE1BQU0sSUFBSSxLQUE1QixDQUFaOztBQUNBLGNBQUkrSSxXQUFXLElBQUlBLFdBQVcsQ0FBQ2pLLFFBQVosQ0FBcUIsV0FBckIsQ0FBbkIsRUFBc0Q7QUFDbEQsZ0JBQU1tSyxPQUFPLEdBQUcseUNBQXlDQyxJQUF6QyxDQUE4Q0gsV0FBOUMsQ0FBaEI7O0FBQ0EsZ0JBQUlFLE9BQU8sSUFBSSxJQUFYLElBQW1CQSxPQUFPLENBQUMsQ0FBRCxDQUE5QixFQUFtQztBQUMvQkQsY0FBQUEsUUFBUSxHQUFHQyxPQUFPLENBQUMsQ0FBRCxDQUFQLENBQVdFLE9BQVgsQ0FBbUIsT0FBbkIsRUFBNEIsRUFBNUIsQ0FBWDtBQUNIO0FBQ0osV0FMRCxNQUtPO0FBQ0g7QUFDQSxnQkFBTUMsU0FBUyxHQUFHLElBQUlDLGVBQUosQ0FBb0JuSixXQUFXLENBQUNvSixLQUFaLENBQWtCLEdBQWxCLEVBQXVCLENBQXZCLENBQXBCLENBQWxCO0FBQ0EsZ0JBQU1DLGFBQWEsR0FBR0gsU0FBUyxDQUFDckUsR0FBVixDQUFjLFVBQWQsQ0FBdEI7O0FBQ0EsZ0JBQUl3RSxhQUFKLEVBQW1CO0FBQ2ZQLGNBQUFBLFFBQVEsR0FBR08sYUFBWDtBQUNIO0FBQ0o7O0FBRUQsaUJBQU9oTSxTQUFTLENBQUNpTSxnQkFBVixDQUEyQjVFLFFBQTNCLEVBQXFDLFVBQUM2RSxNQUFELEVBQVNDLEtBQVQsRUFBbUI7QUFDM0QsZ0JBQU1DLFlBQVksR0FBR3BNLFNBQVMsQ0FBQ3FNLHNCQUFWLENBQ2pCSCxNQURpQixFQUVqQkMsS0FGaUIsRUFHakJqQixXQUFXLENBQUNDLEdBQVosS0FBb0JGLFNBSEgsQ0FBckI7O0FBS0EsWUFBQSxNQUFJLENBQUNsSixpQkFBTCxDQUF1QlEsSUFBdkIsQ0FBNEI2SixZQUE1QjtBQUNILFdBUE0sRUFPSmhGLElBUEksQ0FPQyxVQUFBa0YsSUFBSTtBQUFBLG1CQUFLO0FBQUVBLGNBQUFBLElBQUksRUFBSkEsSUFBRjtBQUFRYixjQUFBQSxRQUFRLEVBQVJBO0FBQVIsYUFBTDtBQUFBLFdBUEwsQ0FBUDtBQVFILFNBL0JMLEVBZ0NLckUsSUFoQ0wsQ0FnQ1UsZ0JBQXdCO0FBQUEsY0FBckJrRixJQUFxQixRQUFyQkEsSUFBcUI7QUFBQSxjQUFmYixRQUFlLFFBQWZBLFFBQWU7QUFDMUI7QUFDQSxjQUFNYyxHQUFHLEdBQUczRixNQUFNLENBQUNzRCxHQUFQLENBQVdzQyxlQUFYLENBQTJCRixJQUEzQixDQUFaO0FBQ0EsY0FBTUcsQ0FBQyxHQUFHdE0sUUFBUSxDQUFDdU0sYUFBVCxDQUF1QixHQUF2QixDQUFWO0FBQ0FELFVBQUFBLENBQUMsQ0FBQ0UsS0FBRixDQUFRQyxPQUFSLEdBQWtCLE1BQWxCO0FBQ0FILFVBQUFBLENBQUMsQ0FBQ0ksSUFBRixHQUFTTixHQUFUO0FBQ0FFLFVBQUFBLENBQUMsQ0FBQ0ssUUFBRixHQUFhckIsUUFBYjtBQUNBdEwsVUFBQUEsUUFBUSxDQUFDNE0sSUFBVCxDQUFjQyxXQUFkLENBQTBCUCxDQUExQjtBQUNBQSxVQUFBQSxDQUFDLENBQUNRLEtBQUY7QUFDQXJHLFVBQUFBLE1BQU0sQ0FBQ3NELEdBQVAsQ0FBV0MsZUFBWCxDQUEyQm9DLEdBQTNCO0FBQ0FwTSxVQUFBQSxRQUFRLENBQUM0TSxJQUFULENBQWNHLFdBQWQsQ0FBMEJULENBQTFCOztBQUNBLFVBQUEsTUFBSSxDQUFDVSxxQkFBTDtBQUNILFNBNUNMLFdBNkNXLFVBQUFwRCxLQUFLLEVBQUk7QUFDWixVQUFBLE1BQUksQ0FBQ29ELHFCQUFMOztBQUNBekMsVUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCWixLQUFLLENBQUNTLE9BQWxDLEVBQTJDSSxlQUFlLENBQUN3QywwQkFBM0Q7QUFDSCxTQWhETDtBQWlESCxPQTdFRCxNQTZFTztBQUNIO0FBQ0F4RyxRQUFBQSxNQUFNLENBQUNDLFFBQVAsR0FBa0JsRSxXQUFsQjtBQUNIO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSxpQ0FBd0I7QUFDcEIsV0FBS2IsaUJBQUwsQ0FBdUJrQyxXQUF2QixDQUFtQyxVQUFuQztBQUNBLFdBQUtsQyxpQkFBTCxDQUF1QmpCLElBQXZCLENBQTRCLFdBQTVCLEVBQXlDbUQsV0FBekMsQ0FBcUQsaUJBQXJELEVBQXdFTixRQUF4RSxDQUFpRixVQUFqRjtBQUNBLFdBQUszQixpQkFBTCxDQUF1QkMsSUFBdkIsR0FBOEJPLElBQTlCLENBQW1DLEVBQW5DO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSw2QkFBb0I7QUFDaEJqQyxNQUFBQSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVEwRixPQUFSLENBQWdCLElBQWhCLEVBQXNCdEMsUUFBdEIsQ0FBK0IsVUFBL0I7QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBOzs7O1dBQ0kseUJBQWdCO0FBQ1o7QUFDQSxXQUFLOUMsUUFBTCxDQUFjb0IsSUFBZCxHQUZZLENBSVo7O0FBQ0EsV0FBS2xCLFFBQUwsQ0FBY2tCLElBQWQsR0FMWSxDQU9aOztBQUNBLFdBQUtoQixhQUFMLENBQW1CdUIsSUFBbkIsQ0FBd0IsYUFBeEIsRUFBdUNtQixRQUF2QyxDQUFnRCxVQUFoRCxFQVJZLENBVVo7O0FBQ0EsV0FBSzNDLE9BQUwsQ0FBYTJDLFFBQWIsQ0FBc0IsVUFBdEI7QUFDQSxXQUFLM0MsT0FBTCxDQUFhaUYsT0FBYixDQUFxQixJQUFyQixFQUEyQnRDLFFBQTNCLENBQW9DLFVBQXBDLEVBWlksQ0FjWjs7QUFDQSxXQUFLMUMsYUFBTCxDQUFtQmdGLE9BQW5CLENBQTJCLElBQTNCLEVBQWlDdEMsUUFBakMsQ0FBMEMsVUFBMUM7QUFDSDs7O1dBNXpCRDs7QUFHQTtBQUNKO0FBQ0E7QUFDQTtBQUNJLHdCQUFrQjJKLFlBQWxCLEVBQWdDO0FBQzVCLFVBQUlyTixTQUFTLENBQUNpRCxnQkFBVixJQUE4QmpELFNBQVMsQ0FBQ2lELGdCQUFWLEtBQStCb0ssWUFBakUsRUFBK0U7QUFDM0VyTixRQUFBQSxTQUFTLENBQUNpRCxnQkFBVixDQUEyQnFLLFlBQTNCO0FBQ0g7O0FBQ0R0TixNQUFBQSxTQUFTLENBQUNpRCxnQkFBVixHQUE2Qm9LLFlBQTdCO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksMEJBQXdCaEcsUUFBeEIsRUFBa0NrRyxVQUFsQyxFQUE4QztBQUMxQyxVQUFNcEIsS0FBSyxHQUFHeEgsTUFBTSxDQUFDUyxRQUFQLENBQWdCaUMsUUFBUSxDQUFDTixPQUFULENBQWlCUyxHQUFqQixDQUFxQixnQkFBckIsQ0FBaEIsRUFBd0QsRUFBeEQsS0FBK0QsQ0FBN0U7QUFDQSxVQUFNL0IsV0FBVyxHQUFHNEIsUUFBUSxDQUFDTixPQUFULENBQWlCUyxHQUFqQixDQUFxQixjQUFyQixLQUF3QywwQkFBNUQ7O0FBRUEsVUFBSSxDQUFDSCxRQUFRLENBQUMwRixJQUFWLElBQWtCLE9BQU8xRixRQUFRLENBQUMwRixJQUFULENBQWNTLFNBQXJCLEtBQW1DLFVBQXpELEVBQXFFO0FBQ2pFLGVBQU9uRyxRQUFRLENBQUNpRixJQUFULEdBQWdCbEYsSUFBaEIsQ0FBcUIsVUFBQ2tGLElBQUQsRUFBVTtBQUNsQ2lCLFVBQUFBLFVBQVUsQ0FBQ2pCLElBQUksQ0FBQ21CLElBQU4sRUFBWXRCLEtBQUssSUFBSUcsSUFBSSxDQUFDbUIsSUFBMUIsQ0FBVjtBQUNBLGlCQUFPbkIsSUFBUDtBQUNILFNBSE0sQ0FBUDtBQUlIOztBQUVELFVBQU1vQixNQUFNLEdBQUdyRyxRQUFRLENBQUMwRixJQUFULENBQWNTLFNBQWQsRUFBZjtBQUNBLFVBQU1HLE1BQU0sR0FBRyxFQUFmO0FBQ0EsVUFBSXpCLE1BQU0sR0FBRyxDQUFiOztBQUVBLFVBQU0wQixhQUFhLEdBQUcsU0FBaEJBLGFBQWdCO0FBQUEsZUFBTUYsTUFBTSxDQUFDRyxJQUFQLEdBQWN6RyxJQUFkLENBQW1CLGlCQUFxQjtBQUFBLGNBQWxCMEcsSUFBa0IsU0FBbEJBLElBQWtCO0FBQUEsY0FBWnhMLEtBQVksU0FBWkEsS0FBWTs7QUFDaEUsY0FBSXdMLElBQUosRUFBVTtBQUNOLG1CQUFPLElBQUlDLElBQUosQ0FBU0osTUFBVCxFQUFpQjtBQUFFSyxjQUFBQSxJQUFJLEVBQUV2STtBQUFSLGFBQWpCLENBQVA7QUFDSDs7QUFFRGtJLFVBQUFBLE1BQU0sQ0FBQ00sSUFBUCxDQUFZM0wsS0FBWjtBQUNBNEosVUFBQUEsTUFBTSxJQUFJNUosS0FBSyxDQUFDNEwsVUFBaEI7QUFDQVgsVUFBQUEsVUFBVSxDQUFDckIsTUFBRCxFQUFTQyxLQUFULENBQVY7QUFDQSxpQkFBT3lCLGFBQWEsRUFBcEI7QUFDSCxTQVQyQixDQUFOO0FBQUEsT0FBdEI7O0FBV0EsYUFBT0EsYUFBYSxFQUFwQjtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLGdDQUE4QjFCLE1BQTlCLEVBQXNDQyxLQUF0QyxFQUE2Q2dDLFNBQTdDLEVBQXdEO0FBQ3BELFVBQU1DLGNBQWMsR0FBR0QsU0FBUyxHQUFHLENBQVosR0FBZ0JqQyxNQUFNLElBQUlpQyxTQUFTLEdBQUcsSUFBaEIsQ0FBdEIsR0FBOEMsQ0FBckU7QUFDQSxVQUFNRSxJQUFJLEdBQUdELGNBQWMsSUFBSSxPQUFPLElBQXpCLGFBQ0osQ0FBQ0EsY0FBYyxJQUFJLE9BQU8sSUFBWCxDQUFmLEVBQWlDRSxPQUFqQyxDQUF5QyxDQUF6QyxDQURJLHVCQUVKN0osSUFBSSxDQUFDK0IsS0FBTCxDQUFXNEgsY0FBYyxHQUFHLElBQTVCLENBRkksVUFBYjs7QUFJQSxVQUFJakMsS0FBSyxJQUFJLENBQWIsRUFBZ0I7QUFDWix5QkFBVSxDQUFDRCxNQUFNLElBQUksT0FBTyxJQUFYLENBQVAsRUFBeUJvQyxPQUF6QixDQUFpQyxDQUFqQyxDQUFWLHNCQUFzREQsSUFBdEQ7QUFDSDs7QUFFRCxVQUFNN0osT0FBTyxHQUFHQyxJQUFJLENBQUNyQixHQUFMLENBQVMsR0FBVCxFQUFjcUIsSUFBSSxDQUFDK0IsS0FBTCxDQUFZMEYsTUFBTSxHQUFHQyxLQUFWLEdBQW1CLEdBQTlCLENBQWQsQ0FBaEI7QUFDQSxVQUFNb0MsZ0JBQWdCLEdBQUdILGNBQWMsR0FBRyxDQUFqQixHQUNuQjNKLElBQUksQ0FBQ3BCLEdBQUwsQ0FBUyxDQUFULEVBQVlvQixJQUFJLENBQUMrQixLQUFMLENBQVcsQ0FBQzJGLEtBQUssR0FBR0QsTUFBVCxJQUFtQmtDLGNBQTlCLENBQVosQ0FEbUIsR0FFbkIsQ0FGTjtBQUlBLHVCQUFVNUosT0FBVixvQkFBd0I2SixJQUF4QixtQkFBa0NFLGdCQUFsQztBQUNIOzs7Ozs7Z0JBN0VDdk8sUyxzQkFHd0IsSSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qKlxuICogQ0RSUGxheWVyIGNsYXNzLlxuICovXG5jbGFzcyBDRFJQbGF5ZXIge1xuXG4gICAgLy8gU3RhdGljIHByb3BlcnR5IHRvIHRyYWNrIGN1cnJlbnRseSBwbGF5aW5nIGluc3RhbmNlXG4gICAgc3RhdGljIGN1cnJlbnRseVBsYXlpbmcgPSBudWxsO1xuXG4gICAgLyoqXG4gICAgICogU3RvcCBhbGwgb3RoZXIgcGxheWVycyBleGNlcHQgdGhlIGdpdmVuIG9uZVxuICAgICAqIEBwYXJhbSB7Q0RSUGxheWVyfSBleGNlcHRQbGF5ZXIgLSBUaGUgcGxheWVyIHRoYXQgc2hvdWxkIGNvbnRpbnVlIHBsYXlpbmdcbiAgICAgKi9cbiAgICBzdGF0aWMgc3RvcE90aGVycyhleGNlcHRQbGF5ZXIpIHtcbiAgICAgICAgaWYgKENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nICYmIENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nICE9PSBleGNlcHRQbGF5ZXIpIHtcbiAgICAgICAgICAgIENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nID0gZXhjZXB0UGxheWVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlYWQgYSByZXNwb25zZSBzdHJlYW0gd2hpbGUgcmVwb3J0aW5nIGN1bXVsYXRpdmUgYnl0ZSBjb3VudHMuXG4gICAgICogRmFsbHMgYmFjayB0byBSZXNwb25zZS5ibG9iKCkgZm9yIGJyb3dzZXJzIHdpdGhvdXQgUmVhZGFibGVTdHJlYW0gc3VwcG9ydC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7UmVzcG9uc2V9IHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gb25Qcm9ncmVzc1xuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPEJsb2I+fVxuICAgICAqL1xuICAgIHN0YXRpYyByZWFkUmVzcG9uc2VCb2R5KHJlc3BvbnNlLCBvblByb2dyZXNzKSB7XG4gICAgICAgIGNvbnN0IHRvdGFsID0gTnVtYmVyLnBhcnNlSW50KHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdDb250ZW50LUxlbmd0aCcpLCAxMCkgfHwgMDtcbiAgICAgICAgY29uc3QgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykgfHwgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSc7XG5cbiAgICAgICAgaWYgKCFyZXNwb25zZS5ib2R5IHx8IHR5cGVvZiByZXNwb25zZS5ib2R5LmdldFJlYWRlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmJsb2IoKS50aGVuKChibG9iKSA9PiB7XG4gICAgICAgICAgICAgICAgb25Qcm9ncmVzcyhibG9iLnNpemUsIHRvdGFsIHx8IGJsb2Iuc2l6ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJsb2I7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlYWRlciA9IHJlc3BvbnNlLmJvZHkuZ2V0UmVhZGVyKCk7XG4gICAgICAgIGNvbnN0IGNodW5rcyA9IFtdO1xuICAgICAgICBsZXQgbG9hZGVkID0gMDtcblxuICAgICAgICBjb25zdCByZWFkTmV4dENodW5rID0gKCkgPT4gcmVhZGVyLnJlYWQoKS50aGVuKCh7IGRvbmUsIHZhbHVlIH0pID0+IHtcbiAgICAgICAgICAgIGlmIChkb25lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCbG9iKGNodW5rcywgeyB0eXBlOiBjb250ZW50VHlwZSB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2h1bmtzLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgbG9hZGVkICs9IHZhbHVlLmJ5dGVMZW5ndGg7XG4gICAgICAgICAgICBvblByb2dyZXNzKGxvYWRlZCwgdG90YWwpO1xuICAgICAgICAgICAgcmV0dXJuIHJlYWROZXh0Q2h1bmsoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJlYWROZXh0Q2h1bmsoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBhIGNvbXBhY3QsIGxhbmd1YWdlLW5ldXRyYWwgZG93bmxvYWQgcHJvZ3Jlc3MgbGFiZWwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbG9hZGVkXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRvdGFsXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVsYXBzZWRNc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgc3RhdGljIGZvcm1hdERvd25sb2FkUHJvZ3Jlc3MobG9hZGVkLCB0b3RhbCwgZWxhcHNlZE1zKSB7XG4gICAgICAgIGNvbnN0IGJ5dGVzUGVyU2Vjb25kID0gZWxhcHNlZE1zID4gMCA/IGxvYWRlZCAvIChlbGFwc2VkTXMgLyAxMDAwKSA6IDA7XG4gICAgICAgIGNvbnN0IHJhdGUgPSBieXRlc1BlclNlY29uZCA+PSAxMDI0ICogMTAyNFxuICAgICAgICAgICAgPyBgJHsoYnl0ZXNQZXJTZWNvbmQgLyAoMTAyNCAqIDEwMjQpKS50b0ZpeGVkKDEpfSBNQi9zYFxuICAgICAgICAgICAgOiBgJHtNYXRoLnJvdW5kKGJ5dGVzUGVyU2Vjb25kIC8gMTAyNCl9IEtCL3NgO1xuXG4gICAgICAgIGlmICh0b3RhbCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7KGxvYWRlZCAvICgxMDI0ICogMTAyNCkpLnRvRml4ZWQoMSl9IE1CIMK3ICR7cmF0ZX1gO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcGVyY2VudCA9IE1hdGgubWluKDEwMCwgTWF0aC5yb3VuZCgobG9hZGVkIC8gdG90YWwpICogMTAwKSk7XG4gICAgICAgIGNvbnN0IHJlbWFpbmluZ1NlY29uZHMgPSBieXRlc1BlclNlY29uZCA+IDBcbiAgICAgICAgICAgID8gTWF0aC5tYXgoMCwgTWF0aC5yb3VuZCgodG90YWwgLSBsb2FkZWQpIC8gYnl0ZXNQZXJTZWNvbmQpKVxuICAgICAgICAgICAgOiAwO1xuXG4gICAgICAgIHJldHVybiBgJHtwZXJjZW50fSUgwrcgJHtyYXRlfSDCtyAke3JlbWFpbmluZ1NlY29uZHN9IHNlY2A7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBpbnN0YW5jZSBvZiBDRFJQbGF5ZXIuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIElEIG9mIHRoZSBwbGF5ZXIuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoaWQpIHtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgYXVkaW8tcGxheWVyLSR7aWR9YCk7XG4gICAgICAgIGNvbnN0ICRyb3cgPSAkKGAjJHtpZH1gKTtcblxuICAgICAgICAvLyBUcmFjayBjdXJyZW50IGF1ZGlvIGZvcm1hdCAod2VibSwgbXAzLCB3YXYpXG4gICAgICAgIHRoaXMuY3VycmVudEZvcm1hdCA9IG51bGw7XG5cbiAgICAgICAgLy8gV2ViIEF1ZGlvIEFQSSBmb3IgbW9ubyBtaXhpbmdcbiAgICAgICAgLy8gV0hZOiBBdXRvbWF0aWNhbGx5IG1peCBzdGVyZW8gcmVjb3JkaW5ncyAobGVmdD1leHRlcm5hbCwgcmlnaHQ9aW50ZXJuYWwpIHRvIG1vbm9cbiAgICAgICAgLy8gVGhpcyBtYWtlcyBib3RoIHNwZWFrZXJzIGF1ZGlibGUgaW4gc2luZ2xlIGNoYW5uZWwgZm9yIGVhc2llciBsaXN0ZW5pbmdcbiAgICAgICAgdGhpcy5hdWRpb0NvbnRleHQgPSBudWxsO1xuICAgICAgICB0aGlzLnNvdXJjZU5vZGUgPSBudWxsO1xuICAgICAgICB0aGlzLmdhaW5Ob2RlID0gbnVsbDtcblxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluaXRpYWxpemVkIHRvIHByZXZlbnQgZG91YmxlIHByb2Nlc3NpbmdcbiAgICAgICAgaWYgKCRyb3cuaGFzQ2xhc3MoJ2luaXRpYWxpemVkJykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuJHBCdXR0b24gPSAkcm93LmZpbmQoJ2kucGxheScpOyAvLyBQbGF5IGJ1dHRvblxuICAgICAgICB0aGlzLiRkQnV0dG9uID0gJHJvdy5maW5kKCdpLmRvd25sb2FkJyk7IC8vIERvd25sb2FkIGJ1dHRvblxuICAgICAgICB0aGlzLiRzbGlkZXIgPSAkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJyk7IC8vIFNsaWRlciBlbGVtZW50XG4gICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbiA9ICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKTsgLy8gRHVyYXRpb24gc3BhbiBlbGVtZW50XG5cbiAgICAgICAgLy8gQ2xlYW4gdXAgcHJldmlvdXMgZXZlbnQgbGlzdGVuZXJzXG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYk9uTWV0YWRhdGFMb2FkZWQsIGZhbHNlKTtcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICAgICAgdGhpcy4kcEJ1dHRvbi51bmJpbmQoKTtcbiAgICAgICAgdGhpcy4kZEJ1dHRvbi51bmJpbmQoKTtcblxuICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBzcmMgaW4gZGF0YS1zcmMgYXR0cmlidXRlIGZvciBhdXRoZW50aWNhdGVkIGxvYWRpbmdcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxTcmMgPSB0aGlzLmh0bWw1QXVkaW8uZ2V0QXR0cmlidXRlKCdzcmMnKTtcbiAgICAgICAgaWYgKG9yaWdpbmFsU3JjICYmIG9yaWdpbmFsU3JjLmluY2x1ZGVzKCcvcGJ4Y29yZS9hcGkvJykpIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5zZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJywgb3JpZ2luYWxTcmMpO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUF0dHJpYnV0ZSgnc3JjJyk7IC8vIFJlbW92ZSBkaXJlY3Qgc3JjXG4gICAgICAgIH1cblxuICAgICAgICAvLyBQbGF5IGJ1dHRvbiBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLiRwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLnBsYXkoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkb3dubG9hZCBmb3JtYXQgZHJvcGRvd25cbiAgICAgICAgY29uc3QgJGRvd25sb2FkRHJvcGRvd24gPSAkcm93LmZpbmQoJy5kb3dubG9hZC1mb3JtYXQtZHJvcGRvd24nKTtcbiAgICAgICAgdGhpcy4kZG93bmxvYWREcm9wZG93biA9ICRkb3dubG9hZERyb3Bkb3duO1xuICAgICAgICB0aGlzLiRkb3dubG9hZFByb2dyZXNzID0gJCgnPHNwYW4gY2xhc3M9XCJ1aSB0aW55IGJhc2ljIGxhYmVsIGNkci1kb3dubG9hZC1wcm9ncmVzc1wiPjwvc3Bhbj4nKVxuICAgICAgICAgICAgLmhpZGUoKVxuICAgICAgICAgICAgLmluc2VydEFmdGVyKCRkb3dubG9hZERyb3Bkb3duKTtcbiAgICAgICAgaWYgKCRkb3dubG9hZERyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRkb3dubG9hZERyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdoaWRlJyxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdCA9ICRjaG9pY2UuZGF0YSgnZm9ybWF0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRvd25sb2FkVXJsID0gJGRvd25sb2FkRHJvcGRvd24uZGF0YSgnZG93bmxvYWQtdXJsJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkb3dubG9hZFVybCAmJiBmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZG93bmxvYWRGaWxlKGRvd25sb2FkVXJsLCBmb3JtYXQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMZWdhY3k6IERvd25sb2FkIGJ1dHRvbiBldmVudCBsaXN0ZW5lciAoZm9yIG9sZCBVSSB3aXRob3V0IGRyb3Bkb3duKVxuICAgICAgICB0aGlzLiRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCBkb3dubG9hZFVybCA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIGlmIChkb3dubG9hZFVybCkge1xuICAgICAgICAgICAgICAgIC8vIERvd25sb2FkIGluIFdlYk0gZm9ybWF0IGJ5IGRlZmF1bHRcbiAgICAgICAgICAgICAgICB0aGlzLmRvd25sb2FkRmlsZShkb3dubG9hZFVybCwgJ3dlYm0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTG9hZGVkIG1ldGFkYXRhIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLmJpbmQodGhpcyksIGZhbHNlKTtcblxuICAgICAgICAvLyB0aW1ldXBkYXRlIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblxuICAgICAgICAvLyBlbmRlZCBldmVudCBsaXN0ZW5lciAtIGNsZWFyIGN1cnJlbnRseSBwbGF5aW5nIHJlZmVyZW5jZVxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcgPT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICBDRFJQbGF5ZXIuY3VycmVudGx5UGxheWluZyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICAvLyBubyBzcmMgaGFuZGxlclxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzLmNiT25TcmNNZWRpYUVycm9yLCBmYWxzZSk7XG5cbiAgICAgICAgdGhpcy4kc2xpZGVyLnJhbmdlKHtcbiAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgIG1heDogMTAwLFxuICAgICAgICAgICAgc3RhcnQ6IDAsXG4gICAgICAgICAgICBvbkNoYW5nZTogdGhpcy5jYk9uU2xpZGVyQ2hhbmdlLFxuICAgICAgICAgICAgaHRtbDVBdWRpbzogdGhpcy5odG1sNUF1ZGlvLFxuICAgICAgICAgICAgY2JUaW1lVXBkYXRlOiB0aGlzLmNiVGltZVVwZGF0ZSxcbiAgICAgICAgICAgIHNwYW5EdXJhdGlvbjogdGhpcy4kc3BhbkR1cmF0aW9uLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgdG9vbHRpcCB0byBzbGlkZXJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVG9vbHRpcCgpO1xuXG4gICAgICAgIC8vIE1hcmsgYXMgaW5pdGlhbGl6ZWRcbiAgICAgICAgJHJvdy5hZGRDbGFzcygnaW5pdGlhbGl6ZWQnKTtcblxuICAgICAgICAvLyBMb2FkIG1ldGFkYXRhIG9uIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHRoaXMubG9hZE1ldGFkYXRhKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwIGZvciBzbGlkZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcCgpIHtcbiAgICAgICAgLy8gQWRkIHRvb2x0aXAgZWxlbWVudCB0byBzbGlkZXJcbiAgICAgICAgY29uc3QgJHRvb2x0aXAgPSAkKCc8ZGl2IGNsYXNzPVwiY2RyLXNsaWRlci10b29sdGlwXCI+MDA6MDA8L2Rpdj4nKTtcbiAgICAgICAgdGhpcy4kc2xpZGVyLmFwcGVuZCgkdG9vbHRpcCk7XG4gICAgICAgIHRoaXMuJHRvb2x0aXAgPSAkdG9vbHRpcDtcblxuICAgICAgICAvLyBVcGRhdGUgdG9vbHRpcCBvbiBtb3VzZSBtb3ZlIG92ZXIgc2xpZGVyXG4gICAgICAgIHRoaXMuJHNsaWRlci5vbignbW91c2Vtb3ZlJywgKGUpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVG9vbHRpcFBvc2l0aW9uKGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTaG93IHRvb2x0aXAgb24gbW91c2UgZW50ZXJcbiAgICAgICAgdGhpcy4kc2xpZGVyLm9uKCdtb3VzZWVudGVyJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kdG9vbHRpcC5jc3MoJ29wYWNpdHknLCAnMScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIaWRlIHRvb2x0aXAgb24gbW91c2UgbGVhdmUgKHVubGVzcyBkcmFnZ2luZylcbiAgICAgICAgdGhpcy4kc2xpZGVyLm9uKCdtb3VzZWxlYXZlJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLiRzbGlkZXIuaGFzQ2xhc3MoJ2RyYWdnaW5nJykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiR0b29sdGlwLmNzcygnb3BhY2l0eScsICcwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyYWNrIGRyYWdnaW5nIHN0YXRlXG4gICAgICAgIHRoaXMuJHNsaWRlci5vbignbW91c2Vkb3duJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kc2xpZGVyLmFkZENsYXNzKCdkcmFnZ2luZycpO1xuICAgICAgICAgICAgdGhpcy4kdG9vbHRpcC5jc3MoJ29wYWNpdHknLCAnMScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkKGRvY3VtZW50KS5vbignbW91c2V1cCcsICgpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLiRzbGlkZXIuaGFzQ2xhc3MoJ2RyYWdnaW5nJykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRzbGlkZXIucmVtb3ZlQ2xhc3MoJ2RyYWdnaW5nJyk7XG4gICAgICAgICAgICAgICAgdGhpcy4kdG9vbHRpcC5jc3MoJ29wYWNpdHknLCAnMCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdG9vbHRpcCBwb3NpdGlvbiBhbmQgY29udGVudFxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgLSBNb3VzZSBldmVudFxuICAgICAqL1xuICAgIHVwZGF0ZVRvb2x0aXBQb3NpdGlvbihlKSB7XG4gICAgICAgIGNvbnN0IHNsaWRlck9mZnNldCA9IHRoaXMuJHNsaWRlci5vZmZzZXQoKTtcbiAgICAgICAgY29uc3Qgc2xpZGVyV2lkdGggPSB0aGlzLiRzbGlkZXIud2lkdGgoKTtcbiAgICAgICAgY29uc3QgbW91c2VYID0gZS5wYWdlWCAtIHNsaWRlck9mZnNldC5sZWZ0O1xuICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMTAwLCAobW91c2VYIC8gc2xpZGVyV2lkdGgpICogMTAwKSk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRpbWUgYXQgdGhpcyBwb3NpdGlvblxuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbjtcbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZShkdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVTZWNvbmRzID0gKGR1cmF0aW9uICogcGVyY2VudCkgLyAxMDA7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWRUaW1lID0gdGhpcy5mb3JtYXRUaW1lKHRpbWVTZWNvbmRzKTtcbiAgICAgICAgICAgIHRoaXMuJHRvb2x0aXAudGV4dChmb3JtYXR0ZWRUaW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFBvc2l0aW9uIHRvb2x0aXAgYXQgbW91c2UgcG9zaXRpb25cbiAgICAgICAgdGhpcy4kdG9vbHRpcC5jc3MoJ2xlZnQnLCBgJHtwZXJjZW50fSVgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgdGltZSBpbiBzZWNvbmRzIHRvIE1NOlNTIG9yIEhIOk1NOlNTXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNlY29uZHMgLSBUaW1lIGluIHNlY29uZHNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgdGltZSBzdHJpbmdcbiAgICAgKi9cbiAgICBmb3JtYXRUaW1lKHNlY29uZHMpIHtcbiAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKG51bGwpO1xuICAgICAgICBkYXRlLnNldFNlY29uZHMocGFyc2VJbnQoc2Vjb25kcywgMTApKTtcbiAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGRhdGUudG9JU09TdHJpbmcoKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcblxuICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGVTdHIuc3Vic3RyKDEyLCA3KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRlU3RyLnN1YnN0cigxMSwgOCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3QgYXVkaW8gZm9ybWF0IGZyb20gQ29udGVudC1UeXBlIGhlYWRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50VHlwZSAtIENvbnRlbnQtVHlwZSBoZWFkZXIgdmFsdWVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXQgaWRlbnRpZmllcjogJ3dlYm0nLCAnbXAzJywgJ3dhdicsIG9yICd1bmtub3duJ1xuICAgICAqL1xuICAgIGRldGVjdEF1ZGlvRm9ybWF0KGNvbnRlbnRUeXBlKSB7XG4gICAgICAgIGlmICghY29udGVudFR5cGUpIHJldHVybiAndW5rbm93bic7XG5cbiAgICAgICAgY29uc3QgbG93ZXJUeXBlID0gY29udGVudFR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgaWYgKGxvd2VyVHlwZS5pbmNsdWRlcygnYXVkaW8vd2VibScpKSByZXR1cm4gJ3dlYm0nO1xuICAgICAgICBpZiAobG93ZXJUeXBlLmluY2x1ZGVzKCdhdWRpby9tcGVnJykgfHwgbG93ZXJUeXBlLmluY2x1ZGVzKCdhdWRpby9tcDMnKSkgcmV0dXJuICdtcDMnO1xuICAgICAgICBpZiAobG93ZXJUeXBlLmluY2x1ZGVzKCdhdWRpby93YXYnKSB8fCBsb3dlclR5cGUuaW5jbHVkZXMoJ2F1ZGlvL3gtd2F2JykpIHJldHVybiAnd2F2JztcblxuICAgICAgICByZXR1cm4gJ3Vua25vd24nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBmb3JtYXQgYmFkZ2UgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmb3JtYXQgLSBBdWRpbyBmb3JtYXQgKHdlYm0sIG1wMywgd2F2KVxuICAgICAqL1xuICAgIHVwZGF0ZUZvcm1hdEJhZGdlKGZvcm1hdCkge1xuICAgICAgICBjb25zdCAkcm93ID0gJChgIyR7dGhpcy5pZH1gKTtcbiAgICAgICAgbGV0ICRiYWRnZSA9ICRyb3cuZmluZCgnLmF1ZGlvLWZvcm1hdC1iYWRnZScpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBiYWRnZSBpZiBkb2Vzbid0IGV4aXN0XG4gICAgICAgIGlmICgkYmFkZ2UubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkYmFkZ2UgPSAkKCc8c3BhbiBjbGFzcz1cInVpIG1pbmkgbGFiZWwgYXVkaW8tZm9ybWF0LWJhZGdlXCI+PC9zcGFuPicpO1xuICAgICAgICAgICAgdGhpcy4kc3BhbkR1cmF0aW9uLmJlZm9yZSgkYmFkZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGJhZGdlIGNvbnRlbnQgYW5kIHN0eWxlXG4gICAgICAgIGNvbnN0IGZvcm1hdFVwcGVyID0gZm9ybWF0LnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICRiYWRnZS50ZXh0KGZvcm1hdFVwcGVyKTtcblxuICAgICAgICAvLyBSZW1vdmUgcHJldmlvdXMgZm9ybWF0IGNsYXNzZXNcbiAgICAgICAgJGJhZGdlLnJlbW92ZUNsYXNzKCdncmVlbiBvcmFuZ2UgYmx1ZSBncmV5Jyk7XG5cbiAgICAgICAgLy8gQXBwbHkgY29sb3IgYmFzZWQgb24gZm9ybWF0XG4gICAgICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICAgICAgICBjYXNlICd3ZWJtJzpcbiAgICAgICAgICAgICAgICAkYmFkZ2UuYWRkQ2xhc3MoJ2dyZWVuJyk7IC8vIE1vZGVybiBmb3JtYXRcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ21wMyc6XG4gICAgICAgICAgICAgICAgJGJhZGdlLmFkZENsYXNzKCdvcmFuZ2UnKTsgLy8gTGVnYWN5IGNvbXByZXNzZWRcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3dhdic6XG4gICAgICAgICAgICAgICAgJGJhZGdlLmFkZENsYXNzKCdibHVlJyk7IC8vIFVuY29tcHJlc3NlZFxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAkYmFkZ2UuYWRkQ2xhc3MoJ2dyZXknKTsgLy8gVW5rbm93blxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIG1ldGFkYXRhIGxvYWRlZCBldmVudC5cbiAgICAgKi9cbiAgICBjYk9uTWV0YWRhdGFMb2FkZWQoKSB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG4gICAgICAgICAgICBkYXRlLnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5jdXJyZW50VGltZSwgMTApKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VGltZSA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKHBhcnNlSW50KHRoaXMuZHVyYXRpb24sIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuICAgICAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGRhdGUudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gcGFyc2VJbnQoZGF0ZVN0ci5zdWJzdHIoMTEsIDIpLCAxMCk7XG4gICAgICAgICAgICBsZXQgZHVyYXRpb247XG4gICAgICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTIsIDcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChob3VycyA+PSAxMCkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTEsIDgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3Igc2xpZGVyIGNoYW5nZSBldmVudC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbmV3VmFsIC0gVGhlIG5ldyB2YWx1ZSBvZiB0aGUgc2xpZGVyLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXRhIC0gQWRkaXRpb25hbCBtZXRhZGF0YS5cbiAgICAgKi9cbiAgICBjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuICAgICAgICBpZiAobWV0YS50cmlnZ2VyZWRCeVVzZXIgJiYgTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSA9ICh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24gKiBuZXdWYWwpIC8gMTAwO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgZGF0ZUN1cnJlbnQgPSBuZXcgRGF0ZShudWxsKTtcbiAgICAgICAgICAgIGRhdGVDdXJyZW50LnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lLCAxMCkpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gZGF0ZUN1cnJlbnQudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgY29uc3QgZGF0ZUR1cmF0aW9uID0gbmV3IERhdGUobnVsbCk7XG4gICAgICAgICAgICBkYXRlRHVyYXRpb24uc2V0U2Vjb25kcyhwYXJzZUludCh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24sIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuICAgICAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGRhdGVEdXJhdGlvbi50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgY29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcbiAgICAgICAgICAgIGxldCBkdXJhdGlvbjtcbiAgICAgICAgICAgIGlmIChob3VycyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChob3VycyA8IDEwKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMiwgNyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID49IDEwKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMSwgOCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNwYW5EdXJhdGlvbi50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIHRpbWUgdXBkYXRlIGV2ZW50LlxuICAgICAqL1xuICAgIGNiVGltZVVwZGF0ZSgpIHtcbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgubWluKE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKSwgMTAwKTtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICAkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJykucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFRpbWUgPT09IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAkcm93LmZpbmQoJ2kucGF1c2UnKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBtZXRhZGF0YSAoZHVyYXRpb24pIHdpdGhvdXQgbG9hZGluZyB0aGUgZnVsbCBhdWRpbyBmaWxlLlxuICAgICAqIE1ha2VzIGEgSEVBRCByZXF1ZXN0IHRvIGdldCBYLUF1ZGlvLUR1cmF0aW9uIGhlYWRlci5cbiAgICAgKi9cbiAgICBsb2FkTWV0YWRhdGEoKSB7XG4gICAgICAgIGNvbnN0IHNvdXJjZVNyYyA9IHRoaXMuaHRtbDVBdWRpby5nZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJyk7XG4gICAgICAgIGlmICghc291cmNlU3JjIHx8ICFzb3VyY2VTcmMuaW5jbHVkZXMoJy9wYnhjb3JlL2FwaS8nKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgZnVsbCBVUkwgKFJFU1QgQVBJIHBhdGhzIGFsd2F5cyBzdGFydCB3aXRoIC9wYnhjb3JlLylcbiAgICAgICAgY29uc3QgZnVsbFVybCA9IHNvdXJjZVNyYy5zdGFydHNXaXRoKCdodHRwJylcbiAgICAgICAgICAgID8gc291cmNlU3JjXG4gICAgICAgICAgICA6IGAke3dpbmRvdy5sb2NhdGlvbi5vcmlnaW59JHtzb3VyY2VTcmN9YDtcblxuICAgICAgICAvLyBQcmVwYXJlIGhlYWRlcnMgd2l0aCBCZWFyZXIgdG9rZW5cbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1ha2UgSEVBRCByZXF1ZXN0IHRvIGdldCBvbmx5IGhlYWRlcnMgKG5vIGJvZHkgZG93bmxvYWQpXG4gICAgICAgIGZldGNoKGZ1bGxVcmwsIHtcbiAgICAgICAgICAgIG1ldGhvZDogJ0hFQUQnLFxuICAgICAgICAgICAgaGVhZGVyc1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgLy8gRmlsZSBub3QgZm91bmQgKDQyMikgb3Igb3RoZXIgZXJyb3IgLSBkaXNhYmxlIHBsYXllciBjb250cm9sc1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzYWJsZVBsYXllcigpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGV0ZWN0IGZvcm1hdCBmcm9tIENvbnRlbnQtVHlwZSBoZWFkZXIgKG1vdmVkIGZyb20gbG9hZEF1dGhlbnRpY2F0ZWRTb3VyY2UpXG4gICAgICAgICAgICBjb25zdCBjb250ZW50VHlwZSA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEZvcm1hdCA9IHRoaXMuZGV0ZWN0QXVkaW9Gb3JtYXQoY29udGVudFR5cGUpO1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEZvcm1hdCAmJiB0aGlzLmN1cnJlbnRGb3JtYXQgIT09ICd1bmtub3duJykge1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlRm9ybWF0QmFkZ2UodGhpcy5jdXJyZW50Rm9ybWF0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRXh0cmFjdCBkdXJhdGlvbiBmcm9tIGhlYWRlclxuICAgICAgICAgICAgY29uc3QgZHVyYXRpb25TZWNvbmRzID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ1gtQXVkaW8tRHVyYXRpb24nKTtcbiAgICAgICAgICAgIGlmIChkdXJhdGlvblNlY29uZHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHBhcnNlRmxvYXQoZHVyYXRpb25TZWNvbmRzKTtcbiAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb24gPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBkdXJhdGlvbiBvbiBhdWRpbyBlbGVtZW50IGZvciB0b29sdGlwIGZ1bmN0aW9uYWxpdHlcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMuaHRtbDVBdWRpbywgJ2R1cmF0aW9uJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGR1cmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKHBhcnNlSW50KGR1cmF0aW9uLCAxMCkpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlU3RyID0gZGF0ZS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBob3VycyA9IHBhcnNlSW50KGRhdGVTdHIuc3Vic3RyKDExLCAyKSwgMTApO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZm9ybWF0dGVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZCA9IGRhdGVTdHIuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChob3VycyA8IDEwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWQgPSBkYXRlU3RyLnN1YnN0cigxMiwgNyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWQgPSBkYXRlU3RyLnN1YnN0cigxMSwgOCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kc3BhbkR1cmF0aW9uLnRleHQoYDAwOjAwLyR7Zm9ybWF0dGVkfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgIC8vIE5ldHdvcmsgZXJyb3Igb3Igb3RoZXIgZmFpbHVyZSAtIGRpc2FibGUgcGxheWVyIGNvbnRyb2xzXG4gICAgICAgICAgICB0aGlzLmRpc2FibGVQbGF5ZXIoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3RvcCBwbGF5YmFjayAoY2FsbGVkIGZyb20gc3RhdGljIHN0b3BPdGhlcnMgbWV0aG9kKVxuICAgICAqL1xuICAgIHN0b3BQbGF5YmFjaygpIHtcbiAgICAgICAgaWYgKCF0aGlzLmh0bWw1QXVkaW8ucGF1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcbiAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENsZWFuIHVwIFdlYiBBdWRpbyBBUEkgbm9kZXNcbiAgICAgKi9cbiAgICBjbGVhbnVwQXVkaW9Ob2RlcygpIHtcbiAgICAgICAgaWYgKHRoaXMuc2NyaXB0UHJvY2Vzc29yKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIERpc2Nvbm5lY3QgYWxsIG5vZGVzXG4gICAgICAgICAgICAgICAgdGhpcy5zY3JpcHRQcm9jZXNzb3IuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2NyaXB0UHJvY2Vzc29yLm9uYXVkaW9wcm9jZXNzID0gbnVsbDtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcmlwdFByb2Nlc3NvciA9IG51bGw7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIGNsZWFudXAgZXJyb3JzXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5zb3VyY2VOb2RlKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHRoaXMuc291cmNlTm9kZS5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIGNsZWFudXAgZXJyb3JzXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5nYWluTm9kZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLmdhaW5Ob2RlLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgY2xlYW51cCBlcnJvcnNcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBsYXlzIG9yIHBhdXNlcyB0aGUgYXVkaW8gZmlsZS5cbiAgICAgKi9cbiAgICBwbGF5KCkge1xuICAgICAgICAvLyBDaGVjayBpZiBhdWRpbyBhbHJlYWR5IGhhcyBhIHNvdXJjZSBsb2FkZWQgKGRpcmVjdCBVUkwgb3IgYmxvYilcbiAgICAgICAgY29uc3QgY3VycmVudFNyYyA9IHRoaXMuaHRtbDVBdWRpby5nZXRBdHRyaWJ1dGUoJ3NyYycpO1xuICAgICAgICBpZiAoY3VycmVudFNyYykge1xuICAgICAgICAgICAgLy8gU291cmNlIGFscmVhZHkgbG9hZGVkLCBqdXN0IHRvZ2dsZSBwbGF5L3BhdXNlXG4gICAgICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnBhdXNlZCkge1xuICAgICAgICAgICAgICAgIC8vIFN0b3AgYWxsIG90aGVyIHBsYXllcnMgYmVmb3JlIHBsYXlpbmcgdGhpcyBvbmVcbiAgICAgICAgICAgICAgICBDRFJQbGF5ZXIuc3RvcE90aGVycyh0aGlzKTtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUGF1c2luZyAtIGNsZWFyIGN1cnJlbnRseSBwbGF5aW5nIHJlZmVyZW5jZVxuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wYXVzZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgICAgICBpZiAoQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcgPT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5lZWQgdG8gbG9hZCBzb3VyY2UgZmlyc3RcbiAgICAgICAgbGV0IHNvdXJjZVNyYyA9IHRoaXMuaHRtbDVBdWRpby5nZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJykgfHwgJyc7XG5cbiAgICAgICAgLy8gSWYgc291cmNlIGlzIGFuIEFQSSBlbmRwb2ludCB3aXRoIHRva2VuLCBsb2FkIGl0IGRpcmVjdGx5XG4gICAgICAgIC8vIFdIWTogVG9rZW4tYmFzZWQgVVJMcyBhbHJlYWR5IGNvbnRhaW4gYWxsIG5lY2Vzc2FyeSBpbmZvcm1hdGlvblxuICAgICAgICBpZiAoc291cmNlU3JjICYmIHNvdXJjZVNyYy5pbmNsdWRlcygnL3BieGNvcmUvYXBpLycpKSB7XG4gICAgICAgICAgICAvLyBTdG9wIGFsbCBvdGhlciBwbGF5ZXJzIGJlZm9yZSBsb2FkaW5nIG5ldyBzb3VyY2VcbiAgICAgICAgICAgIENEUlBsYXllci5zdG9wT3RoZXJzKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5sb2FkQXV0aGVudGljYXRlZFNvdXJjZShzb3VyY2VTcmMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmFsbGJhY2sgZm9yIG5vbi1BUEkgc291cmNlcyBvciBhbHJlYWR5IGxvYWRlZFxuICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnBhdXNlZCAmJiB0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pIHtcbiAgICAgICAgICAgIENEUlBsYXllci5zdG9wT3RoZXJzKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcbiAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgfSBlbHNlIGlmICghdGhpcy5odG1sNUF1ZGlvLnBhdXNlZCkge1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG4gICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgICAgICBpZiAoQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcgPT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICBDRFJQbGF5ZXIuY3VycmVudGx5UGxheWluZyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFdlYiBBdWRpbyBBUEkgZm9yIG1vbm8gbWl4aW5nXG4gICAgICogV0hZOiBTdGVyZW8gY2FsbCByZWNvcmRpbmdzIGhhdmUgZXh0ZXJuYWwgY2hhbm5lbCAobGVmdCkgYW5kIGludGVybmFsIGNoYW5uZWwgKHJpZ2h0KVxuICAgICAqIE1peGluZyB0byBtb25vIG1ha2VzIGJvdGggc3BlYWtlcnMgYXVkaWJsZSBpbiBzaW5nbGUgY2hhbm5lbCBmb3IgZWFzaWVyIGxpc3RlbmluZ1xuICAgICAqXG4gICAgICogQVBQUk9BQ0g6IFVzZSBzaW1wbGUgZ2Fpbi1iYXNlZCBkb3dubWl4aW5nXG4gICAgICogTW9zdCByZWxpYWJsZSBtZXRob2QgdGhhdCB3b3JrcyB3aXRoIGFsbCBhdWRpbyBmb3JtYXRzIGluY2x1ZGluZyBXZWJNL09wdXNcbiAgICAgKi9cbiAgICBzZXR1cE1vbm9NaXhlcigpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhdWRpbyBjb250ZXh0IGlmIG5vdCBleGlzdHNcbiAgICAgICAgICAgIGlmICghdGhpcy5hdWRpb0NvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBBdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSBzb3VyY2Ugbm9kZSBmcm9tIGF1ZGlvIGVsZW1lbnQgKGNhbiBvbmx5IGJlIGNyZWF0ZWQgb25jZSEpXG4gICAgICAgICAgICBpZiAoIXRoaXMuc291cmNlTm9kZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc291cmNlTm9kZSA9IHRoaXMuYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhRWxlbWVudFNvdXJjZSh0aGlzLmh0bWw1QXVkaW8pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEaXNjb25uZWN0IHByZXZpb3VzIGNvbm5lY3Rpb25zIGlmIHRoZXkgZXhpc3RcbiAgICAgICAgICAgIGlmICh0aGlzLmdhaW5Ob2RlKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zb3VyY2VOb2RlLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nYWluTm9kZS5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZGlzY29ubmVjdCBlcnJvcnNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIFNjcmlwdFByb2Nlc3Nvck5vZGUgd2l0aCAyIGlucHV0IGNoYW5uZWxzIGFuZCAyIG91dHB1dCBjaGFubmVsc1xuICAgICAgICAgICAgLy8gQnVmZmVyIHNpemUgb2YgNDA5NiBmb3IgZ29vZCBiYWxhbmNlIGJldHdlZW4gbGF0ZW5jeSBhbmQgcGVyZm9ybWFuY2VcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlclNpemUgPSA0MDk2O1xuICAgICAgICAgICAgY29uc3Qgc2NyaXB0UHJvY2Vzc29yID0gdGhpcy5hdWRpb0NvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKGJ1ZmZlclNpemUsIDIsIDIpO1xuXG4gICAgICAgICAgICAvLyBTdG9yZSByZWZlcmVuY2UgZm9yIGNsZWFudXBcbiAgICAgICAgICAgIHRoaXMuc2NyaXB0UHJvY2Vzc29yID0gc2NyaXB0UHJvY2Vzc29yO1xuXG4gICAgICAgICAgICAvLyBQcm9jZXNzIGF1ZGlvIHdpdGggNjUvMzUgY2hhbm5lbCBtaXhpbmcgZm9yIGJldHRlciB0cmFuc2NyaXB0aW9uIGxpc3RlbmluZ1xuICAgICAgICAgICAgLy8gTGVmdCBlYXI6IDY1JSBsZWZ0ICsgMzUlIHJpZ2h0LCBSaWdodCBlYXI6IDM1JSBsZWZ0ICsgNjUlIHJpZ2h0XG4gICAgICAgICAgICBzY3JpcHRQcm9jZXNzb3Iub25hdWRpb3Byb2Nlc3MgPSAoYXVkaW9Qcm9jZXNzaW5nRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbnB1dEJ1ZmZlciA9IGF1ZGlvUHJvY2Vzc2luZ0V2ZW50LmlucHV0QnVmZmVyO1xuICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dEJ1ZmZlciA9IGF1ZGlvUHJvY2Vzc2luZ0V2ZW50Lm91dHB1dEJ1ZmZlcjtcblxuICAgICAgICAgICAgICAgIC8vIEdldCBudW1iZXIgb2YgY2hhbm5lbHMgaW4gdGhlIGJ1ZmZlclxuICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0Q2hhbm5lbENvdW50ID0gaW5wdXRCdWZmZXIubnVtYmVyT2ZDaGFubmVscztcbiAgICAgICAgICAgICAgICBjb25zdCBvdXRwdXRDaGFubmVsQ291bnQgPSBvdXRwdXRCdWZmZXIubnVtYmVyT2ZDaGFubmVscztcblxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBkaWZmZXJlbnQgY2hhbm5lbCBjb25maWd1cmF0aW9uc1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dENoYW5uZWxDb3VudCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbnB1dCBpcyBhbHJlYWR5IG1vbm8gLSBjb3B5IHRvIGJvdGggb3V0cHV0IGNoYW5uZWxzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0TW9ubyA9IGlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvdXRwdXRMID0gb3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvdXRwdXRSID0gb3V0cHV0Q2hhbm5lbENvdW50ID4gMSA/IG91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKSA6IG51bGw7XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dE1vbm8ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dExbaV0gPSBpbnB1dE1vbm9baV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3V0cHV0Uikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dFJbaV0gPSBpbnB1dE1vbm9baV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlucHV0Q2hhbm5lbENvdW50ID49IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5wdXQgaXMgc3RlcmVvIG9yIG11bHRpLWNoYW5uZWwgLSBhcHBseSA2NS8zNSBtaXhpbmdcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5wdXRMID0gaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0UiA9IGlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDEpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvdXRwdXRMID0gb3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvdXRwdXRSID0gb3V0cHV0Q2hhbm5lbENvdW50ID4gMSA/IG91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKSA6IG51bGw7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQXBwbHkgNjUvMzUgbWl4aW5nIGZvciBuZWFyLW1vbm8gZXhwZXJpZW5jZSB3aXRoIHN1YnRsZSBkaXJlY3Rpb25hbCBjdWVzXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRMLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBMZWZ0IGVhciByZWNlaXZlcyA2NSUgbGVmdCArIDM1JSByaWdodFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0TFtpXSA9IChpbnB1dExbaV0gKiAwLjY1KSArIChpbnB1dFJbaV0gKiAwLjM1KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmlnaHQgZWFyIHJlY2VpdmVzIDM1JSBsZWZ0ICsgNjUlIHJpZ2h0XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3V0cHV0Uikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dFJbaV0gPSAoaW5wdXRMW2ldICogMC4zNSkgKyAoaW5wdXRSW2ldICogMC42NSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgZ2FpbiBub2RlIGZvciB2b2x1bWUgY29udHJvbFxuICAgICAgICAgICAgdGhpcy5nYWluTm9kZSA9IHRoaXMuYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgICAgICAgICAgLy8gQ29ubmVjdCB0aGUgYXVkaW8gZ3JhcGg6XG4gICAgICAgICAgICAvLyBzb3VyY2Ug4oaSIHNjcmlwdFByb2Nlc3NvciDihpIgZ2FpbiDihpIgZGVzdGluYXRpb25cbiAgICAgICAgICAgIHRoaXMuc291cmNlTm9kZS5jb25uZWN0KHNjcmlwdFByb2Nlc3Nvcik7XG4gICAgICAgICAgICBzY3JpcHRQcm9jZXNzb3IuY29ubmVjdCh0aGlzLmdhaW5Ob2RlKTtcbiAgICAgICAgICAgIHRoaXMuZ2Fpbk5vZGUuY29ubmVjdCh0aGlzLmF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBhdWRpbyB3aWxsIHBsYXkgYXMgc3RlcmVvIHRocm91Z2ggbm9ybWFsIEhUTUw1IGF1ZGlvXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGF1ZGlvIGZyb20gQVBJIGVuZHBvaW50IHVzaW5nIGRpcmVjdCBzcmMgYXNzaWdubWVudCBmb3Igc3RyZWFtaW5nIHBsYXliYWNrXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFwaVVybCAtIFRoZSBBUEkgVVJMICh0b2tlbi1iYXNlZCwgbm8gYXV0aCBoZWFkZXIgbmVlZGVkKVxuICAgICAqL1xuICAgIGxvYWRBdXRoZW50aWNhdGVkU291cmNlKGFwaVVybCkge1xuICAgICAgICBjb25zdCBmdWxsVXJsID0gYXBpVXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKVxuICAgICAgICAgICAgPyBhcGlVcmxcbiAgICAgICAgICAgIDogYCR7d2luZG93LmxvY2F0aW9uLm9yaWdpbn0ke2FwaVVybH1gO1xuXG4gICAgICAgIC8vIFJldm9rZSBwcmV2aW91cyBibG9iIFVSTCBpZiBleGlzdHMgKGNsZWFudXAgZnJvbSBvbGRlciBjb2RlIHBhdGgpXG4gICAgICAgIGlmICh0aGlzLmh0bWw1QXVkaW8uc3JjICYmIHRoaXMuaHRtbDVBdWRpby5zcmMuc3RhcnRzV2l0aCgnYmxvYjonKSkge1xuICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLmh0bWw1QXVkaW8uc3JjKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBzb3VyY2UgZGlyZWN0bHkg4oCUIGJyb3dzZXIgaGFuZGxlcyBzdHJlYW1pbmcgKyBSYW5nZSByZXF1ZXN0cyBuYXRpdmVseVxuICAgICAgICAvLyBXSFk6IFByZXZpb3VzIGZldGNoKCkuYmxvYigpIGRvd25sb2FkZWQgRU5USVJFIGZpbGUgYmVmb3JlIHBsYXliYWNrICgxNS00MHMgZm9yIGxhcmdlIGZpbGVzKVxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uc3JjID0gZnVsbFVybDtcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmxvYWQoKTtcblxuICAgICAgICAvLyBTZXR1cCBtb25vIG1peGVyIG9uIGZpcnN0IHBsYXliYWNrIG9ubHlcbiAgICAgICAgLy8gV0hZOiBXZWIgQXVkaW8gQVBJIHJlcXVpcmVzIHVzZXIgaW50ZXJhY3Rpb24gYmVmb3JlIGNyZWF0aW5nIEF1ZGlvQ29udGV4dFxuICAgICAgICAvLyBNZWRpYUVsZW1lbnRTb3VyY2UgY2FuIG9ubHkgYmUgY3JlYXRlZCBvbmNlIHBlciBhdWRpbyBlbGVtZW50XG4gICAgICAgIGlmICghdGhpcy5zb3VyY2VOb2RlKSB7XG4gICAgICAgICAgICB0aGlzLnNldHVwTW9ub01peGVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBdXRvLXBsYXkgYWZ0ZXIgZW5vdWdoIGRhdGEgaXMgYnVmZmVyZWRcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLm9uY2FucGxheXRocm91Z2ggPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLm9uY2FucGxheXRocm91Z2ggPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEhhbmRsZSBsb2FkaW5nIGVycm9yc1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8ub25lcnJvciA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yID0gdGhpcy5odG1sNUF1ZGlvLmVycm9yO1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yID8gYEF1ZGlvIGVycm9yOiAke2Vycm9yLm1lc3NhZ2UgfHwgZXJyb3IuY29kZX1gIDogJ0F1ZGlvIGxvYWQgZmFpbGVkJztcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhtZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuY2RyX0F1ZGlvRmlsZUxvYWRFcnJvcik7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ub25lcnJvciA9IG51bGw7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRG93bmxvYWQgZmlsZSB3aXRoIGF1dGhlbnRpY2F0aW9uIGFuZCBvcHRpb25hbCBmb3JtYXQgY29udmVyc2lvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkb3dubG9hZFVybCAtIERvd25sb2FkIFVSTCByZXF1aXJpbmcgQmVhcmVyIHRva2VuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm1hdCAtIERlc2lyZWQgYXVkaW8gZm9ybWF0IChvcmlnaW5hbCwgbXAzLCB3YXYsIHdlYm0sIG9nZylcbiAgICAgKi9cbiAgICBkb3dubG9hZEZpbGUoZG93bmxvYWRVcmwsIGZvcm1hdCA9ICd3ZWJtJykge1xuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIGFuIEFQSSBVUkwgdGhhdCByZXF1aXJlcyBhdXRoZW50aWNhdGlvblxuICAgICAgICBpZiAoZG93bmxvYWRVcmwuaW5jbHVkZXMoJy9wYnhjb3JlL2FwaS8nKSkge1xuICAgICAgICAgICAgLy8gQWRkIGZvcm1hdCBwYXJhbWV0ZXIgdG8gVVJMIGlmIG5vdCAnb3JpZ2luYWwnXG4gICAgICAgICAgICBsZXQgdXJsV2l0aEZvcm1hdCA9IGRvd25sb2FkVXJsO1xuICAgICAgICAgICAgaWYgKGZvcm1hdCAhPT0gJ29yaWdpbmFsJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlcGFyYXRvciA9IGRvd25sb2FkVXJsLmluY2x1ZGVzKCc/JykgPyAnJicgOiAnPyc7XG4gICAgICAgICAgICAgICAgdXJsV2l0aEZvcm1hdCA9IGAke2Rvd25sb2FkVXJsfSR7c2VwYXJhdG9yfWZvcm1hdD0ke2VuY29kZVVSSUNvbXBvbmVudChmb3JtYXQpfWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIGZ1bGwgVVJMIChSRVNUIEFQSSBwYXRocyBhbHdheXMgc3RhcnQgd2l0aCAvcGJ4Y29yZS8pXG4gICAgICAgICAgICBjb25zdCBmdWxsVXJsID0gdXJsV2l0aEZvcm1hdC5zdGFydHNXaXRoKCdodHRwJylcbiAgICAgICAgICAgICAgICA/IHVybFdpdGhGb3JtYXRcbiAgICAgICAgICAgICAgICA6IGAke3dpbmRvdy5sb2NhdGlvbi5vcmlnaW59JHt1cmxXaXRoRm9ybWF0fWA7XG5cbiAgICAgICAgICAgIC8vIFByZXBhcmUgaGVhZGVycyB3aXRoIEJlYXJlciB0b2tlblxuICAgICAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCdcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ZWRBdCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgICAgICAgdGhpcy4kZG93bmxvYWREcm9wZG93bi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHRoaXMuJGRvd25sb2FkRHJvcGRvd24uZmluZCgnaS5kb3dubG9hZCcpLmFkZENsYXNzKCdsb2FkaW5nIHNwaW5uZXInKS5yZW1vdmVDbGFzcygnZG93bmxvYWQnKTtcbiAgICAgICAgICAgIHRoaXMuJGRvd25sb2FkUHJvZ3Jlc3MudGV4dCgnMCUnKS5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIEZldGNoIGZpbGUgd2l0aCBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgZmV0Y2goZnVsbFVybCwgeyBoZWFkZXJzIH0pXG4gICAgICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9OiAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBHZXQgZmlsZW5hbWUgZnJvbSBDb250ZW50LURpc3Bvc2l0aW9uIGhlYWRlciBvciBVUkxcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzcG9zaXRpb24gPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1EaXNwb3NpdGlvbicpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmlsZW5hbWUgPSBgY2FsbC1yZWNvcmQuJHtmb3JtYXQgfHwgJ21wMyd9YDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpc3Bvc2l0aW9uICYmIGRpc3Bvc2l0aW9uLmluY2x1ZGVzKCdmaWxlbmFtZT0nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0Y2hlcyA9IC9maWxlbmFtZVteOz1cXG5dKj0oKFsnXCJdKS4qP1xcMnxbXjtcXG5dKikvLmV4ZWMoZGlzcG9zaXRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1hdGNoZXMgIT0gbnVsbCAmJiBtYXRjaGVzWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWUgPSBtYXRjaGVzWzFdLnJlcGxhY2UoL1snXCJdL2csICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyeSB0byBleHRyYWN0IGZyb20gVVJMIHBhcmFtZXRlcnNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoZG93bmxvYWRVcmwuc3BsaXQoJz8nKVsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlbmFtZVBhcmFtID0gdXJsUGFyYW1zLmdldCgnZmlsZW5hbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWxlbmFtZVBhcmFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWUgPSBmaWxlbmFtZVBhcmFtO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIENEUlBsYXllci5yZWFkUmVzcG9uc2VCb2R5KHJlc3BvbnNlLCAobG9hZGVkLCB0b3RhbCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvZ3Jlc3NUZXh0ID0gQ0RSUGxheWVyLmZvcm1hdERvd25sb2FkUHJvZ3Jlc3MoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9hZGVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlcmZvcm1hbmNlLm5vdygpIC0gc3RhcnRlZEF0XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kZG93bmxvYWRQcm9ncmVzcy50ZXh0KHByb2dyZXNzVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oYmxvYiA9PiAoeyBibG9iLCBmaWxlbmFtZSB9KSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAudGhlbigoeyBibG9iLCBmaWxlbmFtZSB9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBkb3dubG9hZCBsaW5rXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICAgICAgICAgICAgICBhLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgICAgIGEuaHJlZiA9IHVybDtcbiAgICAgICAgICAgICAgICAgICAgYS5kb3dubG9hZCA9IGZpbGVuYW1lO1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xuICAgICAgICAgICAgICAgICAgICBhLmNsaWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5VUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoYSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXREb3dubG9hZFByb2dyZXNzKCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc2V0RG93bmxvYWRQcm9ncmVzcygpO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3IubWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmNkcl9BdWRpb0ZpbGVEb3dubG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExlZ2FjeSBkaXJlY3QgZmlsZSBVUkwgKG5vIGF1dGggbmVlZGVkKVxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZG93bmxvYWRVcmw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXN0b3JlIHRoZSBkb3dubG9hZCBjb250cm9sIGFmdGVyIGNvbXBsZXRpb24gb3IgZmFpbHVyZS5cbiAgICAgKi9cbiAgICByZXNldERvd25sb2FkUHJvZ3Jlc3MoKSB7XG4gICAgICAgIHRoaXMuJGRvd25sb2FkRHJvcGRvd24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuJGRvd25sb2FkRHJvcGRvd24uZmluZCgnaS5zcGlubmVyJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgc3Bpbm5lcicpLmFkZENsYXNzKCdkb3dubG9hZCcpO1xuICAgICAgICB0aGlzLiRkb3dubG9hZFByb2dyZXNzLmhpZGUoKS50ZXh0KCcnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3Igc3JjIG1lZGlhIGVycm9yIGV2ZW50LlxuICAgICAqL1xuICAgIGNiT25TcmNNZWRpYUVycm9yKCkge1xuICAgICAgICAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGlzYWJsZSBwbGF5ZXIgY29udHJvbHMgd2hlbiBmaWxlIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgKiBIaWRlcyBwbGF5IGFuZCBkb3dubG9hZCBidXR0b25zLCBkaXNhYmxlcyBvbmx5IHBsYXllciBjZWxscyAobm90IGVudGlyZSByb3cpXG4gICAgICovXG4gICAgZGlzYWJsZVBsYXllcigpIHtcbiAgICAgICAgLy8gSGlkZSBwbGF5IGJ1dHRvblxuICAgICAgICB0aGlzLiRwQnV0dG9uLmhpZGUoKTtcblxuICAgICAgICAvLyBIaWRlIGRvd25sb2FkIGJ1dHRvblxuICAgICAgICB0aGlzLiRkQnV0dG9uLmhpZGUoKTtcblxuICAgICAgICAvLyBTaG93IHBsYWNlaG9sZGVyIGluIGR1cmF0aW9uIHNwYW5cbiAgICAgICAgdGhpcy4kc3BhbkR1cmF0aW9uLnRleHQoJy0tOi0tLy0tOi0tJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgLy8gRGlzYWJsZSBzbGlkZXIgYW5kIGl0cyBwYXJlbnQgY2VsbFxuICAgICAgICB0aGlzLiRzbGlkZXIuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuJHNsaWRlci5jbG9zZXN0KCd0ZCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgIC8vIERpc2FibGUgZHVyYXRpb24gY2VsbFxuICAgICAgICB0aGlzLiRzcGFuRHVyYXRpb24uY2xvc2VzdCgndGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9XG59XG4iXX0=