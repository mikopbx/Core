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
 * IncomingRoutesAPI - REST API v3 client for incoming routes management
 * 
 * Provides a clean interface for incoming routes operations using the new RESTful API.
 * This replaces the legacy v2 API client.
 * 
 * @class IncomingRoutesAPI 
 */
const IncomingRoutesAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/incoming-routes',
    customMethods: {
        getDefault: ':getDefault',
        getDefaultRoute: ':getDefaultRoute',
        changePriority: ':changePriority',
        copy: ':copy'
    }
});

/**
 * Get or create default incoming route (ID=1)
 *
 * @param {function} callback - Callback function
 */
IncomingRoutesAPI.getDefaultRoute = function(callback) {
    return this.callCustomMethod('getDefaultRoute', {}, callback);
};

/**
 * Change priority of multiple incoming routes
 *
 * @param {object} priorities - Map of route ID to new priority value
 * @param {function} callback - Callback function
 */
IncomingRoutesAPI.changePriority = function(priorities, callback) {
    return this.callCustomMethod('changePriority', { priorities: priorities }, callback, 'POST');
};