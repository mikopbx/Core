/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
	$logContent: $('#log-content-readonly'),
	viewer: '',
	$fileSelectDropDown: $('#system-diagnostic-form .filenames-select'),
	logsItems: [],
	defaultLogItem: null,
	$dimmer: $('#get-logs-dimmer'),
	$formObj: $('#system-diagnostic-form'),
	$fileName: $('#system-diagnostic-form .filename'),
	initialize() {
		const aceHeight = window.innerHeight-250;
		systemDiagnosticLogs.$dimmer.closest('div').css('min-height', `${aceHeight}px`);
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
		systemDiagnosticLogs.viewer = ace.edit('log-content-readonly');

		const julia = ace.require('ace/mode/julia');
		if (julia!==undefined){
			const IniMode = julia.Mode;
			systemDiagnosticLogs.viewer.session.setMode(new IniMode());
		}
		systemDiagnosticLogs.viewer.setTheme('ace/theme/monokai');
		systemDiagnosticLogs.viewer.renderer.setShowGutter(false);
		systemDiagnosticLogs.viewer.setOptions({
			showLineNumbers:false,
			showPrintMargin: false,
			readOnly: true,
		});
		$(window).load(function() {
			const aceHeight = window.innerHeight-systemDiagnosticLogs.$logContent.offset().top-50;
			$('.log-content-readonly').css('min-height', `${aceHeight}px`);
			systemDiagnosticLogs.viewer.resize();
		});
	},
	/**
	 * Makes formatted menu structure
	 */
	cbFormatDropdownResults(response) {
		if (response ===false){
			return ;
		}

		let defVal = '';
		if(systemDiagnosticLogs.logsItems.length === 0 && $("#filename").val() !== ''){
			defVal = $("#filename").val().trim();
		}

		systemDiagnosticLogs.logsItems = [];
		const files = response.files;
		$.each(files, (index, item) => {

			if(defVal !== ''){
				item.default = (defVal === item.path);
			}

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
		systemDiagnosticLogs.$dimmer.removeClass('active');
	},
	/**
	 * After push button download file
	 * @param response
	 */
	cbDownloadFile(response){
		if (response!==false){
			window.location = response.filename;
		}
	},
};

$(document).ready(() => {
	systemDiagnosticLogs.initialize();
});

