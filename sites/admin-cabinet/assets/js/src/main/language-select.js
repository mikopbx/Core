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
/* global globalWebAdminLanguage, globalAvailableLanguages, globalTranslate, globalRootUrl, PbxApi*/

const LanguageSelect = {
	possibleLanguages:[],
	$selector: $('#web-admin-language-selector'),
	initialize() {
		if (LanguageSelect.$selector === undefined) {
			return;
		}
		LanguageSelect.$selector.dropdown({
			values: LanguageSelect.prepareMenu(),
			templates: {
				menu: LanguageSelect.customDropdownMenu,
			},
			onChange: LanguageSelect.onChangeLanguage,
		});
	},
	prepareMenu() {
		const resArray = [];
		const objectAvailableLanguages = JSON.parse(globalAvailableLanguages);
		$.each(objectAvailableLanguages, (key, value) => {
			const v = {
				name: value,
				value: key,
			};
			if (key === globalWebAdminLanguage) {
				v.selected = true;
			}
			resArray.push(v);
			LanguageSelect.possibleLanguages.push(key);
		});
		return resArray;
	},
	getFlagIcon(langKey) {
		const arFlags = {
			en: '<i class="united kingdom flag"></i>',
			ru: '<i class="russia flag"></i>',
			de: '<i class="germany flag"></i>',
			es: '<i class="spain  flag"></i>',
			pt: '<i class="portugal flag"></i>',
			fr: '<i class="france flag"></i>',
			uk: '<i class="ukraine flag"></i>',
			ka: '<i class="georgia flag"></i>',
			it: '<i class="italy flag"></i>',
			da: '<i class="netherlands flag"></i>',
			pl: '<i class="poland flag"></i>',
			sv: '<i class="sweden flag"></i>',
			cs: '<i class="czech republic flag"></i>',
			tr: '<i class="turkey flag"></i>',
			ja: '<i class="japan flag"></i>',
			vi: '<i class="vietnam flag"></i>',
			zh_Hans: '<i class="china flag"></i>',
		};
		if (langKey in arFlags) {
			return arFlags[langKey];
		}
		return '';
	},
	customDropdownMenu(response, fields) {
		const values = response[fields.values] || {};
		let html = '';
		$.each(values, (index, option) => {
			if (html === '') {
				html += `<a class="item" target="_blank" href="https://weblate.mikopbx.com/engage/mikopbx/"><i class="pencil alternate icon"></i> ${globalTranslate.lang_HelpWithTranslateIt}</a>`;
				html += '<div class="divider"></div>';
			}
			html += `<div class="item" data-value="${option[fields.value]}">`;
			html += LanguageSelect.getFlagIcon(option[fields.value]);
			html += option[fields.name];
			html += '</div>';
		});
		return html;
	},
	onChangeLanguage(value) {
		if (value === globalWebAdminLanguage) {
			return;
		}
		if (!LanguageSelect.possibleLanguages.includes(value)){
			LanguageSelect.$selector.dropdown("set selected", globalWebAdminLanguage);
			return;
		}
		$.api({
			url: `${globalRootUrl}session/changeLanguage/`,
			data: { newLanguage: value },
			method: 'POST',
			on: 'now',
			onSuccess(response) {
				if (response !== undefined && response.success === true) {
					const event = document.createEvent('Event');
					event.initEvent('ConfigDataChanged', false, true);
					window.dispatchEvent(event);
					window.location.reload();
				}
			},
		});
	},
};

$(document).ready(() => {
	LanguageSelect.initialize();
});
