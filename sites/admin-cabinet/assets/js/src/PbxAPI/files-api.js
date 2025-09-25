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

/* global PbxApiClient, PbxApi, Resumable, Config, globalRootUrl */ 

/**
 * FilesAPI - REST API v3 client for file management operations
 *
 * Provides both standard REST operations for file CRUD and custom methods
 * for specialized operations like chunked upload and firmware download.
 *
 * @class FilesAPI
 */
const FilesAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/files',
    customMethods: {
        upload: ':upload',
        uploadStatus: ':uploadStatus',
        downloadFirmware: ':downloadFirmware',
        firmwareStatus: ':firmwareStatus'
    }
});

// Add methods to FilesAPI using PbxApi utility
PbxApi.extendApiClient(FilesAPI, {

    /**
     * Get file content by path
     * @param {string} filePath - File path (will be URL encoded)
     * @param {function} callback - Callback function
     * @param {boolean} [needOriginal=false] - Whether to return original content
     * @returns {Object} jQuery API call object
     */
    getFileContent(filePath, callback, needOriginal = false) {
        try {
            // Validate parameters
            const validation = PbxApi.validateApiParams({ filePath, callback }, {
                required: ['filePath', 'callback'],
                types: { filePath: 'string', callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('FilesAPI.getFileContent', validation.errors.join(', '), callback);
            }

            const encodedPath = encodeURIComponent(filePath);
            const params = needOriginal ? { needOriginal: 'true' } : {};

            return this.callGet(params, callback, encodedPath);
        } catch (error) {
            return PbxApi.handleApiError('FilesAPI.getFileContent', error, callback);
        }
    },

    /**
     * Upload file content using PUT method (simple upload)
     * @param {string} filePath - Destination file path
     * @param {string|Blob} content - File content
     * @param {function} callback - Callback function
     * @param {string} [contentType='application/octet-stream'] - Content type
     * @returns {Object} jQuery API call object
     */
    uploadFileContent(filePath, content, callback, contentType = 'application/octet-stream') {
        try {
            // Validate parameters
            const validation = PbxApi.validateApiParams({ filePath, content, callback }, {
                required: ['filePath', 'content', 'callback'],
                types: { filePath: 'string', callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('FilesAPI.uploadFileContent', validation.errors.join(', '), callback);
            }

            const encodedPath = encodeURIComponent(filePath);

            // Use custom PUT call with content type header
            return $.api({
                url: `${this.apiUrl}/${encodedPath}`,
                on: 'now',
                method: 'PUT',
                data: content,
                beforeXHR(xhr) {
                    xhr.setRequestHeader('Content-Type', contentType);
                    return xhr;
                },
                successTest: PbxApi.successTest,
                onSuccess(response) {
                    callback(response);
                },
                onFailure(response) {
                    callback(response);
                },
                onError(error) {
                    PbxApi.handleApiError('FilesAPI.uploadFileContent', error, callback);
                }
            });
        } catch (error) {
            return PbxApi.handleApiError('FilesAPI.uploadFileContent', error, callback);
        }
    },

    /**
     * Delete file by path
     * @param {string} filePath - File path to delete
     * @param {function} callback - Callback function
     * @returns {Object} jQuery API call object
     */
    deleteFile(filePath, callback) {
        try {
            // Validate parameters
            const validation = PbxApi.validateApiParams({ filePath, callback }, {
                required: ['filePath', 'callback'],
                types: { filePath: 'string', callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('FilesAPI.deleteFile', validation.errors.join(', '), callback);
            }

            const encodedPath = encodeURIComponent(filePath);
            return this.callDelete(callback, encodedPath);
        } catch (error) {
            return PbxApi.handleApiError('FilesAPI.deleteFile', error, callback);
        }
    },

    /**
     * Chunked file upload (Resumable.js support)
     * @param {FormData} formData - Form data with file chunks
     * @param {function} callback - Callback function
     * @returns {Object} API call result
     */
    uploadChunked(formData, callback) {
        try {
            const validation = PbxApi.validateApiParams({ formData, callback }, {
                required: ['formData', 'callback'],
                types: { callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('FilesAPI.uploadChunked', validation.errors.join(', '), callback);
            }

            return this.callCustomMethod('upload', formData, callback, 'POST');
        } catch (error) {
            return PbxApi.handleApiError('FilesAPI.uploadChunked', error, callback);
        }
    },

    /**
     * Get upload status
     * @param {string} uploadId - Upload identifier
     * @param {function} callback - Callback function
     * @returns {Object} API call result
     */
    getUploadStatus(uploadId, callback) {
        try {
            const validation = PbxApi.validateApiParams({ uploadId, callback }, {
                required: ['uploadId', 'callback'],
                types: { uploadId: 'string', callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('FilesAPI.getUploadStatus', validation.errors.join(', '), callback);
            }

            const params = { id: uploadId };
            return this.callCustomMethod('uploadStatus', params, callback, 'GET');
        } catch (error) {
            return PbxApi.handleApiError('FilesAPI.getUploadStatus', error, callback);
        }
    },

    /**
     * Download firmware from external URL
     * @param {Object} params - Download parameters
     * @param {string} params.url - Firmware URL
     * @param {string} [params.md5] - Expected MD5 hash
     * @param {function} callback - Callback function
     * @returns {Object} API call result
     */
    downloadFirmware(params, callback) {
        try {
            const validation = PbxApi.validateApiParams({ params, callback }, {
                required: ['params', 'callback'],
                types: { params: 'object', callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('FilesAPI.downloadFirmware', validation.errors.join(', '), callback);
            }

            return this.callCustomMethod('downloadFirmware', params, callback, 'POST');
        } catch (error) {
            return PbxApi.handleApiError('FilesAPI.downloadFirmware', error, callback);
        }
    },

    /**
     * Get firmware download status
     * @param {string} filename - Firmware filename
     * @param {function} callback - Callback function
     * @returns {Object} API call result
     */
    getFirmwareStatus(filename, callback) {
        try {
            const validation = PbxApi.validateApiParams({ filename, callback }, {
                required: ['filename', 'callback'],
                types: { filename: 'string', callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('FilesAPI.getFirmwareStatus', validation.errors.join(', '), callback);
            }

            const params = { filename: filename };
            return this.callCustomMethod('firmwareStatus', params, callback, 'GET');
        } catch (error) {
            return PbxApi.handleApiError('FilesAPI.getFirmwareStatus', error, callback);
        }
    }
});

/**
 * Legacy compatibility methods - these map to the new REST API methods
 * These maintain backward compatibility while using the new standardized methods
 */

/**
 * Legacy: Remove audio file (maps to deleteFile)
 * @param {string} filename - Audio file path
 * @param {function} callback - Callback function
 */
FilesAPI.removeAudioFile = function(filename, callback) {
    return this.deleteFile(filename, callback);
};

/**
 * Legacy: Upload file with params (maps to uploadChunked)
 * @param {object} params - Upload parameters
 * @param {function} callback - Callback function
 */
FilesAPI.uploadFileFromParams = function(params, callback) {
    // Convert object to FormData for chunked upload
    const formData = new FormData();
    Object.keys(params).forEach(key => {
        if (key === 'files' && Array.isArray(params[key])) {
            // Handle file arrays from legacy API
            params[key].forEach((file, index) => {
                if (file.file_path && file.file_name) {
                    // This would need to be handled differently in real scenario
                    // as we can't recreate File objects from paths
                    formData.append(`file_${index}`, file.file_name);
                }
            });
        } else {
            formData.append(key, params[key]);
        }
    });

    return this.uploadChunked(formData, callback);
};

/**
 * Legacy: Get upload status (maps to getUploadStatus)
 * @param {string} uploadId - Upload identifier
 * @param {function} callback - Callback function
 */
FilesAPI.statusUploadFile = function(uploadId, callback) {
    return this.getUploadStatus(uploadId, callback);
};

/**
 * Configure Resumable.js to use the new v3 API
 * @param {object} resumableConfig - Resumable.js configuration
 * @returns {object} Updated configuration
 */
FilesAPI.configureResumable = function(resumableConfig = {}) {
    return Object.assign({
        target: `${Config.pbxUrl}/pbxcore/api/v3/files:upload`,
        testChunks: false,
        chunkSize: 3 * 1024 * 1024, // 3MB chunks
        simultaneousUploads: 1,
        maxFiles: 1,
        fileType: ['*'],
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    }, resumableConfig);
};

/**
 * Upload file using Resumable.js
 * @param {File} file - File object to upload
 * @param {function} callback - Callback function
 */
FilesAPI.uploadFile = function(file, callback) {
    console.log('🔵 FilesAPI.uploadFile started', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
    });

    const r = new Resumable({
        target: `${Config.pbxUrl}/pbxcore/api/v3/files:upload`,
        testChunks: false,
        chunkSize: 3 * 1024 * 1024,
        simultaneousUploads: 1,
        maxFiles: 1,
    });

    console.log('🔧 Resumable.js configured', {
        target: `${Config.pbxUrl}/pbxcore/api/v3/files:upload`,
        chunkSize: 3 * 1024 * 1024
    });

    // Set up event handlers first
    r.on('fileSuccess', (file, response) => {
        console.log('✅ File upload success', {
            fileName: file.fileName || file.name,
            response: response
        });
        callback('fileSuccess', {file, response});
    });
    r.on('fileProgress', (file) => {
        const progress = Math.round(file.progress() * 100);
        console.log('📈 File upload progress', {
            fileName: file.fileName || file.name,
            progress: progress + '%'
        });
        callback('fileProgress', {file});
    });
    r.on('fileAdded', (file, event) => {
        console.log('📁 File added to upload queue', {
            fileName: file.fileName || file.name,
            uniqueIdentifier: file.uniqueIdentifier,
            size: file.size
        });
        callback('fileAdded', {file, event});
        // Upload will start automatically after fileAdded
    });
    r.on('fileRetry', (file) => {
        console.log('🔄 File upload retry', {
            fileName: file.fileName || file.name
        });
        callback('fileRetry', {file});
    });
    r.on('fileError', (file, message) => {
        console.error('❌ File upload error', {
            fileName: file.fileName || file.name,
            message: message
        });
        callback('fileError', {file, message});
    });
    r.on('uploadStart', () => {
        console.log('🚀 Upload process started');
        callback('uploadStart');
    });
    r.on('complete', () => {
        console.log('🏁 All uploads completed');
        callback('complete');
    });
    r.on('progress', () => {
        const percent = 100 * r.progress();
        console.log('📊 Overall upload progress', {
            percent: Math.round(percent) + '%'
        });
        callback('progress', {percent});
    });
    r.on('error', (message, file) => {
        console.error('💥 Upload error', {
            message: message,
            file: file
        });
        callback('error', {message, file});
    });
    r.on('pause', () => {
        console.log('⏸️ Upload paused');
        callback('pause');
    });
    r.on('cancel', () => {
        console.log('⏹️ Upload cancelled');
        callback('cancel');
    });

    // Add file and upload - this will trigger fileAdded then uploadStart
    console.log('➕ Adding file to Resumable.js');
    r.addFile(file);
    console.log('▶️ Starting upload');
    r.upload();
};

/**
 * Get status of uploaded file
 * @param {string} fileId - File ID
 * @param {function} callback - Callback function
 */
FilesAPI.getStatusUploadFile = function(fileId, callback) {
    $.api({
        url: `${Config.pbxUrl}/pbxcore/api/v3/files:uploadStatus`,
        on: 'now',
        method: 'POST',
        data: {id: fileId},
        successTest: PbxApi.successTest,
        onSuccess(response) {
            callback(response.data);
        },
        onFailure() {
            callback(false);
        },
        onError() {
            callback(false);
        },
    });
};

/**
 * Remove audio file
 * @param {string} filePath - File path
 * @param {string|null} fileId - File ID (optional)
 * @param {function|null} callback - Callback function (optional)
 */
FilesAPI.removeAudioFile = function(filePath, fileId = null, callback = null) {
    $.api({
        url: `${Config.pbxUrl}/pbxcore/api/v3/files`,
        on: 'now',
        method: 'POST',
        data: {filename: filePath},
        successTest: PbxApi.successTest,
        onSuccess() {
            if (callback !== null) {
                callback(fileId);
            }
        },
    });
};

/**
 * Download new firmware
 * @param {object} params - Download parameters
 * @param {function} callback - Callback function
 */
FilesAPI.downloadNewFirmware = function(params, callback) {
    $.api({
        url: `${Config.pbxUrl}/pbxcore/api/v3/files:downloadFirmware`,
        on: 'now',
        method: 'POST',
        data: {
            md5: params.md5,
            size: params.size,
            version: params.version,
            url: params.updateLink
        },
        successTest: PbxApi.successTest,
        onSuccess(response) {
            callback(response.data);
        },
        onFailure(response) {
            callback(response);
        },
        onError(response) {
            callback(response);
        },
    });
};

/**
 * Get firmware download status
 * @param {string} filename - Firmware filename
 * @param {function} callback - Callback function
 */
FilesAPI.firmwareDownloadStatus = function(filename, callback) {
    $.api({
        url: `${Config.pbxUrl}/pbxcore/api/v3/files:firmwareStatus`,
        on: 'now',
        method: 'POST',
        data: {filename},
        successTest: PbxApi.successTest,
        onSuccess(response) {
            callback(response.data);
        },
        onFailure() {
            callback(false);
        },
        onError() {
            callback(false);
        },
    });
};

/**
 * Attach to button
 * @param {string} buttonId - Button ID
 * @param {string[]} fileTypes - Array of allowed file types
 * @param {function} callback - Callback function
 */
FilesAPI.attachToBtn = function(buttonId, fileTypes, callback) {
    console.log('🔗 FilesAPI.attachToBtn initialized', {
        buttonId: buttonId,
        fileTypes: fileTypes,
        callbackType: typeof callback
    });

    const buttonElement = document.getElementById(buttonId);
    if (!buttonElement) {
        console.error('❌ Button element not found', { buttonId: buttonId });
        return;
    }

    console.log('✅ Button element found', {
        buttonId: buttonId,
        tagName: buttonElement.tagName,
        className: buttonElement.className
    });

    const uploadUrl = `${Config.pbxUrl}/pbxcore/api/v3/files:upload`;

    const resumableConfig = {
        target: uploadUrl,
        testChunks: false,
        chunkSize: 3 * 1024 * 1024,
        maxFiles: 1,
        simultaneousUploads: 1,
        fileType: fileTypes,
    };

    console.log('🔧 Resumable.js configuration', {
        config: resumableConfig,
        uploadUrl: uploadUrl,
        configPbxUrl: Config?.pbxUrl,
        fullTarget: resumableConfig.target
    });

    const r = new Resumable(resumableConfig);

    console.log('✅ Resumable.js instance created', {
        target: r.opts.target,
        isValidTarget: !!r.opts.target,
        support: r.support
    });

    try {
        r.assignBrowse(buttonElement);
        console.log('✅ File browser assigned to button successfully');
    } catch (error) {
        console.error('❌ Failed to assign browser to button', {
            buttonId: buttonId,
            error: error.message
        });
        return;
    }

    r.on('fileSuccess', (file, response) => {
        console.log('✅ [attachToBtn] File upload success', {
            fileName: file.fileName || file.name,
            response: response,
            responseType: typeof response,
            responseLength: response ? response.length : 0
        });

        // Try to parse and log the response structure
        try {
            const parsedResponse = JSON.parse(response);
            console.log('📊 [attachToBtn] Parsed response structure', {
                result: parsedResponse.result,
                hasData: !!parsedResponse.data,
                dataKeys: parsedResponse.data ? Object.keys(parsedResponse.data) : [],
                messages: parsedResponse.messages,
                fullResponse: parsedResponse
            });
        } catch (e) {
            console.log('📊 [attachToBtn] Response is not JSON', {
                rawResponse: response,
                parseError: e.message
            });
        }

        callback('fileSuccess', {file, response});
    });
    r.on('fileProgress', (file) => {
        const progress = Math.round(file.progress() * 100);
        console.log('📈 [attachToBtn] File upload progress', {
            fileName: file.fileName || file.name,
            progress: progress + '%'
        });
        callback('fileProgress', {file});
    });
    r.on('fileAdded', (file, event) => {
        console.log('📁 [attachToBtn] File added to upload queue', {
            fileName: file.fileName || file.name,
            uniqueIdentifier: file.uniqueIdentifier,
            size: file.size,
            buttonId: buttonId
        });
        console.log('▶️ [attachToBtn] Starting upload automatically');
        r.upload();
        callback('fileAdded', {file, event});
    });
    r.on('fileRetry', (file) => {
        console.log('🔄 [attachToBtn] File upload retry', {
            fileName: file.fileName || file.name
        });
        callback('fileRetry', {file});
    });
    r.on('fileError', (file, message) => {
        console.error('❌ [attachToBtn] File upload error', {
            fileName: file.fileName || file.name,
            message: message,
            messageType: typeof message,
            buttonId: buttonId,
            fileUniqueId: file.uniqueIdentifier,
            fileSize: file.size
        });

        // Try to get more detailed error information
        if (message && typeof message === 'string') {
            try {
                const errorObj = JSON.parse(message);
                console.error('📊 [attachToBtn] Detailed error info', errorObj);
            } catch (e) {
                console.error('📊 [attachToBtn] Error message (raw):', message);
            }
        }

        callback('fileError', {file, message});
    });
    r.on('uploadStart', () => {
        console.log('🚀 [attachToBtn] Upload process started');
        callback('uploadStart');
    });
    r.on('complete', () => {
        console.log('🏁 [attachToBtn] All uploads completed');
        callback('complete');
    });
    r.on('progress', () => {
        const percent = 100 * r.progress();
        console.log('📊 [attachToBtn] Overall upload progress', {
            percent: Math.round(percent) + '%'
        });
        callback('progress', {percent});
    });
    r.on('error', (message, file) => {
        console.error('💥 [attachToBtn] Upload error', {
            message: message,
            file: file,
            buttonId: buttonId
        });
        callback('error', {message, file});
    });
    r.on('pause', () => {
        console.log('⏸️ [attachToBtn] Upload paused');
        callback('pause');
    });
    r.on('cancel', () => {
        console.log('⏹️ [attachToBtn] Upload cancelled');
        callback('cancel');
    });

    console.log('🎯 [attachToBtn] All event handlers registered successfully');
};

// Export for use in other modules
window.FilesAPI = FilesAPI;