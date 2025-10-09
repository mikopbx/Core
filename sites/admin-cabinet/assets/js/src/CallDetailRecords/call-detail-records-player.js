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

    /**
     * Creates an instance of CDRPlayer.
     * @param {string} id - The ID of the player.
     */
    constructor(id) {
        this.id = id;
        this.html5Audio = document.getElementById(`audio-player-${id}`);
        const $row = $(`#${id}`);

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

        // Download button event listener
        this.$dButton.on('click', (e) => {
            e.preventDefault();
            const downloadUrl = $(e.target).attr('data-value');
            if (downloadUrl) {
                this.downloadFile(downloadUrl);
            }
        });

        // Loaded metadata event listener
        this.html5Audio.addEventListener('loadedmetadata', this.cbOnMetadataLoaded.bind(this), false);

        // timeupdate event listener
        this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);

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

        // Mark as initialized
        $row.addClass('initialized');

        // Load metadata on initialization
        this.loadMetadata();
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
            // Silently fail - metadata is not critical
        });
    }

    /**
     * Plays or pauses the audio file.
     */
    play() {
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
        }

        // Need to load source first
        let sourceSrc = this.html5Audio.getAttribute('data-src') || '';

        // If source is an API endpoint, load with authentication
        if (sourceSrc && sourceSrc.includes('/pbxcore/api/')) {
            this.loadAuthenticatedSource(sourceSrc);
            return;
        }

        // Fallback for non-API sources or already loaded
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
     * Download file with authentication
     * @param {string} downloadUrl - Download URL requiring Bearer token
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

                    // Get filename from Content-Disposition header or URL
                    const disposition = response.headers.get('Content-Disposition');
                    let filename = 'call-record.mp3';
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
}