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

/* global globalRootUrl, PbxApiClient, $ */ 

/**
 * CustomFilesAPI - RESTful API client for custom files management
 *
 * This module provides methods to interact with the custom files API v3
 * using the centralized PbxApiClient for all HTTP operations.
 *
 * @module customFilesAPI
 */
const customFilesAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/custom-files',
    customMethods: {
        getDefault: ':getDefault'
    }
});

// Use customFilesAPI.getRecord('new', callback) for default values

/**
 * Save custom file (intelligent create or update)
 * This is a convenience method that determines whether to create or update
 * based on the presence of an ID.
 *
 * @param {Object} data - Custom file data
 * @param {string} [data.id] - File ID (if present, updates; if not, creates)
 * @param {string} data.filepath - File path
 * @param {string} data.content - File content (will be base64 encoded if not already)
 * @param {string} data.mode - File mode
 * @param {string} data.description - File description
 * @param {Function} callback - Callback function to handle the response
 *
 * @example
 * // New file (no ID)
 * customFilesAPI.save({
 *     filepath: '/etc/new.conf',
 *     content: 'data',
 *     mode: 'none'
 * }, callback);
 *
 * // Existing file (with ID)
 * customFilesAPI.save({
 *     id: '123',
 *     filepath: '/etc/existing.conf',
 *     content: 'updated data',
 *     mode: 'override'
 * }, callback);
 */
/**
 * Encode UTF-8 string to base64
 * Handles Unicode characters (Russian, Chinese, etc.)
 *
 * @param {string} str - UTF-8 string to encode
 * @returns {string} Base64 encoded string
 */
customFilesAPI.utf8ToBase64 = function(str) {
    // Use TextEncoder for modern browsers (better than deprecated escape/unescape)
    if (typeof TextEncoder !== 'undefined') {
        const utf8Bytes = new TextEncoder().encode(str);
        let binaryString = '';
        utf8Bytes.forEach(byte => {
            binaryString += String.fromCharCode(byte);
        });
        return btoa(binaryString);
    } else {
        // Fallback for older browsers
        return btoa(unescape(encodeURIComponent(str)));
    }
};

customFilesAPI.save = function(data, callback) {
    // Prepare data for API
    const apiData = { ...data };

    // Handle content encoding
    // Content from cbBeforeSendForm is always plain text from Ace editor,
    // so we always need to encode it to base64 with UTF-8 support
    if (apiData.content && apiData.content !== '') {
        // Encode to base64 with UTF-8 support (handles Russian, Chinese, etc.)
        apiData.content = customFilesAPI.utf8ToBase64(apiData.content);
    }

    if (apiData.id && apiData.id !== '') {
        // Update existing file using PATCH for partial update
        // IMPORTANT: Keep id in data for PATCH request (server expects it in request body)
        delete apiData.isNew;

        this.callPatch(apiData, callback);
    } else {
        // Create new file
        delete apiData.id;
        delete apiData.isNew;

        this.callPost(apiData, callback);
    }
};

/**
 * Get a single custom file record by ID
 *
 * @param {string} id - The ID of the custom file to retrieve
 * @param {Function} callback - Callback function to handle the response
 *
 * @example
 * customFilesAPI.getRecord('123', (response) => {
 *     if (response.result) {
 *         console.log('File data:', response.data);
 *     }
 * });
 */
customFilesAPI.getRecord = function(id, callback) {
    return this.callGet({}, callback, id);
};

/**
 * Get all records with optional filtering
 * This method is needed for PbxDataTableIndex compatibility
 */
customFilesAPI.getRecords = function(callback) {
    return this.callGet({}, callback);
};

/**
 * Delete a custom file record
 *
 * @param {string} id - The ID of the custom file to delete
 * @param {Function} callback - Callback function to handle the response
 */
customFilesAPI.deleteRecord = function(id, callback) {
    return this.callDelete(callback, id);
};