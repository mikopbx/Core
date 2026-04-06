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

/* global PbxApiClient */

/**
 * SysinfoAPI - REST API v3 client for system information operations
 *
 * Provides methods to retrieve system information, external IP, hypervisor details,
 * DMI information, and other system-related data.
 *
 * @class SysinfoAPI 
 */
const SysinfoAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/sysinfo',
    singleton: true,
    customMethods: {
        getInfo: ':getInfo',
        getExternalIpInfo: ':getExternalIpInfo',
        getHypervisorInfo: ':getHypervisorInfo',
        getDMIInfo: ':getDMIInfo'
    }
});

/**
 * Gets collection of the system information
 * @param {function} callback - Callback function
 */
SysinfoAPI.getInfo = function(callback) {
    return this.callCustomMethod('getInfo', {}, callback, 'GET');
};

/**
 * Gets an external IP address of the system
 * @param {function} callback - Callback function
 */
SysinfoAPI.getExternalIpInfo = function(callback) {
    return this.callCustomMethod('getExternalIpInfo', {}, callback, 'GET');
};

/**
 * Gets hypervisor information
 * @param {function} callback - Callback function
 */
SysinfoAPI.getHypervisorInfo = function(callback) {
    return this.callCustomMethod('getHypervisorInfo', {}, callback, 'GET');
};

/**
 * Gets DMI (Desktop Management Interface) information
 * @param {function} callback - Callback function
 */
SysinfoAPI.getDMIInfo = function(callback) {
    return this.callCustomMethod('getDMIInfo', {}, callback, 'GET');
};

// Export for use in other modules
window.SysinfoAPI = SysinfoAPI;