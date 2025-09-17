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
 * Network Configuration API using unified PbxApiClient
 * All standard CRUD operations are provided by the base class
 */
const NetworkAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/network',
    customMethods: {
        getConfig: ':getConfig',
        saveConfig: ':saveConfig',
        getNatSettings: ':getNatSettings'
    }
});

// Add custom method aliases for better compatibility
NetworkAPI.getConfig = function(callback) {
    return this.callCustomMethod('getConfig', callback, null, 'GET');
};

NetworkAPI.saveConfig = function(data, callback) {
    console.log('NetworkAPI.saveConfig called with data:', data);
    return this.callCustomMethod('saveConfig', data, callback, 'POST');
};

NetworkAPI.getNatSettings = function(callback) {
    return this.callCustomMethod('getNatSettings', callback, null, 'GET');
};

// The PbxApiClient automatically provides:
// - getList(callback) or getList(params, callback)
// - getRecord(id, callback)
// - deleteRecord(id, callback)
// - callCustomMethod(methodName, data, callback)