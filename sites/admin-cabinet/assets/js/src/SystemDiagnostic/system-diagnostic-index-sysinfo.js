/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 9 2020
 */
/* global ace, PbxApi */

const systemDiagnosticSysyinfo = {
	viewer: '',
	receivedInfo: false,
	$tabMenuItems: $('#system-diagnostic-menu .item'),
	$dimmer: $('#sysinfo-dimmer'),
	$contentFiled: $('#sysinfo-content-readonly'),
	initialize() {
		const aceHeight = window.innerHeight-300;
		$(window).load(function() {
			systemDiagnosticSysyinfo.$dimmer.closest('div').css('min-height', `${aceHeight}px`);
		});
		systemDiagnosticSysyinfo.$contentFiled.hide();
		systemDiagnosticSysyinfo.$tabMenuItems.on('click',(e)=>{
			if ($(e.target).attr('data-tab')==='show-sysinfo'
				&& systemDiagnosticSysyinfo.receivedInfo===false) {
				systemDiagnosticSysyinfo.initializeAce();
				PbxApi.SysInfoGetInfo(systemDiagnosticSysyinfo.cbUpdateSysinfoText);
			}
		});
	},
	initializeAce() {
		const aceHeight = window.innerHeight-300;
		const rowsCount = Math.round(aceHeight/16.3);
		$(window).load(function() {
			$('.log-content-readonly').css('min-height', `${aceHeight}px`);
		});
		const IniMode = ace.require('ace/mode/julia').Mode;
		systemDiagnosticSysyinfo.viewer = ace.edit('sysinfo-content-readonly');
		systemDiagnosticSysyinfo.viewer.session.setMode(new IniMode());
		systemDiagnosticSysyinfo.viewer.setTheme('ace/theme/monokai');
		systemDiagnosticSysyinfo.viewer.resize();
		systemDiagnosticSysyinfo.viewer.renderer.setShowGutter(false);
		systemDiagnosticSysyinfo.viewer.setOptions({
			showLineNumbers:false,
			showPrintMargin: false,
			readOnly: true,
			maxLines: rowsCount,
		});
	},
	/**
	 * Updates sysinfo view
	 * @param data
	 */
	cbUpdateSysinfoText(data) {
		systemDiagnosticSysyinfo.$dimmer.removeClass('active');
		systemDiagnosticSysyinfo.viewer.getSession().setValue(data.content);
		systemDiagnosticSysyinfo.receivedInfo = true;
		systemDiagnosticSysyinfo.$contentFiled.show();
	},

};

$(document).ready(() => {
	systemDiagnosticSysyinfo.initialize();
});

