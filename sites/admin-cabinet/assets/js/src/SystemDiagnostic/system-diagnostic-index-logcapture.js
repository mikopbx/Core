/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2020
 */
/* global sessionStorage, PbxApi */

const systemDiagnosticCapture = {
	$startBtn: $('#start-capture-button'),
	$stopBtn: $('#stop-capture-button'),
	$showBtn: $('#show-last-log'),
	initialize() {
		if (sessionStorage.getItem('LogsCaptureStatus') === 'started') {
			systemDiagnosticCapture.$startBtn.addClass('disabled loading');
			systemDiagnosticCapture.$stopBtn.removeClass('disabled');
		} else {
			systemDiagnosticCapture.$startBtn.removeClass('disabled loading');
			systemDiagnosticCapture.$stopBtn.addClass('disabled');
		}
		systemDiagnosticCapture.$startBtn.on('click', (e) => {
			e.preventDefault();
			systemDiagnosticCapture.$startBtn.addClass('disabled loading');
			systemDiagnosticCapture.$stopBtn.removeClass('disabled');
			PbxApi.SyslogStartLogsCapture();
		});
		systemDiagnosticCapture.$stopBtn.on('click', (e) => {
			e.preventDefault();
			systemDiagnosticCapture.$startBtn.removeClass('disabled loading');
			systemDiagnosticCapture.$stopBtn.addClass('disabled');
			PbxApi.SyslogStopLogsCapture();
		});

	},
};

$(document).ready(() => {
	systemDiagnosticCapture.initialize();
});

