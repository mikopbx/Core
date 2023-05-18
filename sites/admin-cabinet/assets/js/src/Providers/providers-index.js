/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, PbxApi, DebuggerInfo, SemanticLocalization, sessionStorage */

const providers = {
	$deleteModalForm: $('#delete-modal-form'),
	$providersTable: $('#providers-table'),
	initialize() {
		providers.$deleteModalForm.modal();
		$('.provider-row .checkbox')
			.checkbox({
				onChecked() {
					const uniqid = $(this).closest('tr').attr('id');
					$.api({
						url: `${globalRootUrl}providers/enable/{type}/{uniqid}`,
						on: 'now',
						urlData: {
							type: $(this).closest('tr').attr('data-value'),
							uniqid,
						},
						onSuccess(response) {
							if (response.success) {
								$(`#${uniqid} .disability`).removeClass('disabled');
							}
						},

					});
				},
				onUnchecked() {
					const uniqid = $(this).closest('tr').attr('id');
					$.api({
						url: `${globalRootUrl}providers/disable/{type}/{uniqid}`,
						on: 'now',
						urlData: {
							type: $(this).closest('tr').attr('data-value'),
							uniqid,
						},
						onSuccess(response) {
							if (response.success) {
								$(`#${uniqid} .disability`).addClass('disabled');
							}
						},

					});
				},
			});

		$('.provider-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			const type = $(e.target).closest('tr').attr('data-value');
			window.location = `${globalRootUrl}providers/modify${type}/${id}`;
		});

		$('body').on('click', '.provider-row a.delete', (e) => {
			e.preventDefault();
			const linksExist = $(e.target).closest('tr').attr('data-links');
			if (linksExist === 'true') {
				providers.$deleteModalForm
					.modal({
						closable: false,
						onDeny: () => true,
						onApprove: () => {
							window.location = $(e.target).closest('a').attr('href');
							return true;
						},
					})
					.modal('show');
			} else {
				window.location = $(e.target).closest('a').attr('href');
			}
		});
		providers.initializeDataTable();
	},
	/**
	 * Initialize data tables on table
	 */
	initializeDataTable() {
		providers.$providersTable.DataTable({
			lengthChange: false,
			paging: false,
			columns: [
				null,
				null,
				null,
				{ "width": "0"},
				null,
				null,
				{orderable: false, searchable: false},
			],
			autoWidth: false,
			order: [1, 'asc'],
			language: SemanticLocalization.dataTableLocalisation,
		});
		$('.add-new-button').appendTo($('div.eight.column:eq(0)'));
	},
};
const providersStatusLoopWorker = {
	timeOut: 3000,
	timeOutHandle: '',
	providerStatuses: {},
	initialize() {
		// Запустим обновление статуса провайдера
		DebuggerInfo.initialize();
		const previousStatuses = sessionStorage.getItem('ProviderStatuses');
		if (previousStatuses !== null) {
			providersStatusLoopWorker.providerStatuses = JSON.parse(previousStatuses);
		}
		providersStatusLoopWorker.restartWorker();
	},
	restartWorker() {
		window.clearTimeout(providersStatusLoopWorker.timeoutHandle);
		providersStatusLoopWorker.worker();
	},
	worker() {
		window.clearTimeout(providersStatusLoopWorker.timeoutHandle);
		PbxApi.GetSipProvidersStatuses(providersStatusLoopWorker.cbRefreshProvidersStatus);
		PbxApi.GetIaxProvidersStatuses(providersStatusLoopWorker.cbRefreshProvidersStatus);
	},
	/**
	 * Накопление информации о статусах провайдеров
	 */
	cbRefreshProvidersStatus(response) {
		providersStatusLoopWorker.timeoutHandle =
			window.setTimeout(providersStatusLoopWorker.worker, providersStatusLoopWorker.timeOut);
		if (response.length === 0 || response === false) return;
		$.each(response, (key, value) => {
			if (value.state !== undefined) {
				providersStatusLoopWorker.providerStatuses[value.id] = value.state.toUpperCase();
			}
		});
		sessionStorage.setItem('ProviderStatuses', JSON.stringify(providersStatusLoopWorker.providerStatuses));
		providersStatusLoopWorker.refreshVisualisation();
	},
	/**
	 * Обновление информации в таблице провайдеров
	 */
	refreshVisualisation() {
		let htmlTable = '<table class="ui very compact table">';
		$.each(providersStatusLoopWorker.providerStatuses, (key, value) => {
			htmlTable += '<tr>';
			htmlTable += `<td>${key}</td>`;
			htmlTable += `<td>${value}</td>`;
			htmlTable += '</tr>';
		});
		htmlTable += '</table>';
		DebuggerInfo.UpdateContent(htmlTable);
		const green = '<div class="ui green empty circular label" style="width: 1px;height: 1px;"></div>';
		const grey = '<div class="ui grey empty circular label" style="width: 1px;height: 1px;"></div>';
		const yellow = '<div class="ui yellow empty circular label" style="width: 1px;height: 1px;"></div>';
		$('tr.provider-row').each((index, obj) => {
			const uniqid = $(obj).attr('id');
			if (providersStatusLoopWorker.providerStatuses[uniqid] !== undefined) {
				switch (providersStatusLoopWorker.providerStatuses[uniqid]) {
					case 'REGISTERED':
						$(obj).find('.provider-status').html(green);
						$(obj).find('.failure').text('');
						break;
					case 'OK':
						$(obj).find('.provider-status').html(yellow);
						$(obj).find('.failure').text('');
						break;
					case 'OFF':
						$(obj).find('.provider-status').html(grey);
						$(obj).find('.failure').text('');
						break;
					default:
						$(obj).find('.provider-status').html(grey);
						$(obj).find('.failure').text(providersStatusLoopWorker.providerStatuses[uniqid]);
						break;
				}
			} else {
				$(obj).find('.provider-status').html(grey);
			}
		});
	},
};

$(document).ready(() => {
	providers.initialize();
	providersStatusLoopWorker.initialize();
});
