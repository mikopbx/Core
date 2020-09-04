/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */
/* global ace, PbxApi */


const updateLogViewWorker = {
	timeOut: 3000,
	timeOutHandle: '',
	errorCounts: 0,
	initialize() {
		updateLogViewWorker.restartWorker();
	},
	restartWorker() {
		window.clearTimeout(updateLogViewWorker.timeoutHandle);
		updateLogViewWorker.worker();
	},
	worker() {
		const data = systemDiagnosticLogs.$formObj.form('get values');
		PbxApi.SyslogGetLogFromFile(data.filename, data.filter, data.lines, systemDiagnosticLogs.cbUpdateLogText);
		updateLogViewWorker.timeoutHandle = window.setTimeout(
			updateLogViewWorker.worker,
			updateLogViewWorker.timeOut,
		);
	},
	stop() {
		window.clearTimeout(updateLogViewWorker.timeoutHandle);
	}
};

const systemDiagnosticLogs = {
	$showBtn: $('#show-last-log'),
	$downloadBtn: $('#download-file'),
	$showAutoBtn: $('#show-last-log-auto'),
	viewer: '',
	$fileSelectDropDown: $('#system-diagnostic-form .filenames-select'),
	logsItems: [],
	defaultLogItem: null,
	$formObj: $('#system-diagnostic-form'),
	$fileName: $('#system-diagnostic-form .filename'),
	initialize() {
		systemDiagnosticLogs.initializeAce();
		PbxApi.SyslogGetLogsList(systemDiagnosticLogs.cbFormatDropdownResults);

		systemDiagnosticLogs.$showBtn.on('click', (e) => {
			e.preventDefault();
			const data = systemDiagnosticLogs.$formObj.form('get values');
			PbxApi.SyslogGetLogFromFile(data.filename, data.filter, data.lines, systemDiagnosticLogs.cbUpdateLogText);
		});

		systemDiagnosticLogs.$downloadBtn.on('click', (e) => {
			e.preventDefault();
			const data = systemDiagnosticLogs.$formObj.form('get values');
			PbxApi.SyslogDownloadLogFile(data.filename, systemDiagnosticLogs.cbDownloadFile);
		});

		systemDiagnosticLogs.$showAutoBtn.on('click', (e) => {
			e.preventDefault();
			const $reloadIcon = systemDiagnosticLogs.$showAutoBtn.find('i.refresh');
			if ($reloadIcon.hasClass('loading')){
				$reloadIcon.removeClass('loading');
				updateLogViewWorker.stop();
			} else {
				$reloadIcon.addClass('loading');
				updateLogViewWorker.initialize();
			}
		});
	},
	initializeAce() {
		const IniMode = ace.require('ace/mode/julia').Mode;
		systemDiagnosticLogs.viewer = ace.edit('log-content-readonly');
		systemDiagnosticLogs.viewer.setReadOnly(true);
		systemDiagnosticLogs.viewer.session.setMode(new IniMode());
		systemDiagnosticLogs.viewer.setTheme('ace/theme/monokai');
		systemDiagnosticLogs.viewer.resize();
		systemDiagnosticLogs.viewer.setShowPrintMargin(false);
		systemDiagnosticLogs.viewer.setOptions({
			maxLines: 45,
		});
	},
	/**
	 * Makes formatted menu structure
	 */
	cbFormatDropdownResults(response) {
		if (response ===false){
			return ;
		}
		systemDiagnosticLogs.logsItems = [];
		const files = response.files;
		$.each(files, (index, item) => {
			systemDiagnosticLogs.logsItems.push({
				name: `${index} (${item.size})`,
				value: item.path,
				selected: item.default
			});
		});
		systemDiagnosticLogs.$fileSelectDropDown.dropdown(
			{
				values: systemDiagnosticLogs.logsItems,
				onChange: systemDiagnosticLogs.cbOnChangeFile,
				ignoreCase: true,
				fullTextSearch: true,
				forceSelection: false,
			}
		);
	},
	/**
	 * Callback after change log file in select
	 * @param value
	 */
	cbOnChangeFile(value) {
		if (value.length===0){
			return;
		}
		systemDiagnosticLogs.$formObj.form('set value', 'filename', value);
		const data = systemDiagnosticLogs.$formObj.form('get values');
		PbxApi.SyslogGetLogFromFile(data.filename, data.filter, data.lines, systemDiagnosticLogs.cbUpdateLogText);
	},
	/**
	 * Updates log view
	 * @param data
	 */
	cbUpdateLogText(data) {
		systemDiagnosticLogs.viewer.getSession().setValue(data.content);
		const row = systemDiagnosticLogs.viewer.session.getLength() - 1;
		const column = systemDiagnosticLogs.viewer.session.getLine(row).length; // or simply Infinity
		systemDiagnosticLogs.viewer.gotoLine(row + 1, column);
	},
	/**
	 * After push button download file
	 * @param response
	 */
	cbDownloadFile(response){
		if (response!==false){
			window.location = response.filename;
		}
	}
};

$(document).ready(() => {
	systemDiagnosticLogs.initialize();
});

