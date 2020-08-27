/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

/* global globalRootUrl,globalTranslate, Extensions, Form */

const incomingRouteModify = {
	$formObj: $('#incoming-route-form'),
	$providerDropDown: $('#provider'),
	$forwardingSelectDropdown: $('#incoming-route-form .forwarding-select'),
	validateRules: {
		extension: {
			identifier: 'extension',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.ir_ValidateForwardingToBeFilled,
				},
			],
		},
		timeout: {
			identifier: 'timeout',
			rules: [
				{
					type: 'integer[3..300]',
					prompt: globalTranslate.ir_ValidateTimeoutOutOfRange,
				},
			],
		},
	},
	initialize() {
		incomingRouteModify.$providerDropDown.dropdown();
		incomingRouteModify.initializeForm();
		incomingRouteModify.$forwardingSelectDropdown.dropdown(Extensions.getDropdownSettingsWithoutEmpty());
		Extensions.fixBugDropdownIcon();
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = incomingRouteModify.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = incomingRouteModify.$formObj;
		Form.url = `${globalRootUrl}incoming-routes/save`;
		Form.validateRules = incomingRouteModify.validateRules;
		Form.cbBeforeSendForm = incomingRouteModify.cbBeforeSendForm;
		Form.cbAfterSendForm = incomingRouteModify.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	incomingRouteModify.initialize();
});
