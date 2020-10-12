/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2020
 *
 */

const clockTimer = {
	timerVar: null,
	startTime: null,
	$localTime: $("#ManualDateTime"),
	$serverTime:$("#SystemDateTime"),
	initialize() {
		clockTimer.startTime = parseInt(timeSettings.$formObj.form('get value', 'SystemDateTime'),10)*1000;
		clockTimer.timeoutHandle = window.setTimeout(clockTimer.countTimer, 1000);
		clockTimer.countTimer();
		timeSettings.$formObj.form({onChange:clockTimer.cbOnChangeTimeSettingsMode});
	},
	countTimer() {
		if (timeSettings.$formObj.form('get value', 'PBXManualTimeSettings') !== 'on') {
			const now = Date.now();
			const diff = now - clockTimer.startTime;
			const serverTime = clockTimer.startTime + diff;
			timeSettings.$formObj.form('set value', 'ManualDateTime', new Date(serverTime).toLocaleString());
		} else {
			timeSettings.$formObj.form('set value', 'ManualDateTime', new Date(clockTimer.startTime).toLocaleString());
		}
	},
	cbOnChangeTimeSettingsMode(value){
		if (value==='on'){
			const localTime = new Date();
			timeSettings.$formObj.form('set value', 'ManualDateTime', localTime.toLocaleString());
			window.clearTimeout(clockTimer.timeoutHandle);
		} else {
			clockTimer.timeoutHandle = window.setTimeout(clockTimer.countTimer, 1000);
			clockTimer.countTimer();
		}
	}

};

$(document).ready(() => {
	clockTimer.initialize();
});
