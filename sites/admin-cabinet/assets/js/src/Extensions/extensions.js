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

/* global globalRootUrl, sessionStorage */

const Extensions = {
	initialize() {
		window.addEventListener('ConfigDataChanged', Extensions.cbOnDataChanged);
	},
	/**
	 * We will drop all caches if data changes
 	 */
	cbOnDataChanged() {
		sessionStorage.removeItem(`${globalRootUrl}extensions/getForSelect/internal`);
		sessionStorage.removeItem(`${globalRootUrl}extensions/getForSelect/all`);
		sessionStorage.removeItem(`${globalRootUrl}extensions/getForSelect/routing`);
	},
	/**
	 * Makes formatted menu structure
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
	/**
	 * Makes dropdown menu for extensions with empty field
	 * @param cbOnChange - on change calback function
	 * @returns  dropdown settings
	 */
	getDropdownSettingsWithEmpty(cbOnChange = null) {
		return {
			apiSettings: {
				url: `${globalRootUrl}extensions/getForSelect/all`,
				// cache: false,
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
			saveRemoteData: true,
			forceSelection: false,
			// direction: 'downward',
			hideDividers: 'empty',
			templates: {
				menu: Extensions.customDropdownMenu,
			},

		};
	},
	/**
	 * Makes dropdown menu for extensions without empty field
	 * @param cbOnChange - on change calback function
	 * @returns  dropdown settings
	 */
	getDropdownSettingsWithoutEmpty(cbOnChange = null) {
		return {
			apiSettings: {
				url: `${globalRootUrl}extensions/getForSelect/all`,
				onResponse(response) {
					return Extensions.formatDropdownResults(response, false);
				},
			},
			ignoreCase: true,
			fullTextSearch: true,
			filterRemoteData: true,
			saveRemoteData: true,
			forceSelection: false,
			hideDividers: 'empty',
			onChange(value) {
				if (cbOnChange !== null) cbOnChange(value);
			},
			templates: {
				menu: Extensions.customDropdownMenu,
			},
		};
	},
	/**
	 * Makes dropdown menu for extensions without empty field
	 * @param cbOnChange - on change calback function
	 * @returns  dropdown settings
	 */
	getDropdownSettingsForRouting(cbOnChange = null) {
		return {
			apiSettings: {
				url: `${globalRootUrl}extensions/getForSelect/routing`,
				// cache: false,
				// throttle: 400,
				onResponse(response) {
					return Extensions.formatDropdownResults(response, false);
				},
			},
			ignoreCase: true,
			fullTextSearch: true,
			filterRemoteData: true,
			saveRemoteData: true,
			forceSelection: false,
			// direction: 'downward',
			hideDividers: 'empty',
			onChange(value) {
				if (cbOnChange !== null) cbOnChange(value);
			},
			templates: {
				menu: Extensions.customDropdownMenu,
			},
		};
	},
	/**
	 * Makes dropdown menu for internal extensions without empty field
	 * @param cbOnChange - on change calback function
	 * @returns dropdown settings
	 */
	getDropdownSettingsOnlyInternalWithoutEmpty(cbOnChange = null) {
		return {
			apiSettings: {
				url: `${globalRootUrl}extensions/getForSelect/internal`,
				// cache: false,
				// throttle: 400,
				onResponse(response) {
					return Extensions.formatDropdownResults(response, false);
				},
			},
			ignoreCase: true,
			fullTextSearch: true,
			filterRemoteData: true,
			saveRemoteData: true,
			forceSelection: false,
			// direction: 'downward',
			hideDividers: 'empty',
			onChange(value) {
				if (cbOnChange !== null) cbOnChange(value);
			},
			templates: {
				menu: Extensions.customDropdownMenu,
			},
		};
	},
	/**
	 * Makes dropdown menu for internal extensions with empty field
	 * @param cbOnChange - on change calback function
	 * @returns dropdown settings
	 */
	getDropdownSettingsOnlyInternalWithEmpty(cbOnChange = null) {
		return {
			apiSettings: {
				url: `${globalRootUrl}extensions/getForSelect/internal`,
				// cache: false,
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
			saveRemoteData: true,
			forceSelection: false,
			// direction: 'downward',
			hideDividers: 'empty',
			templates: {
				menu: Extensions.customDropdownMenu,
			},

		};
	},
	/**
	 * Checks if newNumber doesn't exist in database
	 * @param oldNumber
	 * @param newNumber
	 * @param cssClassName
	 * @param userId
	 * @returns {*}
	 */
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
	/**
	 * Retuns phone extensions
	 * @param callBack
	 * @returns {{success: boolean, results: []}}
	 */
	getPhoneExtensions(callBack) {
		$.api({
			url: `${globalRootUrl}extensions/getForSelect/phones`,
			on: 'now',
			onResponse(response) {
				return Extensions.formatDropdownResults(response, false);
			},
			onSuccess(response) {
				callBack(response);
			},
		});
	},
	/**
	 * Makes html view for dropdown menu with icons and headers
	 * @param response
	 * @param fields
	 * @returns {string}
	 */
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
	 * Postprocess html page to change internal numbers and celluar numbers to pretty view
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
			url: `${globalRootUrl}extensions/GetPhonesRepresent`,
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
	/**
	 * Update pretty view in cache
	 */
	UpdatePhoneRepresent(number) {
		const numbers = [];
		numbers.push(number);
		$.api({
			url: `${globalRootUrl}extensions/GetPhonesRepresent`,
			data: { numbers },
			method: 'POST',
			on: 'now',
			onSuccess(response) {
				if (response !== undefined
					&& response.success === true
					&& response.message[number] !== undefined) {
					sessionStorage.setItem(number, response.message[number].represent);
				}
			},
		});
	},

};

$(document).ready(() => {
	Extensions.initialize();
});
