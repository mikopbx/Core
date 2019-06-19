/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2018
 *
 */

/* global globalRootUrl, PbxApi, globalTranslate */

const pbxExtesionStatus = {
	$toggle: $('#module-status-toggle'),
	$ajaxMessagesDiv: $('#ajax-messages'),
	initialize() {
		pbxExtesionStatus.$toggle
			.checkbox({
				onChecked() {
					const uniqid = $(this).closest('.ui.toggle.checkbox').attr('data-value');
					pbxExtesionStatus.$toggle.addClass('disabled');
					pbxExtesionStatus.$toggle.find('label').text(globalTranslate.ext_ModuleStatusChanging);
					pbxExtesionStatus.enableModule(uniqid, PbxApi.SystemReloadModule);
				},
				onUnchecked() {
					const uniqid = $(this).closest('.ui.toggle.checkbox').attr('data-value');
					pbxExtesionStatus.$toggle.find('label').text(globalTranslate.ext_ModuleStatusChanging);
					pbxExtesionStatus.$toggle.addClass('disabled');
					pbxExtesionStatus.disableModule(uniqid, PbxApi.SystemReloadModule);
				},
			});
	},
	/**
	 * Включить модуль, с проверкой ссылочной целостности
	 * @param params - параметры запроса.
	 * @param cbAfterEnable - колбек функция
	 */
	enableModule(uniqid, cbAfterEnable) {
		$('.ui.message.ajax').remove();
		$.api({
			url: `${globalRootUrl}pbx-extension-modules/enable/{uniqid}`,
			on: 'now',
			urlData: {
				uniqid,
			},
			onSuccess(response) {
				if (response.success) {
					pbxExtesionStatus.$toggle.checkbox('set checked');
					cbAfterEnable(uniqid);
					pbxExtesionStatus.$toggle.find('label').text(globalTranslate.ext_ModuleDisabledStatusEnabled);
				} else {
					pbxExtesionStatus.$toggle.checkbox('set unchecked');
					pbxExtesionStatus.$toggle.find('label').text(globalTranslate.ext_ModuleDisabledStatusDisabled);
					let previousMessage = '';
					$.each(response.message, (index, value) => {
						if (previousMessage !== value) {
							pbxExtesionStatus.$ajaxMessagesDiv
								.after(`<div class="ui ${index} message ajax">${value}</div>`);
						}
						previousMessage = value;
					});
				}
				pbxExtesionStatus.$toggle.removeClass('disabled');
			},

		});
	},
	/**
	 * Выключить модуль, с проверкой ссылочной целостности
	 * @param uniqid - ID модуля
	 * @param cbAfterDisable - колбек функция
	 */
	disableModule(uniqid, cbAfterDisable) {
		$('.ui.message.ajax').remove();
		$.api({
			url: `${globalRootUrl}pbx-extension-modules/disable/{uniqid}`,
			on: 'now',
			urlData: {
				uniqid,
			},
			onSuccess(response) {
				if (response.success) {
					pbxExtesionStatus.$toggle.checkbox('set unchecked');
					cbAfterDisable(uniqid);
					pbxExtesionStatus.$toggle.find('label').text(globalTranslate.ext_ModuleDisabledStatusDisabled);
				} else {
					pbxExtesionStatus.$toggle.checkbox('set checked');
					pbxExtesionStatus.$toggle.find('label').text(globalTranslate.ext_ModuleDisabledStatusEnabled);
					let previousMessage = '';
					$.each(response.message, (index, value) => {
						if (previousMessage !== value) {
							pbxExtesionStatus.$ajaxMessagesDiv
								.after(`<div class="ui ${index} message ajax">${value}</div>`);
						}
						previousMessage = value;
					});
				}
				pbxExtesionStatus.$toggle.removeClass('disabled');
			},

		});
	},
};

$(document).ready(() => {
	pbxExtesionStatus.initialize();
});
