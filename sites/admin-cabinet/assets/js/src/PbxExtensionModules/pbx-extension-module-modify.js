/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, Form, globalTranslate */

/**
 * Process common module settings
 *
 */
const pbxExtensionModuleModify = {
	$formObj: $('#pbx-extension-modify-form'),
	$backButton: $('#back-to-list-button'),
	$dropdown: $('#menu-group'),
	validateRules: {
		name: {
			identifier: 'caption',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.ext_ValidateCaptionEmpty,
				},
			],
		},
	},
	initialize() {
		$('#menu-group').dropdown();
		pbxExtensionModuleModify.initializeForm();
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = pbxExtensionModuleModify.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {
		window.location = window.location.href;
	},
	initializeForm() {
		Form.$formObj = pbxExtensionModuleModify.$formObj;
		Form.url = `${globalRootUrl}pbx-extension-modules/saveModuleSettings`;
		Form.validateRules = pbxExtensionModuleModify.validateRules;
		Form.cbBeforeSendForm = pbxExtensionModuleModify.cbBeforeSendForm;
		Form.cbAfterSendForm = pbxExtensionModuleModify.cbAfterSendForm;
		Form.initialize();
	},
};


$(document).ready(() => {
	pbxExtensionModuleModify.initialize();
});
