/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2020
 *
 */


class IndexSoundPlayer {
	constructor(id) {
		this.id = id;
		this.html5Audio = document.getElementById(`audio-player-${id}`);
		const $row = $(`#${id}`);
		if ($row.hasClass('initialized')) {
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


		// play button event listenter
		this.$pButton.on('click', (e) => {
			e.preventDefault();
			this.play();
		});

		// download button event listenter
		this.$dButton.on('click', (e) => {
			e.preventDefault();
			window.location = $(e.target).attr('data-value');
		});

		this.html5Audio.addEventListener('loadedmetadata', this.cbOnMetadataLoaded, false);

		// timeupdate event listener
		this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);

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
	 * Обработчик подгрузки метаданных
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
	 * Колбек на сдвиг слайдера проигрывателя
	 * @param newVal
	 * @param meta
	 */
	cbOnSliderChange(newVal, meta) {
		if (meta.triggeredByUser && Number.isFinite(this.html5Audio.duration)) {
			this.html5Audio.removeEventListener('timeupdate', this.cbTimeUpdate, false);
			this.html5Audio.currentTime = (this.html5Audio.duration * newVal) / 100;
			this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);
		}
		if (Number.isFinite(this.html5Audio.duration)) {
			const date = new Date(null);
			date.setSeconds(this.html5Audio.currentTime); // specify value for SECONDS here
			const currentTime = date.toISOString().substr(14, 5);
			date.setSeconds(this.html5Audio.duration); // specify value for SECONDS here
			const duration = date.toISOString().substr(14, 5);
			this.spanDuration.text(`${currentTime}/${duration}`);
		}
	}

	/**
	 * Колбек на изменение позиции проигрываемого файла из HTML5 аудиотега
	 */
	cbTimeUpdate() {
		if (Number.isFinite(this.duration)) {
			const percent = this.currentTime / this.duration;
			const rangePosition = Math.round((percent) * 100);
			const $row = $(this).closest('tr');
			$row.find('div.cdr-player').range('set value', rangePosition);
			if (this.currentTime === this.duration) {
				$row.find('i.pause').removeClass('pause').addClass('play');
			}
		}
	}

	/**
	 * Запуск и остановка воспроизведения аудио файла
	 * по клику на иконку Play
	 */
	play() {
		// start music
		if (this.html5Audio.paused && this.html5Audio.duration) {
			this.html5Audio.play();
			// remove play, add pause
			this.$pButton.removeClass('play').addClass('pause');
		} else { // pause music
			this.html5Audio.pause();
			// remove pause, add play
			this.$pButton.removeClass('pause').addClass('play');
		}
	}
}