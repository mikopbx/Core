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

/* global globalRootUrl,globalTranslate,Form */

const loginForm = {
	$formObj: $('#login-form'),
	$submitButton: $('#submitbutton'),
	validateRules: {
		login: {
			identifier: 'login',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.auth_ValidateLoginNotEmpty,
				},
			],
		},
		password: {
			identifier: 'password',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.auth_ValidatePasswordNotEmpty,
				},
			],
		},
	},
	initialize() {
		loginForm.initializeForm();
		$('input')
			.keyup((event)=> {
			if (event.keyCode === 13) {
				loginForm.$submitButton.click();
			}
		})
			.on('input', () => {
			$('.message.ajax').remove();
		});
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = loginForm.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = loginForm.$formObj;
		Form.url = `${globalRootUrl}session/start`;
		Form.validateRules = loginForm.validateRules;
		Form.cbBeforeSendForm = loginForm.cbBeforeSendForm;
		Form.cbAfterSendForm = loginForm.cbAfterSendForm;
		Form.keyboardShortcuts = false;
		Form.initialize();
	},
};

$(document).ready(() => {
	loginForm.initialize();
});

