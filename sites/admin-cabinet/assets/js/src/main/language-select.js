/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */
/* global globalWebAdminLanguage, globalAvailableLanguages, globalTranslate, globalRootUrl, PbxApi*/

const LanguageSelect = {
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
		PbxApi.SystemChangeCoreLanguage();
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
