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
 * OutboundRoutesAPI - REST API v3 client for outbound routes management
 * 
 * Provides a clean interface for outbound routes operations using the new RESTful API v3.
 * 
 * @class OutboundRoutesAPI
 */
const OutboundRoutesAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/outbound-routes',
    customMethods: {
        getDefault: ':getDefault',
        changePriority: ':changePriority',
        copy: ':copy'
    }
});

/**
 * Create new outbound route (wrapper for saveRecord)
 * @param {object} data - Route data
 * @param {function} callback - Callback function
 */
OutboundRoutesAPI.create = function(data, callback) {
    this.saveRecord(data, callback);
};

/**
 * Update existing outbound route (wrapper for saveRecord)
 * @param {object} data - Route data
 * @param {function} callback - Callback function
 */
OutboundRoutesAPI.update = function(data, callback) {
    this.saveRecord(data, callback);
};

/**
 * Change priority of outbound routes
 * @param {object} priorityData - Object with route IDs as keys and new priorities as values
 * @param {function} callback - Callback function
 */
OutboundRoutesAPI.changePriority = function(priorityData, callback) {
    $.api({
        url: `${this.apiUrl}:changePriority`,
        method: 'POST',
        data: { priorities: priorityData },
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