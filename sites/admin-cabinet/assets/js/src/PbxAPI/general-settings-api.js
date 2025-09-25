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

/* global globalRootUrl, Config, PbxApi, PbxApiClient, $ */ 

/**
 * GeneralSettingsAPI - REST API v3 client for general settings management (Singleton resource)
 *
 * Provides a clean interface for general settings operations.
 * General Settings is a singleton resource - there's only one configuration in the system.
 *
 * @class GeneralSettingsAPI
 */
const GeneralSettingsAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/general-settings',
    singleton: true,
    customMethods: {
        getDefault: ':getDefault',
        updateCodecs: ':updateCodecs'
    }
});

// Add method aliases for compatibility and easier use using centralized utility
PbxApi.extendApiClient(GeneralSettingsAPI, {

    /**
     * Get all general settings (GET /general-settings)
     * @param {Function} callback - Callback function to handle the response
     * @returns {Object} API call result
     */
    getSettings(callback) {
        try {
            const validation = PbxApi.validateApiParams({ callback }, {
                required: ['callback'],
                types: { callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('GeneralSettingsAPI.getSettings', validation.errors.join(', '), callback);
            }

            return this.callGet({}, callback);
        } catch (error) {
            return PbxApi.handleApiError('GeneralSettingsAPI.getSettings', error, callback);
        }
    },

    /**
     * Get single setting by key (GET /general-settings/{key})
     * @param {string} key - Setting key to retrieve
     * @param {Function} callback - Callback function to handle the response
     */
    getSetting(key, callback) {
        return this.callGet({}, callback, key);
    },

    /**
     * Get default settings values (GET /general-settings:getDefault)
     * @param {Function} callback - Callback function to handle the response
     */
    getDefault(callback) {
        return this.callCustomMethod('getDefault', {}, callback);
    },

    /**
     * Save general settings via PATCH for partial update
     * This is the main method used by the form for saving settings
     * @param {Object} data - Settings data to save (partial update)
     * @param {Function} callback - Callback function to handle the response
     */
    saveSettings(data, callback) {
        return this.callPatch(data, callback);
    },

    /**
     * Full update of settings (PUT /general-settings)
     * @param {Object} data - Complete settings data to replace existing
     * @param {Function} callback - Callback function to handle the response
     */
    updateSettings(data, callback) {
        return this.callPut(data, callback);
    },

    /**
     * Update codec configuration (POST /general-settings:updateCodecs)
     * @param {Array} codecs - Array of codec configurations
     * @param {Function} callback - Callback function to handle the response
     */
    updateCodecs(codecs, callback) {
        return this.callCustomMethod('updateCodecs', { codecs: codecs }, callback, 'POST');
    }
});