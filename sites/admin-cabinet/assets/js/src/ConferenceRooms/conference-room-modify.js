/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
					type: 'number',
					prompt: globalTranslate.cr_ValidateExtensionNumber,
				},
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

