/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

/* global globalRootUrl, PbxApi, DebuggerInfo */

const providers = {
	initialize() {
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
		const green = '<a class="ui green empty circular label "></a>';
		const grey = '<a class="ui grey empty circular label "></a>';
		const yellow = '<a class="ui yellow empty circular label "></a>';
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
