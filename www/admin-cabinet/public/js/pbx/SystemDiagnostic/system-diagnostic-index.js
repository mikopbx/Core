"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

/* global localStorage, PbxApi */
var systemDiagnostic = {
	$startBtn: $('#start-capture-button'),
	$stopBtn: $('#stop-capture-button'),
	initialize: function () {
		function initialize() {
			if (localStorage.getItem('LogsCaptureStatus') === 'started') {
				systemDiagnostic.$startBtn.addClass('disabled loading');
				systemDiagnostic.$stopBtn.removeClass('disabled');
			} else {
				systemDiagnostic.$startBtn.removeClass('disabled loading');
				systemDiagnostic.$stopBtn.addClass('disabled');
			}

			systemDiagnostic.$startBtn.on('click', function (e) {
				e.preventDefault();
				systemDiagnostic.$startBtn.addClass('disabled loading');
				systemDiagnostic.$stopBtn.removeClass('disabled');
				PbxApi.SystemStartLogsCapture();
			});
			systemDiagnostic.$stopBtn.on('click', function (e) {
				e.preventDefault();
				systemDiagnostic.$startBtn.removeClass('disabled loading');
				systemDiagnostic.$stopBtn.addClass('disabled');
				PbxApi.SystemStopLogsCapture(systemDiagnostic.cbAfterStopLogsCapture);
			});
		}

		return initialize;
	}(),
	cbAfterStopLogsCapture: function () {
		function cbAfterStopLogsCapture(response) {
			console.log(response);
		}

		return cbAfterStopLogsCapture;
	}()
};
$(document).ready(function () {
	systemDiagnostic.initialize();
});
//# sourceMappingURL=system-diagnostic-index.js.map