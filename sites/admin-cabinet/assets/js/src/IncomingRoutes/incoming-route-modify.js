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
					type: 'integer[3..600]',
					prompt: globalTranslate.ir_ValidateTimeoutOutOfRange,
				},
			],
		},
	},
	initialize() {
		incomingRouteModify.$providerDropDown.dropdown();
		incomingRouteModify.initializeForm();
		incomingRouteModify.$forwardingSelectDropdown.dropdown(Extensions.getDropdownSettingsForRouting());
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
