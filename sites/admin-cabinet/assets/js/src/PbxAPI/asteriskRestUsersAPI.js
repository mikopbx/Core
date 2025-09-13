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
 * Asterisk REST Interface (ARI) Users API module using unified PbxApiClient
 * 
 * This module demonstrates significant code reduction by using PbxApiClient.
 * The API client provides all standard operations plus custom methods and caching.
 * 
 * @module AsteriskRestUsersAPI
 */

// Create unified API client instance with caching enabled
const AsteriskRestUsersAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/asterisk-rest-users',
    resourceName: 'asteriskRestUsers',
    enableCache: true,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    cacheKey: 'AsteriskRestUsersList',
    customMethods: {
        getDefaults: ':getDefaults'
    }
});

// Add backward compatibility methods for legacy code
Object.assign(AsteriskRestUsersAPI, {
    /**
     * Legacy method for compatibility with existing code
     * @deprecated Use getList(params, callback) instead
     */
    getListWithParams(params = {}, callback, useCache = false) {
        return this.getList(params, callback);
    },

    /**
     * Get default values for new ARI user
     * @param {function} callback - Callback function
     */
    getDefaults(callback) {
        return this.callCustomMethod('getDefaults', callback);
    },

    /**
     * Create new ARI user
     * @param {object} data - User data
     * @param {function} callback - Callback function  
     */
    createRecord(data, callback) {
        const newData = {...data, _isNew: true};
        return this.saveRecord(newData, callback);
    },

    /**
     * Update ARI user (full update - PUT)
     * @param {string} id - User ID
     * @param {object} data - User data
     * @param {function} callback - Callback function
     */
    updateRecord(id, data, callback) {
        if (!id) {
            callback({ success: false, messages: { error: ['ID is required'] } });
            return;
        }
        const updateData = {...data, id: id};
        return this.saveRecord(updateData, callback);
    },

    /**
     * Partially update ARI user (PATCH)
     * @param {string} id - User ID
     * @param {object} data - Partial user data
     * @param {function} callback - Callback function
     */
    patchRecord(id, data, callback) {
        // For now, treat PATCH as PUT until PbxApiClient supports PATCH
        return this.updateRecord(id, data, callback);
    }
});

// The PbxApiClient automatically provides:
// - getList(callback) or getList(params, callback)
// - getRecord(id, callback) - uses :getDefaults for empty ID
// - saveRecord(data, callback) - automatically selects POST/PUT
// - deleteRecord(id, callback)
// - callCustomMethod(methodName, data, callback)
// - Built-in caching with 5-minute timeout
// - Backward compatibility through endpoints property