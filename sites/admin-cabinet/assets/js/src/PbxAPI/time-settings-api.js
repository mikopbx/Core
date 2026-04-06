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

/* global PbxApiClient, $ */

/**
 * TimeSettingsAPI - REST API v3 client for Time Settings management (Singleton resource)
 *
 * Provides a clean interface for Time Settings operations.
 * Time Settings is a singleton resource - there's only one time configuration in the system.
 *
 * @class TimeSettingsAPI 
 */
const TimeSettingsAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/time-settings',
    singleton: true,
    customMethods: {
        getAvailableTimezones: ':getAvailableTimezones'
    }
});

/**
 * Get Time Settings (Singleton GET)
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * TimeSettingsAPI.get((response) => {
 *     if (response.result) {
 *         console.log('Settings:', response.data);
 *         console.log('Current timezone:', response.data.PBXTimezone);
 *         console.log('Timezone representation:', response.data.PBXTimezone_represent);
 *     }
 * });
 */
TimeSettingsAPI.get = function(callback) {
    return this.callGet({}, callback);
};

// Alias for backward compatibility
TimeSettingsAPI.getSettings = TimeSettingsAPI.get;

/**
 * Update Time Settings (Singleton PUT)
 *
 * @param {object} data - Settings data to update
 * @param {function} callback - Callback function to handle the response
 * @example
 * TimeSettingsAPI.update({
 *     PBXTimezone: 'Europe/Moscow',
 *     NTPServer: 'pool.ntp.org',
 *     PBXManualTimeSettings: '0',
 *     ManualDateTime: '2025-01-01 12:00:00'
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Settings updated successfully');
 *     }
 * });
 */
TimeSettingsAPI.update = function(data, callback) {
    return this.callPut(data, callback);
};

// Alias for backward compatibility
TimeSettingsAPI.updateSettings = TimeSettingsAPI.update;

/**
 * Partially update Time Settings (Singleton PATCH)
 *
 * @param {object} data - Settings data to patch
 * @param {function} callback - Callback function to handle the response
 * @example
 * TimeSettingsAPI.patch({
 *     PBXTimezone: 'America/New_York'
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Timezone updated successfully');
 *     }
 * });
 */
TimeSettingsAPI.patch = function(data, callback) {
    return this.callPatch(data, callback);
};

/**
 * Get available timezones for selection (Custom method)
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * TimeSettingsAPI.getAvailableTimezones((response) => {
 *     if (response.result) {
 *         console.log('Available timezones:', response.data);
 *     }
 * });
 */
TimeSettingsAPI.getAvailableTimezones = function(callback) {
    return this.callCustomMethod('getAvailableTimezones', {}, callback);
};