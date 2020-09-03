/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */
/* global ace, PbxApi */

const systemDiagnosticLogs = {
	$showBtn: $('#show-last-log'),
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
};

$(document).ready(() => {
	systemDiagnosticLogs.initialize();
});

