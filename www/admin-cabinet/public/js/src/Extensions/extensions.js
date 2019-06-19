/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl */
const Extensions = {
	fixBugDropdownIcon() {
		$('.forwarding-select .dropdown.icon').on('click', (e) => {
			$(e.target).parent().find('.text').trigger('click');
		});
	},
	/**
	 * Форматирование списка выбора для выпадающих меню
	 */
	formatDropdownResults(response, addEmpty) {
		const formattedResponse = {
			success: false,
			results: [],
		};
		if (addEmpty) {
			formattedResponse.results.push({
				name: '-',
				value: -1,
				type: '',
				typeLocalized: '',
			});
		}

		if (response) {
			formattedResponse.success = true;
			$.each(response.results, (index, item) => {
				formattedResponse.results.push({
					name: item.name,
					value: item.value,
					type: item.type,
					typeLocalized: item.typeLocalized,
				});
			});
		}

		return formattedResponse;
	},
	getDropdownSettingsWithEmpty(cbOnChange = null) {
		const result = {
			apiSettings: {
				url: `${globalRootUrl}extensions/getForSelect/0`,
				cache: false,
				// throttle: 400,
				onResponse(response) {
					return Extensions.formatDropdownResults(response, true);
				},
			},
			onChange(value) {
				if (parseInt(value, 10) === -1) $(this).dropdown('clear');
				if (cbOnChange !== null) cbOnChange(value);
			},
			ignoreCase: true,
			fullTextSearch: true,
			filterRemoteData: true,
			saveRemoteData: false,
			forceSelection: false,
			direction: 'downward',
			hideDividers: 'empty',
			templates: {
				menu: Extensions.customDropdownMenu,
			},

		};
		return result;
	},
	getDropdownSettingsWithoutEmpty(cbOnChange = null) {
		const result = {
			apiSettings: {
				url: `${globalRootUrl}extensions/getForSelect/0`,
				cache: false,
				// throttle: 400,
				onResponse(response) {
					return Extensions.formatDropdownResults(response, false);
				},
			},
			ignoreCase: true,
			fullTextSearch: true,
			filterRemoteData: true,
			saveRemoteData: false,
			forceSelection: false,
			direction: 'downward',
			hideDividers: 'empty',
			onChange(value) {
				if (cbOnChange !== null) cbOnChange(value);
			},
			templates: {
				menu: Extensions.customDropdownMenu,
			},
		};
		return result;
	},
	checkAvailability(oldNumber, newNumber, cssClassName = 'extension', userId = '') {
		if (oldNumber === newNumber) {
			$(`.ui.input.${cssClassName}`).parent().removeClass('error');
			$(`#${cssClassName}-error`).addClass('hidden');
			return;
		}
		$.api({
			url: `${globalRootUrl}extensions/available/{value}`,
			stateContext: `.ui.input.${cssClassName}`,
			on: 'now',
			beforeSend(settings) {
				const result = settings;
				result.urlData = {
					value: newNumber,
				};
				return result;
			},
			onSuccess(response) {
				if (response.numberAvailable) {
					$(`.ui.input.${cssClassName}`).parent().removeClass('error');
					$(`#${cssClassName}-error`).addClass('hidden');
				} else if (userId.length > 0 && response.userId === userId) {
					$(`.ui.input.${cssClassName}`).parent().removeClass('error');
					$(`#${cssClassName}-error`).addClass('hidden');
				} else {
					$(`.ui.input.${cssClassName}`).parent().addClass('error');
					$(`#${cssClassName}-error`).removeClass('hidden');
				}
			},
		});
	},
	getPhoneExtensions(callBack) {
		$.api({
			url: `${globalRootUrl}extensions/getForSelect/1`,
			on: 'now',
			onResponse(response) {
				return Extensions.formatDropdownResults(response, false);
			},
			onSuccess(response) {
				callBack(response);
			},
		});
	},
	customDropdownMenu(response, fields) {
		const values = response[fields.values] || {};
		let html = '';
		let oldType = '';
		$.each(values, (index, option) => {
			if (option.type !== oldType) {
				oldType = option.type;
				html += '<div class="divider"></div>';
				html += '	<div class="header">';
				html += '	<i class="tags icon"></i>';
				html += option.typeLocalized;
				html += '</div>';
			}
			const maybeText = (option[fields.text]) ? `data-text="${option[fields.text]}"` : '';
			const maybeDisabled = (option[fields.disabled]) ? 'disabled ' : '';
			html += `<div class="${maybeDisabled}item" data-value="${option[fields.value]}"${maybeText}>`;
			html += option[fields.name];
			html += '</div>';
		});
		return html;
	},
	/**
	 * Возвращает представление номера телефона
	 *
	 */
	GetPhoneRepresent(callBack, number) {
		$.api({
			url: `${globalRootUrl}extensions/GetPhoneRepresentAction/${number}`,
			on: 'now',
			onSuccess(response) {
				callBack(response);
			},
		});
	},
	/**
	 * Возвращает представление номера телефона
	 *
	 */
	UpdatePhonesRepresent(htmlClass) {
		const $preprocessedObjects = $(`.${htmlClass}`);
		if ($preprocessedObjects.length === 0) return;
		const numbers = [];
		$preprocessedObjects.each((index, el) => {
			const number = $(el).text();
			const represent = sessionStorage.getItem(number);
			if (represent) {
				$(el).html(represent);
				$(el).removeClass(htmlClass);
			} else if (numbers.indexOf(number) === -1) {
				numbers.push(number);
			}
		});
		if (numbers.length === 0) return;
		$.api({
			url: `${globalRootUrl}extensions/GetPhonesRepresent/`,
			data: { numbers },
			method: 'POST',
			on: 'now',
			onSuccess(response) {
				if (response !== undefined && response.success === true) {
					$preprocessedObjects.each((index, el) => {
						const needle = $(el).text();
						if (response.message[needle] !== undefined) {
							$(el).html(response.message[needle].represent);
							sessionStorage.setItem(needle, response.message[needle].represent);
						}
						$(el).removeClass(htmlClass);
					});
				}
			},
		});
	},

};
