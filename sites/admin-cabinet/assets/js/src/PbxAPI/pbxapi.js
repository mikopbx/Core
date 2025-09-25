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
/* global sessionStorage, globalRootUrl, Config, Resumable */

/**
 * The PbxApi object is responsible for conversation with backend core API
 *
 * @module PbxApi 
 */
const PbxApi = {

    /**
     * Tries to parse a JSON string.
     *
     * @param {string} jsonString - The JSON string to be parsed.
     * @returns {boolean|any} - Returns the parsed JSON object if parsing is successful and the result is an object.
     *                          Otherwise, returns `false`.
     */
    tryParseJSON(jsonString) {
        try {
            const o = JSON.parse(jsonString);

            // Handle non-exception-throwing cases:
            // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
            // but... JSON.parse(null) returns null, and typeof null === "object",
            // so we must check for that, too. Thankfully, null is falsey, so this suffices:
            if (o && typeof o === 'object') {
                return o;
            }
            return false;
        } catch (e) {
            return false;
        }
    },

    /**
     * Checks the success response from the backend.
     *
     * @param {Object} response - The response object to be checked for success.
     * @returns {boolean} - Returns `true` if the response is defined, has non-empty keys, and the 'result' property is `true`.
     */
    successTest(response) {
        return response !== undefined
            && Object.keys(response).length > 0
            && response.result !== undefined
            && response.result === true;
    },
        /**
     * Connects the file upload handler for uploading files in parts.
     *
     * @param {string} buttonId - The ID of the button to assign the file upload functionality.
     * @param {string[]} fileTypes - An array of allowed file types.
     * @param {function} callback - The callback function to be called during different upload events.
     *                             It will receive event information such as progress, success, error, etc.
     * @returns {void}
     * 
     * @depricated Use FilesAPI.attachToBtn() instead
     */
    SystemUploadFileAttachToBtn(buttonId, fileTypes, callback) {
        FilesAPI.attachToBtn(buttonId, fileTypes, callback);
    },

    /**
     * Enables uploading a file using chunk resumable worker.
     *
     * @param {File} file - The file to be uploaded.
     * @param {function} callback - The callback function to be called during different upload events.
     *                             It will receive event information such as progress, success, error, etc.
     * @returns {void}
     * 
     * @depricated Use FilesAPI.uploadFile() instead
     */
    FilesUploadFile(file, callback) {
        FilesAPI.uploadFile(file, callback);
    },

        /**
     * Gets the uploading status of a file.
     *
     * @param {string} fileId - The ID of the file for which the status is requested.
     * @param {function} callback - The callback function to be called with the response data or `false` in case of failure.
     * @returns {void}
     * 
     * @depricated Use FilesAPI.getStatusUploadFile() instead
     */
    FilesGetStatusUploadFile(fileId, callback) {
        FilesAPI.getStatusUploadFile(fileId, callback);
    },

    /**
     * Handles API errors with consistent format and context information
     *
     * @param {string} context - The context where the error occurred (e.g., 'ExtensionsAPI.getRecord')
     * @param {Error|string|Object} error - The error object, string, or response
     * @param {function} [callback] - Optional callback to call with formatted error
     * @returns {Object} Standardized error response object
     */
    handleApiError(context, error, callback) {
        let errorMessage = 'Unknown error occurred';
        let errorDetails = {};

        // Extract error message from different error types
        if (typeof error === 'string') {
            errorMessage = error;
        } else if (error && error.message) {
            errorMessage = error.message;
        } else if (error && error.messages && error.messages.error) {
            errorMessage = Array.isArray(error.messages.error)
                ? error.messages.error.join(', ')
                : error.messages.error;
            errorDetails = error.messages;
        } else if (error && error.result === false) {
            errorMessage = 'API request failed';
            errorDetails = error;
        }

        const response = {
            result: false,
            messages: {
                error: [`${context}: ${errorMessage}`]
            },
            context: context,
            originalError: errorDetails,
            timestamp: new Date().toISOString()
        };

        // Call callback if provided
        if (typeof callback === 'function') {
            callback(response);
        }

        // Log error for debugging in development
        if (typeof console !== 'undefined' && console.error) {
            console.error(`[PbxAPI] ${context}:`, error);
        }

        return response;
    },

    /**
     * Normalizes callback parameters for overloaded functions
     * Handles common patterns like (callback) and (data, callback)
     *
     * @param {function|Object} arg1 - First argument (callback or data)
     * @param {function} [arg2] - Second argument (callback when first is data)
     * @returns {Object} Object with normalized data and callback
     */
    normalizeCallbackParams(arg1, arg2) {
        let data = {};
        let callback;

        if (typeof arg1 === 'function') {
            // Pattern: (callback)
            callback = arg1;
        } else if (typeof arg1 === 'object' && arg1 !== null) {
            // Pattern: (data, callback)
            data = arg1;
            callback = arg2;
        } else {
            // Pattern: (data, callback) where data is not object
            data = arg1 || {};
            callback = arg2;
        }

        return { data, callback };
    },

    /**
     * Standard implementation for getRecord methods across API modules
     * Handles the common pattern of GET by ID or getDefault for new records
     *
     * @param {Object} apiInstance - The API client instance
     * @param {string} recordId - Record ID or empty/null for new record
     * @param {function} callback - Callback function
     * @param {boolean} [useDefault=true] - Whether to use :getDefault for new records
     * @param {string} [defaultMethod='getDefault'] - Name of the default method to use
     * @returns {void}
     */
    standardGetRecord(apiInstance, recordId, callback, useDefault = true, defaultMethod = 'getDefault') {
        const isNew = !recordId || recordId === '' || recordId === 'new';

        try {
            if (isNew && useDefault && apiInstance.customMethods && apiInstance.customMethods[defaultMethod]) {
                // Use custom method for new records
                apiInstance.callCustomMethod(defaultMethod, {}, (response) => {
                    // Set _isNew flag for new records
                    if (response && response.result && response.data) {
                        response.data._isNew = true;
                    }
                    callback(response);
                });
            } else if (!isNew) {
                // Get existing record by ID
                apiInstance.callGet({}, callback, recordId);
            } else {
                // Fallback: return empty structure for new record
                callback({
                    result: true,
                    data: { _isNew: true }
                });
            }
        } catch (error) {
            this.handleApiError(`${apiInstance.constructor.name || 'API'}.getRecord`, error, callback);
        }
    },

    /**
     * Validates API parameters against a simple schema
     *
     * @param {Object} params - Parameters to validate
     * @param {Object} schema - Validation schema
     * @param {string} schema.required - Array of required parameter names
     * @param {string} schema.optional - Array of optional parameter names
     * @param {Object} schema.types - Object mapping parameter names to expected types
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    validateApiParams(params, schema) {
        const result = {
            isValid: true,
            errors: []
        };

        // Check required parameters
        if (schema.required) {
            for (const param of schema.required) {
                if (params[param] === undefined || params[param] === null) {
                    result.isValid = false;
                    result.errors.push(`Required parameter '${param}' is missing`);
                }
            }
        }

        // Check parameter types
        if (schema.types) {
            for (const [param, expectedType] of Object.entries(schema.types)) {
                if (params[param] !== undefined) {
                    const actualType = typeof params[param];
                    if (actualType !== expectedType) {
                        result.isValid = false;
                        result.errors.push(`Parameter '${param}' should be ${expectedType}, got ${actualType}`);
                    }
                }
            }
        }

        return result;
    },

    /**
     * Extends an API client instance with additional methods using a consistent pattern
     *
     * @param {Object} apiInstance - The PbxApiClient instance to extend
     * @param {Object} methods - Object containing methods to add to the API
     * @param {Object} [options={}] - Extension options
     * @param {boolean} [options.preserveContext=true] - Whether to preserve 'this' context
     * @returns {Object} The extended API instance
     */
    extendApiClient(apiInstance, methods, options = {}) {
        const opts = {
            preserveContext: true,
            ...options
        };

        // Validate input
        if (!apiInstance || typeof apiInstance !== 'object') {
            throw new Error('API instance must be an object');
        }

        if (!methods || typeof methods !== 'object') {
            throw new Error('Methods must be an object');
        }

        // Add methods to the API instance
        for (const [methodName, methodFunc] of Object.entries(methods)) {
            if (typeof methodFunc === 'function') {
                if (opts.preserveContext) {
                    // Bind the function to the API instance to preserve 'this' context
                    apiInstance[methodName] = methodFunc.bind(apiInstance);
                } else {
                    apiInstance[methodName] = methodFunc;
                }
            } else {
                console.warn(`[PbxAPI] Skipping non-function property '${methodName}' during API extension`);
            }
        }

        return apiInstance;
    },

    /**
     * Creates a debounced version of a function
     * Useful for API calls that should be delayed until after a period of inactivity
     *
     * @param {function} func - Function to debounce
     * @param {number} wait - Time to wait in milliseconds
     * @param {boolean} [immediate=false] - Whether to call function immediately on first call
     * @returns {function} Debounced function
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    },

    /**
     * Formats dropdown results with consistent structure
     * Used by multiple API modules for dropdown data formatting
     *
     * @param {Object} response - API response containing data array
     * @param {Object} [options={}] - Formatting options
     * @param {boolean} [options.addEmpty=false] - Whether to add empty option
     * @param {string} [options.emptyText='-'] - Text for empty option
     * @param {number} [options.emptyValue=-1] - Value for empty option
     * @param {Array} [options.excludeValues=[]] - Values to exclude from results
     * @returns {Object} Formatted dropdown response
     */
    formatDropdownResults(response, options = {}) {
        const opts = {
            addEmpty: false,
            emptyText: '-',
            emptyValue: -1,
            excludeValues: [],
            ...options
        };

        const formattedResponse = {
            success: false,
            results: []
        };

        // Add empty option if requested
        if (opts.addEmpty) {
            formattedResponse.results.push({
                name: opts.emptyText,
                value: opts.emptyValue,
                type: '',
                typeLocalized: ''
            });
        }

        if (response && response.result === true && response.data) {
            formattedResponse.success = true;

            // Process each item in the response data
            response.data.forEach((item) => {
                // Skip excluded values
                if (opts.excludeValues.includes(item.value)) {
                    return;
                }

                formattedResponse.results.push({
                    name: item.name || item.text || item.label || '',
                    value: item.value || item.id || '',
                    type: item.type || '',
                    typeLocalized: item.typeLocalized || item.type || ''
                });
            });
        }

        return formattedResponse;
    }
}