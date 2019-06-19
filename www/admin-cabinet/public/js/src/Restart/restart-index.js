/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
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
		PbxApi.GetCurrentCalls(currentCallsWorker.cbGetCurrentCalls);
		currentCallsWorker.timeoutHandle
			= window.setTimeout(currentCallsWorker.worker, currentCallsWorker.timeOut);
	},
	cbGetCurrentCalls(response) {
		currentCallsWorker.$currentCallsInfo.empty();
		if (response === false || typeof response !== 'object') return;
		const respObject = response;
		let resultUl = `<h2 class="ui header">${globalTranslate.rs_CurrentCalls}</h2>`;
		resultUl += '<table class="ui very compact table">';
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

