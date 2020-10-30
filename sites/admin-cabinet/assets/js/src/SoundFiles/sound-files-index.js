/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalTranslate, SemanticLocalization, PbxApi, globalRootUrl, IndexSoundPlayer*/


const soundFiles = {
	$audioFilesList: $('#custom-sound-files-table, #moh-sound-files-table'),
	$contentFrame: $('#content-frame'),
	$tabMenuItems: $('#sound-files-menu .item'),
	initialize() {
		soundFiles.$tabMenuItems.tab({
			history: true,
			historyType: 'hash',
		});
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

