/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalTranslate, SemanticLocalization, PbxApi, globalRootUrl */

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

const soundFiles = {
	$audioFilesList: $('#custom-sound-files-table, #moh-sound-files-table'),
	$contentFrame: $('#content-frame'),
	$tabMenuItems: $('#sound-files-menu .item'),
	initialize() {
		soundFiles.$tabMenuItems.tab();
		soundFiles.$audioFilesList.DataTable({
			lengthChange: false,
			paging: false,
			columns: [
				null,
				{ orderable: false, searchable: false },
				{ orderable: false, searchable: false },
			],
			order: [0, 'asc'],
			initComplete() {
				$('.file-row').each((index, row) => {
					const id = $(row).attr('id');
					return new IndexSoundPlayer(id);
				});
			},
			language: SemanticLocalization.dataTableLocalisation,
		});
		soundFiles.dataTable = soundFiles.$audioFilesList.DataTable();
		soundFiles.dataTable.on('draw', () => {
			$('.file-row').each((index, row) => {
				const id = $(row).attr('id');
				return new IndexSoundPlayer(id);
			});
		});
		$('#add-new-custom-button').appendTo($('#custom-sound-files-table_wrapper div.eight.column:eq(0)'));
		$('#add-new-moh-button').appendTo($('#moh-sound-files-table_wrapper div.eight.column:eq(0)'));
		const toArray = Array.prototype.slice;
		toArray.apply(document.getElementsByTagName('audio')).forEach((audio) => {
			audio.addEventListener('error', soundFiles.handleMediaError);
		});
		$('body').on('click', 'a.delete', (e) => {
			e.preventDefault();
			const fileName = $(e.target).closest('tr').attr('data-value');
			const fileId = $(e.target).closest('tr').attr('id');
			PbxApi.FilesRemoveAudioFile(fileName, fileId, soundFiles.cbAfterDelete);
		});
	},
	/**
	 * Callback after success file delete
	 * @param id
	 * @returns {boolean|boolean}
	 */
	cbAfterDelete(id) {
		$('.message.ajax').remove();
		$.api({
			url: `${globalRootUrl}sound-files/delete/${id}`,
			on: 'now',
			successTest(response) {
				// test whether a JSON response is valid
				return response !== undefined
					&& Object.keys(response).length > 0;
			},
			onSuccess(response) {
				if (response.success === true) {
					soundFiles.$audioFilesList.find(`tr[id=${id}]`).remove();
				} else {
					soundFiles.$contentFrame.before(`<div class="ui error message ajax">${response.message.error}</div>`);
				}
			},
		});
	},
	handleMediaError(e) {
		switch (e.target.error.code) {
			case e.target.error.MEDIA_ERR_ABORTED:
				console.log('You aborted the media playback.');
				break;
			case e.target.error.MEDIA_ERR_NETWORK:
				console.log('A network error caused the media download to fail.');
				break;
			case e.target.error.MEDIA_ERR_DECODE:
				console.log('The media playback was aborted due to a corruption problem or because the media used features your browser did not support.');
				break;
			case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
				console.log('The media could not be loaded, either because the server or network failed or because the format is not supported.');
				break;
			default:
				console.log('An unknown media error occurred.');
		}
		const $row = $(e.target).closest('tr');
		$row.addClass('negative');
		$row.find('td.player').html(globalTranslate.sf_FileNotFound);
	},
};


$(document).ready(() => {
	soundFiles.initialize();
});

