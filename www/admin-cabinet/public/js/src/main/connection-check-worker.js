/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
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
