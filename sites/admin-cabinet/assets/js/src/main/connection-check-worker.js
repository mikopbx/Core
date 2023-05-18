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

/* global PbxApi, globalDebugMode */

const connectionCheckWorker = {
	timeOut: 1000,
	timeOutHandle: '',
	errorCounts: 0,
	$connectionDimmer: $('#connection-dimmer'),
	initialize() {
		// Запустим обновление статуса провайдера
		connectionCheckWorker.restartWorker();
	},
	restartWorker() {
		window.clearTimeout(connectionCheckWorker.timeoutHandle);
		connectionCheckWorker.worker();
	},
	worker() {
		PbxApi.PingPBX(connectionCheckWorker.cbAfterResponse);
		connectionCheckWorker.timeoutHandle = window.setTimeout(
			connectionCheckWorker.worker,
			connectionCheckWorker.timeOut,
		);
	},
	cbAfterResponse(result) {
		if (result === true) {
			connectionCheckWorker.$connectionDimmer.dimmer('hide');
			connectionCheckWorker.timeOut = 3000;
			if (connectionCheckWorker.errorCounts > 5) window.location.reload();
			connectionCheckWorker.errorCounts = 0;
		} else if (connectionCheckWorker.errorCounts > 3) {
			connectionCheckWorker.$connectionDimmer.dimmer('show');
			connectionCheckWorker.timeOut = 1000;
			connectionCheckWorker.errorCounts += 1;
		} else {
			connectionCheckWorker.timeOut = 1000;
			connectionCheckWorker.errorCounts += 1;
		}
	},
};

$(document).ready(() => {
	if (!globalDebugMode) {
		connectionCheckWorker.initialize();
	}
});
