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
		systemDiagnosticLogs.updateLogFromServer();
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
		systemDiagnosticLogs.$fileSelectDropDown.dropdown(
			{
				values: systemDiagnosticLogs.logsItems,
				onChange: systemDiagnosticLogs.cbOnChangeFile,
				ignoreCase: true,
				fullTextSearch: true,
				forceSelection: false,
			}
		);
		systemDiagnosticLogs.initializeAce();
		PbxApi.SyslogGetLogsList(systemDiagnosticLogs.cbFormatDropdownResults);

		systemDiagnosticLogs.$showBtn.on('click', (e) => {
			e.preventDefault();
			systemDiagnosticLogs.updateLogFromServer();
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
		$('input').keyup((event)=> {
			if (event.keyCode === 13) {
				systemDiagnosticLogs.updateLogFromServer();
			}
		});
	},
	initializeAce() {
		const aceHeight = window.innerHeight-300;
		const rowsCount = Math.round(aceHeight/15.7);
		$(window).load(function() {
			$('.log-content-readonly').css('min-height', `${aceHeight}px`);
		});
		const IniMode = ace.require('ace/mode/julia').Mode;
		systemDiagnosticLogs.viewer = ace.edit('log-content-readonly');
		systemDiagnosticLogs.viewer.session.setMode(new IniMode());
		systemDiagnosticLogs.viewer.setTheme('ace/theme/monokai');
		systemDiagnosticLogs.viewer.resize();
		systemDiagnosticLogs.viewer.renderer.setShowGutter(false);
		systemDiagnosticLogs.viewer.setOptions({
			 showLineNumbers:false,
			 showPrintMargin: false,
			 readOnly: true,
			 maxLines: rowsCount,
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

		systemDiagnosticLogs.$fileSelectDropDown.dropdown('change values', systemDiagnosticLogs.logsItems);
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
		systemDiagnosticLogs.updateLogFromServer();
	},
	/**
	 * Asks log file content from server
	 */
	updateLogFromServer(){
		const params = systemDiagnosticLogs.$formObj.form('get values');
		PbxApi.SyslogGetLogFromFile(params, systemDiagnosticLogs.cbUpdateLogText);
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

