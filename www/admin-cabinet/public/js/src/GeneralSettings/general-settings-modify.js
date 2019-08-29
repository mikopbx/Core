/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */


/* global globalRootUrl,globalTranslate, Form, PasswordScore */

const generalSettingsModify = {
	$formObj: $('#general-settings-form'),
	$webAdminPassword: $('#WebAdminPassword'),
	$sshPassword: $('#SSHPassword'),
	validateRules: {
		pbxname: {
			identifier: 'PBXName',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.gs_ValidateEmptyPBXName,
				},
			],
		},
		WebAdminPassword: {
			identifier: 'WebAdminPassword',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.gs_ValidateEmptyWebPassword,
				},
				{
					type: 'minLength[5]',
					prompt: globalTranslate.gs_ValidateWeakWebPassword,
				},
			],
		},
		WebAdminPasswordRepeat: {
			identifier: 'WebAdminPasswordRepeat',
			rules: [
				{
					type: 'match[WebAdminPassword]',
					prompt: globalTranslate.gs_ValidateWebPasswordsFieldDifferent,
				},
			],
		},
		SSHPassword: {
			identifier: 'SSHPassword',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.gs_ValidateEmptySSHPassword,
				},
				{
					type: 'minLength[5]',
					prompt: globalTranslate.gs_ValidateWeakSSHPassword,
				},
			],
		},
		SSHPasswordRepeat: {
			identifier: 'SSHPasswordRepeat',
			rules: [
				{
					type: 'match[SSHPassword]',
					prompt: globalTranslate.gs_ValidateSSHPasswordsFieldDifferent,
				},
			],
		},
	},
	initialize() {
		generalSettingsModify.$webAdminPassword.on('keyup', () => {
			PasswordScore.checkPassStrength({
				pass: generalSettingsModify.$webAdminPassword.val(),
				bar: $('.password-score'),
				section: $('.password-score-section'),
			});
		});
		generalSettingsModify.$sshPassword.on('keyup', () => {
			PasswordScore.checkPassStrength({
				pass: generalSettingsModify.$sshPassword.val(),
				bar: $('.ssh-password-score'),
				section: $('.ssh-password-score-section'),
			});
		});
		$('#general-settings-menu').find('.item').tab({
			history: true,
			historyType: 'hash',
		});
		$('.checkbox').checkbox();
		$('.dropdown').dropdown();
		generalSettingsModify.initializeForm();
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = generalSettingsModify.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = generalSettingsModify.$formObj;
		Form.url = `${globalRootUrl}general-settings/save`;
		Form.validateRules = generalSettingsModify.validateRules;
		Form.cbBeforeSendForm = generalSettingsModify.cbBeforeSendForm;
		Form.cbAfterSendForm = generalSettingsModify.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	generalSettingsModify.initialize();
});