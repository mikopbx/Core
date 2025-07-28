/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, Config */

/**
 * SoundFilesAPI - REST API for sound file management
 * 
 * Uses unified approach with centralized endpoint definitions.
 * This provides:
 * - Single point of API URL management
 * - Easy API version switching (v2 -> v3)
 * - Consistent endpoint usage throughout code
 * - Simplified debugging and support
 */
const SoundFilesAPI = {
    /**
     * API endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v2/sound-files/`,
    
    // Endpoint definitions for unification
    endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v2/sound-files/getList`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v2/sound-files/getRecord`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/sound-files/saveRecord`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v2/sound-files/deleteRecord`,
        uploadFile: `${Config.pbxUrl}/pbxcore/api/v2/sound-files/uploadFile`,
        getForSelect: `${Config.pbxUrl}/pbxcore/api/v2/sound-files/getForSelect`
    },
    
    /**
     * Get record by ID
     * @param {string} id - Record ID or empty string for new
     * @param {function} callback - Callback function
     */
    getRecord(id, callback) {
        const recordId = (!id || id === '') ? 'new' : id;
        
        $.api({
            url: `${this.endpoints.getRecord}/${recordId}`,
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
     * Get list of all records
     * @param {object} params - Query parameters (e.g., category filter)
     * @param {function} callback - Callback function
     */
    getList(params, callback) {
        const url = params && Object.keys(params).length > 0 
            ? `${this.endpoints.getList}?${$.param(params)}`
            : this.endpoints.getList;
            
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
                callback({result: false, data: []});
            }
        });
    },
    
    /**
     * Save record
     * @param {object} data - Data to save
     * @param {function} callback - Callback function
     */
    saveRecord(data, callback) {
        const method = data.id ? 'PUT' : 'POST';
        const url = data.id ? 
            `${this.endpoints.saveRecord}/${data.id}` : 
            this.endpoints.saveRecord;
        
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
     * Delete record
     * @param {string} id - Record ID
     * @param {function} callback - Callback function
     */
    deleteRecord(id, callback) {
        $.api({
            url: `${this.endpoints.deleteRecord}/${id}`,
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
     * Upload file endpoint for Resumable.js
     * @returns {string}
     */
    getUploadUrl() {
        return this.endpoints.uploadFile;
    },
    
    /**
     * Get sound files for dropdown select
     * @param {string} category - Category filter (custom/moh)
     * @param {function} callback - Callback function
     */
    getForSelect(category, callback) {
        $.api({
            url: this.endpoints.getForSelect,
            method: 'GET',
            data: { category: category },
            on: 'now',
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