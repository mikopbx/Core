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
class CDRPlayer {

    // Static property to track currently playing instance
    static currentlyPlaying = null;

    /**
     * Stop all other players except the given one
     * @param {CDRPlayer} exceptPlayer - The player that should continue playing
     */
    static stopOthers(exceptPlayer) {
        if (CDRPlayer.currentlyPlaying && CDRPlayer.currentlyPlaying !== exceptPlayer) {
            CDRPlayer.currentlyPlaying.stopPlayback();
        }
        CDRPlayer.currentlyPlaying = exceptPlayer;
    }

    /**
     * Creates an instance of CDRPlayer.
     * @param {string} id - The ID of the player.
     */
    constructor(id) {
        this.id = id;
        this.html5Audio = document.getElementById(`audio-player-${id}`);
        const $row = $(`#${id}`);

        // Track current audio format (webm, mp3, wav)
        this.currentFormat = null;

        // Web Audio API for mono mixing
        // WHY: Automatically mix stereo recordings (left=external, right=internal) to mono
        // This makes both speakers audible in single channel for easier listening
        this.audioContext = null;
        this.sourceNode = null;
        this.gainNode = null;

        // Check if already initialized to prevent double processing
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
        this.$dButton.unbind();

        // Store original src in data-src attribute for authenticated loading
        const originalSrc = this.html5Audio.getAttribute('src');
        if (originalSrc && originalSrc.includes('/pbxcore/api/')) {
            this.html5Audio.setAttribute('data-src', originalSrc);
            this.html5Audio.removeAttribute('src'); // Remove direct src
        }

        // Play button event listener
        this.$pButton.on('click', (e) => {
            e.preventDefault();
            this.play();
        });

        // Initialize download format dropdown
        const $downloadDropdown = $row.find('.download-format-dropdown');
        if ($downloadDropdown.length > 0) {
            $downloadDropdown.dropdown({
                action: 'hide',
                onChange: (value, text, $choice) => {
                    const format = $choice.data('format');
                    const downloadUrl = $downloadDropdown.data('download-url');
                    if (downloadUrl && format) {
                        this.downloadFile(downloadUrl, format);
                    }
                }
            });
        }

        // Legacy: Download button event listener (for old UI without dropdown)
        this.$dButton.on('click', (e) => {
            e.preventDefault();
            const downloadUrl = $(e.target).attr('data-value');
            if (downloadUrl) {
                // Download in WebM format by default
                this.downloadFile(downloadUrl, 'webm');
            }
        });

        // Loaded metadata event listener
        this.html5Audio.addEventListener('loadedmetadata', this.cbOnMetadataLoaded.bind(this), false);

        // timeupdate event listener
        this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);

        // ended event listener - clear currently playing reference
        this.html5Audio.addEventListener('ended', () => {
            if (CDRPlayer.currentlyPlaying === this) {
                CDRPlayer.currentlyPlaying = null;
            }
        }, false);

        // no src handler
        this.html5Audio.addEventListener('error', this.cbOnSrcMediaError, false);

        this.$slider.range({
            min: 0,
            max: 100,
            start: 0,
            onChange: this.cbOnSliderChange,
            html5Audio: this.html5Audio,
            cbTimeUpdate: this.cbTimeUpdate,
            spanDuration: this.$spanDuration,
        });

        // Add tooltip to slider
        this.initializeTooltip();

        // Mark as initialized
        $row.addClass('initialized');

        // Load metadata on initialization
        this.loadMetadata();
    }

    /**
     * Initialize tooltip for slider
     */
    initializeTooltip() {
        // Add tooltip element to slider
        const $tooltip = $('<div class="cdr-slider-tooltip">00:00</div>');
        this.$slider.append($tooltip);
        this.$tooltip = $tooltip;

        // Update tooltip on mouse move over slider
        this.$slider.on('mousemove', (e) => {
            this.updateTooltipPosition(e);
        });

        // Show tooltip on mouse enter
        this.$slider.on('mouseenter', () => {
            this.$tooltip.css('opacity', '1');
        });

        // Hide tooltip on mouse leave (unless dragging)
        this.$slider.on('mouseleave', () => {
            if (!this.$slider.hasClass('dragging')) {
                this.$tooltip.css('opacity', '0');
            }
        });

        // Track dragging state
        this.$slider.on('mousedown', () => {
            this.$slider.addClass('dragging');
            this.$tooltip.css('opacity', '1');
        });

        $(document).on('mouseup', () => {
            if (this.$slider.hasClass('dragging')) {
                this.$slider.removeClass('dragging');
                this.$tooltip.css('opacity', '0');
            }
        });
    }

    /**
     * Update tooltip position and content
     * @param {Event} e - Mouse event
     */
    updateTooltipPosition(e) {
        const sliderOffset = this.$slider.offset();
        const sliderWidth = this.$slider.width();
        const mouseX = e.pageX - sliderOffset.left;
        const percent = Math.max(0, Math.min(100, (mouseX / sliderWidth) * 100));

        // Calculate time at this position
        const duration = this.html5Audio.duration;
        if (Number.isFinite(duration)) {
            const timeSeconds = (duration * percent) / 100;
            const formattedTime = this.formatTime(timeSeconds);
            this.$tooltip.text(formattedTime);
        }

        // Position tooltip at mouse position
        this.$tooltip.css('left', `${percent}%`);
    }

    /**
     * Format time in seconds to MM:SS or HH:MM:SS
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    formatTime(seconds) {
        const date = new Date(null);
        date.setSeconds(parseInt(seconds, 10));
        const dateStr = date.toISOString();
        const hours = parseInt(dateStr.substr(11, 2), 10);

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
    detectAudioFormat(contentType) {
        if (!contentType) return 'unknown';

        const lowerType = contentType.toLowerCase();
        if (lowerType.includes('audio/webm')) return 'webm';
        if (lowerType.includes('audio/mpeg') || lowerType.includes('audio/mp3')) return 'mp3';
        if (lowerType.includes('audio/wav') || lowerType.includes('audio/x-wav')) return 'wav';

        return 'unknown';
    }

    /**
     * Update format badge display
     * @param {string} format - Audio format (webm, mp3, wav)
     */
    updateFormatBadge(format) {
        const $row = $(`#${this.id}`);
        let $badge = $row.find('.audio-format-badge');

        // Create badge if doesn't exist
        if ($badge.length === 0) {
            $badge = $('<span class="ui mini label audio-format-badge"></span>');
            this.$spanDuration.before($badge);
        }

        // Update badge content and style
        const formatUpper = format.toUpperCase();
        $badge.text(formatUpper);

        // Remove previous format classes
        $badge.removeClass('green orange blue grey');

        // Apply color based on format
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
                $badge.addClass('grey'); // Unknown
        }
    }

    /**
     * Callback for metadata loaded event.
     */
    cbOnMetadataLoaded() {
        if (Number.isFinite(this.duration)) {
            const $row = $(this).closest('tr');
            const date = new Date(null);
            date.setSeconds(parseInt(this.currentTime, 10)); // specify value for SECONDS here
            const currentTime = date.toISOString().substr(14, 5);
            date.setSeconds(parseInt(this.duration, 10)); // specify value for SECONDS here
            const dateStr = date.toISOString();
            const hours = parseInt(dateStr.substr(11, 2), 10);
            let duration;
            if (hours === 0) {
                duration = dateStr.substr(14, 5);
            } else if (hours < 10) {
                duration = dateStr.substr(12, 7);
            } else if (hours >= 10) {
                duration = dateStr.substr(11, 8);
            }
            $row.find('span.cdr-duration').text(`${currentTime}/${duration}`);
        }
    }

    /**
     * Callback for slider change event.
     * @param {number} newVal - The new value of the slider.
     * @param {object} meta - Additional metadata.
     */
    cbOnSliderChange(newVal, meta) {
        if (meta.triggeredByUser && Number.isFinite(this.html5Audio.duration)) {
            this.html5Audio.removeEventListener('timeupdate', this.cbTimeUpdate, false);
            this.html5Audio.currentTime = (this.html5Audio.duration * newVal) / 100;
            this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);
        }
        if (Number.isFinite(this.html5Audio.duration)) {
            const dateCurrent = new Date(null);
            dateCurrent.setSeconds(parseInt(this.html5Audio.currentTime, 10)); // specify value for SECONDS here
            const currentTime = dateCurrent.toISOString().substr(14, 5);
            const dateDuration = new Date(null);
            dateDuration.setSeconds(parseInt(this.html5Audio.duration, 10)); // specify value for SECONDS here
            const dateStr = dateDuration.toISOString();
            const hours = parseInt(dateStr.substr(11, 2), 10);
            let duration;
            if (hours === 0) {
                duration = dateStr.substr(14, 5);
            } else if (hours < 10) {
                duration = dateStr.substr(12, 7);
            } else if (hours >= 10) {
                duration = dateStr.substr(11, 8);
            }
            this.spanDuration.text(`${currentTime}/${duration}`);
        }
    }

    /**
     * Callback for time update event.
     */
    cbTimeUpdate() {
        if (Number.isFinite(this.duration)) {
            const percent = this.currentTime / this.duration;
            const rangePosition = Math.min(Math.round((percent) * 100), 100);
            const $row = $(this).closest('tr');
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
    loadMetadata() {
        const sourceSrc = this.html5Audio.getAttribute('data-src');
        if (!sourceSrc || !sourceSrc.includes('/pbxcore/api/')) {
            return;
        }

        // Build full URL (REST API paths always start with /pbxcore/)
        const fullUrl = sourceSrc.startsWith('http')
            ? sourceSrc
            : `${window.location.origin}${sourceSrc}`;

        // Prepare headers with Bearer token
        const headers = {
            'X-Requested-With': 'XMLHttpRequest'
        };

        if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
            headers['Authorization'] = `Bearer ${TokenManager.accessToken}`;
        }

        // Make HEAD request to get only headers (no body download)
        fetch(fullUrl, {
            method: 'HEAD',
            headers
        })
        .then(response => {
            if (!response.ok) {
                // File not found (422) or other error - disable player controls
                this.disablePlayer();
                return;
            }

            // Extract duration from header
            const durationSeconds = response.headers.get('X-Audio-Duration');
            if (durationSeconds) {
                const duration = parseFloat(durationSeconds);
                if (duration > 0) {
                    // Set duration on audio element for tooltip functionality
                    Object.defineProperty(this.html5Audio, 'duration', {
                        value: duration,
                        writable: false,
                        configurable: true
                    });

                    const date = new Date(null);
                    date.setSeconds(parseInt(duration, 10));
                    const dateStr = date.toISOString();
                    const hours = parseInt(dateStr.substr(11, 2), 10);
                    let formatted;
                    if (hours === 0) {
                        formatted = dateStr.substr(14, 5);
                    } else if (hours < 10) {
                        formatted = dateStr.substr(12, 7);
                    } else {
                        formatted = dateStr.substr(11, 8);
                    }
                    this.$spanDuration.text(`00:00/${formatted}`);
                }
            }
        })
        .catch(() => {
            // Network error or other failure - disable player controls
            this.disablePlayer();
        });
    }

    /**
     * Stop playback (called from static stopOthers method)
     */
    stopPlayback() {
        if (!this.html5Audio.paused) {
            this.html5Audio.pause();
            this.$pButton.removeClass('pause').addClass('play');
        }

        // Clean up audio nodes to prevent memory leaks
        this.cleanupAudioNodes();
    }

    /**
     * Clean up Web Audio API nodes
     */
    cleanupAudioNodes() {
        if (this.scriptProcessor) {
            try {
                // Disconnect all nodes
                this.scriptProcessor.disconnect();
                this.scriptProcessor.onaudioprocess = null;
                this.scriptProcessor = null;
            } catch (e) {
                // Ignore cleanup errors
            }
        }

        if (this.sourceNode) {
            try {
                this.sourceNode.disconnect();
            } catch (e) {
                // Ignore cleanup errors
            }
        }

        if (this.gainNode) {
            try {
                this.gainNode.disconnect();
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    }

    /**
     * Plays or pauses the audio file.
     */
    play() {
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
                }
                // Clean up audio nodes when pausing
                this.cleanupAudioNodes();
            }
            return;
        }

        // Need to load source first
        let sourceSrc = this.html5Audio.getAttribute('data-src') || '';

        // If source is an API endpoint with token, load it directly
        // WHY: Token-based URLs already contain all necessary information
        if (sourceSrc && sourceSrc.includes('/pbxcore/api/')) {
            // Stop all other players before loading new source
            CDRPlayer.stopOthers(this);
            this.loadAuthenticatedSource(sourceSrc);
            return;
        }

        // Fallback for non-API sources or already loaded
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
    setupMonoMixer() {
        try {
            // Create audio context if not exists
            if (!this.audioContext) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext();
            }

            // Create source node from audio element (can only be created once!)
            if (!this.sourceNode) {
                this.sourceNode = this.audioContext.createMediaElementSource(this.html5Audio);
            }

            // Disconnect previous connections if they exist
            if (this.gainNode) {
                try {
                    this.sourceNode.disconnect();
                    this.gainNode.disconnect();
                } catch (e) {
                    // Ignore disconnect errors
                }
            }

            // Create a ScriptProcessorNode with 2 input channels and 2 output channels
            // Buffer size of 4096 for good balance between latency and performance
            const bufferSize = 4096;
            const scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 2, 2);

            // Store reference for cleanup
            this.scriptProcessor = scriptProcessor;

            // Process audio to force mono output
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputBuffer = audioProcessingEvent.inputBuffer;
                const outputBuffer = audioProcessingEvent.outputBuffer;

                // Get number of channels in the buffer
                const inputChannelCount = inputBuffer.numberOfChannels;
                const outputChannelCount = outputBuffer.numberOfChannels;

                // Handle different channel configurations
                if (inputChannelCount === 1) {
                    // Input is already mono - copy to both output channels
                    const inputMono = inputBuffer.getChannelData(0);
                    const outputL = outputBuffer.getChannelData(0);
                    const outputR = outputChannelCount > 1 ? outputBuffer.getChannelData(1) : null;

                    for (let i = 0; i < inputMono.length; i++) {
                        outputL[i] = inputMono[i];
                        if (outputR) {
                            outputR[i] = inputMono[i];
                        }
                    }
                } else if (inputChannelCount >= 2) {
                    // Input is stereo or multi-channel - mix to mono
                    const inputL = inputBuffer.getChannelData(0);
                    const inputR = inputBuffer.getChannelData(1);
                    const outputL = outputBuffer.getChannelData(0);
                    const outputR = outputChannelCount > 1 ? outputBuffer.getChannelData(1) : null;

                    // Mix L+R to mono and copy to both output channels
                    for (let i = 0; i < inputL.length; i++) {
                        // Average L and R channels for true mono
                        const monoSample = (inputL[i] + inputR[i]) * 0.5;

                        // Write the same mono signal to both output channels
                        outputL[i] = monoSample;
                        if (outputR) {
                            outputR[i] = monoSample;
                        }
                    }
                }
            };

            // Create gain node for volume control
            this.gainNode = this.audioContext.createGain();

            // Connect the audio graph:
            // source → scriptProcessor → gain → destination
            this.sourceNode.connect(scriptProcessor);
            scriptProcessor.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);

        } catch (error) {
            // Fallback: audio will play as stereo through normal HTML5 audio
        }
    }

    /**
     * Load audio from authenticated API endpoint using fetch + Bearer token
     * @param {string} apiUrl - The API URL requiring authentication
     */
    loadAuthenticatedSource(apiUrl) {
        // Build full URL (REST API paths always start with /pbxcore/)
        const fullUrl = apiUrl.startsWith('http')
            ? apiUrl
            : `${window.location.origin}${apiUrl}`;

        // Prepare headers with Bearer token
        const headers = {
            'X-Requested-With': 'XMLHttpRequest'
        };

        if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
            headers['Authorization'] = `Bearer ${TokenManager.accessToken}`;
        }

        // Fetch audio file with authentication
        fetch(fullUrl, { headers })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Detect format from Content-Type header
                const contentType = response.headers.get('Content-Type');
                this.currentFormat = this.detectAudioFormat(contentType);

                // Update format badge
                if (this.currentFormat && this.currentFormat !== 'unknown') {
                    this.updateFormatBadge(this.currentFormat);
                }

                // Extract duration from header if available
                const durationSeconds = response.headers.get('X-Audio-Duration');
                if (durationSeconds) {
                    const duration = parseFloat(durationSeconds);
                    if (duration > 0) {
                        const date = new Date(null);
                        date.setSeconds(parseInt(duration, 10));
                        const dateStr = date.toISOString();
                        const hours = parseInt(dateStr.substr(11, 2), 10);
                        let formatted;
                        if (hours === 0) {
                            formatted = dateStr.substr(14, 5);
                        } else if (hours < 10) {
                            formatted = dateStr.substr(12, 7);
                        } else {
                            formatted = dateStr.substr(11, 8);
                        }
                        this.$spanDuration.text(`00:00/${formatted}`);
                    }
                }

                return response.blob();
            })
            .then(blob => {
                // Create blob URL from response
                const blobUrl = URL.createObjectURL(blob);

                // Revoke previous blob URL if exists
                if (this.html5Audio.src && this.html5Audio.src.startsWith('blob:')) {
                    URL.revokeObjectURL(this.html5Audio.src);
                }

                // Set blob URL directly to audio element
                this.html5Audio.src = blobUrl;
                this.html5Audio.load();

                // Setup mono mixer on first playback only
                // WHY: Web Audio API requires user interaction before creating AudioContext
                // MediaElementSource can only be created once per audio element
                // After first setup, same source node works for all subsequent files
                if (!this.sourceNode) {
                    this.setupMonoMixer();
                }

                // Auto-play after loading
                this.html5Audio.oncanplaythrough = () => {
                    this.html5Audio.play();
                    this.$pButton.removeClass('play').addClass('pause');
                    this.html5Audio.oncanplaythrough = null;

                };
            })
            .catch(error => {
                UserMessage.showMultiString(error.message, globalTranslate.cdr_AudioFileLoadError);
            });
    }

    /**
     * Download file with authentication and optional format conversion
     * @param {string} downloadUrl - Download URL requiring Bearer token
     * @param {string} format - Desired audio format (original, mp3, wav, webm, ogg)
     */
    downloadFile(downloadUrl, format = 'webm') {
        // Check if it's an API URL that requires authentication
        if (downloadUrl.includes('/pbxcore/api/')) {
            // Add format parameter to URL if not 'original'
            let urlWithFormat = downloadUrl;
            if (format !== 'original') {
                const separator = downloadUrl.includes('?') ? '&' : '?';
                urlWithFormat = `${downloadUrl}${separator}format=${encodeURIComponent(format)}`;
            }

            // Build full URL (REST API paths always start with /pbxcore/)
            const fullUrl = urlWithFormat.startsWith('http')
                ? urlWithFormat
                : `${window.location.origin}${urlWithFormat}`;

            // Prepare headers with Bearer token
            const headers = {
                'X-Requested-With': 'XMLHttpRequest'
            };

            if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
                headers['Authorization'] = `Bearer ${TokenManager.accessToken}`;
            }

            // Fetch file with authentication
            fetch(fullUrl, { headers })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    // Get filename from Content-Disposition header or URL
                    const disposition = response.headers.get('Content-Disposition');
                    let filename = `call-record.${format || 'mp3'}`;
                    if (disposition && disposition.includes('filename=')) {
                        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                        if (matches != null && matches[1]) {
                            filename = matches[1].replace(/['"]/g, '');
                        }
                    } else {
                        // Try to extract from URL parameters
                        const urlParams = new URLSearchParams(downloadUrl.split('?')[1]);
                        const filenameParam = urlParams.get('filename');
                        if (filenameParam) {
                            filename = filenameParam;
                        }
                    }

                    return response.blob().then(blob => ({ blob, filename }));
                })
                .then(({ blob, filename }) => {
                    // Create download link
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                })
                .catch(error => {
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
    cbOnSrcMediaError() {
        $(this).closest('tr').addClass('disabled');
    }

    /**
     * Disable player controls when file is not available
     * Hides play and download buttons, disables only player cells (not entire row)
     */
    disablePlayer() {
        // Hide play button
        this.$pButton.hide();

        // Hide download button
        this.$dButton.hide();

        // Show placeholder in duration span
        this.$spanDuration.text('--:--/--:--').addClass('disabled');

        // Disable slider and its parent cell
        this.$slider.addClass('disabled');
        this.$slider.closest('td').addClass('disabled');

        // Disable duration cell
        this.$spanDuration.closest('td').addClass('disabled');
    }
}