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
 * FirewallAPI - REST API v3 client for firewall management
 * 
 * Provides a clean interface for firewall operations using the new RESTful API.
 * 
 * @class FirewallAPI
 */
const FirewallAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/firewall',
    customMethods: {
        getDefault: ':getDefault',
        getBannedIps: ':getBannedIps',
        unbanIp: ':unbanIp',
        enable: ':enable',
        disable: ':disable'
    }
});

/**
 * Get default values for a new firewall rule
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.getDefault((response) => {
 *     if (response.result) {
 *         console.log('Default values:', response.data);
 *     }
 * });
 */
FirewallAPI.getDefault = function(callback) {
    $.api({
        url: `${this.apiUrl}:getDefault`,
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

/**
 * Get list of banned IP addresses
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.getBannedIps((response) => {
 *     if (response.result) {
 *         console.log('Banned IPs:', response.data);
 *     }
 * });
 */
FirewallAPI.getBannedIps = function(callback) {
    $.api({
        url: `${this.apiUrl}:getBannedIps`,
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

/**
 * Unban an IP address
 * 
 * @param {string} ip - IP address to unban
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.unbanIp('192.168.1.100', (response) => {
 *     if (response.result) {
 *         console.log('IP unbanned successfully');
 *     }
 * });
 */
FirewallAPI.unbanIp = function(ip, callback) {
    $.api({
        url: `${this.apiUrl}:unbanIp`,
        method: 'POST',
        data: { ip: ip },
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

/**
 * Enable firewall and fail2ban
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.enable((response) => {
 *     if (response.result) {
 *         console.log('Firewall enabled');
 *     }
 * });
 */
FirewallAPI.enable = function(callback) {
    $.api({
        url: `${this.apiUrl}:enable`,
        method: 'POST',
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

/**
 * Disable firewall and fail2ban
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.disable((response) => {
 *     if (response.result) {
 *         console.log('Firewall disabled');
 *     }
 * });
 */
FirewallAPI.disable = function(callback) {
    $.api({
        url: `${this.apiUrl}:disable`,
        method: 'POST',
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