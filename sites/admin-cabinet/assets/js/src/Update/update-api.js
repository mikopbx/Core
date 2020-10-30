/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global Config, globalWebAdminLanguage, globalPBXLicense, globalPBXVersion */
const UpdateApi = {
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
					&& response.result === 'SUCCESS';
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
					&& response.result === 'SUCCESS';
			},
			onSuccess(response) {
				cbSuccess(params, response);
			},
			onFailure() {
				cbFailure(params);
			},
		});
	},
};