/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

/* global globalRootUrl, PbxApi, globalTranslate,
 globalPBXLanguage, globalPBXLicense, globalPBXVersion */

let upgradeStatusLoopWorker = {};
const extensionModules = {
	$ajaxMessgesDiv: $('#ajax-messages'),
	$checboxes: $('.module-row .checkbox'),
	updatesUrl: 'https://update.askozia.ru/',
	initialize() {
		extensionModules.getModulesUpdates();
		extensionModules.$checboxes
			.checkbox({
				onChecked() {
					const uniqid = $(this).closest('tr').attr('id');
					extensionModules.enableModule(uniqid, PbxApi.SystemReloadModule);
				},
				onUnchecked() {
					const uniqid = $(this).closest('tr').attr('id');
					extensionModules.disableModule(uniqid, PbxApi.SystemReloadModule);
				},
			});
	},
	addUpdateButtonToRow(obj) {
		const $moduleRow = $(`tr#${obj.uniqid}`);
		const dymanicButton
			= `<a href="${obj.href}" class="ui button update popuped" 
			data-content="${globalTranslate.ext_UpdateModule}"
			data-uniqid ="${obj.uniqid}" 
			data-md5 ="${obj.md5}">
			<i class="icon redo blue"></i> 
			<span class="percent"></span>
			</a>`;
		$moduleRow.find('.action-buttons').prepend(dymanicButton);
	},
	addModuleDescription(obj) {
		$('#online-updates-block').show();
		let promoLink = '';
		if (obj.promo_link !== undefined && obj.promo_link !== null) {
			promoLink = `<br><a href="${obj.promo_link}" target="_blank">${globalTranslate.ext_ExternalDescription}</a>`;
		}
		const dymanicRow = `
			<tr class="new-module-row" id="${obj.uniqid}">
						<td>${decodeURIComponent(obj.name)}<br>
						<span class="features">${decodeURIComponent(obj.description)} ${promoLink}</span>
						</td>
						<td>${decodeURIComponent(obj.developer)}</td>
						<td class="center aligned">${obj.version}</td>
						<td class="right aligned collapsing">
    						<div class="ui small basic icon buttons action-buttons">
    							<a href="${obj.href}" class="ui button download" 
									data-content="${globalTranslate.ext_InstallModule}"
									data-uniqid ="${obj.uniqid}" 
									data-md5 ="${obj.md5}">
									<i class="icon download blue"></i> 
									<span class="percent"></span>
								</a>
    						</div>
			</tr>`;
		$('#new-modules-table tbody').append(dymanicRow);
	},
	getModulesUpdates() {
		const requestData = {
			TYPE: 'MODULES',
			LICENSE: globalPBXLicense,
			PBXVER: globalPBXVersion,
			LANGUAGE: globalPBXLanguage,
		};
		$.api({
			url: extensionModules.updatesUrl,
			on: 'now',
			method: 'POST',
			data: requestData,
			successTest(response) {
				// test whether a JSON response is valid
				return response !== undefined
					&& Object.keys(response).length > 0
					&& response.result.toUpperCase() === 'SUCCESS';
			},
			onSuccess(response) {
				response.modules.forEach((obj) => {
					const $moduleRow = $(`tr#${obj.uniqid}`);
					if ($moduleRow.length > 0) {
						const oldVer = $moduleRow.find('td.version').text().replace(/\D/g, '');
						const newVer = obj.version.replace(/\D/g, '');

						if (oldVer < newVer) {
							extensionModules.addUpdateButtonToRow(obj);
						}
					} else {
						extensionModules.addModuleDescription(obj);
					}
				});

				$('a.download').on('click', (e) => {
					e.preventDefault();
					$('a.button').addClass('disabled');
					const params = [];
					const $aLink = $(e.target).closest('a');
					$aLink.removeClass('disabled');
					params.updateLink = $aLink.attr('href');
					params.uniqid = $aLink.attr('data-uniqid');
					params.md5 = $aLink.attr('data-md5');
					$aLink.find('i').addClass('loading redo').removeClass('download');
					extensionModules.installModule(params, false);
				});
				$('a.update').on('click', (e) => {
					e.preventDefault();
					$('a.button').addClass('disabled');
					const params = [];
					const $aLink = $(e.target).closest('a');
					$aLink.removeClass('disabled');
					params.updateLink = $aLink.attr('href');
					params.uniqid = $aLink.attr('data-uniqid');
					params.md5 = $aLink.attr('data-md5');
					$aLink.find('i').addClass('loading');
					extensionModules.updateModule(params);
				});
				$('a.delete').on('click', (e) => {
					e.preventDefault();
					$('a.button').addClass('disabled');
					$(e.target).closest('a').removeClass('disabled');
					const params = [];
					const $aLink = $(e.target).closest('tr');
					params.uniqid = $aLink.attr('id');
					extensionModules.deleteModule(params);
				});
				$('a[data-content]').popup();
			},
		});
	},
	/**
	 * Сначала отключим модуль, если получится, то отправим команду на удаление
	 * и обновим страничку
	 * @param params - параметры запроса.
	 */
	deleteModule(params) {
		// Проверим включен ли модуль, если включен, вырубим его
		const status = $(`#${params.uniqid}`).find('.checkbox').checkbox('is checked');
		if (status === true) {
			extensionModules.disableModule(params.uniqid, () => {
				PbxApi.SystemDeleteModule(params.uniqid, extensionModules.cbAfterDelete);
			});
		} else {
			PbxApi.SystemDeleteModule(params.uniqid, extensionModules.cbAfterDelete);
		}
	},
	/**
	 * Сначала отключим модуль, если получится, то отправим команду на обновление
	 * и обновим страничку
	 * @param params - параметры запроса
	 */
	updateModule(params) {
		// Проверим включен ли модуль, если включен, вырубим его
		const status = $(`#${params.uniqid}`).find('.checkbox').checkbox('is checked');
		if (status === true) {
			extensionModules.disableModule(params.uniqid, () => {
				extensionModules.installModule(params, true);
			});
		} else {
			extensionModules.installModule(params, false);
		}
	},
	/**
	 * Обновление модуля
	 * @param params - параметры запроса
	 */
	installModule(params, needEnable) {
		PbxApi.SystemInstallModule(params);
		upgradeStatusLoopWorker.initialize(params.uniqid, needEnable);
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
					$(`#${uniqid} .disability`).removeClass('disabled');
					$(`#${uniqid}`).find('.checkbox').checkbox('set checked');
					cbAfterEnable(uniqid);
				} else {
					$(`#${uniqid}`).find('.checkbox').checkbox('set unchecked');
					let previousMessage = '';
					$.each(response.message, (index, value) => {
						if (previousMessage !== value) {
							extensionModules.$ajaxMessgesDiv
								.after(`<div class="ui ${index} message ajax">${value}</div>`);
						}
						previousMessage = value;
					});
				}
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
					$(`#${uniqid} .disability`).addClass('disabled');
					$(`#${uniqid}`).find('.checkbox').checkbox('set unchecked');
					cbAfterDisable(uniqid);
				} else {
					$(`#${uniqid}`).find('.checkbox').checkbox('set checked');
					let previousMessage = '';
					$.each(response.message, (index, value) => {
						if (previousMessage !== value) {
							extensionModules.$ajaxMessgesDiv
								.after(`<div class="ui ${index} message ajax">${value}</div>`);
						}
						previousMessage = value;
					});
					$(`#${uniqid}`).find('i').removeClass('loading');
				}
			},

		});
	},
	/**
	 * Перезапуск модуля и перезагрузка страницы
	 * @param uniqid - ID модуля
	 */
	reloadModuleAndPage(uniqid) {
		PbxApi.SystemReloadModule(uniqid);
		window.location = `${globalRootUrl}/pbx-extension-modules/index/`;
	},
	/**
	 * Обработчик команды uninstall для модуля
	 * Если успешно, перегрузим страницу, если нет, то сообщим об ошибке
	 * @param result - результат удаления модуля
	 */
	cbAfterDelete(result) {
		$('a.button').removeClass('disabled');
		if (result) {
			window.location = `${globalRootUrl}pbx-extension-modules/index/`;
		} else {
			$('.ui.message.ajax').remove();
			extensionModules.$ajaxMessgesDiv.after(`<div class="ui error message ajax">${globalTranslate.ext_DeleteModuleError}</div>`);
		}
	},

};

upgradeStatusLoopWorker = {
	timeOut: 1000,
	timeOutHandle: '',
	moduleUniqid: '',
	iterations: 0,
	oldPercent: 0,
	needEnableAfterInstall: false,
	initialize(uniqid, needEnable) {
		upgradeStatusLoopWorker.moduleUniqid = uniqid;
		upgradeStatusLoopWorker.iterations = 0;
		upgradeStatusLoopWorker.needEnableAfterInstall = needEnable;
		upgradeStatusLoopWorker.restartWorker();
	},
	restartWorker() {
		window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
		upgradeStatusLoopWorker.worker();
	},
	worker() {
		window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
		PbxApi.SystemGetModuleInstallStatus(
			upgradeStatusLoopWorker.moduleUniqid,
			upgradeStatusLoopWorker.cbRefreshModuleStatus,
		);
	},
	cbRefreshModuleStatus(response) {
		upgradeStatusLoopWorker.iterations += 1;
		upgradeStatusLoopWorker.timeoutHandle =
			window.setTimeout(upgradeStatusLoopWorker.worker, upgradeStatusLoopWorker.timeOut);
		if (response.length === 0 || response === false) return;
		if (response.i_status === true) {
			$('a.button').removeClass('disabled');
			localStorage.removeItem('globalTranslateVersion'); // Перезапустим формирование кеша перевода
			if (upgradeStatusLoopWorker.needEnableAfterInstall) {
				extensionModules.enableModule(
					upgradeStatusLoopWorker.moduleUniqid,
					extensionModules.reloadModuleAndPage,
				);
			} else {
				window.location = `${globalRootUrl}pbx-extension-modules/index/`;
			}
			window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
		}
		if (upgradeStatusLoopWorker.iterations > 50 || response.d_status === 'DOWNLOAD_ERROR') {
			window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
			$('.ui.message.ajax').remove();
			extensionModules.$ajaxMessgesDiv.after(`<div class="ui error message ajax">${globalTranslate.ext_UpdateModuleError}</div>`);
			$(`#${upgradeStatusLoopWorker.moduleUniqid}`).find('i').removeClass('loading');
			$('.new-module-row').find('i').addClass('download').removeClass('redo');
			$('a.button').removeClass('disabled');
		} else if (response.d_status === 'DOWNLOAD_IN_PROGRESS' || response.d_status === 'DOWNLOAD_COMPLETE') {
			if (upgradeStatusLoopWorker.oldPercent !== response.d_status_progress) {
				upgradeStatusLoopWorker.iterations = 0;
			}
			$('i.loading.redo').closest('a').find('.percent').text(`${response.d_status_progress}%`);
			upgradeStatusLoopWorker.oldPercent = response.d_status_progress;
		}
	},
};


$(document).ready(() => {
	extensionModules.initialize();
});
