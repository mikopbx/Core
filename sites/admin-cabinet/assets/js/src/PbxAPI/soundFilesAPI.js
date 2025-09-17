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

/* global Config, PbxApi, $ */

/**
 * SoundFilesAPI - REST API v3 for sound file management
 *
 * These methods provide clean REST API interface for sound file management
 * following REST conventions with proper HTTP methods
 */
const SoundFilesAPI = {
    /**
     * API base URL for v3 RESTful endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v3/sound-files`,
    
    /**
     * Get sound file record for editing
     * Uses v3 RESTful API: GET /sound-files/{id} or GET /sound-files:getDefault for new
     * @param {string} recordId - Sound file ID or empty/null for new sound file
     * @param {function} callback - Callback function to handle response
     */
    getRecord(recordId, callback) {
        // Use :getDefault for new records, otherwise GET by ID
        const isNew = !recordId || recordId === '' || recordId === 'new';
        const url = isNew ? `${this.apiUrl}:getDefault` : `${this.apiUrl}/${recordId}`;

        $.api({
            url: url,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, messages: {error: 'Network error'}});
            }
        });
    },

    /**
     * Save sound file record with proper POST/PUT method selection
     * Uses v3 RESTful API: POST /sound-files (create) or PUT /sound-files/{id} (update)
     * @param {object} data - Sound file data to save
     * @param {function} callback - Callback function to handle response
     */
    saveRecord(data, callback) {
        // Check if this is a new record using the _isNew flag passed from form
        const isNew = data._isNew === true || !data.id || data.id === '';

        // Remove the flag before sending to server
        if (data._isNew !== undefined) {
            delete data._isNew;
        }

        // v3 API: POST for new records, PUT for updates
        const method = isNew ? 'POST' : 'PUT';
        const url = isNew ? this.apiUrl : `${this.apiUrl}/${data.id}`;

        $.api({
            url: url,
            method: method,
            data: data,
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, messages: {error: 'Network error'}});
            }
        });
    },

    /**
     * Delete sound file record
     * Uses v3 RESTful API: DELETE /sound-files/{id}
     * @param {string} id - Sound file ID to delete
     * @param {function} callback - Callback function to handle response
     */
    deleteRecord(id, callback) {
        // v3 API: DELETE /sound-files/{id}
        $.api({
            url: `${this.apiUrl}/${id}`,
            on: 'now',
            method: 'DELETE',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback(false);
            }
        });
    },

    /**
     * Get list of sound files for DataTable
     * Uses v3 RESTful API: GET /sound-files with query parameters
     * @param {object} params - Query parameters (category, search, limit, offset, etc.)
     * @param {function} callback - Callback function to handle response
     */
    getList(params, callback) {
        // v3 API: GET /sound-files with query parameters
        $.api({
            url: this.apiUrl,
            method: 'GET',
            data: params,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, messages: {error: 'Network error'}});
            }
        });
    },

    /**
     * Upload sound file endpoint for Resumable.js
     * Uses v3 RESTful API: POST /sound-files:uploadFile
     * @returns {string}
     */
    getUploadUrl() {
        return `${this.apiUrl}:uploadFile`;
    },

    /**
     * Get sound files for dropdown select
     * Uses v3 RESTful API: GET /sound-files:getForSelect
     * @param {string} category - Category filter (custom/moh)
     * @param {function} callback - Callback function to handle response
     */
    getForSelect(category, callback) {
        // v3 API: GET /sound-files:getForSelect (custom action)
        $.api({
            url: `${this.apiUrl}:getForSelect`,
            method: 'GET',
            data: { category: category },
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, data: []});
            }
        });
    }
};