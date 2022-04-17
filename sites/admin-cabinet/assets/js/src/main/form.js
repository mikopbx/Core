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

/* global globalRootUrl, globalTranslate */

const Form = {
	$formObj: '',
	validateRules: {},
	url: '',
	cbBeforeSendForm: '',
	cbAfterSendForm: '',
	$submitButton: $('#submitbutton'),
	$dropdownSubmit: $('#dropdownSubmit'),
	$submitModeInput: $('input[name="submitMode"]'),
	processData: true,
	contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
	keyboardShortcuts: true,
	enableDirrity: true,
	afterSubmitIndexUrl: '',
	afterSubmitModifyUrl: '',
	oldFormValues: [],
	initialize() {
		if (Form.enableDirrity) Form.initializeDirrity();

		Form.$submitButton.on('click', (e) => {
			e.preventDefault();
			if (Form.$submitButton.hasClass('loading')) return;
			if (Form.$submitButton.hasClass('disabled')) return;
			Form.$formObj
				.form({
					on: 'blur',
					fields: Form.validateRules,
					onSuccess() {
						Form.submitForm();
					},
					onFailure() {
						Form.$formObj.removeClass('error').addClass('error');
					},
				});
			Form.$formObj.form('validate form');
		});
		if (Form.$dropdownSubmit.length > 0) {
			Form.$dropdownSubmit.dropdown({
				onChange: (value) => {
					const translateKey = `bt_${value}`;
					Form.$submitModeInput.val(value);
					Form.$submitButton
						.html(`<i class="save icon"></i> ${globalTranslate[translateKey]}`)
						.click();
				},
			});
		}
		Form.$formObj.on('submit', (e) => {
			e.preventDefault();
		});
	},
	/**
	 * Инициализация отслеживания изменений формы
	 */
	initializeDirrity() {
		Form.saveInitialValues();
		Form.setEvents();
		Form.$submitButton.addClass('disabled');
		Form.$dropdownSubmit.addClass('disabled');
	},
	/**
	 * Сохраняет первоначальные значения для проверки на изменения формы
	 */
	saveInitialValues() {
		Form.oldFormValues = Form.$formObj.form('get values');
	},
	/**
	 * Запускает обработчики изменения объектов формы
	 */
	setEvents() {
		Form.$formObj.find('input, select').change(() => {
			Form.checkValues();
		});
		Form.$formObj.find('input, textarea').on('keyup keydown blur', () => {
			Form.checkValues();
		});
		Form.$formObj.find('.ui.checkbox').on('click', () => {
			Form.checkValues();
		});
	},
	/**
	 * Сверяет изменения старых и новых значений формы
	 */
	checkValues() {
		const newFormValues = Form.$formObj.form('get values');
		if (JSON.stringify(Form.oldFormValues) === JSON.stringify(newFormValues)) {
			Form.$submitButton.addClass('disabled');
			Form.$dropdownSubmit.addClass('disabled');
		} else {
			Form.$submitButton.removeClass('disabled');
			Form.$dropdownSubmit.removeClass('disabled');
		}
	},
	/**
	 * Отправка формы на сервер
	 */
	submitForm() {
		$.api({
			url: Form.url,
			on: 'now',
			method: 'POST',
			processData: Form.processData,
			contentType: Form.contentType,
			keyboardShortcuts: Form.keyboardShortcuts,
			beforeSend(settings) {
				Form.$submitButton.addClass('loading');
				const cbBeforeSendResult = Form.cbBeforeSendForm(settings);
				if (cbBeforeSendResult === false) {
					Form.$submitButton
						.transition('shake')
						.removeClass('loading');
				} else {
					$.each(cbBeforeSendResult.data, (index, value) => {
						if (index.indexOf('ecret') > -1 || index.indexOf('assword') > -1) return;
						if (typeof value === 'string') cbBeforeSendResult.data[index] = value.trim();
					});
				}
				return cbBeforeSendResult;
			},
			onSuccess(response) {
				$('.ui.message.ajax').remove();
				$.each(response.message, (index, value) => {
					if (index === 'error') {
						Form.$submitButton.transition('shake').removeClass('loading');
						Form.$formObj.after(`<div class="ui ${index} message ajax">${value}</div>`);
					}
				});
				const event = document.createEvent('Event');
				event.initEvent('ConfigDataChanged', false, true);
				window.dispatchEvent(event);
				Form.cbAfterSendForm(response);
				if (response.success
					&& response.reload.length > 0
					&& Form.$submitModeInput.val() === 'SaveSettings') {
					window.location = globalRootUrl + response.reload;
				} else if (response.success && Form.$submitModeInput.val() === 'SaveSettingsAndAddNew') {
					if (Form.afterSubmitModifyUrl.length > 1){
						window.location = Form.afterSubmitModifyUrl;
					} else {
						const emptyUrl = window.location.href.split('modify');
						let action = 'modify';
						let prefixData = emptyUrl[1].split('/');
						if(prefixData.length > 0){
							action = action + prefixData[0];
						}
						if (emptyUrl.length > 1) {
							window.location = `${emptyUrl[0]}${action}/`;
						}
					}
				} else if (response.success && Form.$submitModeInput.val() === 'SaveSettingsAndExit') {
					if (Form.afterSubmitIndexUrl.length > 1){
						window.location = Form.afterSubmitIndexUrl;
					} else {
						const emptyUrl = window.location.href.split('modify');
						if (emptyUrl.length > 1) {
							window.location = `${emptyUrl[0]}index/`;
						}
					}
				} else if (response.success
						&& response.reload.length > 0) {
					window.location = globalRootUrl + response.reload;
				} else if (Form.enableDirrity) {
					Form.initializeDirrity();
				}
				Form.$submitButton.removeClass('loading');
			},
			onFailure(response) {
				Form.$formObj.after(response);
				Form.$submitButton
					.transition('shake')
					.removeClass('loading');
			},

		});
	},
};

// export default Form;
