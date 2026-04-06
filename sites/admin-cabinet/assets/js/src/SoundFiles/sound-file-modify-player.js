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
 * Represents the sound player on modify page.
 * Uses the same structure as IndexSoundPlayer for consistency.
 *
 * @class ModifySoundPlayer
 */
class ModifySoundPlayer {
    /**
     * Constructs a new ModifySoundPlayer object.
     */
    constructor() {
        this.id = 'sound-file-player-row';
        this.html5Audio = document.getElementById('audio-player');
        this.$pButton = $('#audio-player-segment').find('button.play-button');
        this.$dButton = $('#audio-player-segment').find('button.download-button');
        this.$slider = $('#audio-player-segment').find('div.cdr-player');
        this.$spanDuration = $('#audio-player-segment').find('span.cdr-duration');
        this.$playerSegment = $('#audio-player-segment');
        this.currentFileUrl = '';

        this.initialize();
    }

    /**
     * Initializes the sound player with slider functionality.
     */
    initialize() {
        // Play button event listener
        this.$pButton.on('click', (e) => {
            e.preventDefault();
            this.play();
        });

        // Download button event listener
        this.$dButton.on('click', (e) => {
            e.preventDefault();
            if (this.currentFileUrl) {
                this.downloadFile(this.currentFileUrl);
            }
        });

        // Loaded metadata event listener
        this.html5Audio.addEventListener('loadedmetadata', this.cbOnMetadataLoaded.bind(this), false);

        // Timeupdate event listener
        this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate.bind(this), false);

        // Initialize range slider
        this.$slider.range({
            min: 0,
            max: 100,
            start: 0,
            onChange: this.cbOnSliderChange.bind(this),
            html5Audio: this.html5Audio,
            cbTimeUpdate: this.cbTimeUpdate.bind(this),
            spanDuration: this.$spanDuration,
        });
    }

    /**
     * Updates the audio source.
     * @param {string} newSource - The new source for the audio.
     */
    UpdateSource(newSource) {
        // Pause current playback
        this.html5Audio.pause();

        // Store the URL for downloading
        this.currentFileUrl = newSource;

        // Set data-src attribute for later loading
        this.html5Audio.setAttribute('data-src', newSource);

        // Show the player segment
        this.$playerSegment.show();

        // Check if it's an API endpoint or blob URL
        if (newSource.includes('/pbxcore/api/')) {
            // Load metadata via HEAD request for API endpoints
            this.loadMetadata();
        } else {
            // For blob URLs (recorded audio), load directly
            this.html5Audio.src = newSource;
            this.html5Audio.load();
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

        // Build full URL
        let fullUrl;
        if (sourceSrc.startsWith('http')) {
            fullUrl = sourceSrc;
        } else if (sourceSrc.startsWith('/pbxcore/')) {
            const baseUrl = window.location.origin;
            fullUrl = `${baseUrl}${sourceSrc}`;
        } else {
            fullUrl = `${globalRootUrl}${sourceSrc.replace(/^\//, '')}`;
        }

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
                return;
            }

            // Extract duration from header
            const durationSeconds = response.headers.get('X-Audio-Duration');
            if (durationSeconds) {
                const duration = parseFloat(durationSeconds);
                if (duration > 0) {
                    const date = new Date(duration * 1000);
                    const formatted = date.toISOString().substr(14, 5);
                    this.$spanDuration.text(`00:00/${formatted}`);
                }
            }
        })
        .catch(() => {
            // Silently fail - metadata is not critical
        });
    }

    /**
     * Callback for metadata loaded event.
     */
    cbOnMetadataLoaded() {
        if (Number.isFinite(this.html5Audio.duration)) {
            const currentTime = new Date(this.html5Audio.currentTime * 1000).toISOString().substr(14, 5);
            const duration = new Date(this.html5Audio.duration * 1000).toISOString().substr(14, 5);
            this.$spanDuration.text(`${currentTime}/${duration}`);
        }
    }

    /**
     * Callback function for the slider change event.
     * @param {number} newVal - The new value of the slider.
     * @param {Object} meta - Additional metadata for the slider.
     */
    cbOnSliderChange(newVal, meta) {
        if (meta.triggeredByUser && Number.isFinite(this.html5Audio.duration)) {
            this.html5Audio.removeEventListener('timeupdate', this.cbTimeUpdate.bind(this), false);
            this.html5Audio.currentTime = (this.html5Audio.duration * newVal) / 100;
            this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate.bind(this), false);
        }
        if (Number.isFinite(this.html5Audio.duration)) {
            const currentTime = new Date(this.html5Audio.currentTime * 1000).toISOString().substr(14, 5);
            const duration = new Date(this.html5Audio.duration * 1000).toISOString().substr(14, 5);
            this.$spanDuration.text(`${currentTime}/${duration}`);
        }
    }

    /**
     * Callback function for the timeupdate event.
     * Synchronizes playhead position with current point in audio
     */
    cbTimeUpdate() {
        if (Number.isFinite(this.html5Audio.duration)) {
            const percent = this.html5Audio.currentTime / this.html5Audio.duration;
            const rangePosition = Math.round(percent * 100);

            // Update slider position
            this.$slider.range('set value', rangePosition);

            // Update time display
            const currentTime = new Date(this.html5Audio.currentTime * 1000).toISOString().substr(14, 5);
            const duration = new Date(this.html5Audio.duration * 1000).toISOString().substr(14, 5);
            this.$spanDuration.text(`${currentTime}/${duration}`);

            // Reset play button when finished
            if (rangePosition === 100) {
                this.$pButton.find('i').removeClass('pause').addClass('play');
            }
        }
    }

    /**
     * Plays or pauses the audio based on its current state.
     */
    play() {
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
        }

        // Need to load source first
        let sourceSrc = this.html5Audio.getAttribute('data-src') || '';

        // If source is an API endpoint, load with authentication
        if (sourceSrc && sourceSrc.includes('/pbxcore/api/')) {
            this.loadAuthenticatedSource(sourceSrc);
            return;
        }

        // Fallback for non-API sources
        if (this.html5Audio.paused && this.html5Audio.duration) {
            this.html5Audio.play();
            this.$pButton.find('i').removeClass('play').addClass('pause');
        } else {
            this.html5Audio.pause();
            this.$pButton.find('i').removeClass('pause').addClass('play');
        }
    }

    /**
     * Loads audio from authenticated API endpoint using fetch + Bearer token
     * @param {string} apiUrl - The API URL requiring authentication
     */
    loadAuthenticatedSource(apiUrl) {
        // Build full URL
        let fullUrl;
        if (apiUrl.startsWith('http')) {
            fullUrl = apiUrl;
        } else if (apiUrl.startsWith('/pbxcore/')) {
            const baseUrl = window.location.origin;
            fullUrl = `${baseUrl}${apiUrl}`;
        } else {
            fullUrl = `${globalRootUrl}${apiUrl.replace(/^\//, '')}`;
        }

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

                // Extract duration from header if available
                const durationSeconds = response.headers.get('X-Audio-Duration');
                if (durationSeconds) {
                    // Display duration immediately (before file loads)
                    const duration = parseFloat(durationSeconds);
                    if (duration > 0) {
                        const date = new Date(duration * 1000);
                        const formatted = date.toISOString().substr(14, 5);
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

                // Set blob URL directly to audio element (not source)
                this.html5Audio.src = blobUrl;
                this.html5Audio.load();

                // Show player and auto-play after loading
                this.$playerSegment.show();
                this.html5Audio.oncanplaythrough = () => {
                    this.html5Audio.play();
                    this.$pButton.find('i').removeClass('play').addClass('pause');
                    this.html5Audio.oncanplaythrough = null;
                };
            })
            .catch(error => {
                console.error('Failed to load audio file:', error);
                UserMessage.showMultiString(error.message, globalTranslate.sf_AudioFileLoadError);
            });
    }

    /**
     * Downloads the audio file with authentication
     * @param {string} apiUrl - The API URL for the file
     */
    downloadFile(apiUrl) {
        // Build full URL with download flag
        let downloadUrl;
        if (apiUrl.includes('?')) {
            downloadUrl = `${apiUrl}&download=1`;
        } else {
            downloadUrl = `${apiUrl}?download=1`;
        }

        // Build full URL
        let fullUrl;
        if (downloadUrl.startsWith('http')) {
            fullUrl = downloadUrl;
        } else if (downloadUrl.startsWith('/pbxcore/')) {
            const baseUrl = window.location.origin;
            fullUrl = `${baseUrl}${downloadUrl}`;
        } else {
            fullUrl = `${globalRootUrl}${downloadUrl.replace(/^\//, '')}`;
        }

        // Prepare headers with Bearer token
        const headers = {
            'X-Requested-With': 'XMLHttpRequest'
        };

        if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
            headers['Authorization'] = `Bearer ${TokenManager.accessToken}`;
        }

        // Fetch and download
        fetch(fullUrl, { headers })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Get filename from Content-Disposition header or URL
                const disposition = response.headers.get('Content-Disposition');
                let filename = 'audio.mp3';
                if (disposition && disposition.includes('filename=')) {
                    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                    if (matches != null && matches[1]) {
                        filename = matches[1].replace(/['"]/g, '');
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
                console.error('Failed to download file:', error);
                UserMessage.showMultiString(error.message, globalTranslate.sf_AudioFileDownloadError);
            });
    }
}

// Global variable to hold the player instance
let sndPlayer;

// When the document is ready, initialize the sound player
$(document).ready(() => {
    sndPlayer = new ModifySoundPlayer();
});
