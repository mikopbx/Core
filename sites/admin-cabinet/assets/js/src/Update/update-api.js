/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global Config, globalWebAdminLanguage, globalPBXLicense, globalPBXVersion */

/** @scrutinizer ignore-unused */ const UpdateApi = {
	/**
	 * Asks for available modules versions
	 * @returns {boolean}
	 */
	getModulesUpdates(cbSuccess) {
		const requestData = {
			PBXVER: globalPBXVersion.replace(/-dev/i, ''),
			LANGUAGE: globalWebAdminLanguage,
		};
		$.api({
			url: `${Config.updateUrl}getAvailableModules`,
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
	/**
	 * Asks for installation link
	 * @param params
	 * @param cbSuccess
	 * @param cbFailure
	 * @returns {boolean}
	 * @constructor
	 */
	GetModuleInstallLink(params, cbSuccess, cbFailure) {
		const requestData = {
			LICENSE: globalPBXLicense,
			RELEASEID: params.releaseId,
		};
		$.api({
			url: `${Config.updateUrl}getModuleLink`,
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