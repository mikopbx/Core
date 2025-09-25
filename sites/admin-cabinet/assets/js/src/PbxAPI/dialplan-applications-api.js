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
 * DialplanApplicationsAPI - REST API v3 client for dialplan applications management
 * 
 * Provides a clean interface for dialplan applications operations using the new RESTful API.
 * 
 * @class DialplanApplicationsAPI
 */
const DialplanApplicationsAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/dialplan-applications',
    customMethods: {
        getDefault: ':getDefault',
        copy: ':copy'
    }
});

/**
 * Get default values for a new dialplan application
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * DialplanApplicationsAPI.getDefault((response) => {
 *     if (response.result) {
 *         console.log('Default values:', response.data);
 *     }
 * });
 */
DialplanApplicationsAPI.getDefault = function(callback) {
    return this.callCustomMethod('getDefault', {}, callback);
};

/**
 * Copy an existing dialplan application
 *
 * @param {string} id - ID of the dialplan application to copy
 * @param {function} callback - Callback function to handle the response
 * @example
 * DialplanApplicationsAPI.copy('DIALPLAN-APP-123', (response) => {
 *     if (response.result) {
 *         console.log('Copied application:', response.data);
 *     }
 * });
 */
DialplanApplicationsAPI.copy = function(id, callback) {
    return this.callCustomMethod('copy', {id: id}, callback, 'GET', id);
};