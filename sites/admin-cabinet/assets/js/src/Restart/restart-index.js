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

/* global globalTranslate, PbxApi, Extensions */

const restart = {
	initialize() {
		$('#restart-button').on('click', (e) => {
			$(e.target).closest('button').addClass('loading');
			PbxApi.SystemReboot();
		});
		$('#shutdown-button').on('click', (e) => {
			$(e.target).closest('button').addClass('loading');
			PbxApi.SystemShutDown();
		});
	},
};

const currentCallsWorker = {
	timeOut: 3000,
	timeOutHandle: '',
	$currentCallsInfo: $('#current-calls-info'),
	initialize() {
		currentCallsWorker.restartWorker();
	},
	restartWorker() {
		window.clearTimeout(currentCallsWorker.timeoutHandle);
		currentCallsWorker.worker();
	},
	worker() {
		PbxApi.GetCurrentCalls(currentCallsWorker.cbGetCurrentCalls); //TODO::Проверить согласно новой структуре ответа PBXCore
		currentCallsWorker.timeoutHandle
			= window.setTimeout(currentCallsWorker.worker, currentCallsWorker.timeOut);
	},
	cbGetCurrentCalls(response) {
		currentCallsWorker.$currentCallsInfo.empty();
		if (response === false || typeof response !== 'object') return;
		const respObject = response;
		let resultUl = `<h2 class="ui header">${globalTranslate.rs_CurrentCalls}</h2>`;
		resultUl += '<table class="ui very compact unstackable table">';
		resultUl += '<thead>';
		resultUl += `<th></th><th>${globalTranslate.rs_DateCall}</th><th>${globalTranslate.rs_Src}</th><th>${globalTranslate.rs_Dst}</th>`;
		resultUl += '</thead>';
		resultUl += '<tbody>';
		$.each(respObject, (index, value) => {
			resultUl += '<tr>';
			resultUl += '<td><i class="spinner loading icon"></i></td>';
			resultUl += `<td>${value.start}</td>`;
			resultUl += `<td class="need-update">${value.src_num}</td>`;
			resultUl += `<td class="need-update">${value.dst_num}</td>`;
			resultUl += '</tr>';
		});
		resultUl += '</tbody></table>';
		currentCallsWorker.$currentCallsInfo.html(resultUl);
		Extensions.UpdatePhonesRepresent('need-update');
	},
};


$(document).ready(() => {
	restart.initialize();
	currentCallsWorker.initialize();
});

