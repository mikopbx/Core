"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

/* global globalRootUrl,globalTranslate,Form */
var loginForm = {
	$formObj: $('#login-form'),
	$submitButton: $('#submitbutton'),
	validateRules: {
		login: {
			identifier: 'login',
			rules: [{
				type: 'empty',
				prompt: globalTranslate.auth_ValidateLoginNotEmpty
			}]
		},
		password: {
			identifier: 'password',
			rules: [{
				type: 'empty',
				prompt: globalTranslate.auth_ValidatePasswordNotEmpty
			}]
		}
	},
	initialize: function () {
		function initialize() {
			loginForm.initializeForm();
			$('input').on('input', function () {
				$('.message.ajax').remove();
			});
		}

		return initialize;
	}(),
	cbBeforeSendForm: function () {
		function cbBeforeSendForm(settings) {
			var result = settings;
			result.data = loginForm.$formObj.form('get values');
			return result;
		}

		return cbBeforeSendForm;
	}(),
	cbAfterSendForm: function () {
		function cbAfterSendForm() {
		}

		return cbAfterSendForm;
	}(),
	initializeForm: function () {
		function initializeForm() {
			Form.$formObj = loginForm.$formObj;
			Form.url = "".concat(globalRootUrl, "session/start");
			Form.validateRules = loginForm.validateRules;
			Form.cbBeforeSendForm = loginForm.cbBeforeSendForm;
			Form.cbAfterSendForm = loginForm.cbAfterSendForm;
			Form.keyboardShortcuts = false;
			Form.configWorkerEnabled = false;
			Form.initialize();
		}

		return initializeForm;
	}()
};
$(document).ready(function () {
	loginForm.initialize();
});
//# sourceMappingURL=login-form.js.map