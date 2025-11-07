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

        this.scriptProcessor = scriptProcessor; // Process audio to force mono output

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
            // Input is stereo or multi-channel - mix to mono
            var inputL = inputBuffer.getChannelData(0);
            var inputR = inputBuffer.getChannelData(1);

            var _outputL = outputBuffer.getChannelData(0);

            var _outputR = outputChannelCount > 1 ? outputBuffer.getChannelData(1) : null; // Mix L+R to mono and copy to both output channels


            for (var _i = 0; _i < inputL.length; _i++) {
              // Average L and R channels for true mono
              var monoSample = (inputL[_i] + inputR[_i]) * 0.5; // Write the same mono signal to both output channels

              _outputL[_i] = monoSample;

              if (_outputR) {
                _outputR[_i] = monoSample;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLXBsYXllci5qcyJdLCJuYW1lcyI6WyJDRFJQbGF5ZXIiLCJpZCIsImh0bWw1QXVkaW8iLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiJHJvdyIsIiQiLCJjdXJyZW50Rm9ybWF0IiwiYXVkaW9Db250ZXh0Iiwic291cmNlTm9kZSIsImdhaW5Ob2RlIiwiaGFzQ2xhc3MiLCIkcEJ1dHRvbiIsImZpbmQiLCIkZEJ1dHRvbiIsIiRzbGlkZXIiLCIkc3BhbkR1cmF0aW9uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNiT25NZXRhZGF0YUxvYWRlZCIsImNiVGltZVVwZGF0ZSIsInVuYmluZCIsIm9yaWdpbmFsU3JjIiwiZ2V0QXR0cmlidXRlIiwiaW5jbHVkZXMiLCJzZXRBdHRyaWJ1dGUiLCJyZW1vdmVBdHRyaWJ1dGUiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInBsYXkiLCIkZG93bmxvYWREcm9wZG93biIsImxlbmd0aCIsImRyb3Bkb3duIiwiYWN0aW9uIiwib25DaGFuZ2UiLCJ2YWx1ZSIsInRleHQiLCIkY2hvaWNlIiwiZm9ybWF0IiwiZGF0YSIsImRvd25sb2FkVXJsIiwiZG93bmxvYWRGaWxlIiwidGFyZ2V0IiwiYXR0ciIsImFkZEV2ZW50TGlzdGVuZXIiLCJiaW5kIiwiY3VycmVudGx5UGxheWluZyIsImNiT25TcmNNZWRpYUVycm9yIiwicmFuZ2UiLCJtaW4iLCJtYXgiLCJzdGFydCIsImNiT25TbGlkZXJDaGFuZ2UiLCJzcGFuRHVyYXRpb24iLCJpbml0aWFsaXplVG9vbHRpcCIsImFkZENsYXNzIiwibG9hZE1ldGFkYXRhIiwiJHRvb2x0aXAiLCJhcHBlbmQiLCJ1cGRhdGVUb29sdGlwUG9zaXRpb24iLCJjc3MiLCJyZW1vdmVDbGFzcyIsInNsaWRlck9mZnNldCIsIm9mZnNldCIsInNsaWRlcldpZHRoIiwid2lkdGgiLCJtb3VzZVgiLCJwYWdlWCIsImxlZnQiLCJwZXJjZW50IiwiTWF0aCIsImR1cmF0aW9uIiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJ0aW1lU2Vjb25kcyIsImZvcm1hdHRlZFRpbWUiLCJmb3JtYXRUaW1lIiwic2Vjb25kcyIsImRhdGUiLCJEYXRlIiwic2V0U2Vjb25kcyIsInBhcnNlSW50IiwiZGF0ZVN0ciIsInRvSVNPU3RyaW5nIiwiaG91cnMiLCJzdWJzdHIiLCJjb250ZW50VHlwZSIsImxvd2VyVHlwZSIsInRvTG93ZXJDYXNlIiwiJGJhZGdlIiwiYmVmb3JlIiwiZm9ybWF0VXBwZXIiLCJ0b1VwcGVyQ2FzZSIsImNsb3Nlc3QiLCJjdXJyZW50VGltZSIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJkYXRlQ3VycmVudCIsImRhdGVEdXJhdGlvbiIsInJhbmdlUG9zaXRpb24iLCJyb3VuZCIsInNvdXJjZVNyYyIsImZ1bGxVcmwiLCJzdGFydHNXaXRoIiwid2luZG93IiwibG9jYXRpb24iLCJvcmlnaW4iLCJoZWFkZXJzIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJmZXRjaCIsIm1ldGhvZCIsInRoZW4iLCJyZXNwb25zZSIsIm9rIiwiZGlzYWJsZVBsYXllciIsImR1cmF0aW9uU2Vjb25kcyIsImdldCIsInBhcnNlRmxvYXQiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsIndyaXRhYmxlIiwiY29uZmlndXJhYmxlIiwiZm9ybWF0dGVkIiwicGF1c2VkIiwicGF1c2UiLCJjbGVhbnVwQXVkaW9Ob2RlcyIsInNjcmlwdFByb2Nlc3NvciIsImRpc2Nvbm5lY3QiLCJvbmF1ZGlvcHJvY2VzcyIsInNyYyIsInN0b3BPdGhlcnMiLCJsb2FkQXV0aGVudGljYXRlZFNvdXJjZSIsIkF1ZGlvQ29udGV4dCIsIndlYmtpdEF1ZGlvQ29udGV4dCIsImNyZWF0ZU1lZGlhRWxlbWVudFNvdXJjZSIsImJ1ZmZlclNpemUiLCJjcmVhdGVTY3JpcHRQcm9jZXNzb3IiLCJhdWRpb1Byb2Nlc3NpbmdFdmVudCIsImlucHV0QnVmZmVyIiwib3V0cHV0QnVmZmVyIiwiaW5wdXRDaGFubmVsQ291bnQiLCJudW1iZXJPZkNoYW5uZWxzIiwib3V0cHV0Q2hhbm5lbENvdW50IiwiaW5wdXRNb25vIiwiZ2V0Q2hhbm5lbERhdGEiLCJvdXRwdXRMIiwib3V0cHV0UiIsImkiLCJpbnB1dEwiLCJpbnB1dFIiLCJtb25vU2FtcGxlIiwiY3JlYXRlR2FpbiIsImNvbm5lY3QiLCJkZXN0aW5hdGlvbiIsImVycm9yIiwiYXBpVXJsIiwiRXJyb3IiLCJzdGF0dXMiLCJzdGF0dXNUZXh0IiwiZGV0ZWN0QXVkaW9Gb3JtYXQiLCJ1cGRhdGVGb3JtYXRCYWRnZSIsImJsb2IiLCJibG9iVXJsIiwiVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwicmV2b2tlT2JqZWN0VVJMIiwibG9hZCIsInNldHVwTW9ub01peGVyIiwib25jYW5wbGF5dGhyb3VnaCIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZSIsImdsb2JhbFRyYW5zbGF0ZSIsImNkcl9BdWRpb0ZpbGVMb2FkRXJyb3IiLCJ1cmxXaXRoRm9ybWF0Iiwic2VwYXJhdG9yIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwiZGlzcG9zaXRpb24iLCJmaWxlbmFtZSIsIm1hdGNoZXMiLCJleGVjIiwicmVwbGFjZSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsInNwbGl0IiwiZmlsZW5hbWVQYXJhbSIsInVybCIsImEiLCJjcmVhdGVFbGVtZW50Iiwic3R5bGUiLCJkaXNwbGF5IiwiaHJlZiIsImRvd25sb2FkIiwiYm9keSIsImFwcGVuZENoaWxkIiwiY2xpY2siLCJyZW1vdmVDaGlsZCIsImNkcl9BdWRpb0ZpbGVEb3dubG9hZEVycm9yIiwiaGlkZSIsImV4Y2VwdFBsYXllciIsInN0b3BQbGF5YmFjayJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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dXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qKlxuICogQ0RSUGxheWVyIGNsYXNzLlxuICovXG5jbGFzcyBDRFJQbGF5ZXIge1xuXG4gICAgLy8gU3RhdGljIHByb3BlcnR5IHRvIHRyYWNrIGN1cnJlbnRseSBwbGF5aW5nIGluc3RhbmNlXG4gICAgc3RhdGljIGN1cnJlbnRseVBsYXlpbmcgPSBudWxsO1xuXG4gICAgLyoqXG4gICAgICogU3RvcCBhbGwgb3RoZXIgcGxheWVycyBleGNlcHQgdGhlIGdpdmVuIG9uZVxuICAgICAqIEBwYXJhbSB7Q0RSUGxheWVyfSBleGNlcHRQbGF5ZXIgLSBUaGUgcGxheWVyIHRoYXQgc2hvdWxkIGNvbnRpbnVlIHBsYXlpbmdcbiAgICAgKi9cbiAgICBzdGF0aWMgc3RvcE90aGVycyhleGNlcHRQbGF5ZXIpIHtcbiAgICAgICAgaWYgKENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nICYmIENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nICE9PSBleGNlcHRQbGF5ZXIpIHtcbiAgICAgICAgICAgIENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nID0gZXhjZXB0UGxheWVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgQ0RSUGxheWVyLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFRoZSBJRCBvZiB0aGUgcGxheWVyLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGlkKSB7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGF1ZGlvLXBsYXllci0ke2lkfWApO1xuICAgICAgICBjb25zdCAkcm93ID0gJChgIyR7aWR9YCk7XG5cbiAgICAgICAgLy8gVHJhY2sgY3VycmVudCBhdWRpbyBmb3JtYXQgKHdlYm0sIG1wMywgd2F2KVxuICAgICAgICB0aGlzLmN1cnJlbnRGb3JtYXQgPSBudWxsO1xuXG4gICAgICAgIC8vIFdlYiBBdWRpbyBBUEkgZm9yIG1vbm8gbWl4aW5nXG4gICAgICAgIC8vIFdIWTogQXV0b21hdGljYWxseSBtaXggc3RlcmVvIHJlY29yZGluZ3MgKGxlZnQ9ZXh0ZXJuYWwsIHJpZ2h0PWludGVybmFsKSB0byBtb25vXG4gICAgICAgIC8vIFRoaXMgbWFrZXMgYm90aCBzcGVha2VycyBhdWRpYmxlIGluIHNpbmdsZSBjaGFubmVsIGZvciBlYXNpZXIgbGlzdGVuaW5nXG4gICAgICAgIHRoaXMuYXVkaW9Db250ZXh0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5zb3VyY2VOb2RlID0gbnVsbDtcbiAgICAgICAgdGhpcy5nYWluTm9kZSA9IG51bGw7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBpbml0aWFsaXplZCB0byBwcmV2ZW50IGRvdWJsZSBwcm9jZXNzaW5nXG4gICAgICAgIGlmICgkcm93Lmhhc0NsYXNzKCdpbml0aWFsaXplZCcpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLiRwQnV0dG9uID0gJHJvdy5maW5kKCdpLnBsYXknKTsgLy8gUGxheSBidXR0b25cbiAgICAgICAgdGhpcy4kZEJ1dHRvbiA9ICRyb3cuZmluZCgnaS5kb3dubG9hZCcpOyAvLyBEb3dubG9hZCBidXR0b25cbiAgICAgICAgdGhpcy4kc2xpZGVyID0gJHJvdy5maW5kKCdkaXYuY2RyLXBsYXllcicpOyAvLyBTbGlkZXIgZWxlbWVudFxuICAgICAgICB0aGlzLiRzcGFuRHVyYXRpb24gPSAkcm93LmZpbmQoJ3NwYW4uY2RyLWR1cmF0aW9uJyk7IC8vIER1cmF0aW9uIHNwYW4gZWxlbWVudFxuXG4gICAgICAgIC8vIENsZWFuIHVwIHByZXZpb3VzIGV2ZW50IGxpc3RlbmVyc1xuICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JPbk1ldGFkYXRhTG9hZGVkLCBmYWxzZSk7XG4gICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgICAgIHRoaXMuJHBCdXR0b24udW5iaW5kKCk7XG4gICAgICAgIHRoaXMuJGRCdXR0b24udW5iaW5kKCk7XG5cbiAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgc3JjIGluIGRhdGEtc3JjIGF0dHJpYnV0ZSBmb3IgYXV0aGVudGljYXRlZCBsb2FkaW5nXG4gICAgICAgIGNvbnN0IG9yaWdpbmFsU3JjID0gdGhpcy5odG1sNUF1ZGlvLmdldEF0dHJpYnV0ZSgnc3JjJyk7XG4gICAgICAgIGlmIChvcmlnaW5hbFNyYyAmJiBvcmlnaW5hbFNyYy5pbmNsdWRlcygnL3BieGNvcmUvYXBpLycpKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uc2V0QXR0cmlidXRlKCdkYXRhLXNyYycsIG9yaWdpbmFsU3JjKTtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5yZW1vdmVBdHRyaWJ1dGUoJ3NyYycpOyAvLyBSZW1vdmUgZGlyZWN0IHNyY1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUGxheSBidXR0b24gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgdGhpcy4kcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZG93bmxvYWQgZm9ybWF0IGRyb3Bkb3duXG4gICAgICAgIGNvbnN0ICRkb3dubG9hZERyb3Bkb3duID0gJHJvdy5maW5kKCcuZG93bmxvYWQtZm9ybWF0LWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZG93bmxvYWREcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkZG93bmxvYWREcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnaGlkZScsXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSwgdGV4dCwgJGNob2ljZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXQgPSAkY2hvaWNlLmRhdGEoJ2Zvcm1hdCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkb3dubG9hZFVybCA9ICRkb3dubG9hZERyb3Bkb3duLmRhdGEoJ2Rvd25sb2FkLXVybCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZG93bmxvYWRVcmwgJiYgZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRvd25sb2FkRmlsZShkb3dubG9hZFVybCwgZm9ybWF0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTGVnYWN5OiBEb3dubG9hZCBidXR0b24gZXZlbnQgbGlzdGVuZXIgKGZvciBvbGQgVUkgd2l0aG91dCBkcm9wZG93bilcbiAgICAgICAgdGhpcy4kZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgZG93bmxvYWRVcmwgPSAkKGUudGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBpZiAoZG93bmxvYWRVcmwpIHtcbiAgICAgICAgICAgICAgICAvLyBEb3dubG9hZCBpbiBXZWJNIGZvcm1hdCBieSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgdGhpcy5kb3dubG9hZEZpbGUoZG93bmxvYWRVcmwsICd3ZWJtJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIExvYWRlZCBtZXRhZGF0YSBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCB0aGlzLmNiT25NZXRhZGF0YUxvYWRlZC5iaW5kKHRoaXMpLCBmYWxzZSk7XG5cbiAgICAgICAgLy8gdGltZXVwZGF0ZSBldmVudCBsaXN0ZW5lclxuICAgICAgICB0aGlzLmh0bWw1QXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cbiAgICAgICAgLy8gZW5kZWQgZXZlbnQgbGlzdGVuZXIgLSBjbGVhciBjdXJyZW50bHkgcGxheWluZyByZWZlcmVuY2VcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nID09PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgQ0RSUGxheWVyLmN1cnJlbnRseVBsYXlpbmcgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBmYWxzZSk7XG5cbiAgICAgICAgLy8gbm8gc3JjIGhhbmRsZXJcbiAgICAgICAgdGhpcy5odG1sNUF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5jYk9uU3JjTWVkaWFFcnJvciwgZmFsc2UpO1xuXG4gICAgICAgIHRoaXMuJHNsaWRlci5yYW5nZSh7XG4gICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICBtYXg6IDEwMCxcbiAgICAgICAgICAgIHN0YXJ0OiAwLFxuICAgICAgICAgICAgb25DaGFuZ2U6IHRoaXMuY2JPblNsaWRlckNoYW5nZSxcbiAgICAgICAgICAgIGh0bWw1QXVkaW86IHRoaXMuaHRtbDVBdWRpbyxcbiAgICAgICAgICAgIGNiVGltZVVwZGF0ZTogdGhpcy5jYlRpbWVVcGRhdGUsXG4gICAgICAgICAgICBzcGFuRHVyYXRpb246IHRoaXMuJHNwYW5EdXJhdGlvbixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIHRvb2x0aXAgdG8gc2xpZGVyXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRvb2x0aXAoKTtcblxuICAgICAgICAvLyBNYXJrIGFzIGluaXRpYWxpemVkXG4gICAgICAgICRyb3cuYWRkQ2xhc3MoJ2luaXRpYWxpemVkJyk7XG5cbiAgICAgICAgLy8gTG9hZCBtZXRhZGF0YSBvbiBpbml0aWFsaXphdGlvblxuICAgICAgICB0aGlzLmxvYWRNZXRhZGF0YSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcCBmb3Igc2xpZGVyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXAoKSB7XG4gICAgICAgIC8vIEFkZCB0b29sdGlwIGVsZW1lbnQgdG8gc2xpZGVyXG4gICAgICAgIGNvbnN0ICR0b29sdGlwID0gJCgnPGRpdiBjbGFzcz1cImNkci1zbGlkZXItdG9vbHRpcFwiPjAwOjAwPC9kaXY+Jyk7XG4gICAgICAgIHRoaXMuJHNsaWRlci5hcHBlbmQoJHRvb2x0aXApO1xuICAgICAgICB0aGlzLiR0b29sdGlwID0gJHRvb2x0aXA7XG5cbiAgICAgICAgLy8gVXBkYXRlIHRvb2x0aXAgb24gbW91c2UgbW92ZSBvdmVyIHNsaWRlclxuICAgICAgICB0aGlzLiRzbGlkZXIub24oJ21vdXNlbW92ZScsIChlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVRvb2x0aXBQb3NpdGlvbihlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2hvdyB0b29sdGlwIG9uIG1vdXNlIGVudGVyXG4gICAgICAgIHRoaXMuJHNsaWRlci5vbignbW91c2VlbnRlcicsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuJHRvb2x0aXAuY3NzKCdvcGFjaXR5JywgJzEnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGlkZSB0b29sdGlwIG9uIG1vdXNlIGxlYXZlICh1bmxlc3MgZHJhZ2dpbmcpXG4gICAgICAgIHRoaXMuJHNsaWRlci5vbignbW91c2VsZWF2ZScsICgpID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy4kc2xpZGVyLmhhc0NsYXNzKCdkcmFnZ2luZycpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kdG9vbHRpcC5jc3MoJ29wYWNpdHknLCAnMCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUcmFjayBkcmFnZ2luZyBzdGF0ZVxuICAgICAgICB0aGlzLiRzbGlkZXIub24oJ21vdXNlZG93bicsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuJHNsaWRlci5hZGRDbGFzcygnZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgIHRoaXMuJHRvb2x0aXAuY3NzKCdvcGFjaXR5JywgJzEnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJChkb2N1bWVudCkub24oJ21vdXNldXAnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy4kc2xpZGVyLmhhc0NsYXNzKCdkcmFnZ2luZycpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kc2xpZGVyLnJlbW92ZUNsYXNzKCdkcmFnZ2luZycpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHRvb2x0aXAuY3NzKCdvcGFjaXR5JywgJzAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRvb2x0aXAgcG9zaXRpb24gYW5kIGNvbnRlbnRcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gTW91c2UgZXZlbnRcbiAgICAgKi9cbiAgICB1cGRhdGVUb29sdGlwUG9zaXRpb24oZSkge1xuICAgICAgICBjb25zdCBzbGlkZXJPZmZzZXQgPSB0aGlzLiRzbGlkZXIub2Zmc2V0KCk7XG4gICAgICAgIGNvbnN0IHNsaWRlcldpZHRoID0gdGhpcy4kc2xpZGVyLndpZHRoKCk7XG4gICAgICAgIGNvbnN0IG1vdXNlWCA9IGUucGFnZVggLSBzbGlkZXJPZmZzZXQubGVmdDtcbiAgICAgICAgY29uc3QgcGVyY2VudCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDEwMCwgKG1vdXNlWCAvIHNsaWRlcldpZHRoKSAqIDEwMCkpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aW1lIGF0IHRoaXMgcG9zaXRpb25cbiAgICAgICAgY29uc3QgZHVyYXRpb24gPSB0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb247XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUoZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCB0aW1lU2Vjb25kcyA9IChkdXJhdGlvbiAqIHBlcmNlbnQpIC8gMTAwO1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkVGltZSA9IHRoaXMuZm9ybWF0VGltZSh0aW1lU2Vjb25kcyk7XG4gICAgICAgICAgICB0aGlzLiR0b29sdGlwLnRleHQoZm9ybWF0dGVkVGltZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQb3NpdGlvbiB0b29sdGlwIGF0IG1vdXNlIHBvc2l0aW9uXG4gICAgICAgIHRoaXMuJHRvb2x0aXAuY3NzKCdsZWZ0JywgYCR7cGVyY2VudH0lYCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0IHRpbWUgaW4gc2Vjb25kcyB0byBNTTpTUyBvciBISDpNTTpTU1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzZWNvbmRzIC0gVGltZSBpbiBzZWNvbmRzXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0dGVkIHRpbWUgc3RyaW5nXG4gICAgICovXG4gICAgZm9ybWF0VGltZShzZWNvbmRzKSB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShudWxsKTtcbiAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKHBhcnNlSW50KHNlY29uZHMsIDEwKSk7XG4gICAgICAgIGNvbnN0IGRhdGVTdHIgPSBkYXRlLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gcGFyc2VJbnQoZGF0ZVN0ci5zdWJzdHIoMTEsIDIpLCAxMCk7XG5cbiAgICAgICAgaWYgKGhvdXJzID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0ZVN0ci5zdWJzdHIoMTQsIDUpO1xuICAgICAgICB9IGVsc2UgaWYgKGhvdXJzIDwgMTApIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRlU3RyLnN1YnN0cigxMiwgNyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0ZVN0ci5zdWJzdHIoMTEsIDgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGV0ZWN0IGF1ZGlvIGZvcm1hdCBmcm9tIENvbnRlbnQtVHlwZSBoZWFkZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGVudFR5cGUgLSBDb250ZW50LVR5cGUgaGVhZGVyIHZhbHVlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0IGlkZW50aWZpZXI6ICd3ZWJtJywgJ21wMycsICd3YXYnLCBvciAndW5rbm93bidcbiAgICAgKi9cbiAgICBkZXRlY3RBdWRpb0Zvcm1hdChjb250ZW50VHlwZSkge1xuICAgICAgICBpZiAoIWNvbnRlbnRUeXBlKSByZXR1cm4gJ3Vua25vd24nO1xuXG4gICAgICAgIGNvbnN0IGxvd2VyVHlwZSA9IGNvbnRlbnRUeXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmIChsb3dlclR5cGUuaW5jbHVkZXMoJ2F1ZGlvL3dlYm0nKSkgcmV0dXJuICd3ZWJtJztcbiAgICAgICAgaWYgKGxvd2VyVHlwZS5pbmNsdWRlcygnYXVkaW8vbXBlZycpIHx8IGxvd2VyVHlwZS5pbmNsdWRlcygnYXVkaW8vbXAzJykpIHJldHVybiAnbXAzJztcbiAgICAgICAgaWYgKGxvd2VyVHlwZS5pbmNsdWRlcygnYXVkaW8vd2F2JykgfHwgbG93ZXJUeXBlLmluY2x1ZGVzKCdhdWRpby94LXdhdicpKSByZXR1cm4gJ3dhdic7XG5cbiAgICAgICAgcmV0dXJuICd1bmtub3duJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZm9ybWF0IGJhZGdlIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybWF0IC0gQXVkaW8gZm9ybWF0ICh3ZWJtLCBtcDMsIHdhdilcbiAgICAgKi9cbiAgICB1cGRhdGVGb3JtYXRCYWRnZShmb3JtYXQpIHtcbiAgICAgICAgY29uc3QgJHJvdyA9ICQoYCMke3RoaXMuaWR9YCk7XG4gICAgICAgIGxldCAkYmFkZ2UgPSAkcm93LmZpbmQoJy5hdWRpby1mb3JtYXQtYmFkZ2UnKTtcblxuICAgICAgICAvLyBDcmVhdGUgYmFkZ2UgaWYgZG9lc24ndCBleGlzdFxuICAgICAgICBpZiAoJGJhZGdlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJGJhZGdlID0gJCgnPHNwYW4gY2xhc3M9XCJ1aSBtaW5pIGxhYmVsIGF1ZGlvLWZvcm1hdC1iYWRnZVwiPjwvc3Bhbj4nKTtcbiAgICAgICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi5iZWZvcmUoJGJhZGdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBiYWRnZSBjb250ZW50IGFuZCBzdHlsZVxuICAgICAgICBjb25zdCBmb3JtYXRVcHBlciA9IGZvcm1hdC50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAkYmFkZ2UudGV4dChmb3JtYXRVcHBlcik7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHByZXZpb3VzIGZvcm1hdCBjbGFzc2VzXG4gICAgICAgICRiYWRnZS5yZW1vdmVDbGFzcygnZ3JlZW4gb3JhbmdlIGJsdWUgZ3JleScpO1xuXG4gICAgICAgIC8vIEFwcGx5IGNvbG9yIGJhc2VkIG9uIGZvcm1hdFxuICAgICAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgICAgICAgY2FzZSAnd2VibSc6XG4gICAgICAgICAgICAgICAgJGJhZGdlLmFkZENsYXNzKCdncmVlbicpOyAvLyBNb2Rlcm4gZm9ybWF0XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdtcDMnOlxuICAgICAgICAgICAgICAgICRiYWRnZS5hZGRDbGFzcygnb3JhbmdlJyk7IC8vIExlZ2FjeSBjb21wcmVzc2VkXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd3YXYnOlxuICAgICAgICAgICAgICAgICRiYWRnZS5hZGRDbGFzcygnYmx1ZScpOyAvLyBVbmNvbXByZXNzZWRcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgJGJhZGdlLmFkZENsYXNzKCdncmV5Jyk7IC8vIFVua25vd25cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciBtZXRhZGF0YSBsb2FkZWQgZXZlbnQuXG4gICAgICovXG4gICAgY2JPbk1ldGFkYXRhTG9hZGVkKCkge1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKG51bGwpO1xuICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKHBhcnNlSW50KHRoaXMuY3VycmVudFRpbWUsIDEwKSk7IC8vIHNwZWNpZnkgdmFsdWUgZm9yIFNFQ09ORFMgaGVyZVxuICAgICAgICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIGRhdGUuc2V0U2Vjb25kcyhwYXJzZUludCh0aGlzLmR1cmF0aW9uLCAxMCkpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcbiAgICAgICAgICAgIGNvbnN0IGRhdGVTdHIgPSBkYXRlLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICBjb25zdCBob3VycyA9IHBhcnNlSW50KGRhdGVTdHIuc3Vic3RyKDExLCAyKSwgMTApO1xuICAgICAgICAgICAgbGV0IGR1cmF0aW9uO1xuICAgICAgICAgICAgaWYgKGhvdXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhvdXJzIDwgMTApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDEyLCA3KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPj0gMTApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDExLCA4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRyb3cuZmluZCgnc3Bhbi5jZHItZHVyYXRpb24nKS50ZXh0KGAke2N1cnJlbnRUaW1lfS8ke2R1cmF0aW9ufWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIHNsaWRlciBjaGFuZ2UgZXZlbnQuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG5ld1ZhbCAtIFRoZSBuZXcgdmFsdWUgb2YgdGhlIHNsaWRlci5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbWV0YSAtIEFkZGl0aW9uYWwgbWV0YWRhdGEuXG4gICAgICovXG4gICAgY2JPblNsaWRlckNoYW5nZShuZXdWYWwsIG1ldGEpIHtcbiAgICAgICAgaWYgKG1ldGEudHJpZ2dlcmVkQnlVc2VyICYmIE51bWJlci5pc0Zpbml0ZSh0aGlzLmh0bWw1QXVkaW8uZHVyYXRpb24pKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRoaXMuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8uY3VycmVudFRpbWUgPSAodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uICogbmV3VmFsKSAvIDEwMDtcbiAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGhpcy5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVDdXJyZW50ID0gbmV3IERhdGUobnVsbCk7XG4gICAgICAgICAgICBkYXRlQ3VycmVudC5zZXRTZWNvbmRzKHBhcnNlSW50KHRoaXMuaHRtbDVBdWRpby5jdXJyZW50VGltZSwgMTApKTsgLy8gc3BlY2lmeSB2YWx1ZSBmb3IgU0VDT05EUyBoZXJlXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VGltZSA9IGRhdGVDdXJyZW50LnRvSVNPU3RyaW5nKCkuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVEdXJhdGlvbiA9IG5ldyBEYXRlKG51bGwpO1xuICAgICAgICAgICAgZGF0ZUR1cmF0aW9uLnNldFNlY29uZHMocGFyc2VJbnQodGhpcy5odG1sNUF1ZGlvLmR1cmF0aW9uLCAxMCkpOyAvLyBzcGVjaWZ5IHZhbHVlIGZvciBTRUNPTkRTIGhlcmVcbiAgICAgICAgICAgIGNvbnN0IGRhdGVTdHIgPSBkYXRlRHVyYXRpb24udG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gcGFyc2VJbnQoZGF0ZVN0ci5zdWJzdHIoMTEsIDIpLCAxMCk7XG4gICAgICAgICAgICBsZXQgZHVyYXRpb247XG4gICAgICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGRhdGVTdHIuc3Vic3RyKDE0LCA1KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTIsIDcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChob3VycyA+PSAxMCkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZGF0ZVN0ci5zdWJzdHIoMTEsIDgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zcGFuRHVyYXRpb24udGV4dChgJHtjdXJyZW50VGltZX0vJHtkdXJhdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciB0aW1lIHVwZGF0ZSBldmVudC5cbiAgICAgKi9cbiAgICBjYlRpbWVVcGRhdGUoKSB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUodGhpcy5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSB0aGlzLmN1cnJlbnRUaW1lIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlUG9zaXRpb24gPSBNYXRoLm1pbihNYXRoLnJvdW5kKChwZXJjZW50KSAqIDEwMCksIDEwMCk7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgJHJvdy5maW5kKCdkaXYuY2RyLXBsYXllcicpLnJhbmdlKCdzZXQgdmFsdWUnLCByYW5nZVBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRUaW1lID09PSB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCdpLnBhdXNlJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgbWV0YWRhdGEgKGR1cmF0aW9uKSB3aXRob3V0IGxvYWRpbmcgdGhlIGZ1bGwgYXVkaW8gZmlsZS5cbiAgICAgKiBNYWtlcyBhIEhFQUQgcmVxdWVzdCB0byBnZXQgWC1BdWRpby1EdXJhdGlvbiBoZWFkZXIuXG4gICAgICovXG4gICAgbG9hZE1ldGFkYXRhKCkge1xuICAgICAgICBjb25zdCBzb3VyY2VTcmMgPSB0aGlzLmh0bWw1QXVkaW8uZ2V0QXR0cmlidXRlKCdkYXRhLXNyYycpO1xuICAgICAgICBpZiAoIXNvdXJjZVNyYyB8fCAhc291cmNlU3JjLmluY2x1ZGVzKCcvcGJ4Y29yZS9hcGkvJykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIGZ1bGwgVVJMIChSRVNUIEFQSSBwYXRocyBhbHdheXMgc3RhcnQgd2l0aCAvcGJ4Y29yZS8pXG4gICAgICAgIGNvbnN0IGZ1bGxVcmwgPSBzb3VyY2VTcmMuc3RhcnRzV2l0aCgnaHR0cCcpXG4gICAgICAgICAgICA/IHNvdXJjZVNyY1xuICAgICAgICAgICAgOiBgJHt3aW5kb3cubG9jYXRpb24ub3JpZ2lufSR7c291cmNlU3JjfWA7XG5cbiAgICAgICAgLy8gUHJlcGFyZSBoZWFkZXJzIHdpdGggQmVhcmVyIHRva2VuXG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCdcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYWtlIEhFQUQgcmVxdWVzdCB0byBnZXQgb25seSBoZWFkZXJzIChubyBib2R5IGRvd25sb2FkKVxuICAgICAgICBmZXRjaChmdWxsVXJsLCB7XG4gICAgICAgICAgICBtZXRob2Q6ICdIRUFEJyxcbiAgICAgICAgICAgIGhlYWRlcnNcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgIC8vIEZpbGUgbm90IGZvdW5kICg0MjIpIG9yIG90aGVyIGVycm9yIC0gZGlzYWJsZSBwbGF5ZXIgY29udHJvbHNcbiAgICAgICAgICAgICAgICB0aGlzLmRpc2FibGVQbGF5ZXIoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgZHVyYXRpb24gZnJvbSBoZWFkZXJcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uU2Vjb25kcyA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdYLUF1ZGlvLUR1cmF0aW9uJyk7XG4gICAgICAgICAgICBpZiAoZHVyYXRpb25TZWNvbmRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBwYXJzZUZsb2F0KGR1cmF0aW9uU2Vjb25kcyk7XG4gICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZHVyYXRpb24gb24gYXVkaW8gZWxlbWVudCBmb3IgdG9vbHRpcCBmdW5jdGlvbmFsaXR5XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLmh0bWw1QXVkaW8sICdkdXJhdGlvbicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBkdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIGRhdGUuc2V0U2Vjb25kcyhwYXJzZUludChkdXJhdGlvbiwgMTApKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGRhdGUudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZvcm1hdHRlZDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhvdXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWQgPSBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPCAxMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkID0gZGF0ZVN0ci5zdWJzdHIoMTIsIDcpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkID0gZGF0ZVN0ci5zdWJzdHIoMTEsIDgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi50ZXh0KGAwMDowMC8ke2Zvcm1hdHRlZH1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBOZXR3b3JrIGVycm9yIG9yIG90aGVyIGZhaWx1cmUgLSBkaXNhYmxlIHBsYXllciBjb250cm9sc1xuICAgICAgICAgICAgdGhpcy5kaXNhYmxlUGxheWVyKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN0b3AgcGxheWJhY2sgKGNhbGxlZCBmcm9tIHN0YXRpYyBzdG9wT3RoZXJzIG1ldGhvZClcbiAgICAgKi9cbiAgICBzdG9wUGxheWJhY2soKSB7XG4gICAgICAgIGlmICghdGhpcy5odG1sNUF1ZGlvLnBhdXNlZCkge1xuICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBhdXNlKCk7XG4gICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhbiB1cCBhdWRpbyBub2RlcyB0byBwcmV2ZW50IG1lbW9yeSBsZWFrc1xuICAgICAgICB0aGlzLmNsZWFudXBBdWRpb05vZGVzKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2xlYW4gdXAgV2ViIEF1ZGlvIEFQSSBub2Rlc1xuICAgICAqL1xuICAgIGNsZWFudXBBdWRpb05vZGVzKCkge1xuICAgICAgICBpZiAodGhpcy5zY3JpcHRQcm9jZXNzb3IpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gRGlzY29ubmVjdCBhbGwgbm9kZXNcbiAgICAgICAgICAgICAgICB0aGlzLnNjcmlwdFByb2Nlc3Nvci5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JpcHRQcm9jZXNzb3Iub25hdWRpb3Byb2Nlc3MgPSBudWxsO1xuICAgICAgICAgICAgICAgIHRoaXMuc2NyaXB0UHJvY2Vzc29yID0gbnVsbDtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgY2xlYW51cCBlcnJvcnNcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnNvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zb3VyY2VOb2RlLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgY2xlYW51cCBlcnJvcnNcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmdhaW5Ob2RlKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2Fpbk5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBjbGVhbnVwIGVycm9yc1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGxheXMgb3IgcGF1c2VzIHRoZSBhdWRpbyBmaWxlLlxuICAgICAqL1xuICAgIHBsYXkoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGF1ZGlvIGFscmVhZHkgaGFzIGEgYmxvYiBzb3VyY2UgbG9hZGVkXG4gICAgICAgIGlmICh0aGlzLmh0bWw1QXVkaW8uc3JjICYmIHRoaXMuaHRtbDVBdWRpby5zcmMuc3RhcnRzV2l0aCgnYmxvYjonKSkge1xuICAgICAgICAgICAgLy8gQmxvYiBhbHJlYWR5IGxvYWRlZCwganVzdCB0b2dnbGUgcGxheS9wYXVzZVxuICAgICAgICAgICAgaWYgKHRoaXMuaHRtbDVBdWRpby5wYXVzZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBTdG9wIGFsbCBvdGhlciBwbGF5ZXJzIGJlZm9yZSBwbGF5aW5nIHRoaXMgb25lXG4gICAgICAgICAgICAgICAgQ0RSUGxheWVyLnN0b3BPdGhlcnModGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sNUF1ZGlvLnBsYXkoKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFBhdXNpbmcgLSBjbGVhciBjdXJyZW50bHkgcGxheWluZyByZWZlcmVuY2VcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgICAgICAgICAgaWYgKENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nID09PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gQ2xlYW4gdXAgYXVkaW8gbm9kZXMgd2hlbiBwYXVzaW5nXG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhbnVwQXVkaW9Ob2RlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTmVlZCB0byBsb2FkIHNvdXJjZSBmaXJzdFxuICAgICAgICBsZXQgc291cmNlU3JjID0gdGhpcy5odG1sNUF1ZGlvLmdldEF0dHJpYnV0ZSgnZGF0YS1zcmMnKSB8fCAnJztcblxuICAgICAgICAvLyBJZiBzb3VyY2UgaXMgYW4gQVBJIGVuZHBvaW50IHdpdGggdG9rZW4sIGxvYWQgaXQgZGlyZWN0bHlcbiAgICAgICAgLy8gV0hZOiBUb2tlbi1iYXNlZCBVUkxzIGFscmVhZHkgY29udGFpbiBhbGwgbmVjZXNzYXJ5IGluZm9ybWF0aW9uXG4gICAgICAgIGlmIChzb3VyY2VTcmMgJiYgc291cmNlU3JjLmluY2x1ZGVzKCcvcGJ4Y29yZS9hcGkvJykpIHtcbiAgICAgICAgICAgIC8vIFN0b3AgYWxsIG90aGVyIHBsYXllcnMgYmVmb3JlIGxvYWRpbmcgbmV3IHNvdXJjZVxuICAgICAgICAgICAgQ0RSUGxheWVyLnN0b3BPdGhlcnModGhpcyk7XG4gICAgICAgICAgICB0aGlzLmxvYWRBdXRoZW50aWNhdGVkU291cmNlKHNvdXJjZVNyYyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGYWxsYmFjayBmb3Igbm9uLUFQSSBzb3VyY2VzIG9yIGFscmVhZHkgbG9hZGVkXG4gICAgICAgIGlmICh0aGlzLmh0bWw1QXVkaW8ucGF1c2VkICYmIHRoaXMuaHRtbDVBdWRpby5kdXJhdGlvbikge1xuICAgICAgICAgICAgQ0RSUGxheWVyLnN0b3BPdGhlcnModGhpcyk7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuICAgICAgICAgICAgdGhpcy4kcEJ1dHRvbi5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLmh0bWw1QXVkaW8ucGF1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGF1c2UoKTtcbiAgICAgICAgICAgIHRoaXMuJHBCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIGlmIChDRFJQbGF5ZXIuY3VycmVudGx5UGxheWluZyA9PT0gdGhpcykge1xuICAgICAgICAgICAgICAgIENEUlBsYXllci5jdXJyZW50bHlQbGF5aW5nID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgV2ViIEF1ZGlvIEFQSSBmb3IgbW9ubyBtaXhpbmdcbiAgICAgKiBXSFk6IFN0ZXJlbyBjYWxsIHJlY29yZGluZ3MgaGF2ZSBleHRlcm5hbCBjaGFubmVsIChsZWZ0KSBhbmQgaW50ZXJuYWwgY2hhbm5lbCAocmlnaHQpXG4gICAgICogTWl4aW5nIHRvIG1vbm8gbWFrZXMgYm90aCBzcGVha2VycyBhdWRpYmxlIGluIHNpbmdsZSBjaGFubmVsIGZvciBlYXNpZXIgbGlzdGVuaW5nXG4gICAgICpcbiAgICAgKiBBUFBST0FDSDogVXNlIHNpbXBsZSBnYWluLWJhc2VkIGRvd25taXhpbmdcbiAgICAgKiBNb3N0IHJlbGlhYmxlIG1ldGhvZCB0aGF0IHdvcmtzIHdpdGggYWxsIGF1ZGlvIGZvcm1hdHMgaW5jbHVkaW5nIFdlYk0vT3B1c1xuICAgICAqL1xuICAgIHNldHVwTW9ub01peGVyKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGF1ZGlvIGNvbnRleHQgaWYgbm90IGV4aXN0c1xuICAgICAgICAgICAgaWYgKCF0aGlzLmF1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IEF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvQ29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHNvdXJjZSBub2RlIGZyb20gYXVkaW8gZWxlbWVudCAoY2FuIG9ubHkgYmUgY3JlYXRlZCBvbmNlISlcbiAgICAgICAgICAgIGlmICghdGhpcy5zb3VyY2VOb2RlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zb3VyY2VOb2RlID0gdGhpcy5hdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFFbGVtZW50U291cmNlKHRoaXMuaHRtbDVBdWRpbyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERpc2Nvbm5lY3QgcHJldmlvdXMgY29ubmVjdGlvbnMgaWYgdGhleSBleGlzdFxuICAgICAgICAgICAgaWYgKHRoaXMuZ2Fpbk5vZGUpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZU5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmdhaW5Ob2RlLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElnbm9yZSBkaXNjb25uZWN0IGVycm9yc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgU2NyaXB0UHJvY2Vzc29yTm9kZSB3aXRoIDIgaW5wdXQgY2hhbm5lbHMgYW5kIDIgb3V0cHV0IGNoYW5uZWxzXG4gICAgICAgICAgICAvLyBCdWZmZXIgc2l6ZSBvZiA0MDk2IGZvciBnb29kIGJhbGFuY2UgYmV0d2VlbiBsYXRlbmN5IGFuZCBwZXJmb3JtYW5jZVxuICAgICAgICAgICAgY29uc3QgYnVmZmVyU2l6ZSA9IDQwOTY7XG4gICAgICAgICAgICBjb25zdCBzY3JpcHRQcm9jZXNzb3IgPSB0aGlzLmF1ZGlvQ29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoYnVmZmVyU2l6ZSwgMiwgMik7XG5cbiAgICAgICAgICAgIC8vIFN0b3JlIHJlZmVyZW5jZSBmb3IgY2xlYW51cFxuICAgICAgICAgICAgdGhpcy5zY3JpcHRQcm9jZXNzb3IgPSBzY3JpcHRQcm9jZXNzb3I7XG5cbiAgICAgICAgICAgIC8vIFByb2Nlc3MgYXVkaW8gdG8gZm9yY2UgbW9ubyBvdXRwdXRcbiAgICAgICAgICAgIHNjcmlwdFByb2Nlc3Nvci5vbmF1ZGlvcHJvY2VzcyA9IChhdWRpb1Byb2Nlc3NpbmdFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0QnVmZmVyID0gYXVkaW9Qcm9jZXNzaW5nRXZlbnQuaW5wdXRCdWZmZXI7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0QnVmZmVyID0gYXVkaW9Qcm9jZXNzaW5nRXZlbnQub3V0cHV0QnVmZmVyO1xuXG4gICAgICAgICAgICAgICAgLy8gR2V0IG51bWJlciBvZiBjaGFubmVscyBpbiB0aGUgYnVmZmVyXG4gICAgICAgICAgICAgICAgY29uc3QgaW5wdXRDaGFubmVsQ291bnQgPSBpbnB1dEJ1ZmZlci5udW1iZXJPZkNoYW5uZWxzO1xuICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dENoYW5uZWxDb3VudCA9IG91dHB1dEJ1ZmZlci5udW1iZXJPZkNoYW5uZWxzO1xuXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGRpZmZlcmVudCBjaGFubmVsIGNvbmZpZ3VyYXRpb25zXG4gICAgICAgICAgICAgICAgaWYgKGlucHV0Q2hhbm5lbENvdW50ID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElucHV0IGlzIGFscmVhZHkgbW9ubyAtIGNvcHkgdG8gYm90aCBvdXRwdXQgY2hhbm5lbHNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5wdXRNb25vID0gaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dEwgPSBvdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dFIgPSBvdXRwdXRDaGFubmVsQ291bnQgPiAxID8gb3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDEpIDogbnVsbDtcblxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0TW9uby5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0TFtpXSA9IGlucHV0TW9ub1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvdXRwdXRSKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0UltpXSA9IGlucHV0TW9ub1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5wdXRDaGFubmVsQ291bnQgPj0gMikge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbnB1dCBpcyBzdGVyZW8gb3IgbXVsdGktY2hhbm5lbCAtIG1peCB0byBtb25vXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0TCA9IGlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dFIgPSBpbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0TCA9IG91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0UiA9IG91dHB1dENoYW5uZWxDb3VudCA+IDEgPyBvdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkgOiBudWxsO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIE1peCBMK1IgdG8gbW9ubyBhbmQgY29weSB0byBib3RoIG91dHB1dCBjaGFubmVsc1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0TC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXZlcmFnZSBMIGFuZCBSIGNoYW5uZWxzIGZvciB0cnVlIG1vbm9cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vbm9TYW1wbGUgPSAoaW5wdXRMW2ldICsgaW5wdXRSW2ldKSAqIDAuNTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gV3JpdGUgdGhlIHNhbWUgbW9ubyBzaWduYWwgdG8gYm90aCBvdXRwdXQgY2hhbm5lbHNcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dExbaV0gPSBtb25vU2FtcGxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG91dHB1dFIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXRSW2ldID0gbW9ub1NhbXBsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSBnYWluIG5vZGUgZm9yIHZvbHVtZSBjb250cm9sXG4gICAgICAgICAgICB0aGlzLmdhaW5Ob2RlID0gdGhpcy5hdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgICAgICAgICAvLyBDb25uZWN0IHRoZSBhdWRpbyBncmFwaDpcbiAgICAgICAgICAgIC8vIHNvdXJjZSDihpIgc2NyaXB0UHJvY2Vzc29yIOKGkiBnYWluIOKGkiBkZXN0aW5hdGlvblxuICAgICAgICAgICAgdGhpcy5zb3VyY2VOb2RlLmNvbm5lY3Qoc2NyaXB0UHJvY2Vzc29yKTtcbiAgICAgICAgICAgIHNjcmlwdFByb2Nlc3Nvci5jb25uZWN0KHRoaXMuZ2Fpbk5vZGUpO1xuICAgICAgICAgICAgdGhpcy5nYWluTm9kZS5jb25uZWN0KHRoaXMuYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IGF1ZGlvIHdpbGwgcGxheSBhcyBzdGVyZW8gdGhyb3VnaCBub3JtYWwgSFRNTDUgYXVkaW9cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgYXVkaW8gZnJvbSBhdXRoZW50aWNhdGVkIEFQSSBlbmRwb2ludCB1c2luZyBmZXRjaCArIEJlYXJlciB0b2tlblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhcGlVcmwgLSBUaGUgQVBJIFVSTCByZXF1aXJpbmcgYXV0aGVudGljYXRpb25cbiAgICAgKi9cbiAgICBsb2FkQXV0aGVudGljYXRlZFNvdXJjZShhcGlVcmwpIHtcbiAgICAgICAgLy8gQnVpbGQgZnVsbCBVUkwgKFJFU1QgQVBJIHBhdGhzIGFsd2F5cyBzdGFydCB3aXRoIC9wYnhjb3JlLylcbiAgICAgICAgY29uc3QgZnVsbFVybCA9IGFwaVVybC5zdGFydHNXaXRoKCdodHRwJylcbiAgICAgICAgICAgID8gYXBpVXJsXG4gICAgICAgICAgICA6IGAke3dpbmRvdy5sb2NhdGlvbi5vcmlnaW59JHthcGlVcmx9YDtcblxuICAgICAgICAvLyBQcmVwYXJlIGhlYWRlcnMgd2l0aCBCZWFyZXIgdG9rZW5cbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIGF1ZGlvIGZpbGUgd2l0aCBhdXRoZW50aWNhdGlvblxuICAgICAgICBmZXRjaChmdWxsVXJsLCB7IGhlYWRlcnMgfSlcbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c306ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBEZXRlY3QgZm9ybWF0IGZyb20gQ29udGVudC1UeXBlIGhlYWRlclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpO1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEZvcm1hdCA9IHRoaXMuZGV0ZWN0QXVkaW9Gb3JtYXQoY29udGVudFR5cGUpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm1hdCBiYWRnZVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRGb3JtYXQgJiYgdGhpcy5jdXJyZW50Rm9ybWF0ICE9PSAndW5rbm93bicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVGb3JtYXRCYWRnZSh0aGlzLmN1cnJlbnRGb3JtYXQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgZHVyYXRpb24gZnJvbSBoZWFkZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb25TZWNvbmRzID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ1gtQXVkaW8tRHVyYXRpb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb25TZWNvbmRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gcGFyc2VGbG9hdChkdXJhdGlvblNlY29uZHMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb24gPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlLnNldFNlY29uZHMocGFyc2VJbnQoZHVyYXRpb24sIDEwKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlU3RyID0gZGF0ZS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaG91cnMgPSBwYXJzZUludChkYXRlU3RyLnN1YnN0cigxMSwgMiksIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmb3JtYXR0ZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWQgPSBkYXRlU3RyLnN1YnN0cigxNCwgNSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGhvdXJzIDwgMTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWQgPSBkYXRlU3RyLnN1YnN0cigxMiwgNyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZCA9IGRhdGVTdHIuc3Vic3RyKDExLCA4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi50ZXh0KGAwMDowMC8ke2Zvcm1hdHRlZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5ibG9iKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oYmxvYiA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGJsb2IgVVJMIGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBjb25zdCBibG9iVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblxuICAgICAgICAgICAgICAgIC8vIFJldm9rZSBwcmV2aW91cyBibG9iIFVSTCBpZiBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5odG1sNUF1ZGlvLnNyYyAmJiB0aGlzLmh0bWw1QXVkaW8uc3JjLnN0YXJ0c1dpdGgoJ2Jsb2I6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLmh0bWw1QXVkaW8uc3JjKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgYmxvYiBVUkwgZGlyZWN0bHkgdG8gYXVkaW8gZWxlbWVudFxuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5zcmMgPSBibG9iVXJsO1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5sb2FkKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXR1cCBtb25vIG1peGVyIG9uIGZpcnN0IHBsYXliYWNrIG9ubHlcbiAgICAgICAgICAgICAgICAvLyBXSFk6IFdlYiBBdWRpbyBBUEkgcmVxdWlyZXMgdXNlciBpbnRlcmFjdGlvbiBiZWZvcmUgY3JlYXRpbmcgQXVkaW9Db250ZXh0XG4gICAgICAgICAgICAgICAgLy8gTWVkaWFFbGVtZW50U291cmNlIGNhbiBvbmx5IGJlIGNyZWF0ZWQgb25jZSBwZXIgYXVkaW8gZWxlbWVudFxuICAgICAgICAgICAgICAgIC8vIEFmdGVyIGZpcnN0IHNldHVwLCBzYW1lIHNvdXJjZSBub2RlIHdvcmtzIGZvciBhbGwgc3Vic2VxdWVudCBmaWxlc1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5zb3VyY2VOb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dXBNb25vTWl4ZXIoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBdXRvLXBsYXkgYWZ0ZXIgbG9hZGluZ1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5vbmNhbnBsYXl0aHJvdWdoID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmh0bWw1QXVkaW8ucGxheSgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRwQnV0dG9uLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaHRtbDVBdWRpby5vbmNhbnBsYXl0aHJvdWdoID0gbnVsbDtcblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3IubWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmNkcl9BdWRpb0ZpbGVMb2FkRXJyb3IpO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRG93bmxvYWQgZmlsZSB3aXRoIGF1dGhlbnRpY2F0aW9uIGFuZCBvcHRpb25hbCBmb3JtYXQgY29udmVyc2lvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkb3dubG9hZFVybCAtIERvd25sb2FkIFVSTCByZXF1aXJpbmcgQmVhcmVyIHRva2VuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm1hdCAtIERlc2lyZWQgYXVkaW8gZm9ybWF0IChvcmlnaW5hbCwgbXAzLCB3YXYsIHdlYm0sIG9nZylcbiAgICAgKi9cbiAgICBkb3dubG9hZEZpbGUoZG93bmxvYWRVcmwsIGZvcm1hdCA9ICd3ZWJtJykge1xuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIGFuIEFQSSBVUkwgdGhhdCByZXF1aXJlcyBhdXRoZW50aWNhdGlvblxuICAgICAgICBpZiAoZG93bmxvYWRVcmwuaW5jbHVkZXMoJy9wYnhjb3JlL2FwaS8nKSkge1xuICAgICAgICAgICAgLy8gQWRkIGZvcm1hdCBwYXJhbWV0ZXIgdG8gVVJMIGlmIG5vdCAnb3JpZ2luYWwnXG4gICAgICAgICAgICBsZXQgdXJsV2l0aEZvcm1hdCA9IGRvd25sb2FkVXJsO1xuICAgICAgICAgICAgaWYgKGZvcm1hdCAhPT0gJ29yaWdpbmFsJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlcGFyYXRvciA9IGRvd25sb2FkVXJsLmluY2x1ZGVzKCc/JykgPyAnJicgOiAnPyc7XG4gICAgICAgICAgICAgICAgdXJsV2l0aEZvcm1hdCA9IGAke2Rvd25sb2FkVXJsfSR7c2VwYXJhdG9yfWZvcm1hdD0ke2VuY29kZVVSSUNvbXBvbmVudChmb3JtYXQpfWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIGZ1bGwgVVJMIChSRVNUIEFQSSBwYXRocyBhbHdheXMgc3RhcnQgd2l0aCAvcGJ4Y29yZS8pXG4gICAgICAgICAgICBjb25zdCBmdWxsVXJsID0gdXJsV2l0aEZvcm1hdC5zdGFydHNXaXRoKCdodHRwJylcbiAgICAgICAgICAgICAgICA/IHVybFdpdGhGb3JtYXRcbiAgICAgICAgICAgICAgICA6IGAke3dpbmRvdy5sb2NhdGlvbi5vcmlnaW59JHt1cmxXaXRoRm9ybWF0fWA7XG5cbiAgICAgICAgICAgIC8vIFByZXBhcmUgaGVhZGVycyB3aXRoIEJlYXJlciB0b2tlblxuICAgICAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCdcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZldGNoIGZpbGUgd2l0aCBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgZmV0Y2goZnVsbFVybCwgeyBoZWFkZXJzIH0pXG4gICAgICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9OiAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBHZXQgZmlsZW5hbWUgZnJvbSBDb250ZW50LURpc3Bvc2l0aW9uIGhlYWRlciBvciBVUkxcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzcG9zaXRpb24gPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1EaXNwb3NpdGlvbicpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmlsZW5hbWUgPSBgY2FsbC1yZWNvcmQuJHtmb3JtYXQgfHwgJ21wMyd9YDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpc3Bvc2l0aW9uICYmIGRpc3Bvc2l0aW9uLmluY2x1ZGVzKCdmaWxlbmFtZT0nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0Y2hlcyA9IC9maWxlbmFtZVteOz1cXG5dKj0oKFsnXCJdKS4qP1xcMnxbXjtcXG5dKikvLmV4ZWMoZGlzcG9zaXRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1hdGNoZXMgIT0gbnVsbCAmJiBtYXRjaGVzWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWUgPSBtYXRjaGVzWzFdLnJlcGxhY2UoL1snXCJdL2csICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyeSB0byBleHRyYWN0IGZyb20gVVJMIHBhcmFtZXRlcnNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoZG93bmxvYWRVcmwuc3BsaXQoJz8nKVsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlbmFtZVBhcmFtID0gdXJsUGFyYW1zLmdldCgnZmlsZW5hbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWxlbmFtZVBhcmFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWUgPSBmaWxlbmFtZVBhcmFtO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmJsb2IoKS50aGVuKGJsb2IgPT4gKHsgYmxvYiwgZmlsZW5hbWUgfSkpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnRoZW4oKHsgYmxvYiwgZmlsZW5hbWUgfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgZG93bmxvYWQgbGlua1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgICAgICAgICAgICAgYS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICBhLmhyZWYgPSB1cmw7XG4gICAgICAgICAgICAgICAgICAgIGEuZG93bmxvYWQgPSBmaWxlbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhKTtcbiAgICAgICAgICAgICAgICAgICAgYS5jbGljaygpO1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGEpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yLm1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZS5jZHJfQXVkaW9GaWxlRG93bmxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMZWdhY3kgZGlyZWN0IGZpbGUgVVJMIChubyBhdXRoIG5lZWRlZClcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGRvd25sb2FkVXJsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIHNyYyBtZWRpYSBlcnJvciBldmVudC5cbiAgICAgKi9cbiAgICBjYk9uU3JjTWVkaWFFcnJvcigpIHtcbiAgICAgICAgJCh0aGlzKS5jbG9zZXN0KCd0cicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERpc2FibGUgcGxheWVyIGNvbnRyb2xzIHdoZW4gZmlsZSBpcyBub3QgYXZhaWxhYmxlXG4gICAgICogSGlkZXMgcGxheSBhbmQgZG93bmxvYWQgYnV0dG9ucywgZGlzYWJsZXMgb25seSBwbGF5ZXIgY2VsbHMgKG5vdCBlbnRpcmUgcm93KVxuICAgICAqL1xuICAgIGRpc2FibGVQbGF5ZXIoKSB7XG4gICAgICAgIC8vIEhpZGUgcGxheSBidXR0b25cbiAgICAgICAgdGhpcy4kcEJ1dHRvbi5oaWRlKCk7XG5cbiAgICAgICAgLy8gSGlkZSBkb3dubG9hZCBidXR0b25cbiAgICAgICAgdGhpcy4kZEJ1dHRvbi5oaWRlKCk7XG5cbiAgICAgICAgLy8gU2hvdyBwbGFjZWhvbGRlciBpbiBkdXJhdGlvbiBzcGFuXG4gICAgICAgIHRoaXMuJHNwYW5EdXJhdGlvbi50ZXh0KCctLTotLS8tLTotLScpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgIC8vIERpc2FibGUgc2xpZGVyIGFuZCBpdHMgcGFyZW50IGNlbGxcbiAgICAgICAgdGhpcy4kc2xpZGVyLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB0aGlzLiRzbGlkZXIuY2xvc2VzdCgndGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICAvLyBEaXNhYmxlIGR1cmF0aW9uIGNlbGxcbiAgICAgICAgdGhpcy4kc3BhbkR1cmF0aW9uLmNsb3Nlc3QoJ3RkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfVxufSJdfQ==