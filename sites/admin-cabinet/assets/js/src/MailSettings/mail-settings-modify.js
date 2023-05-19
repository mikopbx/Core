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

/* global globalRootUrl,globalTranslate, Form, PbxApi, UserMessage */

const mailSettings = {
	$formObj: $('#mail-settings-form'),
	$checkBoxes: $('#mail-settings-form .checkbox'),
	$menuItems: $('#mail-settings-menu .item'),
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
		mailSettings.$menuItems.tab();
		mailSettings.$checkBoxes.checkbox();
		mailSettings.initializeForm();
	},
	updateMailSettingsCallback(response) {
		if (response.result === true) {
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
			UserMessage.showMultiString(message);
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
