/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

/* global globalRootUrl,globalTranslate, Extensions, Form  */

// Проверка нет ли ошибки занятого другой учеткой номера
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

const conference = {
	$number: $('#extension'),
	$formObj: $('#conference-room-form'),
	defaultExtension: '',
	validateRules: {
		name: {
			identifier: 'name',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.cr_ValidateNameEmpty,
				},
			],
		},
		extension: {
			identifier: 'extension',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.cr_ValidateExtensionEmpty,
				},
				{
					type: 'existRule[extension-error]',
					prompt: globalTranslate.cr_ValidateExtensionDouble,
				},
			],
		},
	},
	initialize() {
		// Динамическая проверка свободен ли внутренний номер
		conference.$number.on('change', () => {
			const newNumber = conference.$formObj.form('get value', 'extension');
			Extensions.checkAvailability(conference.defaultNumber, newNumber);
		});

		conference.initializeForm();
		conference.defaultExtension = conference.$formObj.form('get value', 'extension');
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = conference.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = conference.$formObj;
		Form.url = `${globalRootUrl}conference-rooms/save`;
		Form.validateRules = conference.validateRules;
		Form.cbBeforeSendForm = conference.cbBeforeSendForm;
		Form.cbAfterSendForm = conference.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	conference.initialize();
});

