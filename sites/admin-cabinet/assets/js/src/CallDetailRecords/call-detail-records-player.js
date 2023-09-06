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
        this.$pButton = $row.find('i.play'); // Play button
        this.$dButton = $row.find('i.download'); // Download button
        this.$slider = $row.find('div.cdr-player'); // Slider element
        this.$spanDuration = $row.find('span.cdr-duration'); // Duration span element
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
            window.location = $(e.target).attr('data-value');
        });

        this.html5Audio.addEventListener('loadedmetadata', this.cbOnMetadataLoaded, false);

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
     * Plays or pauses the audio file.
     */
    play() {
        // start music
        if (this.html5Audio.paused) {
            this.html5Audio.play();
            // remove play, add pause
            this.$pButton.removeClass('play').addClass('pause');
        } else { // pause music
            this.html5Audio.pause();
            // remove pause, add play
            this.$pButton.removeClass('pause').addClass('play');
        }
    }

    /**
     * Callback for src media error event.
     */
    cbOnSrcMediaError() {
        $(this).closest('tr').addClass('disabled');
    }
}