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

/* global globalRootUrl,globalTranslate, Form */

$.fn.form.settings.rules.ipaddr = function (value) {
	let result = true;
	const f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (f === null) {
		result = false;
	} else {
		for (let i = 1; i < 5; i += 1) {
			const a = f[i];
			if (a > 255) {
				result = false;
			}
		}
		if (f[5] > 32) {
			result = false;
		}
	}
	return result;
};

const firewall = {
	$formObj: $('#firewall-form'),
	validateRules: {
		network: {
			identifier: 'network',
			rules: [
				{
					type: 'ipaddr',
					prompt: globalTranslate.fw_ValidatePermitAddress,
				},
			],
		},
		description: {
			identifier: 'description',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.fw_ValidateRuleName,
				},
			],
		},
	},
	initialize() {
		$('#firewall-form .rules,#firewall-form .checkbox').checkbox();
		$('#firewall-form .dropdown').dropdown();

		firewall.initializeForm();
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = firewall.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = firewall.$formObj;
		Form.url = `${globalRootUrl}firewall/save`;
		Form.validateRules = firewall.validateRules;
		Form.cbBeforeSendForm = firewall.cbBeforeSendForm;
		Form.cbAfterSendForm = firewall.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	firewall.initialize();
});

