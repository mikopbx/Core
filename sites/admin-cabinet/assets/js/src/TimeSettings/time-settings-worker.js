/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2020
 *
 */

const clockWorker = {
	timeoutHandle: null,
	options: null,
	initialize() {
		clockWorker.restartWorker();
	},
	restartWorker() {
		window.clearTimeout(clockWorker.timeoutHandle);
		clockWorker.worker();
	},
	worker() {
		PbxApi.GetDateTime(clockWorker.cbAfterReceiveDateTimeFromServer);
	},

	cbAfterReceiveDateTimeFromServer(response){
		const options = { timeZone: timeSettings.$formObj.form('get value', 'PBXTimezone'), timeZoneName : 'short'};
		if (timeSettings.$formObj.form('get value', 'PBXManualTimeSettings') !== 'on') {
			clockWorker.timeoutHandle = window.setTimeout(
				clockWorker.worker,
				1000,
			);
		} else {
			options.timeZoneName = undefined;
		}
		if (response!==false){
			const dateTime =  new Date(response.timestamp*1000);
			timeSettings.$formObj.form('set value', 'ManualDateTime', dateTime.toLocaleString(globalWebAdminLanguage, options));
		}
	}
};

$(document).ready(() => {
	clockWorker.initialize();
});
