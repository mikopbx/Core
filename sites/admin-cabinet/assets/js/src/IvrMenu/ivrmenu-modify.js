/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, ivrActions, globalTranslate, Form, Extensions */

$.fn.form.settings.rules.existRule = () => $('#extension-error').hasClass('hidden');

const ivrMenu = {
	$formObj: $('#ivr-menu-form'),
	$dropDowns: $('#ivr-menu-form .ui.dropdown'),
	$number: $('#extension'),
	$dirrtyField: $('#dirrty'),
	$errorMessages: $('#form-error-messages'),
	$rowTemplate: $('#row-template'),
	defaultExtension: '',
	actionsRowsCount: 0,
	validateRules: {
		name: {
			identifier: 'name',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.iv_ValidateNameIsEmpty,
				},
			],
		},
		extension: {
			identifier: 'extension',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.iv_ValidateExtensionIsEmpty,
				},
				{
					type: 'existRule',
					prompt: globalTranslate.iv_ValidateExtensionIsDouble,
				},
			],
		},
		timeout_extension: {
			identifier: 'timeout_extension',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.iv_ValidateTimeoutExtensionIsEmpty,
				},
			],
		},
		audio_message_id: {
			identifier: 'audio_message_id',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.iv_ValidateAudioFileIsEmpty,
				},
			],
		},
		timeout: {
			identifier: 'timeout',
			rules: [
				{
					type: 'integer[0..99]',
					prompt: globalTranslate.iv_ValidateTimeoutOutOfRange,
				},
			],
		},
		number_of_repeat: {
			identifier: 'number_of_repeat',
			rules: [
				{
					type: 'integer[0..99]',
					prompt: globalTranslate.iv_ValidateRepeatNumberOutOfRange,
				},
			],
		},
	},

	initialize() {
		ivrMenu.$dropDowns.dropdown();

		// Динамическая прововерка свободен ли выбранный номер
		ivrMenu.$number.on('change', () => {
			const newNumber = ivrMenu.$formObj.form('get value', 'extension');
			Extensions.checkAvailability(ivrMenu.defaultNumber, newNumber);
		});

		$('#add-new-ivr-action').on('click', (el) => {
			ivrMenu.addNewActionRow();
			ivrMenu.rebuildActionExtensionsDropdown();
			ivrMenu.$dirrtyField.val(Math.random());
			ivrMenu.$dirrtyField.trigger('change');
			el.preventDefault();
		});
		ivrMenu.initializeForm();

		ivrMenu.buildIvrMenuActions();

		ivrMenu.defaultExtension = ivrMenu.$formObj.form('get value', 'extension');
	},
	/**
	 * Create ivr menu items on the form
	 */
	buildIvrMenuActions() {
		const objActions = JSON.parse(ivrActions);
		objActions.forEach((element) => {
			ivrMenu.addNewActionRow(element);
		});
		if (objActions.length === 0) ivrMenu.addNewActionRow();

		ivrMenu.rebuildActionExtensionsDropdown();
	},
	addNewFormRules(newRowId) {
		const $digitsClass = `digits-${newRowId}`;
		ivrMenu.validateRules[$digitsClass] = {
			identifier: $digitsClass,
			rules: [
				{
					type: 'regExp[/^[0-9]{1,7}$/]',
					prompt: globalTranslate.iv_ValidateDigitsIsNotCorrect,
				},
				{
					type: 'checkDoublesDigits',
					prompt: globalTranslate.iv_ValidateDigitsIsNotCorrect,
				},
			],

		};
		const $extensionClass = `extension-${newRowId}`;
		ivrMenu.validateRules[$extensionClass] = {
			identifier: $extensionClass,
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.iv_ValidateExtensionIsNotCorrect,
				},
			],

		};
	},
	addNewActionRow(paramObj) {
		let param = {
			id: '',
			extension: '',
			extensionRepresent: '',
			digits: '',
		};
		if (paramObj !== undefined) {
			param = paramObj;
		}
		ivrMenu.actionsRowsCount += 1;
		const $actionTemplate = ivrMenu.$rowTemplate.clone();
		$actionTemplate
			.removeClass('hidden')
			.attr('id', `row-${ivrMenu.actionsRowsCount}`)
			.attr('data-value', ivrMenu.actionsRowsCount)
			.attr('style', '');

		$actionTemplate.find('input[name="digits-id"]')
			.attr('id', `digits-${ivrMenu.actionsRowsCount}`)
			.attr('name', `digits-${ivrMenu.actionsRowsCount}`)
			.attr('value', param.digits);

		$actionTemplate.find('input[name="extension-id"]')
			.attr('id', `extension-${ivrMenu.actionsRowsCount}`)
			.attr('name', `extension-${ivrMenu.actionsRowsCount}`)
			.attr('value', param.extension);
		$actionTemplate.find('div.delete-action-row')
			.attr('data-value', ivrMenu.actionsRowsCount);

		if (param.extensionRepresent.length > 0) {
			$actionTemplate.find('div.default.text').removeClass('default').html(param.extensionRepresent);
		} else {
			$actionTemplate.find('div.default.text').html(globalTranslate.ex_SelectNumber);
		}

		$('#actions-place').append($actionTemplate);
		ivrMenu.addNewFormRules(ivrMenu.actionsRowsCount);
	},
	rebuildActionExtensionsDropdown() {
		$('#ivr-menu-form .forwarding-select').dropdown(Extensions.getDropdownSettingsWithoutEmpty(ivrMenu.cbOnExtensionSelect));
		$('.delete-action-row').on('click', function (e) {
			e.preventDefault();
			const id = $(this).attr('data-value');
			delete ivrMenu.validateRules[`digits-${id}`];
			delete ivrMenu.validateRules[`extension-${id}`];
			$(`#row-${id}`).remove();
			ivrMenu.$dirrtyField.val(Math.random());
			ivrMenu.$dirrtyField.trigger('change');
		});
	},
	cbBeforeSendForm(settings) {
		let result = settings;

		result.data = ivrMenu.$formObj.form('get values');
		const arrActions = [];

		$('.action-row').each((index, obj) => {
			const rowId = $(obj).attr('data-value');
			if (rowId > 0) {
				arrActions.push({
					digits: ivrMenu.$formObj.form('get value', `digits-${rowId}`),
					extension: ivrMenu.$formObj.form('get value', `extension-${rowId}`),
				});
			}
		});
		if (arrActions.length === 0) {
			result = false;
			ivrMenu.$errorMessages.html(globalTranslate.iv_ValidateNoIVRExtensions);
			ivrMenu.$formObj.addClass('error');
		} else {
			result.data.actions = JSON.stringify(arrActions);
		}
		return result;
	},
	/**
	 * Срабатывает при выборе номера из выпадающего списка
	 */
	cbOnExtensionSelect() {
		ivrMenu.$dirrtyField.val(Math.random());
		ivrMenu.$dirrtyField.trigger('change');
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = ivrMenu.$formObj;
		Form.url = `${globalRootUrl}ivr-menu/save`;
		Form.validateRules = ivrMenu.validateRules;
		Form.cbBeforeSendForm = ivrMenu.cbBeforeSendForm;
		Form.cbAfterSendForm = ivrMenu.cbAfterSendForm;
		Form.initialize();
	},
};

$.fn.form.settings.rules.checkDoublesDigits = (value) => {
	let count = 0;
	$("input[id^='digits']").each((index, obj) => {
		if (ivrMenu.$formObj.form('get value', `${obj.id}`) === value) count += 1;
	});

	return (count === 1);
};

$(document).ready(() => {
	ivrMenu.initialize();
});

