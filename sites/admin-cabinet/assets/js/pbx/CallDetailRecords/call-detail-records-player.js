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
      } // Clean up audio nodes to prevent memory leaks


      this.cleanupAudioNodes();
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
      // Check if audio already has a blob source loaded
      if (this.html5Audio.src && this.html5Audio.src.startsWith('blob:')) {
        // Blob already loaded, just toggle play/pause
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
          } // Clean up audio nodes when pausing


          this.cleanupAudioNodes();
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
        } // Detect format from Content-Type header


        var contentType = response.headers.get('Content-Type');
        _this4.currentFormat = _this4.detectAudioFormat(contentType); // Update format badge

        if (_this4.currentFormat && _this4.currentFormat !== 'unknown') {
          _this4.updateFormatBadge(_this4.currentFormat);
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

        _this4.html5Audio.load(); // Setup mono mixer on first playback only
        // WHY: Web Audio API requires user interaction before creating AudioContext
        // MediaElementSource can only be created once per audio element
        // After first setup, same source node works for all subsequent files


        if (!_this4.sourceNode) {
          _this4.setupMonoMixer();
        } // Auto-play after loading


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLXBsYXllci5qcyJdLCJuYW1lcyI6WyJDRFJQbGF5ZXIiLCJpZCIsImh0bWw1QXVkaW8iLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiJHJvdyIsIiQiLCJjdXJyZW50Rm9ybWF0IiwiYXVkaW9Db250ZXh0Iiwic291cmNlTm9kZSIsImdhaW5Ob2RlIiwiaGFzQ2xhc3MiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9yaWdpbmFsU3JjIiwiZ2V0QXR0cmlidXRlIiwiaW5jbHVkZXMiLCJzZXRBdHRyaWJ1dGUiLCJyZW1vdmVBdHRyaWJ1dGUiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInBsYXkiLCIkZG93bmxvYWREcm9wZG93biIsImxlbmd0aCIsImRyb3Bkb3duIiwiYWN0aW9uIiwib25DaGFuZ2UiLCJ2YWx1ZSIsInRleHQiLCIkY2hvaWNlIiwiZm9ybWF0IiwiZGF0YSIsImRvd25sb2FkVXJsIiwiZG93bmxvYWRGaWxlIiwidGFyZ2V0IiwiYXR0ciIsImFkZEV2ZW50TGlzdGVuZXIiLCJiaW5kIiwiY3VycmVudGx5UGxheWluZyIsImNiT25TcmNNZWRpYUVycm9yIiwicmFuZ2UiLCJtaW4iLCJtYXgiLCJzdGFydCIsImNiT25TbGlkZXJDaGFuZ2UiLCJzcGFuRHVyYXRpb24iLCJpbml0aWFsaXplVG9vbHRpcCIsImFkZENsYXNzIiwibG9hZE1ldGFkYXRhIiwiJHRvb2x0aXAiLCJhcHBlbmQiLCJ1cGRhdGVUb29sdGlwUG9zaXRpb24iLCJjc3MiLCJyZW1vdmVDbGFzcyIsInNsaWRlck9mZnNldCIsIm9mZnNldCIsInNsaWRlcldpZHRoIiwid2lkdGgiLCJtb3VzZVgiLCJwYWdlWCIsImxlZnQiLCJwZXJjZW50IiwiTWF0aCIsImR1cmF0aW9uIiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJ0aW1lU2Vjb25kcyIsImZvcm1hdHRlZFRpbWUiLCJmb3JtYXRUaW1lIiwic2Vjb25kcyIsImRhdGUiLCJEYXRlIiwic2V0U2Vjb25kcyIsInBhcnNlSW50IiwiZGF0ZVN0ciIsInRvSVNPU3RyaW5nIiwiaG91cnMiLCJzdWJzdHIiLCJjb250ZW50VHlwZSIsImxvd2VyVHlwZSIsInRvTG93ZXJDYXNlIiwiJGJhZGdlIiwiYmVmb3JlIiwiZm9ybWF0VXBwZXIiLCJ0b1VwcGVyQ2FzZSIsImNsb3Nlc3QiLCJjdXJyZW50VGltZSIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJkYXRlQ3VycmVudCIsImRhdGVEdXJhdGlvbiIsInJhbmdlUG9zaXRpb24iLCJyb3VuZCIsInNvdXJjZVNyYyIsImZ1bGxVcmwiLCJzdGFydHNXaXRoIiwid2luZG93IiwibG9jYXRpb24iLCJvcmlnaW4iLCJoZWFkZXJzIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJmZXRjaCIsIm1ldGhvZCIsInRoZW4iLCJyZXNwb25zZSIsIm9rIiwiZGlzYWJsZVBsYXllciIsImR1cmF0aW9uU2Vjb25kcyIsImdldCIsInBhcnNlRmxvYXQiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsIndyaXRhYmxlIiwiY29uZmlndXJhYmxlIiwiZm9ybWF0dGVkIiwicGF1c2VkIiwicGF1c2UiLCJjbGVhbnVwQXVkaW9Ob2RlcyIsInNjcmlwdFByb2Nlc3NvciIsImRpc2Nvbm5lY3QiLCJvbmF1ZGlvcHJvY2VzcyIsInNyYyIsInN0b3BPdGhlcnMiLCJsb2FkQXV0aGVudGljYXRlZFNvdXJjZSIsIkF1ZGlvQ29udGV4dCIsIndlYmtpdEF1ZGlvQ29udGV4dCIsImNyZWF0ZU1lZGlhRWxlbWVudFNvdXJjZSIsImJ1ZmZlclNpemUiLCJjcmVhdGVTY3JpcHRQcm9jZXNzb3IiLCJhdWRpb1Byb2Nlc3NpbmdFdmVudCIsImlucHV0QnVmZmVyIiwib3V0cHV0QnVmZmVyIiwiaW5wdXRDaGFubmVsQ291bnQiLCJudW1iZXJPZkNoYW5uZWxzIiwib3V0cHV0Q2hhbm5lbENvdW50IiwiaW5wdXRNb25vIiwiZ2V0Q2hhbm5lbERhdGEiLCJvdXRwdXRMIiwib3V0cHV0UiIsImkiLCJpbnB1dEwiLCJpbnB1dFIiLCJjcmVhdGVHYWluIiwiY29ubmVjdCIsImRlc3RpbmF0aW9uIiwiZXJyb3IiLCJhcGlVcmwiLCJFcnJvciIsInN0YXR1cyIsInN0YXR1c1RleHQiLCJkZXRlY3RBdWRpb0Zvcm1hdCIsInVwZGF0ZUZvcm1hdEJhZGdlIiwiYmxvYiIsImJsb2JVcmwiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJyZXZva2VPYmplY3RVUkwiLCJsb2FkIiwic2V0dXBNb25vTWl4ZXIiLCJvbmNhbnBsYXl0aHJvdWdoIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2RyX0F1ZGlvRmlsZUxvYWRFcnJvciIsInVybFdpdGhGb3JtYXQiLCJzZXBhcmF0b3IiLCJlbmNvZGVVUklDb21wb25lbnQiLCJkaXNwb3NpdGlvbiIsImZpbGVuYW1lIiwibWF0Y2hlcyIsImV4ZWMiLCJyZXBsYWNlIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwic3BsaXQiLCJmaWxlbmFtZVBhcmFtIiwidXJsIiwiYSIsImNyZWF0ZUVsZW1lbnQiLCJzdHlsZSIsImRpc3BsYXkiLCJocmVmIiwiZG93bmxvYWQiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJjbGljayIsInJlbW92ZUNoaWxkIiwiY2RyX0F1ZGlvRmlsZURvd25sb2FkRXJyb3IiLCJoaWRlIiwiZXhjZXB0UGxheWVyIiwic3RvcFBsYXliYWNrIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7SUFDTUEsUztBQWdCRjtBQUNKO0FBQ0E7QUFDQTtBQUNJLHFCQUFZQyxFQUFaLEVBQWdCO0FBQUE7O0FBQUE7O0FBQ1osU0FBS0EsRUFBTCxHQUFVQSxFQUFWO0FBQ0EsU0FBS0MsVUFBTCxHQUFrQkMsUUFBUSxDQUFDQyxjQUFULHdCQUF3Q0gsRUFBeEMsRUFBbEI7QUFDQSxRQUFNSSxJQUFJLEdBQUdDLENBQUMsWUFBS0wsRUFBTCxFQUFkLENBSFksQ0FLWjs7QUFDQSxTQUFLTSxhQUFMLEdBQXFCLElBQXJCLENBTlksQ0FRWjtBQUNBO0FBQ0E7O0FBQ0EsU0FBS0MsWUFBTCxHQUFvQixJQUFwQjtBQUNBLFNBQUtDLFVBQUwsR0FBa0IsSUFBbEI7QUFDQSxTQUFLQyxRQUFMLEdBQWdCLElBQWhCLENBYlksQ0FlWjs7QUFDQSxRQUFJTCxJQUFJLENBQUNNLFFBQUwsQ0FBYyxhQUFkLENBQUosRUFBa0M7QUFDOUI7QUFDSDs7QUFFRCxTQUFLQyxRQUFMLEdBQWdCUCxJQUFJLENBQUNRLElBQUwsQ0FBVSxRQUFWLENBQWhCLENBcEJZLENBb0J5Qjs7QUFDckMsU0FBS0MsUUFBTCxHQUFnQlQsSUFBSSxDQUFDUSxJQUFMLENBQVUsWUFBVixDQUFoQixDQXJCWSxDQXFCNkI7O0FBQ3pDLFNBQUtFLE9BQUwsR0FBZVYsSUFBSSxDQUFDUSxJQUFMLENBQVUsZ0JBQVYsQ0FBZixDQXRCWSxDQXNCZ0M7O0FBQzVDLFNBQUtHLGFBQUwsR0FBcUJYLElBQUksQ0FBQ1EsSUFBTCxDQUFVLG1CQUFWLENBQXJCLENBdkJZLENBdUJ5QztBQUVyRDs7QUFDQSxTQUFLWCxVQUFMLENBQWdCZSxtQkFBaEIsQ0FBb0MsWUFBcEMsRUFBa0QsS0FBS0Msa0JBQXZELEVBQTJFLEtBQTNFO0FBQ0EsU0FBS2hCLFVBQUwsQ0FBZ0JlLG1CQUFoQixDQUFvQyxnQkFBcEMsRUFBc0QsS0FBS0UsWUFBM0QsRUFBeUUsS0FBekU7QUFDQSxTQUFLUCxRQUFMLENBQWNRLE1BQWQ7QUFDQSxTQUFLTixRQUFMLENBQWNNLE1BQWQsR0E3QlksQ0ErQlo7O0FBQ0EsUUFBTUMsV0FBVyxHQUFHLEtBQUtuQixVQUFMLENBQWdCb0IsWUFBaEIsQ0FBNkIsS0FBN0IsQ0FBcEI7O0FBQ0EsUUFBSUQsV0FBVyxJQUFJQSxXQUFXLENBQUNFLFFBQVosQ0FBcUIsZUFBckIsQ0FBbkIsRUFBMEQ7QUFDdEQsV0FBS3JCLFVBQUwsQ0FBZ0JzQixZQUFoQixDQUE2QixVQUE3QixFQUF5Q0gsV0FBekM7QUFDQSxXQUFLbkIsVUFBTCxDQUFnQnVCLGVBQWhCLENBQWdDLEtBQWhDLEVBRnNELENBRWQ7QUFDM0MsS0FwQ1csQ0FzQ1o7OztBQUNBLFNBQUtiLFFBQUwsQ0FBY2MsRUFBZCxDQUFpQixPQUFqQixFQUEwQixVQUFDQyxDQUFELEVBQU87QUFDN0JBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjs7QUFDQSxNQUFBLEtBQUksQ0FBQ0MsSUFBTDtBQUNILEtBSEQsRUF2Q1ksQ0E0Q1o7O0FBQ0EsUUFBTUMsaUJBQWlCLEdBQUd6QixJQUFJLENBQUNRLElBQUwsQ0FBVSwyQkFBVixDQUExQjs7QUFDQSxRQUFJaUIsaUJBQWlCLENBQUNDLE1BQWxCLEdBQTJCLENBQS9CLEVBQWtDO0FBQzlCRCxNQUFBQSxpQkFBaUIsQ0FBQ0UsUUFBbEIsQ0FBMkI7QUFDdkJDLFFBQUFBLE1BQU0sRUFBRSxNQURlO0FBRXZCQyxRQUFBQSxRQUFRLEVBQUUsa0JBQUNDLEtBQUQsRUFBUUMsSUFBUixFQUFjQyxPQUFkLEVBQTBCO0FBQ2hDLGNBQU1DLE1BQU0sR0FBR0QsT0FBTyxDQUFDRSxJQUFSLENBQWEsUUFBYixDQUFmO0FBQ0EsY0FBTUMsV0FBVyxHQUFHVixpQkFBaUIsQ0FBQ1MsSUFBbEIsQ0FBdUIsY0FBdkIsQ0FBcEI7O0FBQ0EsY0FBSUMsV0FBVyxJQUFJRixNQUFuQixFQUEyQjtBQUN2QixZQUFBLEtBQUksQ0FBQ0csWUFBTCxDQUFrQkQsV0FBbEIsRUFBK0JGLE1BQS9CO0FBQ0g7QUFDSjtBQVJzQixPQUEzQjtBQVVILEtBekRXLENBMkRaOzs7QUFDQSxTQUFLeEIsUUFBTCxDQUFjWSxFQUFkLENBQWlCLE9BQWpCLEVBQTBCLFVBQUNDLENBQUQsRUFBTztBQUM3QkEsTUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsVUFBTVksV0FBVyxHQUFHbEMsQ0FBQyxDQUFDcUIsQ0FBQyxDQUFDZSxNQUFILENBQUQsQ0FBWUMsSUFBWixDQUFpQixZQUFqQixDQUFwQjs7QUFDQSxVQUFJSCxXQUFKLEVBQWlCO0FBQ2I7QUFDQSxRQUFBLEtBQUksQ0FBQ0MsWUFBTCxDQUFrQkQsV0FBbEIsRUFBK0IsTUFBL0I7QUFDSDtBQUNKLEtBUEQsRUE1RFksQ0FxRVo7O0FBQ0EsU0FBS3RDLFVBQUwsQ0FBZ0IwQyxnQkFBaEIsQ0FBaUMsZ0JBQWpDLEVBQW1ELEtBQUsxQixrQkFBTCxDQUF3QjJCLElBQXhCLENBQTZCLElBQTdCLENBQW5ELEVBQXVGLEtBQXZGLEVBdEVZLENBd0VaOztBQUNBLFNBQUszQyxVQUFMLENBQWdCMEMsZ0JBQWhCLENBQWlDLFlBQWpDLEVBQStDLEtBQUt6QixZQUFwRCxFQUFrRSxLQUFsRSxFQXpFWSxDQTJFWjs7QUFDQSxTQUFLakIsVUFBTCxDQUFnQjBDLGdCQUFoQixDQUFpQyxPQUFqQyxFQUEwQyxZQUFNO0FBQzVDLFVBQUk1QyxTQUFTLENBQUM4QyxnQkFBVixLQUErQixLQUFuQyxFQUF5QztBQUNyQzlDLFFBQUFBLFNBQVMsQ0FBQzhDLGdCQUFWLEdBQTZCLElBQTdCO0FBQ0g7QUFDSixLQUpELEVBSUcsS0FKSCxFQTVFWSxDQWtGWjs7QUFDQSxTQUFLNUMsVUFBTCxDQUFnQjBDLGdCQUFoQixDQUFpQyxPQUFqQyxFQUEwQyxLQUFLRyxpQkFBL0MsRUFBa0UsS0FBbEU7QUFFQSxTQUFLaEMsT0FBTCxDQUFhaUMsS0FBYixDQUFtQjtBQUNmQyxNQUFBQSxHQUFHLEVBQUUsQ0FEVTtBQUVmQyxNQUFBQSxHQUFHLEVBQUUsR0FGVTtBQUdmQyxNQUFBQSxLQUFLLEVBQUUsQ0FIUTtBQUlmakIsTUFBQUEsUUFBUSxFQUFFLEtBQUtrQixnQkFKQTtBQUtmbEQsTUFBQUEsVUFBVSxFQUFFLEtBQUtBLFVBTEY7QUFNZmlCLE1BQUFBLFlBQVksRUFBRSxLQUFLQSxZQU5KO0FBT2ZrQyxNQUFBQSxZQUFZLEVBQUUsS0FBS3JDO0FBUEosS0FBbkIsRUFyRlksQ0ErRlo7O0FBQ0EsU0FBS3NDLGlCQUFMLEdBaEdZLENBa0daOztBQUNBakQsSUFBQUEsSUFBSSxDQUFDa0QsUUFBTCxDQUFjLGFBQWQsRUFuR1ksQ0FxR1o7O0FBQ0EsU0FBS0MsWUFBTDtBQUNIO0FBRUQ7QUFDSjtBQUNBOzs7OztXQUNJLDZCQUFvQjtBQUFBOztBQUNoQjtBQUNBLFVBQU1DLFFBQVEsR0FBR25ELENBQUMsQ0FBQyw2Q0FBRCxDQUFsQjtBQUNBLFdBQUtTLE9BQUwsQ0FBYTJDLE1BQWIsQ0FBb0JELFFBQXBCO0FBQ0EsV0FBS0EsUUFBTCxHQUFnQkEsUUFBaEIsQ0FKZ0IsQ0FNaEI7O0FBQ0EsV0FBSzFDLE9BQUwsQ0FBYVcsRUFBYixDQUFnQixXQUFoQixFQUE2QixVQUFDQyxDQUFELEVBQU87QUFDaEMsUUFBQSxNQUFJLENBQUNnQyxxQkFBTCxDQUEyQmhDLENBQTNCO0FBQ0gsT0FGRCxFQVBnQixDQVdoQjs7QUFDQSxXQUFLWixPQUFMLENBQWFXLEVBQWIsQ0FBZ0IsWUFBaEIsRUFBOEIsWUFBTTtBQUNoQyxRQUFBLE1BQUksQ0FBQytCLFFBQUwsQ0FBY0csR0FBZCxDQUFrQixTQUFsQixFQUE2QixHQUE3QjtBQUNILE9BRkQsRUFaZ0IsQ0FnQmhCOztBQUNBLFdBQUs3QyxPQUFMLENBQWFXLEVBQWIsQ0FBZ0IsWUFBaEIsRUFBOEIsWUFBTTtBQUNoQyxZQUFJLENBQUMsTUFBSSxDQUFDWCxPQUFMLENBQWFKLFFBQWIsQ0FBc0IsVUFBdEIsQ0FBTCxFQUF3QztBQUNwQyxVQUFBLE1BQUksQ0FBQzhDLFFBQUwsQ0FBY0csR0FBZCxDQUFrQixTQUFsQixFQUE2QixHQUE3QjtBQUNIO0FBQ0osT0FKRCxFQWpCZ0IsQ0F1QmhCOztBQUNBLFdBQUs3QyxPQUFMLENBQWFXLEVBQWIsQ0FBZ0IsV0FBaEIsRUFBNkIsWUFBTTtBQUMvQixRQUFBLE1BQUksQ0FBQ1gsT0FBTCxDQUFhd0MsUUFBYixDQUFzQixVQUF0Qjs7QUFDQSxRQUFBLE1BQUksQ0FBQ0UsUUFBTCxDQUFjRyxHQUFkLENBQWtCLFNBQWxCLEVBQTZCLEdBQTdCO0FBQ0gsT0FIRDtBQUtBdEQsTUFBQUEsQ0FBQyxDQUFDSCxRQUFELENBQUQsQ0FBWXVCLEVBQVosQ0FBZSxTQUFmLEVBQTBCLFlBQU07QUFDNUIsWUFBSSxNQUFJLENBQUNYLE9BQUwsQ0FBYUosUUFBYixDQUFzQixVQUF0QixDQUFKLEVBQXVDO0FBQ25DLFVBQUEsTUFBSSxDQUFDSSxPQUFMLENBQWE4QyxXQUFiLENBQXlCLFVBQXpCOztBQUNBLFVBQUEsTUFBSSxDQUFDSixRQUFMLENBQWNHLEdBQWQsQ0FBa0IsU0FBbEIsRUFBNkIsR0FBN0I7QUFDSDtBQUNKLE9BTEQ7QUFNSDtBQUVEO0FBQ0o7QUFDQTtBQUNBOzs7O1dBQ0ksK0JBQXNCakMsQ0FBdEIsRUFBeUI7QUFDckIsVUFBTW1DLFlBQVksR0FBRyxLQUFLL0MsT0FBTCxDQUFhZ0QsTUFBYixFQUFyQjtBQUNBLFVBQU1DLFdBQVcsR0FBRyxLQUFLakQsT0FBTCxDQUFha0QsS0FBYixFQUFwQjtBQUNBLFVBQU1DLE1BQU0sR0FBR3ZDLENBQUMsQ0FBQ3dDLEtBQUYsR0FBVUwsWUFBWSxDQUFDTSxJQUF0QztBQUNBLFVBQU1DLE9BQU8sR0FBR0MsSUFBSSxDQUFDcEIsR0FBTCxDQUFTLENBQVQsRUFBWW9CLElBQUksQ0FBQ3JCLEdBQUwsQ0FBUyxHQUFULEVBQWVpQixNQUFNLEdBQUdGLFdBQVYsR0FBeUIsR0FBdkMsQ0FBWixDQUFoQixDQUpxQixDQU1yQjs7QUFDQSxVQUFNTyxRQUFRLEdBQUcsS0FBS3JFLFVBQUwsQ0FBZ0JxRSxRQUFqQzs7QUFDQSxVQUFJQyxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JGLFFBQWhCLENBQUosRUFBK0I7QUFDM0IsWUFBTUcsV0FBVyxHQUFJSCxRQUFRLEdBQUdGLE9BQVosR0FBdUIsR0FBM0M7QUFDQSxZQUFNTSxhQUFhLEdBQUcsS0FBS0MsVUFBTCxDQUFnQkYsV0FBaEIsQ0FBdEI7QUFDQSxhQUFLakIsUUFBTCxDQUFjckIsSUFBZCxDQUFtQnVDLGFBQW5CO0FBQ0gsT0Fab0IsQ0FjckI7OztBQUNBLFdBQUtsQixRQUFMLENBQWNHLEdBQWQsQ0FBa0IsTUFBbEIsWUFBNkJTLE9BQTdCO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksb0JBQVdRLE9BQVgsRUFBb0I7QUFDaEIsVUFBTUMsSUFBSSxHQUFHLElBQUlDLElBQUosQ0FBUyxJQUFULENBQWI7QUFDQUQsTUFBQUEsSUFBSSxDQUFDRSxVQUFMLENBQWdCQyxRQUFRLENBQUNKLE9BQUQsRUFBVSxFQUFWLENBQXhCO0FBQ0EsVUFBTUssT0FBTyxHQUFHSixJQUFJLENBQUNLLFdBQUwsRUFBaEI7QUFDQSxVQUFNQyxLQUFLLEdBQUdILFFBQVEsQ0FBQ0MsT0FBTyxDQUFDRyxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFELEVBQXdCLEVBQXhCLENBQXRCOztBQUVBLFVBQUlELEtBQUssS0FBSyxDQUFkLEVBQWlCO0FBQ2IsZUFBT0YsT0FBTyxDQUFDRyxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFQO0FBQ0gsT0FGRCxNQUVPLElBQUlELEtBQUssR0FBRyxFQUFaLEVBQWdCO0FBQ25CLGVBQU9GLE9BQU8sQ0FBQ0csTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBUDtBQUNILE9BRk0sTUFFQTtBQUNILGVBQU9ILE9BQU8sQ0FBQ0csTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBUDtBQUNIO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksMkJBQWtCQyxXQUFsQixFQUErQjtBQUMzQixVQUFJLENBQUNBLFdBQUwsRUFBa0IsT0FBTyxTQUFQO0FBRWxCLFVBQU1DLFNBQVMsR0FBR0QsV0FBVyxDQUFDRSxXQUFaLEVBQWxCO0FBQ0EsVUFBSUQsU0FBUyxDQUFDaEUsUUFBVixDQUFtQixZQUFuQixDQUFKLEVBQXNDLE9BQU8sTUFBUDtBQUN0QyxVQUFJZ0UsU0FBUyxDQUFDaEUsUUFBVixDQUFtQixZQUFuQixLQUFvQ2dFLFNBQVMsQ0FBQ2hFLFFBQVYsQ0FBbUIsV0FBbkIsQ0FBeEMsRUFBeUUsT0FBTyxLQUFQO0FBQ3pFLFVBQUlnRSxTQUFTLENBQUNoRSxRQUFWLENBQW1CLFdBQW5CLEtBQW1DZ0UsU0FBUyxDQUFDaEUsUUFBVixDQUFtQixhQUFuQixDQUF2QyxFQUEwRSxPQUFPLEtBQVA7QUFFMUUsYUFBTyxTQUFQO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7OztXQUNJLDJCQUFrQmUsTUFBbEIsRUFBMEI7QUFDdEIsVUFBTWpDLElBQUksR0FBR0MsQ0FBQyxZQUFLLEtBQUtMLEVBQVYsRUFBZDtBQUNBLFVBQUl3RixNQUFNLEdBQUdwRixJQUFJLENBQUNRLElBQUwsQ0FBVSxxQkFBVixDQUFiLENBRnNCLENBSXRCOztBQUNBLFVBQUk0RSxNQUFNLENBQUMxRCxNQUFQLEtBQWtCLENBQXRCLEVBQXlCO0FBQ3JCMEQsUUFBQUEsTUFBTSxHQUFHbkYsQ0FBQyxDQUFDLHdEQUFELENBQVY7QUFDQSxhQUFLVSxhQUFMLENBQW1CMEUsTUFBbkIsQ0FBMEJELE1BQTFCO0FBQ0gsT0FScUIsQ0FVdEI7OztBQUNBLFVBQU1FLFdBQVcsR0FBR3JELE1BQU0sQ0FBQ3NELFdBQVAsRUFBcEI7QUFDQUgsTUFBQUEsTUFBTSxDQUFDckQsSUFBUCxDQUFZdUQsV0FBWixFQVpzQixDQWN0Qjs7QUFDQUYsTUFBQUEsTUFBTSxDQUFDNUIsV0FBUCxDQUFtQix3QkFBbkIsRUFmc0IsQ0FpQnRCOztBQUNBLGNBQVF2QixNQUFSO0FBQ0ksYUFBSyxNQUFMO0FBQ0ltRCxVQUFBQSxNQUFNLENBQUNsQyxRQUFQLENBQWdCLE9BQWhCLEVBREosQ0FDOEI7O0FBQzFCOztBQUNKLGFBQUssS0FBTDtBQUNJa0MsVUFBQUEsTUFBTSxDQUFDbEMsUUFBUCxDQUFnQixRQUFoQixFQURKLENBQytCOztBQUMzQjs7QUFDSixhQUFLLEtBQUw7QUFDSWtDLFVBQUFBLE1BQU0sQ0FBQ2xDLFFBQVAsQ0FBZ0IsTUFBaEIsRUFESixDQUM2Qjs7QUFDekI7O0FBQ0o7QUFDSWtDLFVBQUFBLE1BQU0sQ0FBQ2xDLFFBQVAsQ0FBZ0IsTUFBaEI7QUFBeUI7QUFYakM7QUFhSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLDhCQUFxQjtBQUNqQixVQUFJaUIsTUFBTSxDQUFDQyxRQUFQLENBQWdCLEtBQUtGLFFBQXJCLENBQUosRUFBb0M7QUFDaEMsWUFBTWxFLElBQUksR0FBR0MsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRdUYsT0FBUixDQUFnQixJQUFoQixDQUFiO0FBQ0EsWUFBTWYsSUFBSSxHQUFHLElBQUlDLElBQUosQ0FBUyxJQUFULENBQWI7QUFDQUQsUUFBQUEsSUFBSSxDQUFDRSxVQUFMLENBQWdCQyxRQUFRLENBQUMsS0FBS2EsV0FBTixFQUFtQixFQUFuQixDQUF4QixFQUhnQyxDQUdpQjs7QUFDakQsWUFBTUEsV0FBVyxHQUFHaEIsSUFBSSxDQUFDSyxXQUFMLEdBQW1CRSxNQUFuQixDQUEwQixFQUExQixFQUE4QixDQUE5QixDQUFwQjtBQUNBUCxRQUFBQSxJQUFJLENBQUNFLFVBQUwsQ0FBZ0JDLFFBQVEsQ0FBQyxLQUFLVixRQUFOLEVBQWdCLEVBQWhCLENBQXhCLEVBTGdDLENBS2M7O0FBQzlDLFlBQU1XLE9BQU8sR0FBR0osSUFBSSxDQUFDSyxXQUFMLEVBQWhCO0FBQ0EsWUFBTUMsS0FBSyxHQUFHSCxRQUFRLENBQUNDLE9BQU8sQ0FBQ0csTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBRCxFQUF3QixFQUF4QixDQUF0QjtBQUNBLFlBQUlkLFFBQUo7O0FBQ0EsWUFBSWEsS0FBSyxLQUFLLENBQWQsRUFBaUI7QUFDYmIsVUFBQUEsUUFBUSxHQUFHVyxPQUFPLENBQUNHLE1BQVIsQ0FBZSxFQUFmLEVBQW1CLENBQW5CLENBQVg7QUFDSCxTQUZELE1BRU8sSUFBSUQsS0FBSyxHQUFHLEVBQVosRUFBZ0I7QUFDbkJiLFVBQUFBLFFBQVEsR0FBR1csT0FBTyxDQUFDRyxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFYO0FBQ0gsU0FGTSxNQUVBLElBQUlELEtBQUssSUFBSSxFQUFiLEVBQWlCO0FBQ3BCYixVQUFBQSxRQUFRLEdBQUdXLE9BQU8sQ0FBQ0csTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBWDtBQUNIOztBQUNEaEYsUUFBQUEsSUFBSSxDQUFDUSxJQUFMLENBQVUsbUJBQVYsRUFBK0J1QixJQUEvQixXQUF1QzBELFdBQXZDLGNBQXNEdkIsUUFBdEQ7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLDBCQUFpQndCLE1BQWpCLEVBQXlCQyxJQUF6QixFQUErQjtBQUMzQixVQUFJQSxJQUFJLENBQUNDLGVBQUwsSUFBd0J6QixNQUFNLENBQUNDLFFBQVAsQ0FBZ0IsS0FBS3ZFLFVBQUwsQ0FBZ0JxRSxRQUFoQyxDQUE1QixFQUF1RTtBQUNuRSxhQUFLckUsVUFBTCxDQUFnQmUsbUJBQWhCLENBQW9DLFlBQXBDLEVBQWtELEtBQUtFLFlBQXZELEVBQXFFLEtBQXJFO0FBQ0EsYUFBS2pCLFVBQUwsQ0FBZ0I0RixXQUFoQixHQUErQixLQUFLNUYsVUFBTCxDQUFnQnFFLFFBQWhCLEdBQTJCd0IsTUFBNUIsR0FBc0MsR0FBcEU7QUFDQSxhQUFLN0YsVUFBTCxDQUFnQjBDLGdCQUFoQixDQUFpQyxZQUFqQyxFQUErQyxLQUFLekIsWUFBcEQsRUFBa0UsS0FBbEU7QUFDSDs7QUFDRCxVQUFJcUQsTUFBTSxDQUFDQyxRQUFQLENBQWdCLEtBQUt2RSxVQUFMLENBQWdCcUUsUUFBaEMsQ0FBSixFQUErQztBQUMzQyxZQUFNMkIsV0FBVyxHQUFHLElBQUluQixJQUFKLENBQVMsSUFBVCxDQUFwQjtBQUNBbUIsUUFBQUEsV0FBVyxDQUFDbEIsVUFBWixDQUF1QkMsUUFBUSxDQUFDLEtBQUsvRSxVQUFMLENBQWdCNEYsV0FBakIsRUFBOEIsRUFBOUIsQ0FBL0IsRUFGMkMsQ0FFd0I7O0FBQ25FLFlBQU1BLFdBQVcsR0FBR0ksV0FBVyxDQUFDZixXQUFaLEdBQTBCRSxNQUExQixDQUFpQyxFQUFqQyxFQUFxQyxDQUFyQyxDQUFwQjtBQUNBLFlBQU1jLFlBQVksR0FBRyxJQUFJcEIsSUFBSixDQUFTLElBQVQsQ0FBckI7QUFDQW9CLFFBQUFBLFlBQVksQ0FBQ25CLFVBQWIsQ0FBd0JDLFFBQVEsQ0FBQyxLQUFLL0UsVUFBTCxDQUFnQnFFLFFBQWpCLEVBQTJCLEVBQTNCLENBQWhDLEVBTDJDLENBS3NCOztBQUNqRSxZQUFNVyxPQUFPLEdBQUdpQixZQUFZLENBQUNoQixXQUFiLEVBQWhCO0FBQ0EsWUFBTUMsS0FBSyxHQUFHSCxRQUFRLENBQUNDLE9BQU8sQ0FBQ0csTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBRCxFQUF3QixFQUF4QixDQUF0QjtBQUNBLFlBQUlkLFFBQUo7O0FBQ0EsWUFBSWEsS0FBSyxLQUFLLENBQWQsRUFBaUI7QUFDYmIsVUFBQUEsUUFBUSxHQUFHVyxPQUFPLENBQUNHLE1BQVIsQ0FBZSxFQUFmLEVBQW1CLENBQW5CLENBQVg7QUFDSCxTQUZELE1BRU8sSUFBSUQsS0FBSyxHQUFHLEVBQVosRUFBZ0I7QUFDbkJiLFVBQUFBLFFBQVEsR0FBR1csT0FBTyxDQUFDRyxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFYO0FBQ0gsU0FGTSxNQUVBLElBQUlELEtBQUssSUFBSSxFQUFiLEVBQWlCO0FBQ3BCYixVQUFBQSxRQUFRLEdBQUdXLE9BQU8sQ0FBQ0csTUFBUixDQUFlLEVBQWYsRUFBbUIsQ0FBbkIsQ0FBWDtBQUNIOztBQUNELGFBQUtoQyxZQUFMLENBQWtCakIsSUFBbEIsV0FBMEIwRCxXQUExQixjQUF5Q3ZCLFFBQXpDO0FBQ0g7QUFDSjtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLHdCQUFlO0FBQ1gsVUFBSUMsTUFBTSxDQUFDQyxRQUFQLENBQWdCLEtBQUtGLFFBQXJCLENBQUosRUFBb0M7QUFDaEMsWUFBTUYsT0FBTyxHQUFHLEtBQUt5QixXQUFMLEdBQW1CLEtBQUt2QixRQUF4QztBQUNBLFlBQU02QixhQUFhLEdBQUc5QixJQUFJLENBQUNyQixHQUFMLENBQVNxQixJQUFJLENBQUMrQixLQUFMLENBQVloQyxPQUFELEdBQVksR0FBdkIsQ0FBVCxFQUFzQyxHQUF0QyxDQUF0QjtBQUNBLFlBQU1oRSxJQUFJLEdBQUdDLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUXVGLE9BQVIsQ0FBZ0IsSUFBaEIsQ0FBYjtBQUNBeEYsUUFBQUEsSUFBSSxDQUFDUSxJQUFMLENBQVUsZ0JBQVYsRUFBNEJtQyxLQUE1QixDQUFrQyxXQUFsQyxFQUErQ29ELGFBQS9DOztBQUNBLFlBQUksS0FBS04sV0FBTCxLQUFxQixLQUFLdkIsUUFBOUIsRUFBd0M7QUFDcENsRSxVQUFBQSxJQUFJLENBQUNRLElBQUwsQ0FBVSxTQUFWLEVBQXFCZ0QsV0FBckIsQ0FBaUMsT0FBakMsRUFBMENOLFFBQTFDLENBQW1ELE1BQW5EO0FBQ0g7QUFDSjtBQUNKO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7Ozs7V0FDSSx3QkFBZTtBQUFBOztBQUNYLFVBQU0rQyxTQUFTLEdBQUcsS0FBS3BHLFVBQUwsQ0FBZ0JvQixZQUFoQixDQUE2QixVQUE3QixDQUFsQjs7QUFDQSxVQUFJLENBQUNnRixTQUFELElBQWMsQ0FBQ0EsU0FBUyxDQUFDL0UsUUFBVixDQUFtQixlQUFuQixDQUFuQixFQUF3RDtBQUNwRDtBQUNILE9BSlUsQ0FNWDs7O0FBQ0EsVUFBTWdGLE9BQU8sR0FBR0QsU0FBUyxDQUFDRSxVQUFWLENBQXFCLE1BQXJCLElBQ1ZGLFNBRFUsYUFFUEcsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxNQUZULFNBRWtCTCxTQUZsQixDQUFoQixDQVBXLENBV1g7O0FBQ0EsVUFBTU0sT0FBTyxHQUFHO0FBQ1osNEJBQW9CO0FBRFIsT0FBaEI7O0FBSUEsVUFBSSxPQUFPQyxZQUFQLEtBQXdCLFdBQXhCLElBQXVDQSxZQUFZLENBQUNDLFdBQXhELEVBQXFFO0FBQ2pFRixRQUFBQSxPQUFPLENBQUMsZUFBRCxDQUFQLG9CQUFxQ0MsWUFBWSxDQUFDQyxXQUFsRDtBQUNILE9BbEJVLENBb0JYOzs7QUFDQUMsTUFBQUEsS0FBSyxDQUFDUixPQUFELEVBQVU7QUFDWFMsUUFBQUEsTUFBTSxFQUFFLE1BREc7QUFFWEosUUFBQUEsT0FBTyxFQUFQQTtBQUZXLE9BQVYsQ0FBTCxDQUlDSyxJQUpELENBSU0sVUFBQUMsUUFBUSxFQUFJO0FBQ2QsWUFBSSxDQUFDQSxRQUFRLENBQUNDLEVBQWQsRUFBa0I7QUFDZDtBQUNBLFVBQUEsTUFBSSxDQUFDQyxhQUFMOztBQUNBO0FBQ0gsU0FMYSxDQU9kOzs7QUFDQSxZQUFNQyxlQUFlLEdBQUdILFFBQVEsQ0FBQ04sT0FBVCxDQUFpQlUsR0FBakIsQ0FBcUIsa0JBQXJCLENBQXhCOztBQUNBLFlBQUlELGVBQUosRUFBcUI7QUFDakIsY0FBTTlDLFFBQVEsR0FBR2dELFVBQVUsQ0FBQ0YsZUFBRCxDQUEzQjs7QUFDQSxjQUFJOUMsUUFBUSxHQUFHLENBQWYsRUFBa0I7QUFDZDtBQUNBaUQsWUFBQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCLE1BQUksQ0FBQ3ZILFVBQTNCLEVBQXVDLFVBQXZDLEVBQW1EO0FBQy9DaUMsY0FBQUEsS0FBSyxFQUFFb0MsUUFEd0M7QUFFL0NtRCxjQUFBQSxRQUFRLEVBQUUsS0FGcUM7QUFHL0NDLGNBQUFBLFlBQVksRUFBRTtBQUhpQyxhQUFuRDtBQU1BLGdCQUFNN0MsSUFBSSxHQUFHLElBQUlDLElBQUosQ0FBUyxJQUFULENBQWI7QUFDQUQsWUFBQUEsSUFBSSxDQUFDRSxVQUFMLENBQWdCQyxRQUFRLENBQUNWLFFBQUQsRUFBVyxFQUFYLENBQXhCO0FBQ0EsZ0JBQU1XLE9BQU8sR0FBR0osSUFBSSxDQUFDSyxXQUFMLEVBQWhCO0FBQ0EsZ0JBQU1DLEtBQUssR0FBR0gsUUFBUSxDQUFDQyxPQUFPLENBQUNHLE1BQVIsQ0FBZSxFQUFmLEVBQW1CLENBQW5CLENBQUQsRUFBd0IsRUFBeEIsQ0FBdEI7QUFDQSxnQkFBSXVDLFNBQUo7O0FBQ0EsZ0JBQUl4QyxLQUFLLEtBQUssQ0FBZCxFQUFpQjtBQUNid0MsY0FBQUEsU0FBUyxHQUFHMUMsT0FBTyxDQUFDRyxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFaO0FBQ0gsYUFGRCxNQUVPLElBQUlELEtBQUssR0FBRyxFQUFaLEVBQWdCO0FBQ25Cd0MsY0FBQUEsU0FBUyxHQUFHMUMsT0FBTyxDQUFDRyxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFaO0FBQ0gsYUFGTSxNQUVBO0FBQ0h1QyxjQUFBQSxTQUFTLEdBQUcxQyxPQUFPLENBQUNHLE1BQVIsQ0FBZSxFQUFmLEVBQW1CLENBQW5CLENBQVo7QUFDSDs7QUFDRCxZQUFBLE1BQUksQ0FBQ3JFLGFBQUwsQ0FBbUJvQixJQUFuQixpQkFBaUN3RixTQUFqQztBQUNIO0FBQ0o7QUFDSixPQXRDRCxXQXVDTyxZQUFNO0FBQ1Q7QUFDQSxRQUFBLE1BQUksQ0FBQ1IsYUFBTDtBQUNILE9BMUNEO0FBMkNIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksd0JBQWU7QUFDWCxVQUFJLENBQUMsS0FBS2xILFVBQUwsQ0FBZ0IySCxNQUFyQixFQUE2QjtBQUN6QixhQUFLM0gsVUFBTCxDQUFnQjRILEtBQWhCO0FBQ0EsYUFBS2xILFFBQUwsQ0FBY2lELFdBQWQsQ0FBMEIsT0FBMUIsRUFBbUNOLFFBQW5DLENBQTRDLE1BQTVDO0FBQ0gsT0FKVSxDQU1YOzs7QUFDQSxXQUFLd0UsaUJBQUw7QUFDSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLDZCQUFvQjtBQUNoQixVQUFJLEtBQUtDLGVBQVQsRUFBMEI7QUFDdEIsWUFBSTtBQUNBO0FBQ0EsZUFBS0EsZUFBTCxDQUFxQkMsVUFBckI7QUFDQSxlQUFLRCxlQUFMLENBQXFCRSxjQUFyQixHQUFzQyxJQUF0QztBQUNBLGVBQUtGLGVBQUwsR0FBdUIsSUFBdkI7QUFDSCxTQUxELENBS0UsT0FBT3JHLENBQVAsRUFBVSxDQUNSO0FBQ0g7QUFDSjs7QUFFRCxVQUFJLEtBQUtsQixVQUFULEVBQXFCO0FBQ2pCLFlBQUk7QUFDQSxlQUFLQSxVQUFMLENBQWdCd0gsVUFBaEI7QUFDSCxTQUZELENBRUUsT0FBT3RHLENBQVAsRUFBVSxDQUNSO0FBQ0g7QUFDSjs7QUFFRCxVQUFJLEtBQUtqQixRQUFULEVBQW1CO0FBQ2YsWUFBSTtBQUNBLGVBQUtBLFFBQUwsQ0FBY3VILFVBQWQ7QUFDSCxTQUZELENBRUUsT0FBT3RHLENBQVAsRUFBVSxDQUNSO0FBQ0g7QUFDSjtBQUNKO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksZ0JBQU87QUFDSDtBQUNBLFVBQUksS0FBS3pCLFVBQUwsQ0FBZ0JpSSxHQUFoQixJQUF1QixLQUFLakksVUFBTCxDQUFnQmlJLEdBQWhCLENBQW9CM0IsVUFBcEIsQ0FBK0IsT0FBL0IsQ0FBM0IsRUFBb0U7QUFDaEU7QUFDQSxZQUFJLEtBQUt0RyxVQUFMLENBQWdCMkgsTUFBcEIsRUFBNEI7QUFDeEI7QUFDQTdILFVBQUFBLFNBQVMsQ0FBQ29JLFVBQVYsQ0FBcUIsSUFBckI7QUFDQSxlQUFLbEksVUFBTCxDQUFnQjJCLElBQWhCO0FBQ0EsZUFBS2pCLFFBQUwsQ0FBY2lELFdBQWQsQ0FBMEIsTUFBMUIsRUFBa0NOLFFBQWxDLENBQTJDLE9BQTNDO0FBQ0gsU0FMRCxNQUtPO0FBQ0g7QUFDQSxlQUFLckQsVUFBTCxDQUFnQjRILEtBQWhCO0FBQ0EsZUFBS2xILFFBQUwsQ0FBY2lELFdBQWQsQ0FBMEIsT0FBMUIsRUFBbUNOLFFBQW5DLENBQTRDLE1BQTVDOztBQUNBLGNBQUl2RCxTQUFTLENBQUM4QyxnQkFBVixLQUErQixJQUFuQyxFQUF5QztBQUNyQzlDLFlBQUFBLFNBQVMsQ0FBQzhDLGdCQUFWLEdBQTZCLElBQTdCO0FBQ0gsV0FORSxDQU9IOzs7QUFDQSxlQUFLaUYsaUJBQUw7QUFDSDs7QUFDRDtBQUNILE9BcEJFLENBc0JIOzs7QUFDQSxVQUFJekIsU0FBUyxHQUFHLEtBQUtwRyxVQUFMLENBQWdCb0IsWUFBaEIsQ0FBNkIsVUFBN0IsS0FBNEMsRUFBNUQsQ0F2QkcsQ0F5Qkg7QUFDQTs7QUFDQSxVQUFJZ0YsU0FBUyxJQUFJQSxTQUFTLENBQUMvRSxRQUFWLENBQW1CLGVBQW5CLENBQWpCLEVBQXNEO0FBQ2xEO0FBQ0F2QixRQUFBQSxTQUFTLENBQUNvSSxVQUFWLENBQXFCLElBQXJCO0FBQ0EsYUFBS0MsdUJBQUwsQ0FBNkIvQixTQUE3QjtBQUNBO0FBQ0gsT0FoQ0UsQ0FrQ0g7OztBQUNBLFVBQUksS0FBS3BHLFVBQUwsQ0FBZ0IySCxNQUFoQixJQUEwQixLQUFLM0gsVUFBTCxDQUFnQnFFLFFBQTlDLEVBQXdEO0FBQ3BEdkUsUUFBQUEsU0FBUyxDQUFDb0ksVUFBVixDQUFxQixJQUFyQjtBQUNBLGFBQUtsSSxVQUFMLENBQWdCMkIsSUFBaEI7QUFDQSxhQUFLakIsUUFBTCxDQUFjaUQsV0FBZCxDQUEwQixNQUExQixFQUFrQ04sUUFBbEMsQ0FBMkMsT0FBM0M7QUFDSCxPQUpELE1BSU8sSUFBSSxDQUFDLEtBQUtyRCxVQUFMLENBQWdCMkgsTUFBckIsRUFBNkI7QUFDaEMsYUFBSzNILFVBQUwsQ0FBZ0I0SCxLQUFoQjtBQUNBLGFBQUtsSCxRQUFMLENBQWNpRCxXQUFkLENBQTBCLE9BQTFCLEVBQW1DTixRQUFuQyxDQUE0QyxNQUE1Qzs7QUFDQSxZQUFJdkQsU0FBUyxDQUFDOEMsZ0JBQVYsS0FBK0IsSUFBbkMsRUFBeUM7QUFDckM5QyxVQUFBQSxTQUFTLENBQUM4QyxnQkFBVixHQUE2QixJQUE3QjtBQUNIO0FBQ0o7QUFDSjtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSwwQkFBaUI7QUFDYixVQUFJO0FBQ0E7QUFDQSxZQUFJLENBQUMsS0FBS3RDLFlBQVYsRUFBd0I7QUFDcEIsY0FBTThILFlBQVksR0FBRzdCLE1BQU0sQ0FBQzZCLFlBQVAsSUFBdUI3QixNQUFNLENBQUM4QixrQkFBbkQ7QUFDQSxlQUFLL0gsWUFBTCxHQUFvQixJQUFJOEgsWUFBSixFQUFwQjtBQUNILFNBTEQsQ0FPQTs7O0FBQ0EsWUFBSSxDQUFDLEtBQUs3SCxVQUFWLEVBQXNCO0FBQ2xCLGVBQUtBLFVBQUwsR0FBa0IsS0FBS0QsWUFBTCxDQUFrQmdJLHdCQUFsQixDQUEyQyxLQUFLdEksVUFBaEQsQ0FBbEI7QUFDSCxTQVZELENBWUE7OztBQUNBLFlBQUksS0FBS1EsUUFBVCxFQUFtQjtBQUNmLGNBQUk7QUFDQSxpQkFBS0QsVUFBTCxDQUFnQndILFVBQWhCO0FBQ0EsaUJBQUt2SCxRQUFMLENBQWN1SCxVQUFkO0FBQ0gsV0FIRCxDQUdFLE9BQU90RyxDQUFQLEVBQVUsQ0FDUjtBQUNIO0FBQ0osU0FwQkQsQ0FzQkE7QUFDQTs7O0FBQ0EsWUFBTThHLFVBQVUsR0FBRyxJQUFuQjtBQUNBLFlBQU1ULGVBQWUsR0FBRyxLQUFLeEgsWUFBTCxDQUFrQmtJLHFCQUFsQixDQUF3Q0QsVUFBeEMsRUFBb0QsQ0FBcEQsRUFBdUQsQ0FBdkQsQ0FBeEIsQ0F6QkEsQ0EyQkE7O0FBQ0EsYUFBS1QsZUFBTCxHQUF1QkEsZUFBdkIsQ0E1QkEsQ0E4QkE7QUFDQTs7QUFDQUEsUUFBQUEsZUFBZSxDQUFDRSxjQUFoQixHQUFpQyxVQUFDUyxvQkFBRCxFQUEwQjtBQUN2RCxjQUFNQyxXQUFXLEdBQUdELG9CQUFvQixDQUFDQyxXQUF6QztBQUNBLGNBQU1DLFlBQVksR0FBR0Ysb0JBQW9CLENBQUNFLFlBQTFDLENBRnVELENBSXZEOztBQUNBLGNBQU1DLGlCQUFpQixHQUFHRixXQUFXLENBQUNHLGdCQUF0QztBQUNBLGNBQU1DLGtCQUFrQixHQUFHSCxZQUFZLENBQUNFLGdCQUF4QyxDQU51RCxDQVF2RDs7QUFDQSxjQUFJRCxpQkFBaUIsS0FBSyxDQUExQixFQUE2QjtBQUN6QjtBQUNBLGdCQUFNRyxTQUFTLEdBQUdMLFdBQVcsQ0FBQ00sY0FBWixDQUEyQixDQUEzQixDQUFsQjtBQUNBLGdCQUFNQyxPQUFPLEdBQUdOLFlBQVksQ0FBQ0ssY0FBYixDQUE0QixDQUE1QixDQUFoQjtBQUNBLGdCQUFNRSxPQUFPLEdBQUdKLGtCQUFrQixHQUFHLENBQXJCLEdBQXlCSCxZQUFZLENBQUNLLGNBQWIsQ0FBNEIsQ0FBNUIsQ0FBekIsR0FBMEQsSUFBMUU7O0FBRUEsaUJBQUssSUFBSUcsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBR0osU0FBUyxDQUFDbEgsTUFBOUIsRUFBc0NzSCxDQUFDLEVBQXZDLEVBQTJDO0FBQ3ZDRixjQUFBQSxPQUFPLENBQUNFLENBQUQsQ0FBUCxHQUFhSixTQUFTLENBQUNJLENBQUQsQ0FBdEI7O0FBQ0Esa0JBQUlELE9BQUosRUFBYTtBQUNUQSxnQkFBQUEsT0FBTyxDQUFDQyxDQUFELENBQVAsR0FBYUosU0FBUyxDQUFDSSxDQUFELENBQXRCO0FBQ0g7QUFDSjtBQUNKLFdBWkQsTUFZTyxJQUFJUCxpQkFBaUIsSUFBSSxDQUF6QixFQUE0QjtBQUMvQjtBQUNBLGdCQUFNUSxNQUFNLEdBQUdWLFdBQVcsQ0FBQ00sY0FBWixDQUEyQixDQUEzQixDQUFmO0FBQ0EsZ0JBQU1LLE1BQU0sR0FBR1gsV0FBVyxDQUFDTSxjQUFaLENBQTJCLENBQTNCLENBQWY7O0FBQ0EsZ0JBQU1DLFFBQU8sR0FBR04sWUFBWSxDQUFDSyxjQUFiLENBQTRCLENBQTVCLENBQWhCOztBQUNBLGdCQUFNRSxRQUFPLEdBQUdKLGtCQUFrQixHQUFHLENBQXJCLEdBQXlCSCxZQUFZLENBQUNLLGNBQWIsQ0FBNEIsQ0FBNUIsQ0FBekIsR0FBMEQsSUFBMUUsQ0FMK0IsQ0FPL0I7OztBQUNBLGlCQUFLLElBQUlHLEVBQUMsR0FBRyxDQUFiLEVBQWdCQSxFQUFDLEdBQUdDLE1BQU0sQ0FBQ3ZILE1BQTNCLEVBQW1Dc0gsRUFBQyxFQUFwQyxFQUF3QztBQUNwQztBQUNBRixjQUFBQSxRQUFPLENBQUNFLEVBQUQsQ0FBUCxHQUFjQyxNQUFNLENBQUNELEVBQUQsQ0FBTixHQUFZLElBQWIsR0FBc0JFLE1BQU0sQ0FBQ0YsRUFBRCxDQUFOLEdBQVksSUFBL0MsQ0FGb0MsQ0FJcEM7O0FBQ0Esa0JBQUlELFFBQUosRUFBYTtBQUNUQSxnQkFBQUEsUUFBTyxDQUFDQyxFQUFELENBQVAsR0FBY0MsTUFBTSxDQUFDRCxFQUFELENBQU4sR0FBWSxJQUFiLEdBQXNCRSxNQUFNLENBQUNGLEVBQUQsQ0FBTixHQUFZLElBQS9DO0FBQ0g7QUFDSjtBQUNKO0FBQ0osU0F2Q0QsQ0FoQ0EsQ0F5RUE7OztBQUNBLGFBQUszSSxRQUFMLEdBQWdCLEtBQUtGLFlBQUwsQ0FBa0JnSixVQUFsQixFQUFoQixDQTFFQSxDQTRFQTtBQUNBOztBQUNBLGFBQUsvSSxVQUFMLENBQWdCZ0osT0FBaEIsQ0FBd0J6QixlQUF4QjtBQUNBQSxRQUFBQSxlQUFlLENBQUN5QixPQUFoQixDQUF3QixLQUFLL0ksUUFBN0I7QUFDQSxhQUFLQSxRQUFMLENBQWMrSSxPQUFkLENBQXNCLEtBQUtqSixZQUFMLENBQWtCa0osV0FBeEM7QUFFSCxPQWxGRCxDQWtGRSxPQUFPQyxLQUFQLEVBQWMsQ0FDWjtBQUNIO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7OztXQUNJLGlDQUF3QkMsTUFBeEIsRUFBZ0M7QUFBQTs7QUFDNUI7QUFDQSxVQUFNckQsT0FBTyxHQUFHcUQsTUFBTSxDQUFDcEQsVUFBUCxDQUFrQixNQUFsQixJQUNWb0QsTUFEVSxhQUVQbkQsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxNQUZULFNBRWtCaUQsTUFGbEIsQ0FBaEIsQ0FGNEIsQ0FNNUI7O0FBQ0EsVUFBTWhELE9BQU8sR0FBRztBQUNaLDRCQUFvQjtBQURSLE9BQWhCOztBQUlBLFVBQUksT0FBT0MsWUFBUCxLQUF3QixXQUF4QixJQUF1Q0EsWUFBWSxDQUFDQyxXQUF4RCxFQUFxRTtBQUNqRUYsUUFBQUEsT0FBTyxDQUFDLGVBQUQsQ0FBUCxvQkFBcUNDLFlBQVksQ0FBQ0MsV0FBbEQ7QUFDSCxPQWIyQixDQWU1Qjs7O0FBQ0FDLE1BQUFBLEtBQUssQ0FBQ1IsT0FBRCxFQUFVO0FBQUVLLFFBQUFBLE9BQU8sRUFBUEE7QUFBRixPQUFWLENBQUwsQ0FDS0ssSUFETCxDQUNVLFVBQUFDLFFBQVEsRUFBSTtBQUNkLFlBQUksQ0FBQ0EsUUFBUSxDQUFDQyxFQUFkLEVBQWtCO0FBQ2QsZ0JBQU0sSUFBSTBDLEtBQUosZ0JBQWtCM0MsUUFBUSxDQUFDNEMsTUFBM0IsZUFBc0M1QyxRQUFRLENBQUM2QyxVQUEvQyxFQUFOO0FBQ0gsU0FIYSxDQUtkOzs7QUFDQSxZQUFNekUsV0FBVyxHQUFHNEIsUUFBUSxDQUFDTixPQUFULENBQWlCVSxHQUFqQixDQUFxQixjQUFyQixDQUFwQjtBQUNBLFFBQUEsTUFBSSxDQUFDL0csYUFBTCxHQUFxQixNQUFJLENBQUN5SixpQkFBTCxDQUF1QjFFLFdBQXZCLENBQXJCLENBUGMsQ0FTZDs7QUFDQSxZQUFJLE1BQUksQ0FBQy9FLGFBQUwsSUFBc0IsTUFBSSxDQUFDQSxhQUFMLEtBQXVCLFNBQWpELEVBQTREO0FBQ3hELFVBQUEsTUFBSSxDQUFDMEosaUJBQUwsQ0FBdUIsTUFBSSxDQUFDMUosYUFBNUI7QUFDSCxTQVphLENBY2Q7OztBQUNBLFlBQU04RyxlQUFlLEdBQUdILFFBQVEsQ0FBQ04sT0FBVCxDQUFpQlUsR0FBakIsQ0FBcUIsa0JBQXJCLENBQXhCOztBQUNBLFlBQUlELGVBQUosRUFBcUI7QUFDakIsY0FBTTlDLFFBQVEsR0FBR2dELFVBQVUsQ0FBQ0YsZUFBRCxDQUEzQjs7QUFDQSxjQUFJOUMsUUFBUSxHQUFHLENBQWYsRUFBa0I7QUFDZCxnQkFBTU8sSUFBSSxHQUFHLElBQUlDLElBQUosQ0FBUyxJQUFULENBQWI7QUFDQUQsWUFBQUEsSUFBSSxDQUFDRSxVQUFMLENBQWdCQyxRQUFRLENBQUNWLFFBQUQsRUFBVyxFQUFYLENBQXhCO0FBQ0EsZ0JBQU1XLE9BQU8sR0FBR0osSUFBSSxDQUFDSyxXQUFMLEVBQWhCO0FBQ0EsZ0JBQU1DLEtBQUssR0FBR0gsUUFBUSxDQUFDQyxPQUFPLENBQUNHLE1BQVIsQ0FBZSxFQUFmLEVBQW1CLENBQW5CLENBQUQsRUFBd0IsRUFBeEIsQ0FBdEI7QUFDQSxnQkFBSXVDLFNBQUo7O0FBQ0EsZ0JBQUl4QyxLQUFLLEtBQUssQ0FBZCxFQUFpQjtBQUNid0MsY0FBQUEsU0FBUyxHQUFHMUMsT0FBTyxDQUFDRyxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFaO0FBQ0gsYUFGRCxNQUVPLElBQUlELEtBQUssR0FBRyxFQUFaLEVBQWdCO0FBQ25Cd0MsY0FBQUEsU0FBUyxHQUFHMUMsT0FBTyxDQUFDRyxNQUFSLENBQWUsRUFBZixFQUFtQixDQUFuQixDQUFaO0FBQ0gsYUFGTSxNQUVBO0FBQ0h1QyxjQUFBQSxTQUFTLEdBQUcxQyxPQUFPLENBQUNHLE1BQVIsQ0FBZSxFQUFmLEVBQW1CLENBQW5CLENBQVo7QUFDSDs7QUFDRCxZQUFBLE1BQUksQ0FBQ3JFLGFBQUwsQ0FBbUJvQixJQUFuQixpQkFBaUN3RixTQUFqQztBQUNIO0FBQ0o7O0FBRUQsZUFBT1YsUUFBUSxDQUFDZ0QsSUFBVCxFQUFQO0FBQ0gsT0FyQ0wsRUFzQ0tqRCxJQXRDTCxDQXNDVSxVQUFBaUQsSUFBSSxFQUFJO0FBQ1Y7QUFDQSxZQUFNQyxPQUFPLEdBQUdDLEdBQUcsQ0FBQ0MsZUFBSixDQUFvQkgsSUFBcEIsQ0FBaEIsQ0FGVSxDQUlWOztBQUNBLFlBQUksTUFBSSxDQUFDaEssVUFBTCxDQUFnQmlJLEdBQWhCLElBQXVCLE1BQUksQ0FBQ2pJLFVBQUwsQ0FBZ0JpSSxHQUFoQixDQUFvQjNCLFVBQXBCLENBQStCLE9BQS9CLENBQTNCLEVBQW9FO0FBQ2hFNEQsVUFBQUEsR0FBRyxDQUFDRSxlQUFKLENBQW9CLE1BQUksQ0FBQ3BLLFVBQUwsQ0FBZ0JpSSxHQUFwQztBQUNILFNBUFMsQ0FTVjs7O0FBQ0EsUUFBQSxNQUFJLENBQUNqSSxVQUFMLENBQWdCaUksR0FBaEIsR0FBc0JnQyxPQUF0Qjs7QUFDQSxRQUFBLE1BQUksQ0FBQ2pLLFVBQUwsQ0FBZ0JxSyxJQUFoQixHQVhVLENBYVY7QUFDQTtBQUNBO0FBQ0E7OztBQUNBLFlBQUksQ0FBQyxNQUFJLENBQUM5SixVQUFWLEVBQXNCO0FBQ2xCLFVBQUEsTUFBSSxDQUFDK0osY0FBTDtBQUNILFNBbkJTLENBcUJWOzs7QUFDQSxRQUFBLE1BQUksQ0FBQ3RLLFVBQUwsQ0FBZ0J1SyxnQkFBaEIsR0FBbUMsWUFBTTtBQUNyQyxVQUFBLE1BQUksQ0FBQ3ZLLFVBQUwsQ0FBZ0IyQixJQUFoQjs7QUFDQSxVQUFBLE1BQUksQ0FBQ2pCLFFBQUwsQ0FBY2lELFdBQWQsQ0FBMEIsTUFBMUIsRUFBa0NOLFFBQWxDLENBQTJDLE9BQTNDOztBQUNBLFVBQUEsTUFBSSxDQUFDckQsVUFBTCxDQUFnQnVLLGdCQUFoQixHQUFtQyxJQUFuQztBQUVILFNBTEQ7QUFNSCxPQWxFTCxXQW1FVyxVQUFBZCxLQUFLLEVBQUk7QUFDWmUsUUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCaEIsS0FBSyxDQUFDaUIsT0FBbEMsRUFBMkNDLGVBQWUsQ0FBQ0Msc0JBQTNEO0FBQ0gsT0FyRUw7QUFzRUg7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksc0JBQWF0SSxXQUFiLEVBQTJDO0FBQUEsVUFBakJGLE1BQWlCLHVFQUFSLE1BQVE7O0FBQ3ZDO0FBQ0EsVUFBSUUsV0FBVyxDQUFDakIsUUFBWixDQUFxQixlQUFyQixDQUFKLEVBQTJDO0FBQ3ZDO0FBQ0EsWUFBSXdKLGFBQWEsR0FBR3ZJLFdBQXBCOztBQUNBLFlBQUlGLE1BQU0sS0FBSyxVQUFmLEVBQTJCO0FBQ3ZCLGNBQU0wSSxTQUFTLEdBQUd4SSxXQUFXLENBQUNqQixRQUFaLENBQXFCLEdBQXJCLElBQTRCLEdBQTVCLEdBQWtDLEdBQXBEO0FBQ0F3SixVQUFBQSxhQUFhLGFBQU12SSxXQUFOLFNBQW9Cd0ksU0FBcEIsb0JBQXVDQyxrQkFBa0IsQ0FBQzNJLE1BQUQsQ0FBekQsQ0FBYjtBQUNILFNBTnNDLENBUXZDOzs7QUFDQSxZQUFNaUUsT0FBTyxHQUFHd0UsYUFBYSxDQUFDdkUsVUFBZCxDQUF5QixNQUF6QixJQUNWdUUsYUFEVSxhQUVQdEUsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxNQUZULFNBRWtCb0UsYUFGbEIsQ0FBaEIsQ0FUdUMsQ0FhdkM7O0FBQ0EsWUFBTW5FLE9BQU8sR0FBRztBQUNaLDhCQUFvQjtBQURSLFNBQWhCOztBQUlBLFlBQUksT0FBT0MsWUFBUCxLQUF3QixXQUF4QixJQUF1Q0EsWUFBWSxDQUFDQyxXQUF4RCxFQUFxRTtBQUNqRUYsVUFBQUEsT0FBTyxDQUFDLGVBQUQsQ0FBUCxvQkFBcUNDLFlBQVksQ0FBQ0MsV0FBbEQ7QUFDSCxTQXBCc0MsQ0FzQnZDOzs7QUFDQUMsUUFBQUEsS0FBSyxDQUFDUixPQUFELEVBQVU7QUFBRUssVUFBQUEsT0FBTyxFQUFQQTtBQUFGLFNBQVYsQ0FBTCxDQUNLSyxJQURMLENBQ1UsVUFBQUMsUUFBUSxFQUFJO0FBQ2QsY0FBSSxDQUFDQSxRQUFRLENBQUNDLEVBQWQsRUFBa0I7QUFDZCxrQkFBTSxJQUFJMEMsS0FBSixnQkFBa0IzQyxRQUFRLENBQUM0QyxNQUEzQixlQUFzQzVDLFFBQVEsQ0FBQzZDLFVBQS9DLEVBQU47QUFDSCxXQUhhLENBS2Q7OztBQUNBLGNBQU1tQixXQUFXLEdBQUdoRSxRQUFRLENBQUNOLE9BQVQsQ0FBaUJVLEdBQWpCLENBQXFCLHFCQUFyQixDQUFwQjtBQUNBLGNBQUk2RCxRQUFRLHlCQUFrQjdJLE1BQU0sSUFBSSxLQUE1QixDQUFaOztBQUNBLGNBQUk0SSxXQUFXLElBQUlBLFdBQVcsQ0FBQzNKLFFBQVosQ0FBcUIsV0FBckIsQ0FBbkIsRUFBc0Q7QUFDbEQsZ0JBQU02SixPQUFPLEdBQUcseUNBQXlDQyxJQUF6QyxDQUE4Q0gsV0FBOUMsQ0FBaEI7O0FBQ0EsZ0JBQUlFLE9BQU8sSUFBSSxJQUFYLElBQW1CQSxPQUFPLENBQUMsQ0FBRCxDQUE5QixFQUFtQztBQUMvQkQsY0FBQUEsUUFBUSxHQUFHQyxPQUFPLENBQUMsQ0FBRCxDQUFQLENBQVdFLE9BQVgsQ0FBbUIsT0FBbkIsRUFBNEIsRUFBNUIsQ0FBWDtBQUNIO0FBQ0osV0FMRCxNQUtPO0FBQ0g7QUFDQSxnQkFBTUMsU0FBUyxHQUFHLElBQUlDLGVBQUosQ0FBb0JoSixXQUFXLENBQUNpSixLQUFaLENBQWtCLEdBQWxCLEVBQXVCLENBQXZCLENBQXBCLENBQWxCO0FBQ0EsZ0JBQU1DLGFBQWEsR0FBR0gsU0FBUyxDQUFDakUsR0FBVixDQUFjLFVBQWQsQ0FBdEI7O0FBQ0EsZ0JBQUlvRSxhQUFKLEVBQW1CO0FBQ2ZQLGNBQUFBLFFBQVEsR0FBR08sYUFBWDtBQUNIO0FBQ0o7O0FBRUQsaUJBQU94RSxRQUFRLENBQUNnRCxJQUFULEdBQWdCakQsSUFBaEIsQ0FBcUIsVUFBQWlELElBQUk7QUFBQSxtQkFBSztBQUFFQSxjQUFBQSxJQUFJLEVBQUpBLElBQUY7QUFBUWlCLGNBQUFBLFFBQVEsRUFBUkE7QUFBUixhQUFMO0FBQUEsV0FBekIsQ0FBUDtBQUNILFNBeEJMLEVBeUJLbEUsSUF6QkwsQ0F5QlUsZ0JBQXdCO0FBQUEsY0FBckJpRCxJQUFxQixRQUFyQkEsSUFBcUI7QUFBQSxjQUFmaUIsUUFBZSxRQUFmQSxRQUFlO0FBQzFCO0FBQ0EsY0FBTVEsR0FBRyxHQUFHbEYsTUFBTSxDQUFDMkQsR0FBUCxDQUFXQyxlQUFYLENBQTJCSCxJQUEzQixDQUFaO0FBQ0EsY0FBTTBCLENBQUMsR0FBR3pMLFFBQVEsQ0FBQzBMLGFBQVQsQ0FBdUIsR0FBdkIsQ0FBVjtBQUNBRCxVQUFBQSxDQUFDLENBQUNFLEtBQUYsQ0FBUUMsT0FBUixHQUFrQixNQUFsQjtBQUNBSCxVQUFBQSxDQUFDLENBQUNJLElBQUYsR0FBU0wsR0FBVDtBQUNBQyxVQUFBQSxDQUFDLENBQUNLLFFBQUYsR0FBYWQsUUFBYjtBQUNBaEwsVUFBQUEsUUFBUSxDQUFDK0wsSUFBVCxDQUFjQyxXQUFkLENBQTBCUCxDQUExQjtBQUNBQSxVQUFBQSxDQUFDLENBQUNRLEtBQUY7QUFDQTNGLFVBQUFBLE1BQU0sQ0FBQzJELEdBQVAsQ0FBV0UsZUFBWCxDQUEyQnFCLEdBQTNCO0FBQ0F4TCxVQUFBQSxRQUFRLENBQUMrTCxJQUFULENBQWNHLFdBQWQsQ0FBMEJULENBQTFCO0FBQ0gsU0FwQ0wsV0FxQ1csVUFBQWpDLEtBQUssRUFBSTtBQUNaZSxVQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJoQixLQUFLLENBQUNpQixPQUFsQyxFQUEyQ0MsZUFBZSxDQUFDeUIsMEJBQTNEO0FBQ0gsU0F2Q0w7QUF3Q0gsT0EvREQsTUErRE87QUFDSDtBQUNBN0YsUUFBQUEsTUFBTSxDQUFDQyxRQUFQLEdBQWtCbEUsV0FBbEI7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksNkJBQW9CO0FBQ2hCbEMsTUFBQUEsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRdUYsT0FBUixDQUFnQixJQUFoQixFQUFzQnRDLFFBQXRCLENBQStCLFVBQS9CO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7OztXQUNJLHlCQUFnQjtBQUNaO0FBQ0EsV0FBSzNDLFFBQUwsQ0FBYzJMLElBQWQsR0FGWSxDQUlaOztBQUNBLFdBQUt6TCxRQUFMLENBQWN5TCxJQUFkLEdBTFksQ0FPWjs7QUFDQSxXQUFLdkwsYUFBTCxDQUFtQm9CLElBQW5CLENBQXdCLGFBQXhCLEVBQXVDbUIsUUFBdkMsQ0FBZ0QsVUFBaEQsRUFSWSxDQVVaOztBQUNBLFdBQUt4QyxPQUFMLENBQWF3QyxRQUFiLENBQXNCLFVBQXRCO0FBQ0EsV0FBS3hDLE9BQUwsQ0FBYThFLE9BQWIsQ0FBcUIsSUFBckIsRUFBMkJ0QyxRQUEzQixDQUFvQyxVQUFwQyxFQVpZLENBY1o7O0FBQ0EsV0FBS3ZDLGFBQUwsQ0FBbUI2RSxPQUFuQixDQUEyQixJQUEzQixFQUFpQ3RDLFFBQWpDLENBQTBDLFVBQTFDO0FBQ0g7OztXQWp4QkQ7O0FBR0E7QUFDSjtBQUNBO0FBQ0E7QUFDSSx3QkFBa0JpSixZQUFsQixFQUFnQztBQUM1QixVQUFJeE0sU0FBUyxDQUFDOEMsZ0JBQVYsSUFBOEI5QyxTQUFTLENBQUM4QyxnQkFBVixLQUErQjBKLFlBQWpFLEVBQStFO0FBQzNFeE0sUUFBQUEsU0FBUyxDQUFDOEMsZ0JBQVYsQ0FBMkIySixZQUEzQjtBQUNIOztBQUNEek0sTUFBQUEsU0FBUyxDQUFDOEMsZ0JBQVYsR0FBNkIwSixZQUE3QjtBQUNIOzs7Ozs7Z0JBZEN4TSxTLHNCQUd3QixJIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBDRFJQbGF5ZXIgY2xhc3MuXG4gKi9cbmNsYXNzIENEUlBsYXllciB7XG5cbiAgICAvLyBTdGF0aWMgcHJvcGVydHkgdG8gdHJhY2sgY3VycmVudGx5IHBsYXlpbmcgaW5zdGFuY2VcbiAgICBzdGF0aWMgY3VycmVudGx5UGxheWluZyA9IG51bGw7XG5cbiAgICAvKipcbiAgICAgKiBTdG9wIGFsbCBvdGhlciBwbGF5ZXJzIGV4Y2VwdCB0aGUgZ2l2ZW4gb25lXG4gICAgICogQHBhcmFtIHtDRFJQbGF5ZXJ9IGV4Y2VwdFBsYXllciAtIFRoZSBwbGF5ZXIgdGhhdCBzaG91bGQgY29udGludWUgcGxheWluZ1xuICAgICAqL1xuICAgIHN0YXRpYyBzdG9wT3RoZXJzKGV4Y2VwdFBsYXllcikge1xuICAgICAgICBpZiAoQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcgJiYgQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcgIT09IGV4Y2VwdFBsYXllcikge1xuICAgICAgICAgICAgQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcuc3RvcFBsYXliYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcgPSBleGNlcHRQbGF5ZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBpbnN0YW5jZSBvZiBDRFJQbGF5ZXIuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIElEIG9mIHRoZSBwbGF5ZXIuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoaWQpIHtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgYXVkaW8tcGxheWVyLSR7aWR9YCk7XG4gICAgICAgIGNvbnN0ICRyb3cgPSAkKGAjJHtpZH1gKTtcblxuICAgICAgICAvLyBUcmFjayBjdXJyZW50IGF1ZGlvIGZvcm1hdCAod2VibSwgbXAzLCB3YXYpXG4gICAgICAgIHRoaXMuY3VycmVudEZvcm1hdCA9IG51bGw7XG5cbiAgICAgICAgLy8gV2ViIEF1ZGlvIEFQSSBmb3IgbW9ubyBtaXhpbmdcbiAgICAgICAgLy8gV0hZOiBBdXRvbWF0aWNhbGx5IG1peCBzdGVyZW8gcmVjb3JkaW5ncyAobGVmdD1leHRlcm5hbCwgcmlnaHQ9aW50ZXJuYWwpIHRvIG1vbm9cbiAgICAgICAgLy8gVGhpcyBtYWtlcyBib3RoIHNwZWFrZXJzIGF1ZGlibGUgaW4gc2luZ2xlIGNoYW5uZWwgZm9yIGVhc2llciBsaXN0ZW5pbmdcbiAgICAgICAgdGhpcy5hdWRpb0NvbnRleHQgPSBudWxsO1xuICAgICAgICB0aGlzLnNvdXJjZU5vZGUgPSBudWxsO1xuICAgICAgICB0aGlzLmdhaW5Ob2RlID0gbnVsbDtcblxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluaXRpYWxpemVkIHRvIHByZXZlbnQgZG91YmxlIHByb2Nlc3NpbmdcbiAgICAgICAgaWYgKCRyb3cuaGFzQ2xhc3MoJ2luaXRpYWxpemVkJykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuJHBCdXR0b24gPSAkcm93LmZpbmQoJ2kucGxheScpOyAvLyBQbGF5IGJ1dHRvblxuICAgICAgICB0aGlzLiRkQnV0dG9uID0gJHJvdy5maW5kKCdpLmRvd25sb2FkJyk7IC8vIERvd25sb2FkIGJ1dHRvblxuICAgICAgICB0aGlzLiRzbGlkZXIgPSAkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJyk7IC8vIFNsaWRlciBlbGVtZW50XG4gICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbiA9ICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKTsgLy8gRHVyYXRpb24gc3BhbiBlbGVtZW50XG5cbiAgICAgICAgLy8gQ2xlYW4gdXAgcHJldmlvdXMgZXZlbnQgbGlzdGVuZXJzXG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYk9uTWV0YWRhdGFMb2FkZWQsIGZhbHNlKTtcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICAgICAgdGhpcy4kcEJ1dHRvbi51bmJpbmQoKTtcbiAgICAgICAgdGhpcy4kZEJ1dHRvbi51bmJpbmQoKTtcblxuICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBzcmMgaW4gZGF0YS1zcmMgYXR0cmlidXRlIGZvciBhdXRoZW50aWNhdGVkIGxvYWRpbmdcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxTcmMgPSB0aGlzLmh0bWw1QXVkaW8uZ2V0QXR0cmlidXRlKCdzcmMnKTtcbiAgICAgICAgaWYgKG9yaWdpbmFsU3JjICYmIG9yaWdpbmFsU3JjLmluY2x1ZGVzKCcvcGJ4Y29yZS9hcGkvJykpIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5zZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJywgb3JpZ2luYWxTcmMpO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnJlbW92ZUF0dHJpYnV0ZSgnc3JjJyk7IC8vIFJlbW92ZSBkaXJlY3Qgc3JjXG4gICAgICAgIH1cblxuICAgICAgICAvLyBQbGF5IGJ1dHRvbiBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLiRwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLnBsYXkoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkb3dubG9hZCBmb3JtYXQgZHJvcGRvd25cbiAgICAgICAgY29uc3QgJGRvd25sb2FkRHJvcGRvd24gPSAkcm93LmZpbmQoJy5kb3dubG9hZC1mb3JtYXQtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkb3dubG9hZERyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRkb3dubG9hZERyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdoaWRlJyxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdCA9ICRjaG9pY2UuZGF0YSgnZm9ybWF0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRvd25sb2FkVXJsID0gJGRvd25sb2FkRHJvcGRvd24uZGF0YSgnZG93bmxvYWQtdXJsJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkb3dubG9hZFVybCAmJiBmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZG93bmxvYWRGaWxlKGRvd25sb2FkVXJsLCBmb3JtYXQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMZWdhY3k6IERvd25sb2FkIGJ1dHRvbiBldmVudCBsaXN0ZW5lciAoZm9yIG9sZCBVSSB3aXRob3V0IGRyb3Bkb3duKVxuICAgICAgICB0aGlzLiRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCBkb3dubG9hZFVybCA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIGlmIChkb3dubG9hZFVybCkge1xuICAgICAgICAgICAgICAgIC8vIERvd25sb2FkIGluIFdlYk0gZm9ybWF0IGJ5IGRlZmF1bHRcbiAgICAgICAgICAgICAgICB0aGlzLmRvd25sb2FkRmlsZShkb3dubG9hZFVybCwgJ3dlYm0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTG9hZGVkIG1ldGFkYXRhIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLmJpbmQodGhpcyksIGZhbHNlKTtcblxuICAgICAgICAvLyB0aW1ldXBkYXRlIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblxuICAgICAgICAvLyBlbmRlZCBldmVudCBsaXN0ZW5lciAtIGNsZWFyIGN1cnJlbnRseSBwbGF5aW5nIHJlZmVyZW5jZVxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcgPT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICBDRFJQbGF5ZXIuY3VycmVudGx5UGxheWluZyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICAvLyBubyBzcmMgaGFuZGxlclxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzLmNiT25TcmNNZWRpYUVycm9yLCBmYWxzZSk7XG5cbiAgICAgICAgdGhpcy4kc2xpZGVyLnJhbmdlKHtcbiAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgIG1heDogMTAwLFxuICAgICAgICAgICAgc3RhcnQ6IDAsXG4gICAgICAgICAgICBvbkNoYW5nZTogdGhpcy5jYk9uU2xpZGVyQ2hhbmdlLFxuICAgICAgICAgICAgaHRtbDVBdWRpbzogdGhpcy5odG1sNUF1ZGlvLFxuICAgICAgICAgICAgY2JUaW1lVXBkYXRlOiB0aGlzLmNiVGltZVVwZGF0ZSxcbiAgICAgICAgICAgIHNwYW5EdXJhdGlvbjogdGhpcy4kc3BhbkR1cmF0aW9uLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgdG9vbHRpcCB0byBzbGlkZXJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVG9vbHRpcCgpO1xuXG4gICAgICAgIC8vIE1hcmsgYXMgaW5pdGlhbGl6ZWRcbiAgICAgICAgJHJvdy5hZGRDbGFzcygnaW5pdGlhbGl6ZWQnKTtcblxuICAgICAgICAvLyBMb2FkIG1ldGFkYXRhIG9uIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHRoaXMubG9hZE1ldGFkYXRhKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwIGZvciBzbGlkZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcCgpIHtcbiAgICAgICAgLy8gQWRkIHRvb2x0aXAgZWxlbWVudCB0byBzbGlkZXJcbiAgICAgICAgY29uc3QgJHRvb2x0aXAgPSAkKCc8ZGl2IGNsYXNzPVwiY2RyLXNsaWRlci10b29sdGlwXCI+MDA6MDA8L2Rpdj4nKTtcbiAgICAgICAgdGhpcy4kc2xpZGVyLmFwcGVuZCgkdG9vbHRpcCk7XG4gICAgICAgIHRoaXMuJHRvb2x0aXAgPSAkdG9vbHRpcDtcblxuICAgICAgICAvLyBVcGRhdGUgdG9vbHRpcCBvbiBtb3VzZSBtb3ZlIG92ZXIgc2xpZGVyXG4gICAgICAgIHRoaXMuJHNsaWRlci5vbignbW91c2Vtb3ZlJywgKGUpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVG9vbHRpcFBvc2l0aW9uKGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTaG93IHRvb2x0aXAgb24gbW91c2UgZW50ZXJcbiAgICAgICAgdGhpcy4kc2xpZGVyLm9uKCdtb3VzZWVudGVyJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kdG9vbHRpcC5jc3MoJ29wYWNpdHknLCAnMScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIaWRlIHRvb2x0aXAgb24gbW91c2UgbGVhdmUgKHVubGVzcyBkcmFnZ2luZylcbiAgICAgICAgdGhpcy4kc2xpZGVyLm9uKCdtb3VzZWxlYXZlJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLiRzbGlkZXIuaGFzQ2xhc3MoJ2RyYWdnaW5nJykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiR0b29sdGlwLmNzcygnb3BhY2l0eScsICcwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyYWNrIGRyYWdnaW5nIHN0YXRlXG4gICAgICAgIHRoaXMuJHNsaWRlci5vbignbW91c2Vkb3duJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kc2xpZGVyLmFkZENsYXNzKCdkcmFnZ2luZycpO1xuICAgICAgICAgICAgdGhpcy4kdG9vbHRpcC5jc3MoJ29wYWNpdHknLCAnMScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkKGRvY3VtZW50KS5vbignbW91c2V1cCcsICgpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLiRzbGlkZXIuaGFzQ2xhc3MoJ2RyYWdnaW5nJykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRzbGlkZXIucmVtb3ZlQ2xhc3MoJ2RyYWdnaW5nJyk7XG4gICAgICAgICAgICAgICAgdGhpcy4kdG9vbHRpcC5jc3MoJ29wYWNpdHknLCAnMCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdG9vbHRpcCBwb3NpdGlvbiBhbmQgY29udGVudFxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgLSBNb3VzZSBldmVudFxuICAgICAqL1xuICAgIHVwZGF0ZVRvb2x0aXBQb3NpdGlvbihlKSB7XG4gICAgICAgIGNvbnN0IHNsaWRlck9mZnNldCA9IHRoaXMuJHNsaWRlci5vZmZzZXQoKTtcbiAgICAgICAgY29uc3Qgc2xpZGVyV2lkdGggPSB0aGlzLiRzbGlkZXIud2lkdGgoKTtcbiAgICAgICAgY29uc3QgbW91c2VYID0gZS5wYWdlWCAtIHNsaWRlck9mZnNldC5sZWZ0O1xuICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMTAwLCAobW91c2VYIC8gc2xpZGVyV2lkdGgpICogMTAwKSk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRpbWUgYXQgdGhpcyBwb3NpdGlvblxuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbjtcbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZShkdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVTZWNvbmRzID0gKGR1cmF0aW9uICogcGVyY2VudCkgLyAxMDA7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWRUaW1lID0gdGhpcy5mb3JtYXRUaW1lKHRpbWVTZWNvbmRzKTtcbiAgICAgICAgICAgIHRoaXMuJHRvb2x0aXAudGV4dChmb3JtYXR0ZWRUaW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFBvc2l0aW9uIHRvb2x0aXAgYXQgbW91c2UgcG9zaXRpb25cbiAgICAgICAgdGhpcy4kdG9vbHRpcC5jc3MoJ2xlZnQnLCBgJHtwZXJjZW50fSVgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgdGltZSBpbiBzZWNvbmRzIHRvIE1NOlNTIG9yIEhIOk1NOlNTXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNlY29uZHMgLSBUaW1lIGluIHNlY29uZHNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgdGltZSBzdHJpbmdcbiAgICAgKi9cbiAgICBmb3JtYXRUaW1lKHNlY29uZHMpIHtcbiAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKG51bGwpO1xuICAgICAgICBkYXRlLnNldFNlY29uZHMocGFyc2VJbnQoc2Vjb25kcywgMTApKTtcbiAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGRhdGUudG9JU09TdHJpbmcoKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcblxuICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGVTdHIuc3Vic3RyKDEyLCA3KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRlU3RyLnN1YnN0cigxMSwgOCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3QgYXVkaW8gZm9ybWF0IGZyb20gQ29udGVudC1UeXBlIGhlYWRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50VHlwZSAtIENvbnRlbnQtVHlwZSBoZWFkZXIgdmFsdWVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXQgaWRlbnRpZmllcjogJ3dlYm0nLCAnbXAzJywgJ3dhdicsIG9yICd1bmtub3duJ1xuICAgICAqL1xuICAgIGRldGVjdEF1ZGlvRm9ybWF0KGNvbnRlbnRUeXBlKSB7XG4gICAgICAgIGlmICghY29udGVudFR5cGUpIHJldHVybiAndW5rbm93bic7XG5cbiAgICAgICAgY29uc3QgbG93ZXJUeXBlID0gY29udGVudFR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgaWYgKGxvd2VyVHlwZS5pbmNsdWRlcygnYXVkaW8vd2VibScpKSByZXR1cm4gJ3dlYm0nO1xuICAgICAgICBpZiAobG93ZXJUeXBlLmluY2x1ZGVzKCdhdWRpby9tcGVnJykgfHwgbG93ZXJUeXBlLmluY2x1ZGVzKCdhdWRpby9tcDMnKSkgcmV0dXJuICdtcDMnO1xuICAgICAgICBpZiAobG93ZXJUeXBlLmluY2x1ZGVzKCdhdWRpby93YXYnKSB8fCBsb3dlclR5cGUuaW5jbHVkZXMoJ2F1ZGlvL3gtd2F2JykpIHJldHVybiAnd2F2JztcblxuICAgICAgICByZXR1cm4gJ3Vua25vd24nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBmb3JtYXQgYmFkZ2UgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmb3JtYXQgLSBBdWRpbyBmb3JtYXQgKHdlYm0sIG1wMywgd2F2KVxuICAgICAqL1xuICAgIHVwZGF0ZUZvcm1hdEJhZGdlKGZvcm1hdCkge1xuICAgICAgICBjb25zdCAkcm93ID0gJChgIyR7dGhpcy5pZH1gKTtcbiAgICAgICAgbGV0ICRiYWRnZSA9ICRyb3cuZmluZCgnLmF1ZGlvLWZvcm1hdC1iYWRnZScpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBiYWRnZSBpZiBkb2Vzbid0IGV4aXN0XG4gICAgICAgIGlmICgkYmFkZ2UubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkYmFkZ2UgPSAkKCc8c3BhbiBjbGFzcz1cInVpIG1pbmkgbGFiZWwgYXVkaW8tZm9ybWF0LWJhZGdlXCI+PC9zcGFuPicpO1xuICAgICAgICAgICAgdGhpcy4kc3BhbkR1cmF0aW9uLmJlZm9yZSgkYmFkZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGJhZGdlIGNvbnRlbnQgYW5kIHN0eWxlXG4gICAgICAgIGNvbnN0IGZvcm1hdFVwcGVyID0gZm9ybWF0LnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICRiYWRnZS50ZXh0KGZvcm1hdFVwcGVyKTtcblxuICAgICAgICAvLyBSZW1vdmUgcHJldmlvdXMgZm9ybWF0IGNsYXNzZXNcbiAgICAgICAgJGJhZGdlLnJlbW92ZUNsYXNzKCdncmVlbiBvcmFuZ2UgYmx1ZSBncmV5Jyk7XG5cbiAgICAgICAgLy8gQXBwbHkgY29sb3IgYmFzZWQgb24gZm9ybWF0XG4gICAgICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICAgICAgICBjYXNlICd3ZWJtJzpcbiAgICAgICAgICAgICAgICAkYmFkZ2UuYWRkQ2xhc3MoJ2dyZWVuJyk7IC8vIE1vZGVybiBmb3JtYXRcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ21wMyc6XG4gICAgICAgICAgICAgICAgJGJhZGdlLmFkZENsYXNzKCdvcmFuZ2UnKTsgLy8gTGVnYWN5IGNvbXByZXNzZWRcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3dhdic6XG4gICAgICAgICAgICAgICAgJGJhZGdlLmFkZENsYXNzKCdibHVlJyk7IC8vIFVuY29tcHJlc3NlZFxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAkYmFkZ2UuYWRkQ2xhc3MoJ2dyZXknKTsgLy8gVW5rbm93blxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIG1ldGFkYXRhIGxvYWRlZCBldmVudC5cbiAgICAgKi9cbiAgICBjYk9uTWV0YWRhdGFMb2FkZWQoKSB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG4gICAgICAgICAgICBkYXRlLnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5jdXJyZW50VGltZSwgMTApKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VGltZSA9IGRhdGUudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKHBhcnNlSW50KHRoaXMuZHVyYXRpb24sIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuICAgICAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGRhdGUudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gcGFyc2VJbnQoZGF0ZVN0ci5zdWJzdHIoMTEsIDIpLCAxMCk7XG4gICAgICAgICAgICBsZXQgZHVyYXRpb247XG4gICAgICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTIsIDcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChob3VycyA+PSAxMCkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTEsIDgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHJvdy5maW5kKCdzcGFuLmNkci1kdXJhdGlvbicpLnRleHQoYCR7Y3VycmVudFRpbWV9LyR7ZHVyYXRpb259YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3Igc2xpZGVyIGNoYW5nZSBldmVudC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbmV3VmFsIC0gVGhlIG5ldyB2YWx1ZSBvZiB0aGUgc2xpZGVyLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXRhIC0gQWRkaXRpb25hbCBtZXRhZGF0YS5cbiAgICAgKi9cbiAgICBjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuICAgICAgICBpZiAobWV0YS50cmlnZ2VyZWRCeVVzZXIgJiYgTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSA9ICh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24gKiBuZXdWYWwpIC8gMTAwO1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aGlzLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgZGF0ZUN1cnJlbnQgPSBuZXcgRGF0ZShudWxsKTtcbiAgICAgICAgICAgIGRhdGVDdXJyZW50LnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5odG1sNUF1ZGlvLmN1cnJlbnRUaW1lLCAxMCkpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gZGF0ZUN1cnJlbnQudG9JU09TdHJpbmcoKS5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgY29uc3QgZGF0ZUR1cmF0aW9uID0gbmV3IERhdGUobnVsbCk7XG4gICAgICAgICAgICBkYXRlRHVyYXRpb24uc2V0U2Vjb25kcyhwYXJzZUludCh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24sIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuICAgICAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGRhdGVEdXJhdGlvbi50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgY29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcbiAgICAgICAgICAgIGxldCBkdXJhdGlvbjtcbiAgICAgICAgICAgIGlmIChob3VycyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTQsIDUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChob3VycyA8IDEwKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMiwgNyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID49IDEwKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxMSwgOCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNwYW5EdXJhdGlvbi50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIHRpbWUgdXBkYXRlIGV2ZW50LlxuICAgICAqL1xuICAgIGNiVGltZVVwZGF0ZSgpIHtcbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh0aGlzLmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgubWluKE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKSwgMTAwKTtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICAkcm93LmZpbmQoJ2Rpdi5jZHItcGxheWVyJykucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFRpbWUgPT09IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAkcm93LmZpbmQoJ2kucGF1c2UnKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBtZXRhZGF0YSAoZHVyYXRpb24pIHdpdGhvdXQgbG9hZGluZyB0aGUgZnVsbCBhdWRpbyBmaWxlLlxuICAgICAqIE1ha2VzIGEgSEVBRCByZXF1ZXN0IHRvIGdldCBYLUF1ZGlvLUR1cmF0aW9uIGhlYWRlci5cbiAgICAgKi9cbiAgICBsb2FkTWV0YWRhdGEoKSB7XG4gICAgICAgIGNvbnN0IHNvdXJjZVNyYyA9IHRoaXMuaHRtbDVBdWRpby5nZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJyk7XG4gICAgICAgIGlmICghc291cmNlU3JjIHx8ICFzb3VyY2VTcmMuaW5jbHVkZXMoJy9wYnhjb3JlL2FwaS8nKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgZnVsbCBVUkwgKFJFU1QgQVBJIHBhdGhzIGFsd2F5cyBzdGFydCB3aXRoIC9wYnhjb3JlLylcbiAgICAgICAgY29uc3QgZnVsbFVybCA9IHNvdXJjZVNyYy5zdGFydHNXaXRoKCdodHRwJylcbiAgICAgICAgICAgID8gc291cmNlU3JjXG4gICAgICAgICAgICA6IGAke3dpbmRvdy5sb2NhdGlvbi5vcmlnaW59JHtzb3VyY2VTcmN9YDtcblxuICAgICAgICAvLyBQcmVwYXJlIGhlYWRlcnMgd2l0aCBCZWFyZXIgdG9rZW5cbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1ha2UgSEVBRCByZXF1ZXN0IHRvIGdldCBvbmx5IGhlYWRlcnMgKG5vIGJvZHkgZG93bmxvYWQpXG4gICAgICAgIGZldGNoKGZ1bGxVcmwsIHtcbiAgICAgICAgICAgIG1ldGhvZDogJ0hFQUQnLFxuICAgICAgICAgICAgaGVhZGVyc1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgLy8gRmlsZSBub3QgZm91bmQgKDQyMikgb3Igb3RoZXIgZXJyb3IgLSBkaXNhYmxlIHBsYXllciBjb250cm9sc1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzYWJsZVBsYXllcigpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRXh0cmFjdCBkdXJhdGlvbiBmcm9tIGhlYWRlclxuICAgICAgICAgICAgY29uc3QgZHVyYXRpb25TZWNvbmRzID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ1gtQXVkaW8tRHVyYXRpb24nKTtcbiAgICAgICAgICAgIGlmIChkdXJhdGlvblNlY29uZHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHBhcnNlRmxvYXQoZHVyYXRpb25TZWNvbmRzKTtcbiAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb24gPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBkdXJhdGlvbiBvbiBhdWRpbyBlbGVtZW50IGZvciB0b29sdGlwIGZ1bmN0aW9uYWxpdHlcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMuaHRtbDVBdWRpbywgJ2R1cmF0aW9uJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGR1cmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKHBhcnNlSW50KGR1cmF0aW9uLCAxMCkpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlU3RyID0gZGF0ZS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBob3VycyA9IHBhcnNlSW50KGRhdGVTdHIuc3Vic3RyKDExLCAyKSwgMTApO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZm9ybWF0dGVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZCA9IGRhdGVTdHIuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChob3VycyA8IDEwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWQgPSBkYXRlU3RyLnN1YnN0cigxMiwgNyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWQgPSBkYXRlU3RyLnN1YnN0cigxMSwgOCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kc3BhbkR1cmF0aW9uLnRleHQoYDAwOjAwLyR7Zm9ybWF0dGVkfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgIC8vIE5ldHdvcmsgZXJyb3Igb3Igb3RoZXIgZmFpbHVyZSAtIGRpc2FibGUgcGxheWVyIGNvbnRyb2xzXG4gICAgICAgICAgICB0aGlzLmRpc2FibGVQbGF5ZXIoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3RvcCBwbGF5YmFjayAoY2FsbGVkIGZyb20gc3RhdGljIHN0b3BPdGhlcnMgbWV0aG9kKVxuICAgICAqL1xuICAgIHN0b3BQbGF5YmFjaygpIHtcbiAgICAgICAgaWYgKCF0aGlzLmh0bWw1QXVkaW8ucGF1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcbiAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFuIHVwIGF1ZGlvIG5vZGVzIHRvIHByZXZlbnQgbWVtb3J5IGxlYWtzXG4gICAgICAgIHRoaXMuY2xlYW51cEF1ZGlvTm9kZXMoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDbGVhbiB1cCBXZWIgQXVkaW8gQVBJIG5vZGVzXG4gICAgICovXG4gICAgY2xlYW51cEF1ZGlvTm9kZXMoKSB7XG4gICAgICAgIGlmICh0aGlzLnNjcmlwdFByb2Nlc3Nvcikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBEaXNjb25uZWN0IGFsbCBub2Rlc1xuICAgICAgICAgICAgICAgIHRoaXMuc2NyaXB0UHJvY2Vzc29yLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcmlwdFByb2Nlc3Nvci5vbmF1ZGlvcHJvY2VzcyA9IG51bGw7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JpcHRQcm9jZXNzb3IgPSBudWxsO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBjbGVhbnVwIGVycm9yc1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc291cmNlTm9kZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZU5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBjbGVhbnVwIGVycm9yc1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuZ2Fpbk5vZGUpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhpcy5nYWluTm9kZS5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIGNsZWFudXAgZXJyb3JzXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQbGF5cyBvciBwYXVzZXMgdGhlIGF1ZGlvIGZpbGUuXG4gICAgICovXG4gICAgcGxheSgpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgYXVkaW8gYWxyZWFkeSBoYXMgYSBibG9iIHNvdXJjZSBsb2FkZWRcbiAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5zcmMgJiYgdGhpcy5odG1sNUF1ZGlvLnNyYy5zdGFydHNXaXRoKCdibG9iOicpKSB7XG4gICAgICAgICAgICAvLyBCbG9iIGFscmVhZHkgbG9hZGVkLCBqdXN0IHRvZ2dsZSBwbGF5L3BhdXNlXG4gICAgICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnBhdXNlZCkge1xuICAgICAgICAgICAgICAgIC8vIFN0b3AgYWxsIG90aGVyIHBsYXllcnMgYmVmb3JlIHBsYXlpbmcgdGhpcyBvbmVcbiAgICAgICAgICAgICAgICBDRFJQbGF5ZXIuc3RvcE90aGVycyh0aGlzKTtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUGF1c2luZyAtIGNsZWFyIGN1cnJlbnRseSBwbGF5aW5nIHJlZmVyZW5jZVxuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wYXVzZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgICAgICBpZiAoQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcgPT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBDbGVhbiB1cCBhdWRpbyBub2RlcyB3aGVuIHBhdXNpbmdcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFudXBBdWRpb05vZGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZWVkIHRvIGxvYWQgc291cmNlIGZpcnN0XG4gICAgICAgIGxldCBzb3VyY2VTcmMgPSB0aGlzLmh0bWw1QXVkaW8uZ2V0QXR0cmlidXRlKCdkYXRhLXNyYycpIHx8ICcnO1xuXG4gICAgICAgIC8vIElmIHNvdXJjZSBpcyBhbiBBUEkgZW5kcG9pbnQgd2l0aCB0b2tlbiwgbG9hZCBpdCBkaXJlY3RseVxuICAgICAgICAvLyBXSFk6IFRva2VuLWJhc2VkIFVSTHMgYWxyZWFkeSBjb250YWluIGFsbCBuZWNlc3NhcnkgaW5mb3JtYXRpb25cbiAgICAgICAgaWYgKHNvdXJjZVNyYyAmJiBzb3VyY2VTcmMuaW5jbHVkZXMoJy9wYnhjb3JlL2FwaS8nKSkge1xuICAgICAgICAgICAgLy8gU3RvcCBhbGwgb3RoZXIgcGxheWVycyBiZWZvcmUgbG9hZGluZyBuZXcgc291cmNlXG4gICAgICAgICAgICBDRFJQbGF5ZXIuc3RvcE90aGVycyh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMubG9hZEF1dGhlbnRpY2F0ZWRTb3VyY2Uoc291cmNlU3JjKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrIGZvciBub24tQVBJIHNvdXJjZXMgb3IgYWxyZWFkeSBsb2FkZWRcbiAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQgJiYgdGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICBDRFJQbGF5ZXIuc3RvcE90aGVycyh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG4gICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuaHRtbDVBdWRpby5wYXVzZWQpIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wYXVzZSgpO1xuICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICAgICAgaWYgKENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nID09PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBXZWIgQXVkaW8gQVBJIGZvciBtb25vIG1peGluZ1xuICAgICAqIFdIWTogU3RlcmVvIGNhbGwgcmVjb3JkaW5ncyBoYXZlIGV4dGVybmFsIGNoYW5uZWwgKGxlZnQpIGFuZCBpbnRlcm5hbCBjaGFubmVsIChyaWdodClcbiAgICAgKiBNaXhpbmcgdG8gbW9ubyBtYWtlcyBib3RoIHNwZWFrZXJzIGF1ZGlibGUgaW4gc2luZ2xlIGNoYW5uZWwgZm9yIGVhc2llciBsaXN0ZW5pbmdcbiAgICAgKlxuICAgICAqIEFQUFJPQUNIOiBVc2Ugc2ltcGxlIGdhaW4tYmFzZWQgZG93bm1peGluZ1xuICAgICAqIE1vc3QgcmVsaWFibGUgbWV0aG9kIHRoYXQgd29ya3Mgd2l0aCBhbGwgYXVkaW8gZm9ybWF0cyBpbmNsdWRpbmcgV2ViTS9PcHVzXG4gICAgICovXG4gICAgc2V0dXBNb25vTWl4ZXIoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYXVkaW8gY29udGV4dCBpZiBub3QgZXhpc3RzXG4gICAgICAgICAgICBpZiAoIXRoaXMuYXVkaW9Db250ZXh0KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9Db250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDcmVhdGUgc291cmNlIG5vZGUgZnJvbSBhdWRpbyBlbGVtZW50IChjYW4gb25seSBiZSBjcmVhdGVkIG9uY2UhKVxuICAgICAgICAgICAgaWYgKCF0aGlzLnNvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZU5vZGUgPSB0aGlzLmF1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYUVsZW1lbnRTb3VyY2UodGhpcy5odG1sNUF1ZGlvKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGlzY29ubmVjdCBwcmV2aW91cyBjb25uZWN0aW9ucyBpZiB0aGV5IGV4aXN0XG4gICAgICAgICAgICBpZiAodGhpcy5nYWluTm9kZSkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc291cmNlTm9kZS5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2Fpbk5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWdub3JlIGRpc2Nvbm5lY3QgZXJyb3JzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBTY3JpcHRQcm9jZXNzb3JOb2RlIHdpdGggMiBpbnB1dCBjaGFubmVscyBhbmQgMiBvdXRwdXQgY2hhbm5lbHNcbiAgICAgICAgICAgIC8vIEJ1ZmZlciBzaXplIG9mIDQwOTYgZm9yIGdvb2QgYmFsYW5jZSBiZXR3ZWVuIGxhdGVuY3kgYW5kIHBlcmZvcm1hbmNlXG4gICAgICAgICAgICBjb25zdCBidWZmZXJTaXplID0gNDA5NjtcbiAgICAgICAgICAgIGNvbnN0IHNjcmlwdFByb2Nlc3NvciA9IHRoaXMuYXVkaW9Db250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCAyLCAyKTtcblxuICAgICAgICAgICAgLy8gU3RvcmUgcmVmZXJlbmNlIGZvciBjbGVhbnVwXG4gICAgICAgICAgICB0aGlzLnNjcmlwdFByb2Nlc3NvciA9IHNjcmlwdFByb2Nlc3NvcjtcblxuICAgICAgICAgICAgLy8gUHJvY2VzcyBhdWRpbyB3aXRoIDY1LzM1IGNoYW5uZWwgbWl4aW5nIGZvciBiZXR0ZXIgdHJhbnNjcmlwdGlvbiBsaXN0ZW5pbmdcbiAgICAgICAgICAgIC8vIExlZnQgZWFyOiA2NSUgbGVmdCArIDM1JSByaWdodCwgUmlnaHQgZWFyOiAzNSUgbGVmdCArIDY1JSByaWdodFxuICAgICAgICAgICAgc2NyaXB0UHJvY2Vzc29yLm9uYXVkaW9wcm9jZXNzID0gKGF1ZGlvUHJvY2Vzc2luZ0V2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5wdXRCdWZmZXIgPSBhdWRpb1Byb2Nlc3NpbmdFdmVudC5pbnB1dEJ1ZmZlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBvdXRwdXRCdWZmZXIgPSBhdWRpb1Byb2Nlc3NpbmdFdmVudC5vdXRwdXRCdWZmZXI7XG5cbiAgICAgICAgICAgICAgICAvLyBHZXQgbnVtYmVyIG9mIGNoYW5uZWxzIGluIHRoZSBidWZmZXJcbiAgICAgICAgICAgICAgICBjb25zdCBpbnB1dENoYW5uZWxDb3VudCA9IGlucHV0QnVmZmVyLm51bWJlck9mQ2hhbm5lbHM7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0Q2hhbm5lbENvdW50ID0gb3V0cHV0QnVmZmVyLm51bWJlck9mQ2hhbm5lbHM7XG5cbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZGlmZmVyZW50IGNoYW5uZWwgY29uZmlndXJhdGlvbnNcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXRDaGFubmVsQ291bnQgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5wdXQgaXMgYWxyZWFkeSBtb25vIC0gY29weSB0byBib3RoIG91dHB1dCBjaGFubmVsc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dE1vbm8gPSBpbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0TCA9IG91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0UiA9IG91dHB1dENoYW5uZWxDb3VudCA+IDEgPyBvdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkgOiBudWxsO1xuXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRNb25vLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXRMW2ldID0gaW5wdXRNb25vW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG91dHB1dFIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXRSW2ldID0gaW5wdXRNb25vW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbnB1dENoYW5uZWxDb3VudCA+PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElucHV0IGlzIHN0ZXJlbyBvciBtdWx0aS1jaGFubmVsIC0gYXBwbHkgNjUvMzUgbWl4aW5nXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0TCA9IGlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dFIgPSBpbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0TCA9IG91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0UiA9IG91dHB1dENoYW5uZWxDb3VudCA+IDEgPyBvdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkgOiBudWxsO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5IDY1LzM1IG1peGluZyBmb3IgbmVhci1tb25vIGV4cGVyaWVuY2Ugd2l0aCBzdWJ0bGUgZGlyZWN0aW9uYWwgY3Vlc1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0TC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTGVmdCBlYXIgcmVjZWl2ZXMgNjUlIGxlZnQgKyAzNSUgcmlnaHRcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dExbaV0gPSAoaW5wdXRMW2ldICogMC42NSkgKyAoaW5wdXRSW2ldICogMC4zNSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJpZ2h0IGVhciByZWNlaXZlcyAzNSUgbGVmdCArIDY1JSByaWdodFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG91dHB1dFIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXRSW2ldID0gKGlucHV0TFtpXSAqIDAuMzUpICsgKGlucHV0UltpXSAqIDAuNjUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIGdhaW4gbm9kZSBmb3Igdm9sdW1lIGNvbnRyb2xcbiAgICAgICAgICAgIHRoaXMuZ2Fpbk5vZGUgPSB0aGlzLmF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG5cbiAgICAgICAgICAgIC8vIENvbm5lY3QgdGhlIGF1ZGlvIGdyYXBoOlxuICAgICAgICAgICAgLy8gc291cmNlIOKGkiBzY3JpcHRQcm9jZXNzb3Ig4oaSIGdhaW4g4oaSIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICB0aGlzLnNvdXJjZU5vZGUuY29ubmVjdChzY3JpcHRQcm9jZXNzb3IpO1xuICAgICAgICAgICAgc2NyaXB0UHJvY2Vzc29yLmNvbm5lY3QodGhpcy5nYWluTm9kZSk7XG4gICAgICAgICAgICB0aGlzLmdhaW5Ob2RlLmNvbm5lY3QodGhpcy5hdWRpb0NvbnRleHQuZGVzdGluYXRpb24pO1xuXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjazogYXVkaW8gd2lsbCBwbGF5IGFzIHN0ZXJlbyB0aHJvdWdoIG5vcm1hbCBIVE1MNSBhdWRpb1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBhdWRpbyBmcm9tIGF1dGhlbnRpY2F0ZWQgQVBJIGVuZHBvaW50IHVzaW5nIGZldGNoICsgQmVhcmVyIHRva2VuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFwaVVybCAtIFRoZSBBUEkgVVJMIHJlcXVpcmluZyBhdXRoZW50aWNhdGlvblxuICAgICAqL1xuICAgIGxvYWRBdXRoZW50aWNhdGVkU291cmNlKGFwaVVybCkge1xuICAgICAgICAvLyBCdWlsZCBmdWxsIFVSTCAoUkVTVCBBUEkgcGF0aHMgYWx3YXlzIHN0YXJ0IHdpdGggL3BieGNvcmUvKVxuICAgICAgICBjb25zdCBmdWxsVXJsID0gYXBpVXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKVxuICAgICAgICAgICAgPyBhcGlVcmxcbiAgICAgICAgICAgIDogYCR7d2luZG93LmxvY2F0aW9uLm9yaWdpbn0ke2FwaVVybH1gO1xuXG4gICAgICAgIC8vIFByZXBhcmUgaGVhZGVycyB3aXRoIEJlYXJlciB0b2tlblxuICAgICAgICBjb25zdCBoZWFkZXJzID0ge1xuICAgICAgICAgICAgJ1gtUmVxdWVzdGVkLVdpdGgnOiAnWE1MSHR0cFJlcXVlc3QnXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmV0Y2ggYXVkaW8gZmlsZSB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIGZldGNoKGZ1bGxVcmwsIHsgaGVhZGVycyB9KVxuICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfTogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIERldGVjdCBmb3JtYXQgZnJvbSBDb250ZW50LVR5cGUgaGVhZGVyXG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Rm9ybWF0ID0gdGhpcy5kZXRlY3RBdWRpb0Zvcm1hdChjb250ZW50VHlwZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZm9ybWF0IGJhZGdlXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEZvcm1hdCAmJiB0aGlzLmN1cnJlbnRGb3JtYXQgIT09ICd1bmtub3duJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUZvcm1hdEJhZGdlKHRoaXMuY3VycmVudEZvcm1hdCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBkdXJhdGlvbiBmcm9tIGhlYWRlciBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvblNlY29uZHMgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnWC1BdWRpby1EdXJhdGlvbicpO1xuICAgICAgICAgICAgICAgIGlmIChkdXJhdGlvblNlY29uZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBwYXJzZUZsb2F0KGR1cmF0aW9uU2Vjb25kcyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkdXJhdGlvbiA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGUuc2V0U2Vjb25kcyhwYXJzZUludChkdXJhdGlvbiwgMTApKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVTdHIgPSBkYXRlLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBob3VycyA9IHBhcnNlSW50KGRhdGVTdHIuc3Vic3RyKDExLCAyKSwgMTApO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZvcm1hdHRlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChob3VycyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZCA9IGRhdGVTdHIuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZCA9IGRhdGVTdHIuc3Vic3RyKDEyLCA3KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkID0gZGF0ZVN0ci5zdWJzdHIoMTEsIDgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kc3BhbkR1cmF0aW9uLnRleHQoYDAwOjAwLyR7Zm9ybWF0dGVkfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmJsb2IoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbihibG9iID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYmxvYiBVUkwgZnJvbSByZXNwb25zZVxuICAgICAgICAgICAgICAgIGNvbnN0IGJsb2JVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXG4gICAgICAgICAgICAgICAgLy8gUmV2b2tlIHByZXZpb3VzIGJsb2IgVVJMIGlmIGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmh0bWw1QXVkaW8uc3JjICYmIHRoaXMuaHRtbDVBdWRpby5zcmMuc3RhcnRzV2l0aCgnYmxvYjonKSkge1xuICAgICAgICAgICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHRoaXMuaHRtbDVBdWRpby5zcmMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNldCBibG9iIFVSTCBkaXJlY3RseSB0byBhdWRpbyBlbGVtZW50XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnNyYyA9IGJsb2JVcmw7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmxvYWQoKTtcblxuICAgICAgICAgICAgICAgIC8vIFNldHVwIG1vbm8gbWl4ZXIgb24gZmlyc3QgcGxheWJhY2sgb25seVxuICAgICAgICAgICAgICAgIC8vIFdIWTogV2ViIEF1ZGlvIEFQSSByZXF1aXJlcyB1c2VyIGludGVyYWN0aW9uIGJlZm9yZSBjcmVhdGluZyBBdWRpb0NvbnRleHRcbiAgICAgICAgICAgICAgICAvLyBNZWRpYUVsZW1lbnRTb3VyY2UgY2FuIG9ubHkgYmUgY3JlYXRlZCBvbmNlIHBlciBhdWRpbyBlbGVtZW50XG4gICAgICAgICAgICAgICAgLy8gQWZ0ZXIgZmlyc3Qgc2V0dXAsIHNhbWUgc291cmNlIG5vZGUgd29ya3MgZm9yIGFsbCBzdWJzZXF1ZW50IGZpbGVzXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR1cE1vbm9NaXhlcigpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEF1dG8tcGxheSBhZnRlciBsb2FkaW5nXG4gICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLm9uY2FucGxheXRocm91Z2ggPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5wbGF5KCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLm9uY2FucGxheXRocm91Z2ggPSBudWxsO1xuXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhlcnJvci5tZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuY2RyX0F1ZGlvRmlsZUxvYWRFcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEb3dubG9hZCBmaWxlIHdpdGggYXV0aGVudGljYXRpb24gYW5kIG9wdGlvbmFsIGZvcm1hdCBjb252ZXJzaW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRvd25sb2FkVXJsIC0gRG93bmxvYWQgVVJMIHJlcXVpcmluZyBCZWFyZXIgdG9rZW5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybWF0IC0gRGVzaXJlZCBhdWRpbyBmb3JtYXQgKG9yaWdpbmFsLCBtcDMsIHdhdiwgd2VibSwgb2dnKVxuICAgICAqL1xuICAgIGRvd25sb2FkRmlsZShkb3dubG9hZFVybCwgZm9ybWF0ID0gJ3dlYm0nKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgYW4gQVBJIFVSTCB0aGF0IHJlcXVpcmVzIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIGlmIChkb3dubG9hZFVybC5pbmNsdWRlcygnL3BieGNvcmUvYXBpLycpKSB7XG4gICAgICAgICAgICAvLyBBZGQgZm9ybWF0IHBhcmFtZXRlciB0byBVUkwgaWYgbm90ICdvcmlnaW5hbCdcbiAgICAgICAgICAgIGxldCB1cmxXaXRoRm9ybWF0ID0gZG93bmxvYWRVcmw7XG4gICAgICAgICAgICBpZiAoZm9ybWF0ICE9PSAnb3JpZ2luYWwnKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VwYXJhdG9yID0gZG93bmxvYWRVcmwuaW5jbHVkZXMoJz8nKSA/ICcmJyA6ICc/JztcbiAgICAgICAgICAgICAgICB1cmxXaXRoRm9ybWF0ID0gYCR7ZG93bmxvYWRVcmx9JHtzZXBhcmF0b3J9Zm9ybWF0PSR7ZW5jb2RlVVJJQ29tcG9uZW50KGZvcm1hdCl9YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQnVpbGQgZnVsbCBVUkwgKFJFU1QgQVBJIHBhdGhzIGFsd2F5cyBzdGFydCB3aXRoIC9wYnhjb3JlLylcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxVcmwgPSB1cmxXaXRoRm9ybWF0LnN0YXJ0c1dpdGgoJ2h0dHAnKVxuICAgICAgICAgICAgICAgID8gdXJsV2l0aEZvcm1hdFxuICAgICAgICAgICAgICAgIDogYCR7d2luZG93LmxvY2F0aW9uLm9yaWdpbn0ke3VybFdpdGhGb3JtYXR9YDtcblxuICAgICAgICAgICAgLy8gUHJlcGFyZSBoZWFkZXJzIHdpdGggQmVhcmVyIHRva2VuXG4gICAgICAgICAgICBjb25zdCBoZWFkZXJzID0ge1xuICAgICAgICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmV0Y2ggZmlsZSB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICBmZXRjaChmdWxsVXJsLCB7IGhlYWRlcnMgfSlcbiAgICAgICAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c306ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCBmaWxlbmFtZSBmcm9tIENvbnRlbnQtRGlzcG9zaXRpb24gaGVhZGVyIG9yIFVSTFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXNwb3NpdGlvbiA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdDb250ZW50LURpc3Bvc2l0aW9uJyk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBmaWxlbmFtZSA9IGBjYWxsLXJlY29yZC4ke2Zvcm1hdCB8fCAnbXAzJ31gO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlzcG9zaXRpb24gJiYgZGlzcG9zaXRpb24uaW5jbHVkZXMoJ2ZpbGVuYW1lPScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRjaGVzID0gL2ZpbGVuYW1lW147PVxcbl0qPSgoWydcIl0pLio/XFwyfFteO1xcbl0qKS8uZXhlYyhkaXNwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWF0Y2hlcyAhPSBudWxsICYmIG1hdGNoZXNbMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZSA9IG1hdGNoZXNbMV0ucmVwbGFjZSgvWydcIl0vZywgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGV4dHJhY3QgZnJvbSBVUkwgcGFyYW1ldGVyc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhkb3dubG9hZFVybC5zcGxpdCgnPycpWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lUGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdmaWxlbmFtZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVuYW1lUGFyYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZSA9IGZpbGVuYW1lUGFyYW07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuYmxvYigpLnRoZW4oYmxvYiA9PiAoeyBibG9iLCBmaWxlbmFtZSB9KSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAudGhlbigoeyBibG9iLCBmaWxlbmFtZSB9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBkb3dubG9hZCBsaW5rXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICAgICAgICAgICAgICBhLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgICAgIGEuaHJlZiA9IHVybDtcbiAgICAgICAgICAgICAgICAgICAgYS5kb3dubG9hZCA9IGZpbGVuYW1lO1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xuICAgICAgICAgICAgICAgICAgICBhLmNsaWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5VUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoYSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3IubWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmNkcl9BdWRpb0ZpbGVEb3dubG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExlZ2FjeSBkaXJlY3QgZmlsZSBVUkwgKG5vIGF1dGggbmVlZGVkKVxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZG93bmxvYWRVcmw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3Igc3JjIG1lZGlhIGVycm9yIGV2ZW50LlxuICAgICAqL1xuICAgIGNiT25TcmNNZWRpYUVycm9yKCkge1xuICAgICAgICAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGlzYWJsZSBwbGF5ZXIgY29udHJvbHMgd2hlbiBmaWxlIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgKiBIaWRlcyBwbGF5IGFuZCBkb3dubG9hZCBidXR0b25zLCBkaXNhYmxlcyBvbmx5IHBsYXllciBjZWxscyAobm90IGVudGlyZSByb3cpXG4gICAgICovXG4gICAgZGlzYWJsZVBsYXllcigpIHtcbiAgICAgICAgLy8gSGlkZSBwbGF5IGJ1dHRvblxuICAgICAgICB0aGlzLiRwQnV0dG9uLmhpZGUoKTtcblxuICAgICAgICAvLyBIaWRlIGRvd25sb2FkIGJ1dHRvblxuICAgICAgICB0aGlzLiRkQnV0dG9uLmhpZGUoKTtcblxuICAgICAgICAvLyBTaG93IHBsYWNlaG9sZGVyIGluIGR1cmF0aW9uIHNwYW5cbiAgICAgICAgdGhpcy4kc3BhbkR1cmF0aW9uLnRleHQoJy0tOi0tLy0tOi0tJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgLy8gRGlzYWJsZSBzbGlkZXIgYW5kIGl0cyBwYXJlbnQgY2VsbFxuICAgICAgICB0aGlzLiRzbGlkZXIuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuJHNsaWRlci5jbG9zZXN0KCd0ZCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgIC8vIERpc2FibGUgZHVyYXRpb24gY2VsbFxuICAgICAgICB0aGlzLiRzcGFuRHVyYXRpb24uY2xvc2VzdCgndGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9XG59Il19