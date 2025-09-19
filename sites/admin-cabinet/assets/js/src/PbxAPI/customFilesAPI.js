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

/**
 * Get default values for a new custom file
 *
 * @param {Function} callback - Callback function to handle the response
 *
 * @example
 * customFilesAPI.getDefault((response) => {
 *     if (response.result) {
 *         // Use default values to initialize new file form
 *         initializeForm(response.data);
 *     }
 * });
 */
customFilesAPI.getDefault = function(callback) {
    $.api({
        url: `${this.apiUrl}:getDefault`,
        method: 'GET',
        on: 'now',
        onSuccess: (response) => {
            callback(response);
        },
        onFailure: (response) => {
            callback(response);
        },
        onError: () => {
            callback({result: false, messages: {error: ['Network error']}});
        }
    });
};

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
customFilesAPI.save = function(data, callback) {
    // Prepare data for API
    const apiData = { ...data };

    // Handle content encoding - check if it's already base64
    if (apiData.content) {
        // Simple check if content is already base64 encoded
        // Base64 strings match the pattern: ^[A-Za-z0-9+/]*={0,2}$
        const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(apiData.content.replace(/\s/g, ''));
        if (!isBase64) {
            // Encode to base64 if not already encoded
            apiData.content = btoa(apiData.content);
        }
    }

    if (apiData.id && apiData.id !== '') {
        // Update existing file using PATCH for partial update
        const id = apiData.id;
        delete apiData.id;
        delete apiData.isNew;

        $.api({
            url: `${this.apiUrl}/${id}`,
            method: 'PATCH',
            data: apiData,
            on: 'now',
            onSuccess: (response) => {
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback({result: false, messages: {error: ['Network error']}});
            }
        });
    } else {
        // Create new file
        delete apiData.id;
        delete apiData.isNew;

        $.api({
            url: this.apiUrl,
            method: 'POST',
            data: apiData,
            on: 'now',
            onSuccess: (response) => {
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback({result: false, messages: {error: ['Network error']}});
            }
        });
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
    $.api({
        url: `${this.apiUrl}/${id}`,
        method: 'GET',
        on: 'now',
        onSuccess: (response) => {
            callback(response);
        },
        onFailure: (response) => {
            callback(response);
        },
        onError: () => {
            callback({result: false, messages: {error: ['Network error']}});
        }
    });
};

/**
 * Get all records with optional filtering
 * This method is needed for PbxDataTableIndex compatibility
 */
customFilesAPI.getRecords = function(callback) {
    $.api({
        url: this.apiUrl,
        method: 'GET',
        on: 'now',
        onSuccess: (response) => {
            callback(response);
        },
        onFailure: (response) => {
            callback(response);
        },
        onError: () => {
            callback({result: false, messages: {error: ['Network error']}});
        }
    });
};

/**
 * Delete a custom file record
 *
 * @param {string} id - The ID of the custom file to delete
 * @param {Function} callback - Callback function to handle the response
 */
customFilesAPI.deleteRecord = function(id, callback) {
    $.api({
        url: `${this.apiUrl}/${id}`,
        method: 'DELETE',
        on: 'now',
        onSuccess: (response) => {
            callback(response);
        },
        onFailure: (response) => {
            callback(response);
        },
        onError: () => {
            callback({result: false, messages: {error: ['Network error']}});
        }
    });
};