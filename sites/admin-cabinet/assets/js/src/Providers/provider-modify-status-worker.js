/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalTranslate, PbxApi, DebuggerInfo */

const providersStatusLoopWorker = {
	timeOut: 3000,
	$formObj: $('#save-provider-form'),
	timeOutHandle: '',
	$status: $('#status'),
	initialize() {
		// Запустим обновление статуса провайдера
		DebuggerInfo.initialize();
		providersStatusLoopWorker.restartWorker();
	},
	restartWorker() {
		window.clearTimeout(providersStatusLoopWorker.timeoutHandle);
		providersStatusLoopWorker.worker();
	},
	worker() {
		window.clearTimeout(providersStatusLoopWorker.timeoutHandle);
		switch (provider.providerType) {
			case 'SIP':
				PbxApi.GetSipProvidersStatuses(providersStatusLoopWorker.cbRefreshProvidersStatus);
				break;
			case 'IAX':
				PbxApi.GetIaxProvidersStatuses(providersStatusLoopWorker.cbRefreshProvidersStatus);
				break;
			default:
		}
	},
	cbRefreshProvidersStatus(response) {
		providersStatusLoopWorker.timeoutHandle =
			window.setTimeout(providersStatusLoopWorker.worker, providersStatusLoopWorker.timeOut);
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
		const uniqid = providersStatusLoopWorker.$formObj.form('get value', 'uniqid');
		const result = $.grep(response, (e) => {
			const respid = e.id;
			return respid.toUpperCase() === uniqid.toUpperCase();
		});
		if (result.length === 0) {
			// not found
			providersStatusLoopWorker.$status.removeClass('green').removeClass('yellow').addClass('grey');
		} else if (result[0] !== undefined && result[0].state.toUpperCase() === 'REGISTERED') {
			providersStatusLoopWorker.$status.removeClass('grey').removeClass('yellow').addClass('green');
		} else if (result[0] !== undefined && result[0].state.toUpperCase() === 'OK') {
			providersStatusLoopWorker.$status.removeClass('grey').removeClass('green').addClass('yellow');
		} else {
			providersStatusLoopWorker.$status.removeClass('green').removeClass('yellow').addClass('grey');
		}

		if (providersStatusLoopWorker.$status.hasClass('green')) {
			providersStatusLoopWorker.$status.html(globalTranslate.pr_Online);
		} else if (providersStatusLoopWorker.$status.hasClass('yellow')) {
			providersStatusLoopWorker.$status.html(globalTranslate.pr_WithoutRegistration);
		} else {
			providersStatusLoopWorker.$status.html(globalTranslate.pr_Offline);
		}
	},
};


$(document).ready(() => {
	providersStatusLoopWorker.initialize();
});