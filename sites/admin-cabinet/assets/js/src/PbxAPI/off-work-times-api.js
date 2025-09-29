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
 * OffWorkTimesAPI - REST API v3 client for out-of-work-time management
 *
 * Provides a clean interface for time condition operations using the new RESTful API.
 * This is the v3 API client that replaces the legacy v2 implementation.
 *
 * @class OffWorkTimesAPI
 */
const OffWorkTimesAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/off-work-times',
    customMethods: {
        getDefault: ':getDefault',
        changePriorities: ':changePriorities',
        copy: ':copy'
    }
});

// Add method aliases to OffWorkTimesAPI
Object.assign(OffWorkTimesAPI, {

    /**
     * Change priority of multiple time conditions
     *
     * @param {object} priorities - Map of time condition ID to new priority value
     * @param {function} callback - Callback function
     */
    changePriorities(priorities, callback) {
        return this.callCustomMethod('changePriorities', { priorities }, callback, 'POST');
    },

    /**
     * Get default values for new time condition
     * This is a convenience method that wraps getRecord with null ID
     *
     * @param {function} callback - Callback function
     */
    getDefault(callback) {
        return this.getRecord(null, callback);
    },

    /**
     * Copy time condition
     *
     * @param {string} id - Time condition ID to copy
     * @param {function} callback - Callback function
     */
    copy(id, callback) {
        return this.callCustomMethod('copy', { id }, callback, 'POST');
    }

});

// Export for use in other modules
window.OffWorkTimesAPI = OffWorkTimesAPI;