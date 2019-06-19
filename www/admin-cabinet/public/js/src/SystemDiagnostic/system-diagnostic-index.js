/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */
/* global localStorage, PbxApi */

const systemDiagnostic = {
	$startBtn: $('#start-capture-button'),
	$stopBtn: $('#stop-capture-button'),
	initialize() {
		if (localStorage.getItem('LogsCaptureStatus') === 'started') {
			systemDiagnostic.$startBtn.addClass('disabled loading');
			systemDiagnostic.$stopBtn.removeClass('disabled');
		} else {
			systemDiagnostic.$startBtn.removeClass('disabled loading');
			systemDiagnostic.$stopBtn.addClass('disabled');
		}
		systemDiagnostic.$startBtn.on('click', (e) => {
			e.preventDefault();
			systemDiagnostic.$startBtn.addClass('disabled loading');
			systemDiagnostic.$stopBtn.removeClass('disabled');
			PbxApi.SystemStartLogsCapture();
		});
		systemDiagnostic.$stopBtn.on('click', (e) => {
			e.preventDefault();
			systemDiagnostic.$startBtn.removeClass('disabled loading');
			systemDiagnostic.$stopBtn.addClass('disabled');
			PbxApi.SystemStopLogsCapture(systemDiagnostic.cbAfterStopLogsCapture);
		});
	},
	cbAfterStopLogsCapture(response) {
		console.log(response);
	},
};

$(document).ready(() => {
	systemDiagnostic.initialize();
});

