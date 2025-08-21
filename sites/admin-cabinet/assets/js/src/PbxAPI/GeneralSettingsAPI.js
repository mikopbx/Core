/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, Config */

/**
 * GeneralSettingsAPI module
 * Handles all API calls related to general system settings
 * 
 * @module GeneralSettingsAPI
 */
const GeneralSettingsAPI = {
    /**
     * Get all general settings from the REST API
     * @param {Function} callback - Callback function to handle the response
     */
    getSettings(callback) {
        $.api({
            url: `${Config.pbxUrl}/pbxcore/api/v2/general-settings/getSettings`,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback(false);
            }
        });
    },

    /**
     * Save general settings via REST API
     * @param {Object} data - Settings data to save
     * @param {Function} callback - Callback function to handle the response
     */
    saveSettings(data, callback) {
        $.api({
            url: `${Config.pbxUrl}/pbxcore/api/v2/general-settings/saveSettings`,
            on: 'now',
            method: 'POST',
            data: data,
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback(false);
            }
        });
    }
};