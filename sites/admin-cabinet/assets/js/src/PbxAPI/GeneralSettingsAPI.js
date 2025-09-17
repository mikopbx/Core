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

/* global globalRootUrl, Config, PbxApi */

/**
 * GeneralSettingsAPI module (v3 RESTful API)
 * Handles all API calls related to general system settings
 *
 * @module GeneralSettingsAPI
 */
const GeneralSettingsAPI = {

    /**
     * Base URL for general settings API
     * @type {string}
     */
    baseUrl: `${Config.pbxUrl}/pbxcore/api/v3/general-settings`,

    /**
     * Get all general settings (GET /general-settings)
     * @param {Function} callback - Callback function to handle the response
     */
    getSettings(callback) {
        $.api({
            url: GeneralSettingsAPI.baseUrl,
            on: 'now',
            method: 'GET',
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
     * Get single setting by key (GET /general-settings/{key})
     * @param {string} key - Setting key to retrieve
     * @param {Function} callback - Callback function to handle the response
     */
    getSetting(key, callback) {
        $.api({
            url: `${GeneralSettingsAPI.baseUrl}/${key}`,
            on: 'now',
            method: 'GET',
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
     * Get default settings values (GET /general-settings:getDefault)
     * @param {Function} callback - Callback function to handle the response
     */
    getDefault(callback) {
        $.api({
            url: `${GeneralSettingsAPI.baseUrl}:getDefault`,
            on: 'now',
            method: 'GET',
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
     * Save general settings via PATCH for partial update
     * This is the main method used by the form for saving settings
     * @param {Object} data - Settings data to save (partial update)
     * @param {Function} callback - Callback function to handle the response
     */
    saveSettings(data, callback) {
        $.api({
            url: GeneralSettingsAPI.baseUrl,
            on: 'now',
            method: 'PATCH',
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
    },

    /**
     * Full update of settings (PUT /general-settings)
     * @param {Object} data - Complete settings data to replace existing
     * @param {Function} callback - Callback function to handle the response
     */
    updateSettings(data, callback) {
        $.api({
            url: GeneralSettingsAPI.baseUrl,
            on: 'now',
            method: 'PUT',
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
    },

    /**
     * Update codec configuration (POST /general-settings:updateCodecs)
     * @param {Array} codecs - Array of codec configurations
     * @param {Function} callback - Callback function to handle the response
     */
    updateCodecs(codecs, callback) {
        $.api({
            url: `${GeneralSettingsAPI.baseUrl}:updateCodecs`,
            on: 'now',
            method: 'POST',
            data: { codecs: codecs },
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