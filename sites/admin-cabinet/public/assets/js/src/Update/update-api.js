/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global Config, globalWebAdminLanguage, globalPBXLicense, globalPBXVersion */

const UpdateApi = {
	pbxPing: `${Config.updateUrl}/pbxcore/api/system/ping`,
	pbxReloadAllModulesUrl: `${Config.pbxUrl}/pbxcore/api/pbx/reloadAllModules`, // Рестарт всех модулей АТС
	pbxReloadDialplanUrl: `${Config.pbxUrl}/pbxcore/api/pbx/reloadDialplan`, // Запуск генератора dialplan, перезапуск dialplan на АТС.


	/**
	 * Запрашивает на сайте новые версии модулей PBX
	 * @returns {boolean}
	 */
	getModulesUpdates(cbSuccess) {
		const requestData = {
			TYPE: 'MODULES',
			LICENSE: globalPBXLicense,
			PBXVER: globalPBXVersion.replace(/-dev/i, ''),
			LANGUAGE: globalWebAdminLanguage,
		};
		$.api({
			url: Config.updateUrl,
			on: 'now',
			method: 'POST',
			data: requestData,
			successTest(response) {
				// test whether a JSON response is valid
				return response !== undefined
					&& Object.keys(response).length > 0
					&& response.result === true;
			},
			onSuccess: cbSuccess,
		});
	},

	GetModuleInstallLink(params, cbSuccess, cbFailure) {
		const requestData = {
			TYPE: 'MODULEGETLINK',
			LICENSE: globalPBXLicense,
			RELEASEID: params.releaseId,
		};
		$.api({
			url: Config.updateUrl,
			on: 'now',
			method: 'POST',
			data: requestData,
			successTest(response) {
				// test whether a JSON response is valid
				return response !== undefined
					&& Object.keys(response).length > 0
					&& response.result === true;
			},
			onSuccess(response) {
				cbSuccess(params, response);
			},
			onFailure() {
				cbFailure(params);
			},
		});
	},
	/**
	 * Проверка ответа на JSON
	 * @param jsonString
	 * @returns {boolean|any}
	 */
	tryParseJSON(jsonString) {
		try {
			const o = JSON.parse(jsonString);

			// Handle non-exception-throwing cases:
			// Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
			// but... JSON.parse(null) returns null, and typeof null === "object",
			// so we must check for that, too. Thankfully, null is falsey, so this suffices:
			if (o && typeof o === 'object') {
				return o;
			}
		} catch (e) {
			//
		}
		return false;
	},
};