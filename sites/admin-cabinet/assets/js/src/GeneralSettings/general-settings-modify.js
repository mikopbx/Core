/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */


/* global globalRootUrl,globalTranslate, Form, PasswordScore */

const generalSettingsModify = {
	$dirrtyField: $('#dirrty'),
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
		WEBPort: {
			identifier: 'WEBPort',
			rules: [
				{
					type: 'integer[1..65535]',
					prompt: globalTranslate.gs_ValidateWEBPortOutOfRange,
				},
			],
		},
		WEBHTTPSPort: {
			identifier: 'WEBHTTPSPort',
			rules: [
				{
					type: 'integer[1..65535]',
					prompt: globalTranslate.gs_ValidateWEBHTTPSPortOutOfRange,
				},
				{
					type: 'different[WEBPort]',
					prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToWEBPort,
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
		$('#general-settings-form .checkbox').checkbox();
		$('#general-settings-form .dropdown').dropdown();

		$('#audio-codecs-table, #video-codecs-table').tableDnD({
			onDrop() {
				generalSettingsModify.$dirrtyField.val(Math.random());
				generalSettingsModify.$dirrtyField.trigger('change');
			},
			onDragClass: 'hoveringRow',
			dragHandle: '.dragHandle',
		});
		generalSettingsModify.initializeForm();
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = generalSettingsModify.$formObj.form('get values');
		const arrCodecs = [];
		$('#audio-codecs-table .codec-row, #video-codecs-table .codec-row').each((index, obj) => {
			if ($(obj).attr('id')) {
				arrCodecs.push({
					codecId: $(obj).attr('id'),
					disabled: $(obj).find('.checkbox').checkbox('is unchecked'),
					priority: index,
				});
			}
		});
		result.data.codecs = JSON.stringify(arrCodecs);

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