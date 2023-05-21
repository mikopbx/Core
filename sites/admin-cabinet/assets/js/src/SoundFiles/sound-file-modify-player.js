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
 * Object representing the sound player with slider functionality.
 *
 * @module sndPlayer
 */
const sndPlayer = {
    slider: document.getElementById('audio-player'),

    /**
     * Duration of the audio clip.
     * @type {number}
     */
    duration: 0,

    /**
     * jQuery object for the play button.
     * @type {jQuery}
     */
    $pButton: $('#play-button'),

    /**
     * jQuery object for the slider.
     * @type {jQuery}
     */
    $slider: $('#play-slider'),

    /**
     * jQuery object for the player segment.
     * @type {jQuery}
     */
    $playerSegment: $('#audio-player-segment'),

    /**
     * Initializes the sound player with slider functionality.
     */
    initialize() {
        // Play button event listener
        sndPlayer.$pButton.on('click', (e) => {
            e.preventDefault();
            sndPlayer.play();
        });

        // Timeupdate event listener
        sndPlayer.slider.addEventListener('timeupdate', sndPlayer.cbTimeUpdate, false);

        // Gets audio file duration
        sndPlayer.slider.addEventListener('canplaythrough', sndPlayer.cbCanPlayThrough, false);

        // Initialize range slider
        sndPlayer.$slider.range({
            min: 0,
            max: 100,
            start: 0,
            onChange: sndPlayer.cbOnSliderChange,
        });
    },

    /**
     * Updates the audio source.
     * @param {string} newSource - The new source for the audio.
     */
    UpdateSource(newSource) {
        sndPlayer.slider.getElementsByTagName('source')[0].src = newSource;
        sndPlayer.slider.pause();
        sndPlayer.slider.load();
        sndPlayer.slider.oncanplaythrough = sndPlayer.cbCanPlayThrough;
    },

    /**
     * Callback function for the canplaythrough event.
     */
    cbCanPlayThrough() {
        sndPlayer.duration = sndPlayer.slider.duration;
        // console.log(`New duration ${sndPlayer.slider.readyState}`);
        if (sndPlayer.duration > 0) {
            sndPlayer.$slider.range('set value', 0);
            sndPlayer.$playerSegment.show();
        } else {
            sndPlayer.$playerSegment.hide();
        }
    },


    /**
     * Callback function for the slider change event.
     * @param {number} newVal - The new value of the slider.
     * @param {Object} meta - Additional metadata for the slider.
     */
    cbOnSliderChange(newVal, meta) {
        if (meta.triggeredByUser && Number.isFinite(sndPlayer.slider.duration)) {
            sndPlayer.slider.removeEventListener('timeupdate', sndPlayer.cbTimeUpdate, false);
            sndPlayer.slider.currentTime = (sndPlayer.slider.duration * newVal) / 100;
            sndPlayer.slider.addEventListener('timeupdate', sndPlayer.cbTimeUpdate, false);
        }
    },

    /**
     * Callback function for the timeupdate event.
     * Synchronizes playhead position with current point in audio
     */
    cbTimeUpdate() {
        if (Number.isFinite(sndPlayer.slider.duration)) {
            const percent = sndPlayer.slider.currentTime / sndPlayer.slider.duration;
            const rangePosition = Math.round((percent) * 100);
            sndPlayer.$slider.range('set value', rangePosition);
            if (rangePosition === 100) {
                sndPlayer.$pButton.html('<i class="icon play"></i>');
            }
        }
    },

    /**
     * Plays or pauses the audio based on its current state.
     */
    play() {
        if (sndPlayer.slider.paused && sndPlayer.slider.duration) {
            // Start playing the audio
            sndPlayer.slider.play();
            // Update the play button icon to pause
            sndPlayer.$pButton.html('<i class="icon pause"></i>');
        } else {
            // Pause the audio
            sndPlayer.slider.pause();
            // Update the play button icon to play
            sndPlayer.$pButton.html('<i class="icon play"></i>');
        }
    },

};

// When the document is ready, initialize the sound player with slider
$(document).ready(() => {
    sndPlayer.initialize();
});
