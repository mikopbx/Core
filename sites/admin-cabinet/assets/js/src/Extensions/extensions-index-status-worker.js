/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2022 Alexey Portnov and Nikolay Beketov
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

/* global PbxApi, DebuggerInfo */

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
	extensionsStatusLoopWorker.initialize();
});