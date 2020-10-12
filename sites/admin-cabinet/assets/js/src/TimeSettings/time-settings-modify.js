/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, SemanticLocalization, Form, PbxApi */

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
			const timestamp = Date.parse(manualDate)/1000;
			console.debug(`Set new system date: ${manualDate} timestamp: ${timestamp}`);
			PbxApi.UpdateDateTime(timestamp);
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
