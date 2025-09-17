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
 * Fail2BanAPI - REST API v3 client for Fail2Ban management (Singleton resource)
 *
 * Provides a clean interface for Fail2Ban operations.
 * Fail2Ban is a singleton resource - there's only one configuration in the system.
 *
 * @class Fail2BanAPI
 */
const Fail2BanAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/fail2ban',
    singleton: true
});

/**
 * Get Fail2Ban settings (Singleton GET)
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * Fail2BanAPI.get((response) => {
 *     if (response.result) {
 *         console.log('Settings:', response.data);
 *     }
 * });
 */
Fail2BanAPI.get = function(callback) {
    $.api({
        url: this.apiUrl,
        method: 'GET',
        on: 'now',
        onSuccess(response) {
            callback(response);
        },
        onFailure(response) {
            callback(response);
        },
        onError() {
            callback({
                result: false,
                messages: { error: ['Network error occurred'] }
            });
        }
    });
};

// Alias for backward compatibility
Fail2BanAPI.getSettings = Fail2BanAPI.get;

/**
 * Update Fail2Ban settings (Singleton PUT)
 *
 * @param {object} data - Settings data to update
 * @param {function} callback - Callback function to handle the response
 * @example
 * Fail2BanAPI.update({
 *     maxretry: 5,
 *     bantime: 86400,
 *     findtime: 1800,
 *     whitelist: '192.168.1.0/24'
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Settings updated successfully');
 *     }
 * });
 */
Fail2BanAPI.update = function(data, callback) {
    $.api({
        url: this.apiUrl,
        method: 'PUT',
        data: data,
        on: 'now',
        onSuccess(response) {
            callback(response);
        },
        onFailure(response) {
            callback(response);
        },
        onError() {
            callback({
                result: false,
                messages: { error: ['Network error occurred'] }
            });
        }
    });
};

// Alias for backward compatibility
Fail2BanAPI.updateSettings = Fail2BanAPI.update;

/**
 * Partially update Fail2Ban settings (Singleton PATCH)
 *
 * @param {object} data - Settings data to patch
 * @param {function} callback - Callback function to handle the response
 * @example
 * Fail2BanAPI.patch({
 *     maxretry: 10
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Settings patched successfully');
 *     }
 * });
 */
Fail2BanAPI.patch = function(data, callback) {
    $.api({
        url: this.apiUrl,
        method: 'PATCH',
        data: data,
        on: 'now',
        onSuccess(response) {
            callback(response);
        },
        onFailure(response) {
            callback(response);
        },
        onError() {
            callback({
                result: false,
                messages: { error: ['Network error occurred'] }
            });
        }
    });
};