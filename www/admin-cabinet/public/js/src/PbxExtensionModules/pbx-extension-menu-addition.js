/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, globalPBXLanguage */

const pbxExtensionMenuAddition = {
	$sidebarMenu: $('#sidebarmenu'),
	originalMenuHtml: '',
	initialize() {
		pbxExtensionMenuAddition.originalMenuHtml = pbxExtensionMenuAddition.$sidebarMenu.html();
		pbxExtensionMenuAddition.showPreviousMenuVersion();
		pbxExtensionMenuAddition.updateSidebarMenu();
	},

	/**
	 * Показывает старые пункты меню, до получения ответа от сервера
	 */
	showPreviousMenuVersion() {
		const previousMenu = localStorage.getItem(`previousMenu${globalPBXLanguage}`);
		if (previousMenu !== null) {
			pbxExtensionMenuAddition.$sidebarMenu.html(previousMenu);
			pbxExtensionMenuAddition.makeMenuActiveElement();
		}
	},
	/**
	 * Запрашивает у сервера новую версию меню с учетом включенных модулей
	 */
	updateSidebarMenu() {
		$.api({
			url: `${globalRootUrl}pbx-extension-modules/sidebarInclude`,
			on: 'now',
			onSuccess(response) {
				$('.item.additional-modules').remove();
				$.each(response.message.items, (key, value) => {
					if (value.showAtSidebar) {
						const $groupForAddition = pbxExtensionMenuAddition.$sidebarMenu.find(`[data-group='${value.group}']`);
						if ($groupForAddition !== undefined) {
							let itemHtml = `<a class="item additional-modules" href="${value.href}"><i class="${value.iconClass} icon"></i>`;
							if (value.caption in globalTranslate) {
								itemHtml += `${globalTranslate[value.caption]}</a>`;
							} else {
								itemHtml += `${value.caption}</a>`;
							}
							$groupForAddition.append(itemHtml);
						}
					}
				});
				localStorage.setItem(`previousMenu${globalPBXLanguage}`, pbxExtensionMenuAddition.$sidebarMenu.html());
				pbxExtensionMenuAddition.makeMenuActiveElement();
			},
		});
	},

	/**
	 * Подсвечивает текущий элемент меню
	 */
	makeMenuActiveElement() {
		const current = window.location.href;
		$.each($('#sidebarmenu a'), (index, value) => {
			const $this = $(value);
			$this.removeClass('active');
			// if the current path is like this link, make it active
			const needle = $this.attr('href')
				.replace('/index', '')
				.replace('/modify', '');

			if (current.indexOf(needle) !== -1) {
				$this.addClass('active');
			}
		});
	},
};

$(document).ready(() => {
	pbxExtensionMenuAddition.initialize();
});
