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

const sndPlayerOneBtn = {
	slider: undefined, // audio player
	$pButton: $('.action-playback-button'), // play button
	soundSelectorClass: $('.action-playback-button').attr('data-value'),
	duration: 0,
	initialize() {
		const audioPlayer = '<audio id="audio-player" preload="auto"><source src="" type="audio/mp3"></audio>';
		sndPlayerOneBtn.$pButton.after(audioPlayer);
		sndPlayerOneBtn.slider = document.getElementById('audio-player');
		$(`#${sndPlayerOneBtn.soundSelectorClass}`).on('change', () => {
			sndPlayerOneBtn.updateAudioSource();
		});
		sndPlayerOneBtn.$pButton.on('click', (e) => {
			e.preventDefault();
			if (sndPlayerOneBtn.slider.paused && sndPlayerOneBtn.slider.duration) {
				sndPlayerOneBtn.slider.play();
				// remove play, add pause
				sndPlayerOneBtn.$pButton.html('<i class="icon pause"></i>');
			} else { // pause music
				sndPlayerOneBtn.slider.pause();
				// remove pause, add play
				sndPlayerOneBtn.$pButton.html('<i class="icon play"></i>');
			}
		});
		sndPlayerOneBtn.updateAudioSource();
	},
	updateAudioSource() {
		const audioFileId = $('form').form('get value', sndPlayerOneBtn.soundSelectorClass);
		if (audioFileId !== '') {
			$.api({
				url: `${globalRootUrl}sound-files/getpathbyid/${audioFileId}`,
				on: 'now',
				onSuccess(response) {
					sndPlayerOneBtn.cbAfterResponse(response);
				},
				onError() {
				},
			});
		}

	},
	cbAfterResponse(response) {
		if (response.message !== undefined) {
			sndPlayerOneBtn.slider.getElementsByTagName('source')[0].src
				= `/pbxcore/api/cdr/playback?view=${response.message}`;
			sndPlayerOneBtn.slider.pause();
			sndPlayerOneBtn.slider.load();
			sndPlayerOneBtn.slider.oncanplaythrough = sndPlayerOneBtn.cbCanPlayThrough;
		}
	},
	cbCanPlayThrough() {
		sndPlayerOneBtn.duration = sndPlayerOneBtn.slider.duration;
		if (sndPlayerOneBtn.$pButton.html() === '<i class="icon pause"></i>') {
			sndPlayerOneBtn.slider.play();
		}
	},
	cbOnSliderChange(newVal, meta) {
		if (meta.triggeredByUser && Number.isFinite(sndPlayerOneBtn.slider.duration)) {
			sndPlayerOneBtn.slider.removeEventListener('timeupdate', sndPlayerOneBtn.cbTimeUpdate, false);
			sndPlayerOneBtn.slider.currentTime = (sndPlayerOneBtn.slider.duration * newVal) / 100;
			sndPlayerOneBtn.slider.addEventListener('timeupdate', sndPlayerOneBtn.cbTimeUpdate, false);
		}
	},
	cbTimeUpdate() {
		if (Number.isFinite(sndPlayerOneBtn.slider.duration)) {
			const percent = sndPlayerOneBtn.slider.currentTime / sndPlayerOneBtn.slider.duration;
			const rangePosition = Math.round((percent) * 100);
			sndPlayerOneBtn.$slider.range('set value', rangePosition);
			if (sndPlayerOneBtn.slider.currentTime === sndPlayerOneBtn.duration) {
				sndPlayerOneBtn.$pButton.html('<i class="icon play"></i>');
			}
		}
	},
};
$(document).ready(() => {
	sndPlayerOneBtn.initialize();
});
