/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

/* global globalRootUrl, PbxApi, globalTranslate, UpdateApi, UserMessage */

const licensing = {
	params: undefined,
	callback: undefined,
	captureFeature(params, callback) {
		licensing.params = params;
		licensing.callback = callback;
		$.api({
			url: `${globalRootUrl}licensing/captureFeatureForProductId`,
			on: 'now',
			method: 'POST',
			data: {
				licFeatureId: licensing.params.licFeatureId,
				licProductId: licensing.params.licProductId,
			},
			successTest(response) {
				// test whether a JSON response is valid
				return response !== undefined
					&& Object.keys(response).length > 0
					&& response.success === true;
			},
			onSuccess: licensing.cbAfterFeatureCaptured,
			onFailure: licensing.cbAfterFailureFeatureCaptured,

		});
	},
	cbAfterFeatureCaptured() {
		licensing.callback(licensing.params);
	},
	cbAfterFailureFeatureCaptured(response) {
		if (response !== undefined
			&& Object.keys(response).length > 0
			&& response.message.length > 0) {
			UserMessage.showError(response.message);
		} else {
			UserMessage.showError(globalTranslate.ext_NoLicenseAvailable);
		}
		$('a.button').removeClass('disabled');
	},
};

let upgradeStatusLoopWorker = {};
const extensionModules = {
	$checkboxes: $('.module-row .checkbox'),
	$deleteModalForm: $('#delete-modal-form'),
	$keepSettingsCheckbox: $('#keepModuleSettings'),
	initialize() {
		extensionModules.$deleteModalForm.modal();
		UpdateApi.getModulesUpdates(extensionModules.cbParseModuleUpdates);
		extensionModules.$checkboxes
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
	/**
	 * Обработка списка модулей полученнх с сайта
	 * @param response
	 */
	cbParseModuleUpdates(response) {
		response.modules.forEach((obj) => {
			// Ищем среди установленных
			const $moduleRow = $(`tr.module-row#${obj.uniqid}`);
			if ($moduleRow.length > 0) {
				const oldVer = $moduleRow.find('td.version').text();
				const newVer = obj.version;
				if (extensionModules.versionCompare(newVer, oldVer) > 0) {
					extensionModules.addUpdateButtonToRow(obj);
				}
			} else {
				const $newModuleRow = $(`tr.new-module-row#${obj.uniqid}`);
				if ($newModuleRow.length > 0) {
					const oldVer = $newModuleRow.find('td.version').text();
					const newVer = obj.version;
					if (extensionModules.versionCompare(newVer, oldVer) > 0) {
						$newModuleRow.remove();
						extensionModules.addModuleDescription(obj);
					}
				} else {
					extensionModules.addModuleDescription(obj);
				}
			}
		});

		$('a.download').on('click', (e) => {
			e.preventDefault();
			$('a.button').addClass('disabled');
			const params = {};
			const $aLink = $(e.target).closest('a');
			$aLink.removeClass('disabled');
			params.uniqid = $aLink.attr('data-uniqid');
			params.releaseId = $aLink.attr('data-id');
			params.size = $aLink.attr('data-size');
			params.licProductId = $aLink.attr('data-productid');
			params.licFeatureId = $aLink.attr('data-featureid');
			params.action = 'install';
			params.aLink = $aLink;

			licensing.captureFeature(params, extensionModules.cbAfterLicenseCheck);
		});
		$('a.update').on('click', (e) => {
			e.preventDefault();
			$('a.button').addClass('disabled');
			const params = {};
			const $aLink = $(e.target).closest('a');
			$aLink.removeClass('disabled');
			params.licProductId = $aLink.attr('data-productid');
			params.licFeatureId = $aLink.attr('data-featureid');
			params.action = 'update';
			params.releaseId = $aLink.attr('data-id');
			params.uniqid = $aLink.attr('data-uniqid');
			params.size = $aLink.attr('data-size');
			params.aLink = $aLink;
			licensing.captureFeature(params, extensionModules.cbAfterLicenseCheck);
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
	/**
	 * Добавляет описание доступного модуля
	 * @param obj
	 */
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
						<td class="center aligned version">${obj.version}</td>
						<td class="right aligned collapsing">
    						<div class="ui small basic icon buttons action-buttons">
    							<a href="#" class="ui button download" 
									data-content= "${globalTranslate.ext_InstallModule}"
									data-uniqid = "${obj.uniqid}"
									data-size = "${obj.size}"
									data-productId = "${obj.lic_product_id}"
									data-featureId = "${obj.lic_feature_id}" 
									data-id ="${obj.release_id}">
									<i class="icon download blue"></i> 
									<span class="percent"></span>
								</a>
    						</div>
			</tr>`;
		$('#new-modules-table tbody').append(dymanicRow);
	},

	/**
	 * Добавляет кнопку обновления старой версии PBX
	 * @param obj
	 */
	addUpdateButtonToRow(obj) {
		const $moduleRow = $(`tr.module-row#${obj.uniqid}`);
		const $currentUpdateButton = $(`tr.module-row#${obj.uniqid}`).find('a.update');
		if ($currentUpdateButton.length > 0) {
			const oldVer = $currentUpdateButton.attr('data-ver');
			const newVer = obj.version;
			if (extensionModules.versionCompare(newVer, oldVer) <= 0) {
				return;
			}
		}
		$currentUpdateButton.remove();
		const dynamicButton
			= `<a href="#" class="ui button update popuped" 
			data-content="${globalTranslate.ext_UpdateModule}"
			data-ver ="${obj.version}"
			data-uniqid ="${obj.uniqid}" 
			data-productId = "${obj.lic_product_id}"
			data-featureId = "${obj.lic_feature_id}" 
			data-id ="${obj.release_id}">
			<i class="icon redo blue"></i> 
			<span class="percent"></span>
			</a>`;
		$moduleRow.find('.action-buttons').prepend(dynamicButton);
	},
	/**
	 * Если фича захвачена, обращаемся к серверу
	 * обновлений за получениием дистрибутива
	 * @param params
	 * @returns {boolean}
	 */
	cbAfterLicenseCheck(params) {
		UpdateApi.GetModuleInstallLink(
			params,
			extensionModules.cbGetModuleInstallLinkSuccess,
			extensionModules.cbGetModuleInstallLinkFailure,
		);
	},
	/**
	 * Если сайт вернул ссылку на обновление
	 * @param params
	 * @param response
	 */
	cbGetModuleInstallLinkSuccess(params, response) {
		const newParams = params;
		response.modules.forEach((obj) => {
			newParams.md5 = obj.md5;
			newParams.updateLink = obj.href;
			if (newParams.action === 'update') {
				extensionModules.updateModule(newParams);
				params.aLink.find('i').addClass('loading');
			} else {
				params.aLink.find('i').addClass('loading redo').removeClass('download');
				extensionModules.installModule(newParams, false);
			}
		});
	},
	/**
	 * Если сайт отказал в обновлении, не захвачена нужная фича
	 */
	cbGetModuleInstallLinkFailure(params) {
		$('a.button').removeClass('disabled');
		if (params.action === 'update') {
			params.aLink.find('i').removeClass('loading');
		} else {
			params.aLink.find('i').removeClass('loading redo').addClass('download');
		}
		UserMessage.showError(globalTranslate.ext_GetLinkError);
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
					UserMessage.showMultiString(response.message);
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
					UserMessage.showMultiString(response.message);
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
		window.location = `${globalRootUrl}pbx-extension-modules/index/`;
	},
	/**
	 * Сначала отключим модуль, если получится, то отправим команду на удаление
	 * и обновим страничку
	 * @param params - параметры запроса.
	 */
	deleteModule(params) {
		// Cпросим пользователя сохранять ли настройки
		extensionModules.$deleteModalForm
			.modal({
				closable: false,
				onDeny: () => {
					$('a.button').removeClass('disabled');
					return true;
				},
				onApprove: () => {
					// Проверим включен ли модуль, если включен, вырубим его
					const status = $(`#${params.uniqid}`).find('.checkbox').checkbox('is checked');
					const keepSettings = extensionModules.$keepSettingsCheckbox.checkbox('is checked');
					if (status === true) {
						extensionModules.disableModule(params.uniqid, () => {
							PbxApi.SystemDeleteModule(
								params.uniqid,
								keepSettings,
								extensionModules.cbAfterDelete,
							);
						});
					} else {
						PbxApi.SystemDeleteModule(params.uniqid, keepSettings, extensionModules.cbAfterDelete);
					}
					return true;
				},
			})
			.modal('show');
	},
	/**
	 * Обработчик команды uninstall для модуля
	 * Если успешно, перегрузим страницу, если нет, то сообщим об ошибке
	 * @param result - результат удаления модуля
	 */
	cbAfterDelete(result) {
		$('a.button').removeClass('disabled');
		if (result === true) {
			window.location = `${globalRootUrl}pbx-extension-modules/index/`;
		} else {
			$('.ui.message.ajax').remove();
			let errorMessage = (result.data !== undefined) ? result.data : '';
			errorMessage = errorMessage.replace(/\n/g, '<br>');
			UserMessage.showError(errorMessage, globalTranslate.ext_DeleteModuleError);
		}
	},
	/**
	 * Сравнение версий модулей
	 * @param v1
	 * @param v2
	 * @param options
	 * @returns {number}
	 */
	versionCompare(v1, v2, options) {
		const lexicographical = options && options.lexicographical;
		const zeroExtend = options && options.zeroExtend;
		let v1parts = v1.split('.');
		let v2parts = v2.split('.');

		function isValidPart(x) {
			return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
		}

		if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
			return NaN;
		}

		if (zeroExtend) {
			while (v1parts.length < v2parts.length) v1parts.push('0');
			while (v2parts.length < v1parts.length) v2parts.push('0');
		}

		if (!lexicographical) {
			v1parts = v1parts.map(Number);
			v2parts = v2parts.map(Number);
		}

		for (let i = 0; i < v1parts.length; i += 1) {
			if (v2parts.length === i) {
				return 1;
			}
			if (v1parts[i] === v2parts[i]) {
				//
			} else if (v1parts[i] > v2parts[i]) {
				return 1;
			} else {
				return -1;
			}
		}

		if (v1parts.length !== v2parts.length) {
			return -1;
		}

		return 0;
	},

};


/**
 * Мониторинг статуса обновления или установки модуля
 *
 */
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
			let errorMessage = (response.d_error !== undefined) ? response.d_error : '';
			errorMessage = errorMessage.replace(/\n/g, '<br>');
			UserMessage.showError(errorMessage, globalTranslate.ext_UpdateModuleError);
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
