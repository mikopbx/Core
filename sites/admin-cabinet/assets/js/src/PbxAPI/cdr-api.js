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

/* global globalRootUrl, Config, PbxApi, PbxApiClient */

/**
 * CdrAPI - REST API v3 client for call detail records management
 *
 * Provides methods for working with historical call records.
 * For real-time monitoring (active calls/channels), use PbxStatusAPI instead.
 *
 * @class CdrAPI
 */
const CdrAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/cdr',
    customMethods: {
        getMetadata: ':getMetadata'
    }
});

/**
 * Add method aliases to CdrAPI
 */
Object.assign(CdrAPI, {
    /**
     * Get CDR metadata (date range, record count)
     * @param {Object} params - Request parameters (e.g., {limit: 100})
     * @param {function} callback - Callback function
     */
    getMetadata(params, callback) {
        return this.callCustomMethod('getMetadata', params, (response) => {
            if (response && response.result === true && response.data) {
                callback(response.data);
            } else {
                callback(false);
            }
        });
    },

    /**
     * Delete CDR record
     * WHY: 'delete' is a reserved keyword in JavaScript, so we use 'deleteRecord' as method name
     * @param {string} id - Record ID to delete (numeric ID or linkedid like "mikopbx-xxx")
     *                      - linkedid (mikopbx-*): Deletes entire conversation (all linked records)
     *                      - numeric ID: Deletes single record only
     * @param {Object} params - Optional parameters {deleteRecording: boolean}
     * @param {function} callback - Callback function
     */
    deleteRecord(id, params, callback) {
        // If params is a function, it means no params were passed
        if (typeof params === 'function') {
            callback = params;
            params = {};
        }

        const apiSettings = this.getBaseApiSettings(
            (response) => callback(response, true),
            callback
        );

        $.api({
            url: `${this.apiUrl}/${id}`,
            method: 'DELETE',
            data: params,  // deleteRecording and deleteLinked will be sent as query params
            beforeXHR(xhr) {
                // Add Bearer token for API authentication
                // WHY: REST API v3 uses JWT Bearer tokens, not CSRF tokens
                if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
                    xhr.setRequestHeader('Authorization', `Bearer ${TokenManager.accessToken}`);
                }
                return xhr;
            },
            ...apiSettings
        });
    }
});

// Export for use in other modules
window.CdrAPI = CdrAPI;