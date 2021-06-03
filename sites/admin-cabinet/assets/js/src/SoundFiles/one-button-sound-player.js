/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

const oneButtonPlayer = {
	initialize() {
		$('form .action-playback-button').each((index, button) => {
			const id = $(button).attr('data-value');
			return new sndPlayerOneBtn(id);
		});
	}
}

$(document).ready(() => {
	oneButtonPlayer.initialize();
});

class sndPlayerOneBtn {
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
				this.html5Audio.currentTime=0;
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
							= `/pbxcore/api/cdr/playback?view=${response.message}`;
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

	cbCanPlayThrough() {
		this.duration = this.html5Audio.duration;
		if (this.$pButton.html() === '<i class="icon pause"></i>') {
			this.html5Audio.play();
		}
	}

	cbOnSliderChange(newVal, meta) {
		if (meta.triggeredByUser && Number.isFinite(this.html5Audio.duration)) {
			this.html5Audio.removeEventListener('timeupdate', this.cbTimeUpdate, false);
			this.html5Audio.currentTime = (this.html5Audio.duration * newVal) / 100;
			this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);
		}
	}

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
