/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */
/* global sessionStorage, ace, PbxApi */

const systemDiagnostic = {
	$startBtn: $('#start-capture-button'),
	$stopBtn:  $('#stop-capture-button'),
	$showBtn:  $('#show-last-log'),
	viewer: '',
	$tabMenuItems: $('#system-diagnostic-form .item'),
	$fileSelectDropDown: $('#system-diagnostic-form .type-select'),

	initialize() {
		systemDiagnostic.$tabMenuItems.tab();
		systemDiagnostic.$tabMenuItems.tab('change tab', 'show-log');

		systemDiagnostic.$fileSelectDropDown.dropdown({
			onChange() {
				// customFile.getFileContentFromServer();
			},
		});

		systemDiagnostic.$showBtn.on('click', (e) => {
			e.preventDefault();
			let Lines = $('#lines').val();
			if(!jQuery.isNumeric( Lines)){
				Lines = 500;
			}
			PbxApi.GetLogFromFile($('#filenames').val(), $('#filter').val(), Lines , systemDiagnostic.cbUpdateLogText)
		});

		if (sessionStorage.getItem('LogsCaptureStatus') === 'started') {
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

		systemDiagnostic.initializeAce();
	},
	initializeAce() {
		const IniMode = ace.require('ace/mode/julia').Mode;
		systemDiagnostic.viewer = ace.edit('application-code-readonly');
		systemDiagnostic.viewer.setReadOnly(true);
		systemDiagnostic.viewer.session.setMode(new IniMode());
		systemDiagnostic.viewer.setTheme('ace/theme/monokai');
		systemDiagnostic.viewer.resize();

		const $codeElement = $('#application-code-readonly');
		const Length = $codeElement.height() * 0.80;
		$codeElement.height(Length);
		$('.ace_gutter').hide();

		setTimeout(systemDiagnostic.cbUpdateLogText, 2000);
	},
	cbAfterStopLogsCapture(response) {
		// console.log(response);
	},
	cbUpdateLogText(data) {
		if (typeof (data) !== 'undefined' && data.length > 0) {
			systemDiagnostic.viewer.setValue(data[0]);
		}
		systemDiagnostic.viewer.gotoLine($('#lines').val())
	},
};

$(document).ready(() => {
	systemDiagnostic.initialize();
});

