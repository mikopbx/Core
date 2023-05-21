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

/* global globalRootUrl */

/**
 * The oneButtonPlayer object handles the functionality of a one-button sound player.
 */
const oneButtonPlayer = {

    /**
     * Initializes the one-button sound player.
     */
    initialize() {
        $('form .action-playback-button').each((index, button) => {
            const id = $(button).attr('data-value');
            return new sndPlayerOneBtn(id);
        });
    }
}

// When the document is ready, initialize the one button sound player
$(document).ready(() => {
    oneButtonPlayer.initialize();
});

/**
 * The sndPlayerOneBtn class represents a one-button sound player.
 */
class sndPlayerOneBtn {

    /**
     * Creates an instance of the sndPlayerOneBtn class.
     * @param {string} id - The identifier of the sound player.
     */
    constructor(id) {
        this.$pButton = $(`.action-playback-button[data-value="${id}"]`); // play button
        this.soundSelectorClass = id;
        this.duration = 0;
        this.id = id;
        const audioPlayer = `<audio id="audio-player-${id}" preload="auto"><source src="" type="audio/mp3"></audio>`;
        this.$pButton.after(audioPlayer);
        this.html5Audio = document.getElementById(`audio-player-${id}`);
        $(`#${this.soundSelectorClass}`).on('change', () => {
            this.updateAudioSource();
        });
        this.$pButton.on('click', (e) => {
            e.preventDefault();
            if (this.html5Audio.paused && this.html5Audio.duration) {
                this.html5Audio.play();
                this.html5Audio.currentTime = 0;
                // remove play, add pause
                this.$pButton.html('<i class="icon pause"></i>');
            } else { // pause music
                this.html5Audio.pause();
                // remove pause, add play
                this.$pButton.html('<i class="icon play"></i>');
            }
        });
        this.updateAudioSource();
    }

    /**
     * Updates the audio source based on the selected sound file.
     */
    updateAudioSource() {
        const audioFileId = $('form').form('get value', this.soundSelectorClass);
        if (audioFileId !== '' && audioFileId !== "-1") {
            const _this = this;
            $.api({
                url: `${globalRootUrl}sound-files/getpathbyid/${audioFileId}`,
                on: 'now',
                onSuccess(response) {
                    if (response.message !== undefined) {
                        _this.html5Audio.getElementsByTagName('source')[0].src
                            = `/pbxcore/api/cdr/v2/playback?view=${response.message}`;
                        _this.html5Audio.pause();
                        _this.html5Audio.load();
                        _this.html5Audio.oncanplaythrough = this.cbCanPlayThrough;
                    }
                },
                onError() {
                },
            });
        }
    }

    /**
     * Callback function triggered when the audio can play through.
     */
    cbCanPlayThrough() {
        this.duration = this.html5Audio.duration;
        if (this.$pButton.html() === '<i class="icon pause"></i>') {
            this.html5Audio.play();
        }
    }

    /**
     * Callback function triggered when the slider value changes.
     * @param {number} newVal - The new value of the slider.
     * @param {object} meta - Additional metadata about the slider change.
     */
    cbOnSliderChange(newVal, meta) {
        if (meta.triggeredByUser && Number.isFinite(this.html5Audio.duration)) {
            this.html5Audio.removeEventListener('timeupdate', this.cbTimeUpdate, false);
            this.html5Audio.currentTime = (this.html5Audio.duration * newVal) / 100;
            this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);
        }
    }

    /**
     * Callback function triggered when the audio time updates.
     */
    cbTimeUpdate() {
        if (Number.isFinite(this.html5Audio.duration)) {
            const percent = this.html5Audio.currentTime / this.html5Audio.duration;
            const rangePosition = Math.round((percent) * 100);
            this.$slider.range('set value', rangePosition);
            if (this.html5Audio.currentTime === this.duration) {
                this.$pButton.html('<i class="icon play"></i>');
            }
        }
    }
}
