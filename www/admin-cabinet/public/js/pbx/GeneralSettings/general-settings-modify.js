"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

/* global globalRootUrl,globalTranslate, Form, PasswordScore */
var generalSettingsModify = {
	$formObj: $('#general-settings-form'),
	$webAdminPassword: $('#WebAdminPassword'),
	$sshPassword: $('#SSHPassword'),
	validateRules: {
		pbxname: {
			identifier: 'PBXName',
			rules: [{
				type: 'empty',
				prompt: globalTranslate.gs_ValidateEmptyPBXName
			}]
		},
		WebAdminPassword: {
			identifier: 'WebAdminPassword',
			rules: [{
				type: 'empty',
				prompt: globalTranslate.gs_ValidateEmptyWebPassword
			}, {
				type: 'minLength[5]',
				prompt: globalTranslate.gs_ValidateWeakWebPassword
			}]
		},
		WebAdminPasswordRepeat: {
			identifier: 'WebAdminPasswordRepeat',
			rules: [{
				type: 'match[WebAdminPassword]',
				prompt: globalTranslate.gs_ValidateWebPasswordsFieldDifferent
			}]
		},
		SSHPassword: {
			identifier: 'SSHPassword',
			rules: [{
				type: 'empty',
				prompt: globalTranslate.gs_ValidateEmptySSHPassword
			}, {
				type: 'minLength[5]',
				prompt: globalTranslate.gs_ValidateWeakSSHPassword
			}]
		},
		SSHPasswordRepeat: {
			identifier: 'SSHPasswordRepeat',
			rules: [{
				type: 'match[SSHPassword]',
				prompt: globalTranslate.gs_ValidateSSHPasswordsFieldDifferent
			}]
		}
	},
	initialize: function () {
		function initialize() {
			generalSettingsModify.$webAdminPassword.on('keyup', function () {
				PasswordScore.checkPassStrength({
					pass: generalSettingsModify.$webAdminPassword.val(),
					bar: $('.password-score'),
					section: $('.password-score-section')
				});
			});
			generalSettingsModify.$sshPassword.on('keyup', function () {
				PasswordScore.checkPassStrength({
					pass: generalSettingsModify.$sshPassword.val(),
					bar: $('.ssh-password-score'),
					section: $('.ssh-password-score-section')
				});
			});
			$('#general-settings-menu').find('.item').tab({
				history: true,
				historyType: 'hash'
			});
			$('.checkbox').checkbox();
			$('.dropdown').dropdown();
			generalSettingsModify.initializeForm();
		}

		return initialize;
	}(),
	cbBeforeSendForm: function () {
		function cbBeforeSendForm(settings) {
			var result = settings;
			result.data = generalSettingsModify.$formObj.form('get values');
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
			Form.$formObj = generalSettingsModify.$formObj;
			Form.url = "".concat(globalRootUrl, "general-settings/save");
			Form.validateRules = generalSettingsModify.validateRules;
			Form.cbBeforeSendForm = generalSettingsModify.cbBeforeSendForm;
			Form.cbAfterSendForm = generalSettingsModify.cbAfterSendForm;
			Form.initialize();
		}

		return initializeForm;
	}()
};
$(document).ready(function () {
	generalSettingsModify.initialize();
});
//# sourceMappingURL=general-settings-modify.js.map