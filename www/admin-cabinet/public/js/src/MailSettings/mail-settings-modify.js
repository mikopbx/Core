/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, Form, PbxApi, UserMessage */

const mailSettings = {
	$formObj: $('#mail-settings-form'),
	validateRules: {
		name: {
			identifier: 'name',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.cq_ValidateNameEmpty,
				},
			],
		},
	},
	initialize() {
		$('#mail-settings-menu .item').tab();
		$('.checkbox').checkbox();

		mailSettings.initializeForm();
	},
	updateMailSettingsCallback(response) {
		if (response.result.toUpperCase() === 'SUCCESS') {
			mailSettings.$formObj.after(`<div class="ui success message ajax">${globalTranslate.ms_TestEmailSubject}</div>`);
			const testEmail = mailSettings.$formObj.form('get value', 'SystemNotificationsEmail');
			if (testEmail.length > 0) {
				const params = {
					email: testEmail,
					subject: globalTranslate.ms_TestEmailSubject,
					body: globalTranslate.ms_TestEmailBody,
					encode: '',
				};
				PbxApi.SendTestEmail(params, mailSettings.cbAfterEmailSend);
			}
		}
	},
	cbAfterEmailSend(message) {
		if (message === true) {
			UserMessage.showInformation(globalTranslate.ms_TestEmailSentSuccessfully);
		} else if (message.length > 0) {
			UserMessage.showError(message);
		}
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = mailSettings.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm(response) {
		if (response.success === true) {
			PbxApi.UpdateMailSettings(mailSettings.updateMailSettingsCallback);
		}
	},
	initializeForm() {
		Form.$formObj = mailSettings.$formObj;
		Form.url = `${globalRootUrl}mail-settings/save`;
		Form.validateRules = mailSettings.validateRules;
		Form.cbBeforeSendForm = mailSettings.cbBeforeSendForm;
		Form.cbAfterSendForm = mailSettings.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	mailSettings.initialize();
});
