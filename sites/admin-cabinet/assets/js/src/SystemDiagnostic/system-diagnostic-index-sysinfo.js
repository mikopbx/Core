/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

const systemDiagnosticSysyinfo = {
	viewer: '',
	receivedInfo: false,
	$tabMenuItems: $('#system-diagnostic-menu .item'),
	$dimmer: $('#sysinfo-dimmer'),
	$contentFiled: $('#sysinfo-content-readonly'),
	initialize() {
		const aceHeight = window.innerHeight-300;
		systemDiagnosticSysyinfo.$dimmer.closest('div').css('min-height', `${aceHeight}px`);

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

