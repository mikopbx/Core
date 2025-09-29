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

/* global Config, PbxApi, PbxApiClient, $ */

/**
 * SoundFilesAPI - REST API v3 client for sound files management
 *
 * Provides a clean interface for sound files operations using the new RESTful API.
 *
 * @class SoundFilesAPI 
 */
const SoundFilesAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/sound-files',
    customMethods: {
        getDefault: ':getDefault',
        uploadFile: ':uploadFile',
        getForSelect: ':getForSelect',
        convertAudioFile: ':convertAudioFile'
    }
});

// Add method aliases for compatibility and easier use
Object.assign(SoundFilesAPI, {
    
    /**
     * Get sound file record for editing
     * Uses v3 RESTful API: GET /sound-files/{id} or GET /sound-files:getDefault for new
     * @param {string} recordId - Sound file ID or empty/null for new sound file
     * @param {function} callback - Callback function to handle response
     * @param {object} params - Optional parameters (e.g., category for new records)
     */
    getRecord(recordId, callback, params = {}) {
        // Use :getDefault for new records, otherwise GET by ID
        const isNew = !recordId || recordId === '' || recordId === 'new';

        if (isNew) {
            return this.callCustomMethod('getDefault', params, callback);
        } else {
            return this.callGet({}, callback, recordId);
        }
    },

    /**
     * Delete sound file record
     * Uses v3 RESTful API: DELETE /sound-files/{id}
     * @param {string} id - Sound file ID to delete
     * @param {function} callback - Callback function to handle response
     */
    deleteRecord(id, callback) {
        return this.callDelete(callback, id);
    },

    /**
     * Get list of sound files for DataTable
     * Uses v3 RESTful API: GET /sound-files with query parameters
     * @param {object} params - Query parameters (category, search, limit, offset, etc.)
     * @param {function} callback - Callback function to handle response
     */
    getList(params, callback) {
        return this.callGet(params || {}, callback);
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
        return this.callCustomMethod('getForSelect', { category: category }, (response) => {
            if (response.result) {
                callback(response);
            } else {
                callback({result: false, data: []});
            }
        });
    },

    /**
     * Convert audio file to MP3 format
     * Uses v3 RESTful API: POST /sound-files:convertAudioFile
     * @param {object} params - Conversion parameters
     * @param {string} params.temp_filename - Path to temporary uploaded file
     * @param {string} params.category - File category (custom/moh)
     * @param {function} callback - Callback function to handle response
     */
    convertAudioFile(params, callback) {
        return this.callCustomMethod('convertAudioFile', params, callback, 'POST');
    }
});