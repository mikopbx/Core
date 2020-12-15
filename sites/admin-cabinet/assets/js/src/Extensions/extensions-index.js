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

/* global globalRootUrl, ClipboardJS, PbxApi, SemanticLocalization, DebuggerInfo, InputMaskPatterns */

const extensionsTable = {
	maskList: null,
	initialize() {
		$('.avatar').each(function () {
			if ($(this).attr('src') === '') {
				$(this).attr('src', `${globalRootUrl}assets/img/unknownPerson.jpg`);
			}
		});
		extensionsTable.initializeInputmask($('input.mobile-number-input'));
		$('#extensions-table').DataTable({
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
	},
	/**
	 * Инициализирует красивое представление номеров
	 */
	initializeInputmask($el) {
		if (extensionsTable.maskList === null) {
			// Подготовим таблицу для сортировки
			extensionsTable.maskList = $.masksSort(InputMaskPatterns, ['#'], /[0-9]|#/, 'mask');
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
			list: extensionsTable.maskList,
			listKey: 'mask',
		});
	},
};


const extensionsStatusLoopWorker = {
	timeOut: 3000,
	timeOutHandle: '',
	green: '<div class="ui green empty circular label" style="width: 1px;height: 1px;"></div>',
	grey: '<div class="ui grey empty circular label" style="width: 1px;height: 1px;"></div>',
	initialize() {
		// Запустим обновление статуса провайдера
		DebuggerInfo.initialize();
		extensionsStatusLoopWorker.restartWorker();
	},
	restartWorker() {
		window.clearTimeout(extensionsStatusLoopWorker.timeoutHandle);
		extensionsStatusLoopWorker.worker();
	},
	worker() {
		window.clearTimeout(extensionsStatusLoopWorker.timeoutHandle);
		PbxApi.GetPeersStatus(extensionsStatusLoopWorker.cbRefreshExtensionsStatus);
	},
	cbRefreshExtensionsStatus(response) {
		extensionsStatusLoopWorker.timeoutHandle =
			window.setTimeout(extensionsStatusLoopWorker.worker, extensionsStatusLoopWorker.timeOut);
		if (response.length === 0 || response === false) return;
		let htmlTable = '<table class="ui very compact table">';
		$.each(response, (key, value) => {
			htmlTable += '<tr>';
			htmlTable += `<td>${value.id}</td>`;
			htmlTable += `<td>${value.state}</td>`;
			htmlTable += '</tr>';
		});
		htmlTable += '</table>';
		DebuggerInfo.UpdateContent(htmlTable);
		$('.extension-row').each((index, obj) => {
			const number = $(obj).attr('data-value');
			const result = $.grep(response, e => e.id === number);
			if (result.length === 0) {
				// not found
				$(obj).find('.extension-status').html(extensionsStatusLoopWorker.grey);
			} else if (result[0].state.toUpperCase() === 'OK') {
				$(obj).find('.extension-status').html(extensionsStatusLoopWorker.green);
			} else {
				$(obj).find('.extension-status').html(extensionsStatusLoopWorker.grey);
			}
		});
	},
};


$(document).ready(() => {
	extensionsTable.initialize();
	extensionsStatusLoopWorker.initialize();
});

