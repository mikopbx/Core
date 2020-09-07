/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
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

