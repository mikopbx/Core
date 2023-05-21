/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/**
 * Object for managing API updates firmware.
 */
const UpdateApi = {
    /**
     * Retrieves available module versions.
     * @param {function} cbSuccess - The callback function to execute on success.
     * @returns {boolean} Returns true.
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
                // Test whether a JSON response is valid
                return response !== undefined
                    && Object.keys(response).length > 0
                    && response.result === 'SUCCESS';
            },
            onSuccess: cbSuccess,
        });
    },

    /**
     * Retrieves the installation link for a module.
     * @param {object} params - The parameters for retrieving the installation link.
     * @param {function} cbSuccess - The callback function to execute on success.
     * @param {function} cbFailure - The callback function to execute on failure.
     * @returns {boolean} Returns true.
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
                // Test whether a JSON response is valid
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