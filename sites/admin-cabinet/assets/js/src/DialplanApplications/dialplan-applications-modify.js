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

/* global globalRootUrl,globalTranslate, ace, Form, Extensions */

// Проверка нет ли ошибки занятого другой учеткой номера
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

const dialplanApplication = {
	$number: $('#extension'),
	defaultExtension: '',
	$formObj: $('#dialplan-application-form'),
	$typeSelectDropDown: $('#dialplan-application-form .type-select'),
	$dirrtyField: $('#dirrty'),
	$tabMenuItems: $('#application-code-menu .item'),
	editor: '',
	validateRules: {
		name: {
			identifier: 'name',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.da_ValidateNameIsEmpty,
				},
			],
		},
		extension: {
			identifier: 'extension',
			rules: [
				{
					type: 'regExp',
					value: '/^(|[0-9#+\\*|X]{1,64})$/',
					prompt: globalTranslate.da_ValidateExtensionNumber,
				},
				{
					type: 'empty',
					prompt: globalTranslate.da_ValidateExtensionIsEmpty,
				},
				{
					type: 'existRule[extension-error]',
					prompt: globalTranslate.da_ValidateExtensionDouble,
				},
			],
		},
	},
	initialize() {
		dialplanApplication.$tabMenuItems.tab();
		if (dialplanApplication.$formObj.form('get value', 'name').length === 0) {
			dialplanApplication.$tabMenuItems.tab('change tab', 'main');
		}
		dialplanApplication.$typeSelectDropDown.dropdown({
			onChange: dialplanApplication.changeAceMode,
		});
		// Динамическая проверка свободен ли внутренний номер
		dialplanApplication.$number.on('change', () => {
			const newNumber = dialplanApplication.$formObj.form('get value', 'extension');
			Extensions.checkAvailability(dialplanApplication.defaultExtension, newNumber);
		});
		dialplanApplication.initializeForm();
		dialplanApplication.initializeAce();
		dialplanApplication.changeAceMode();
		dialplanApplication.defaultExtension = dialplanApplication.$formObj.form('get value', 'extension');
	},
	initializeAce() {
		const applicationLogic = dialplanApplication.$formObj.form('get value','applicationlogic');
		const aceHeight = window.innerHeight-380;
		const rowsCount = Math.round(aceHeight/16.3);
		$(window).load(function() {
			$('.application-code').css('min-height', `${aceHeight}px`);
		});
		dialplanApplication.editor = ace.edit('application-code');
		dialplanApplication.editor.getSession().setValue(applicationLogic);
		dialplanApplication.editor.setTheme('ace/theme/monokai');
		dialplanApplication.editor.resize();
		dialplanApplication.editor.getSession().on('change', () => {
			dialplanApplication.$dirrtyField.val(Math.random());
			dialplanApplication.$dirrtyField.trigger('change');
		});
		dialplanApplication.editor.setOptions({
			maxLines: rowsCount,
			showPrintMargin: false,
			showLineNumbers: false,
		});
	},
	changeAceMode() {
		const mode = dialplanApplication.$formObj.form('get value', 'type');
		let NewMode;
		if (mode === 'php') {
			NewMode = ace.require('ace/mode/php').Mode;
			dialplanApplication.editor.setOptions({
				showLineNumbers: true,
			});
		} else {
			NewMode = ace.require('ace/mode/julia').Mode;
			dialplanApplication.editor.setOptions({
				showLineNumbers: false,
			});
		}
		dialplanApplication.editor.session.setMode(new NewMode());
		dialplanApplication.editor.setTheme('ace/theme/monokai');
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = dialplanApplication.$formObj.form('get values');
		result.data.applicationlogic = dialplanApplication.editor.getValue();
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = dialplanApplication.$formObj;
		Form.url = `${globalRootUrl}dialplan-applications/save`;
		Form.validateRules = dialplanApplication.validateRules;
		Form.cbBeforeSendForm = dialplanApplication.cbBeforeSendForm;
		Form.cbAfterSendForm = dialplanApplication.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	dialplanApplication.initialize();
});

