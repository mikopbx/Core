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

/* global globalRootUrl, ClipboardJS, SemanticLocalization, InputMaskPatterns, UserMessage, globalTranslate */

const extensionsIndex = {
	maskList: null,
	$extensionsList: $('#extensions-table'),
	$contentFrame: $('#content-frame'),
	initialize() {
		$('.avatar').each(function () {
			if ($(this).attr('src') === '') {
				$(this).attr('src', `${globalRootUrl}assets/img/unknownPerson.jpg`);
			}
		});
		extensionsIndex.initializeInputmask($('input.mobile-number-input'));
		extensionsIndex.$extensionsList.DataTable({
			lengthChange: false,
			paging: false,
			columns: [
				{orderable: false, searchable: false},
				null,
				null,
				null,
				null,
				{ orderable: false, searchable: false },
			],
			order: [1, 'asc'],
			language: SemanticLocalization.dataTableLocalisation,
			drawCallback() {
			},
		});

		$('#add-new-button').appendTo($('div.eight.column:eq(0)'));

		$('.extension-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			window.location = `${globalRootUrl}extensions/modify/${id}`;
		});
		const clipboard = new ClipboardJS('.clipboard');
		$('.clipboard').popup({
			on: 'manual',
		});
		clipboard.on('success', (e) => {
			$(e.trigger).popup('show');
			setTimeout(() => {
				$(e.trigger).popup('hide');
			}, 1500);
			e.clearSelection();
		});

		clipboard.on('error', (e) => {
			console.error('Action:', e.action);
			console.error('Trigger:', e.trigger);
		});
		$('.extension-row .checkbox')
			.checkbox({
				onChecked() {
					const number = $(this).attr('data-value');
					$.api({
						url: `${globalRootUrl}extensions/enable/${number}`,
						on: 'now',
						onSuccess(response) {
							if (response.success) {
								$(`#${number} .disability`).removeClass('disabled');
							}
						},
					});
				},
				onUnchecked() {
					const number = $(this).attr('data-value');
					$.api({
						url: `${globalRootUrl}extensions/disable/${number}`,
						on: 'now',
						onSuccess(response) {
							if (response.success) {
								$(`#${number} .disability`).addClass('disabled');
							}
						},
					});
				},
			});

		$('body').on('click', 'a.delete', (e) => {
			e.preventDefault();
			const extensionId = $(e.target).closest('tr').attr('id');
			extensionsIndex.deleteExtension(extensionId);
		});
	},
	/**
	 * Deletes extension with id
	 * @param extensionId
	 */
	deleteExtension(extensionId)
	{
		$('.message.ajax').remove();
		$.api({
			url: `${globalRootUrl}extensions/delete/${extensionId}`,
			on: 'now',
			successTest(response) {
				// test whether a JSON response is valid
				return response !== undefined
					&& Object.keys(response).length > 0;
			},
			onSuccess(response) {
				if (response.success === true) {
					extensionsIndex.$extensionsList.find(`tr[id=${extensionId}]`).remove();
					Extensions.cbOnDataChanged();
				} else {
					UserMessage.showError(response.message.error, globalTranslate.ex_ImpossibleToDeleteExtension );
				}
			},
		});
	},
	/**
	 * Makes formatted numbers visualisation
	 */
	initializeInputmask($el) {
		if (extensionsIndex.maskList === null) {
			// Prepares the table for sort
 			extensionsIndex.maskList = $.masksSort(InputMaskPatterns, ['#'], /[0-9]|#/, 'mask');
		}
		$el.inputmasks({
			inputmask: {
				definitions: {
					'#': {
						validator: '[0-9]',
						cardinality: 1,
					},
				},
			},
			match: /[0-9]/,
			replace: '9',
			list: extensionsIndex.maskList,
			listKey: 'mask',
		});
	},
};

$(document).ready(() => {
	extensionsIndex.initialize();
});

