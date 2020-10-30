/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, Form, globalTranslate */

/**
 * Мониторинг статуса обновления или установки модуля
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
