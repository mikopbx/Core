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
class IndexSoundPlayer {

    /**
     * Constructs a new IndexSoundPlayer object.
     * @param {string} id - The ID of the audio player element.
     */
    constructor(id) {
        this.id = id;
        this.html5Audio = document.getElementById(`audio-player-${id}`);
        const $row = $(`#${id}`);
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
        this.$dButton.unbind();

        // Play button event listener
        this.$pButton.on('click', (e) => {
            e.preventDefault();
            this.play();
        });

        // Download button event listener
        this.$dButton.on('click', (e) => {
            e.preventDefault();
            const downloadUrl = this.$dButton.attr('data-value');
            if (downloadUrl) {
                this.downloadFile(downloadUrl);
            }
        });

        // Loaded metadata event listener
        this.html5Audio.addEventListener('loadedmetadata', this.cbOnMetadataLoaded, false);

        // Timeupdate event listener
        this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);

        // Initialize range slider
        this.$slider.range({
            min: 0,
            max: 100,
            start: 0,
            onChange: this.cbOnSliderChange,
            html5Audio: this.html5Audio,
            cbTimeUpdate: this.cbTimeUpdate,
            spanDuration: this.$spanDuration,
        });

        // Prevent double processing
        $row.addClass('initialized');

        // Load metadata on initialization to show duration
        this.loadMetadata();
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
        if (Number.isFinite(this.duration)) {
            const $row = $(this).closest('tr');
            const date = new Date(null);
            date.setSeconds(this.currentTime); // specify value for SECONDS here
            const currentTime = date.toISOString().substr(14, 5);
            date.setSeconds(this.duration); // specify value for SECONDS here
            const duration = date.toISOString().substr(14, 5);
            $row.find('span.cdr-duration').text(`${currentTime}/${duration}`);
        }
    }

    /**
     * Callback function for the slider change event.
     * @param {number} newVal - The new value of the slider.
     * @param {Object} meta - Additional metadata for the slider.
     */
    cbOnSliderChange(newVal, meta) {
        if (meta.triggeredByUser && Number.isFinite(this.html5Audio.duration)) {
            this.html5Audio.removeEventListener('timeupdate', this.cbTimeUpdate, false);
            this.html5Audio.currentTime = (this.html5Audio.duration * newVal) / 100;
            this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);
        }
        if (Number.isFinite(this.html5Audio.duration)) {
            const currentTime = new Date(this.html5Audio.currentTime * 1000).toISOString().substr(14, 5);
            const duration = new Date(this.html5Audio.duration * 1000).toISOString().substr(14, 5);
            this.spanDuration.text(`${currentTime}/${duration}`);
        }
    }

    /**
     * Callback function for the timeupdate event.
     * Synchronizes playhead position with current point in audio
     */
    cbTimeUpdate() {
        if (Number.isFinite(this.duration)) {
            const percent = this.currentTime / this.duration;
            const rangePosition = Math.round((percent) * 100);
            const $row = $(this).closest('tr');
            $row.find('div.cdr-player').range('set value', rangePosition);
            if (rangePosition === 100) {
                $row.find('button.play-button i.pause').removeClass('pause').addClass('play');
            }
        }
    }

    /**
     * Plays or pauses the audio file when the play button is clicked.
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
     * Download file with authentication
     *
     * @param {string} downloadUrl - Download URL (may require Bearer token)
     */
    downloadFile(downloadUrl) {
        // Check if it's an API URL that requires authentication
        if (downloadUrl.includes('/pbxcore/api/')) {
            // Build full URL
            const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${globalRootUrl}${downloadUrl.replace(/^\//, '')}`;

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
                    return response.blob();
                })
                .then(blob => {
                    // Extract filename from URL or use default
                    const urlParams = new URLSearchParams(downloadUrl.split('?')[1]);
                    const filename = urlParams.get('filename') || 'audio.mp3';

                    // Create download link
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);

                    // Clean up blob URL
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                })
                .catch(error => {
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
    loadAuthenticatedSource(apiUrl) {
        // Build full URL
        let fullUrl;
        if (apiUrl.startsWith('http')) {
            fullUrl = apiUrl;
        } else if (apiUrl.startsWith('/pbxcore/')) {
            // API path - use base URL without admin-cabinet path
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

                // Auto-play after loading
                this.html5Audio.oncanplaythrough = () => {
                    this.html5Audio.play();
                    this.$pButton.find('i').removeClass('play').addClass('pause');
                    this.html5Audio.oncanplaythrough = null;
                };
            })
            .catch(error => {
                UserMessage.showMultiString(error.message, globalTranslate.sf_AudioFileLoadError);
            });
    }
}