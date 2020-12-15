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
