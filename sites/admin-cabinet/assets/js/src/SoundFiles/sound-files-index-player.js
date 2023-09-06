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
        this.$pButton = $row.find('i.play'); // play button
        this.$dButton = $row.find('i.download'); // download button
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
            window.location = $(e.target).attr('data-value');
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
                $row.find('i.pause').removeClass('pause').addClass('play');
            }
        }
    }

    /**
     * Plays or pauses the audio file when the play button is clicked.
     */
    play() {
        if (this.html5Audio.paused && this.html5Audio.duration) {
            // Start playing the audio
            this.html5Audio.play();
            // Update the play button icon to pause
            this.$pButton.removeClass('play').addClass('pause');
        } else {
            // Pause the audio
            this.html5Audio.pause();
            // Update the play button icon to play
            this.$pButton.removeClass('pause').addClass('play');
        }
    }
}