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

/* global globalRootUrl, globalTranslate, SemanticLocalization, Form, PbxApi, clockWorker */

const timeSettings = {
	$number: $('#extension'),
	$formObj: $('#time-settings-form'),
	validateRules: {
		CurrentDateTime: {
			depends: 'PBXManualTimeSettings',
			identifier: 'ManualDateTime',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.ts_ValidateDateTime,
				},
			],
		},
	},
	initialize() {
		$('#PBXTimezone').dropdown({
			fullTextSearch: true,
		});

		$('.checkbox').checkbox({
			onChange() {
				timeSettings.toggleDisabledFieldClass();
			},
		});
		timeSettings.initializeForm();
		timeSettings.toggleDisabledFieldClass();
	},
	toggleDisabledFieldClass() {
		if (timeSettings.$formObj.form('get value', 'PBXManualTimeSettings') === 'on') {
			$('#SetDateTimeBlock').removeClass('disabled');
			$('#SetNtpServerBlock').addClass('disabled');
		} else {
			$('#SetNtpServerBlock').removeClass('disabled');
			$('#SetDateTimeBlock').addClass('disabled');
			clockWorker.restartWorker();
		}
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = timeSettings.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {
		if (timeSettings.$formObj.form('get value', 'PBXManualTimeSettings') === 'on') {
			const manualDate = timeSettings.$formObj.form('get value', 'ManualDateTime');
			const timestamp = Date.parse(`${manualDate}`)/1000;
			const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			PbxApi.UpdateDateTime({timestamp, userTimeZone});
		}
	},
	initializeForm() {
		Form.$formObj = timeSettings.$formObj;
		Form.url = `${globalRootUrl}time-settings/save`;
		Form.validateRules = timeSettings.validateRules;
		Form.cbBeforeSendForm = timeSettings.cbBeforeSendForm;
		Form.cbAfterSendForm = timeSettings.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	timeSettings.initialize();
});
