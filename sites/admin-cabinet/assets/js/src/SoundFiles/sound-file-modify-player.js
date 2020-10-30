/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2020
 *
 */

const sndPlayer = {
	slider: document.getElementById('audio-player'),
	duration: 0, // Duration of audio clip
	$pButton: $('#play-button'), // play button
	$slider: $('#play-slider'),
	$playerSegment: $('#audio-player-segment'),
	initialize() {
		// play button event listenter
		sndPlayer.$pButton.on('click', (e) => {
			e.preventDefault();
			sndPlayer.play();
		});
		// timeupdate event listener
		sndPlayer.slider.addEventListener('timeupdate', sndPlayer.cbTimeUpdate, false);

		// Gets audio file duration
		sndPlayer.slider.addEventListener('canplaythrough', sndPlayer.cbCanPlayThrough, false);

		sndPlayer.$slider.range({
			min: 0,
			max: 100,
			start: 0,
			onChange: sndPlayer.cbOnSliderChange,
		});
	},
	UpdateSource(newSource) {
		sndPlayer.slider.getElementsByTagName('source')[0].src = newSource;
		sndPlayer.slider.pause();
		sndPlayer.slider.load();
		sndPlayer.slider.oncanplaythrough = sndPlayer.cbCanPlayThrough;
	},
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

	cbOnSliderChange(newVal, meta) {
		if (meta.triggeredByUser && Number.isFinite(sndPlayer.slider.duration)) {
			sndPlayer.slider.removeEventListener('timeupdate', sndPlayer.cbTimeUpdate, false);
			sndPlayer.slider.currentTime = (sndPlayer.slider.duration * newVal) / 100;
			sndPlayer.slider.addEventListener('timeupdate', sndPlayer.cbTimeUpdate, false);
		}
	},
	// timeUpdate
	// Synchronizes playhead position with current point in audio
	cbTimeUpdate() {
		if (Number.isFinite(sndPlayer.slider.duration)) {
			const percent = sndPlayer.slider.currentTime / sndPlayer.slider.duration;
			const rangePosition = Math.round((percent) * 100);
			sndPlayer.$slider.range('set value', rangePosition);
			if (sndPlayer.slider.currentTime === sndPlayer.duration) {
				sndPlayer.$pButton.html('<i class="icon play"></i>');
			}
		}
	},

	// Play and Pause
	play() {
		// start music
		if (sndPlayer.slider.paused && sndPlayer.slider.duration) {
			sndPlayer.slider.play();
			// remove play, add pause
			sndPlayer.$pButton.html('<i class="icon pause"></i>');
		} else { // pause music
			sndPlayer.slider.pause();
			// remove pause, add play
			sndPlayer.$pButton.html('<i class="icon play"></i>');
		}
	},

};


$(document).ready(() => {
	sndPlayer.initialize();
});
