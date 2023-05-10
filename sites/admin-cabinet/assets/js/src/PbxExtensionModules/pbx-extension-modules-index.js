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

/* global globalRootUrl, PbxApi, globalTranslate, UpdateApi, UserMessage, globalPBXVersion, SemanticLocalization, upgradeStatusLoopWorker, PbxExtensionStatus */


const extensionModules = {
	$checkboxes: $('.module-row .checkbox'),
	$deleteModalForm: $('#delete-modal-form'),
	$keepSettingsCheckbox: $('#keepModuleSettings'),
	$modulesTable: $('#modules-table'),
	pbxVersion: globalPBXVersion.replace(/-dev/i, ''),
	checkBoxes: [],
	initialize() {
		extensionModules.$deleteModalForm.modal();
		extensionModules.initializeDataTable();
		UpdateApi.getModulesUpdates(extensionModules.cbParseModuleUpdates);
		extensionModules.$checkboxes.each((index, obj) => {
			const uniqId = $(obj).attr('data-value');
			const pageStatus = new PbxExtensionStatus();
			pageStatus.initialize(uniqId, false);
			extensionModules.checkBoxes.push(pageStatus);
		});
	},
	/**
	 * Initialize data tables on table
	 */
	initializeDataTable() {
		extensionModules.$modulesTable.DataTable({
			lengthChange: false,
			paging: false,
			columns: [
				{ orderable: false, searchable: false },
				null,
				null,
				null,
				{ orderable: false, searchable: false },
			],
			autoWidth: false,
			language: SemanticLocalization.dataTableLocalisation,
		});
		$('.add-new').appendTo($('div.eight.column:eq(0)'));
	},
	/**
	 * Обработка списка модулей полученнх с сайта
	 * @param response
	 */
	cbParseModuleUpdates(response) {
		response.modules.forEach((obj) => {
			// Проверим подходит ли по номеру версии этот модуль к АТС
			const minAppropriateVersionPBX = obj.min_pbx_version;
			const currentVersionPBX = extensionModules.pbxVersion;
			if (extensionModules.versionCompare(currentVersionPBX, minAppropriateVersionPBX) < 0) {
				return;
			}
			// Ищем среди установленных, предложим обновление
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
			if($('#license-key').val().trim() === '' && params.commercial !== '0'){
				window.location = `${globalRootUrl}licensing/modify/pbx-extension-modules`;
			}else{
				PbxApi.LicenseCaptureFeatureForProductId(params, extensionModules.cbAfterLicenseCheck);
			}
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
			if($('#license-key').val().trim() === '' && params.commercial !== '0'){
				window.location = `${globalRootUrl}licensing/modify/pbx-extension-modules`;
			}else{
				PbxApi.LicenseCaptureFeatureForProductId(params, extensionModules.cbAfterLicenseCheck);
			}
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

		let additionalIcon = '';
		if(obj.commercial !== '0'){
			additionalIcon = '<i class="icon red cart arrow down"></i>';
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
									`+additionalIcon+`
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
	 * @param result
	 */
	cbAfterLicenseCheck(params, result) {
		if (result===true){
			UpdateApi.GetModuleInstallLink(
				params,
				extensionModules.cbGetModuleInstallLinkSuccess,
				extensionModules.cbGetModuleInstallLinkFailure,
			);
		} else if (result===false && params.length > 0){
			UserMessage.showMultiString(params);
			$('a.button').removeClass('disabled');
		} else {
			UserMessage.showMultiString(globalTranslate.ext_NoLicenseAvailable);
			$('a.button').removeClass('disabled');
		}

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
				params.aLink.find('i').addClass('loading');
				extensionModules.updateModule(newParams);
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
		UserMessage.showMultiString(globalTranslate.ext_GetLinkError);
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
			PbxApi.SystemDisableModule(params.uniqid, () => {
				extensionModules.installModule(params, true);
			});
		} else {
			extensionModules.installModule(params, false);
		}
	},
	/**
	 * Обновление модуля
	 * @param params - параметры запроса
	 * @param needEnable - включить ли модуль после установки?
	 */
	installModule(params, needEnable) {
		PbxApi.FilesDownloadNewModule(params, (response) => {
			if (response === true) {
				upgradeStatusLoopWorker.initialize(params.uniqid, needEnable);
			} else {
				if (response.messages !== undefined) {
					UserMessage.showMultiString(response.messages);
				} else {
					UserMessage.showMultiString(globalTranslate.ext_InstallationError);
				}
				params.aLink.removeClass('disabled');
				if (params.action === 'update') {
					params.aLink.find('i').removeClass('loading');
				} else {
					params.aLink.find('i').removeClass('loading redo').addClass('download');
				}
			}
		});
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
						PbxApi.SystemDisableModule(params.uniqid, () => {
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
			UserMessage.showMultiString(errorMessage, globalTranslate.ext_DeleteModuleError);
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

$(document).ready(() => {
	extensionModules.initialize();
});
