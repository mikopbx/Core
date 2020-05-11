/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, sessionStorage */

const topMenuSearch = {
	$input: $('#top-menu-search'),
	initialize() {
		topMenuSearch.$input.dropdown({
			apiSettings: {
				url: `${globalRootUrl}top-menu-search/getForSelect`,
				// cache: false,
				// throttle: 400,
				onResponse(response) {
					return topMenuSearch.formatDropdownResults(response);
				},
			},
			onChange(value) {
				window.location.href = value;
			},
			ignoreCase: true,
			showOnFocus: true,
			fullTextSearch: true,
			filterRemoteData: true,
			saveRemoteData: true,
			allowCategorySelection: true,
			// Whether search selection will force currently selected choice when element is blurred.
			forceSelection: false,
			hideDividers: 'empty',
			// Search only by name,
			match: 'text',
			// Whether dropdown should select new option when using keyboard shortcuts.
			selectOnKeydown: false,
			// action: 'nothing',
			templates: {
				menu: topMenuSearch.customDropdownMenu,
			},
		});
		// $('#top-menu-search .search.link.icon').on('click', (e) => {
		// 	$(e.target).parent().find('.text').trigger('click');
		// });
		window.addEventListener('ConfigDataChanged', topMenuSearch.cbOnDataChanged);
	},

	/**
	 * Makes dropdown menu as html view
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
			html += `<div class="item" data-value="${option[fields.value]}">`;
			html += option[fields.name];
			html += '</div>';
		});
		return html;
	},
	/**
	 * Makes dropdown menu in data structure
	 */
	formatDropdownResults(response) {
		const formattedResponse = {
			success: false,
			results: [],
		};
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
	 * We will drop all caches if data changes
	 */
	cbOnDataChanged() {
		sessionStorage.removeItem(`${globalRootUrl}top-menu-search/getForSelect`);
	},
};

$(document).ready(() => {
	topMenuSearch.initialize();
});
