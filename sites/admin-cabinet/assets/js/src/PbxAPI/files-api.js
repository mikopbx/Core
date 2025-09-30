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
Object.assign(FilesAPI, {

    /**
     * Get file content by path
     * @param {string} filePath - File path (will be URL encoded)
     * @param {function} callback - Callback function
     * @param {boolean} [needOriginal=false] - Whether to return original content
     * @returns {Object} jQuery API call object
     */
    getFileContent(filePath, callback, needOriginal = false) {
        
            const encodedPath = encodeURIComponent(filePath);
            const params = needOriginal ? { needOriginal: 'true' } : {};

            return this.callGet(params, callback, encodedPath);
    
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
        const encodedPath = encodeURIComponent(filePath);

        // Use callPut method with the encoded path as ID
        return this.callPut(content, callback, encodedPath);
    },

    /**
     * Delete file by path
     * @param {string} filePath - File path to delete
     * @param {function} callback - Callback function
     * @returns {Object} jQuery API call object
     */
    deleteFile(filePath, callback) {
        
            
            const encodedPath = encodeURIComponent(filePath);
            return this.callDelete(callback, encodedPath);
      
    },

    /**
     * Chunked file upload (Resumable.js support)
     * @param {FormData} formData - Form data with file chunks
     * @param {function} callback - Callback function
     * @returns {Object} API call result
     */
    uploadChunked(formData, callback) {
      
            return this.callCustomMethod('upload', formData, callback, 'POST');
       
    },

    /**
     * Get upload status
     * @param {string} uploadId - Upload identifier
     * @param {function} callback - Callback function
     * @returns {Object} API call result
     */
    getUploadStatus(uploadId, callback) {
      

            const params = { id: uploadId };
            return this.callCustomMethod('uploadStatus', params, callback, 'GET');
       
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
       

            return this.callCustomMethod('downloadFirmware', params, callback, 'POST');
      
    },

    /**
     * Get firmware download status
     * @param {string} filename - Firmware filename
     * @param {function} callback - Callback function
     * @returns {Object} API call result
     */
    getFirmwareStatus(filename, callback) {
       

            const params = { filename: filename };
            return this.callCustomMethod('firmwareStatus', params, callback, 'GET');
        
    }
});

/**
 * Legacy compatibility methods - these map to the new REST API methods
 * These maintain backward compatibility while using the new standardized methods
 */

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
 * Setup common Resumable.js event handlers
 * @param {object} resumableInstance - Resumable.js instance
 * @param {function} callback - Callback function for events
 * @param {boolean} autoUpload - Whether to auto-upload on fileAdded event
 */
FilesAPI.setupResumableEvents = function(resumableInstance, callback, autoUpload = false) {
    resumableInstance.on('fileSuccess', (file, response) => {
        callback('fileSuccess', {file, response});
    });
    resumableInstance.on('fileProgress', (file) => {
        callback('fileProgress', {file});
    });
    resumableInstance.on('fileAdded', (file, event) => {
        if (autoUpload) {
            resumableInstance.upload();
        }
        callback('fileAdded', {file, event});
    });
    resumableInstance.on('fileRetry', (file) => {
        callback('fileRetry', {file});
    });
    resumableInstance.on('fileError', (file, message) => {
        callback('fileError', {file, message});
    });
    resumableInstance.on('uploadStart', () => {
        callback('uploadStart');
    });
    resumableInstance.on('complete', () => {
        callback('complete');
    });
    resumableInstance.on('progress', () => {
        const percent = 100 * resumableInstance.progress();
        callback('progress', {percent});
    });
    resumableInstance.on('error', (message, file) => {
        callback('error', {message, file});
    });
    resumableInstance.on('pause', () => {
        callback('pause');
    });
    resumableInstance.on('cancel', () => {
        callback('cancel');
    });
};

/**
 * Upload file using Resumable.js
 * @param {File} file - File object to upload
 * @param {function} callback - Callback function
 */
FilesAPI.uploadFile = function(file, callback) {
    const r = new Resumable(this.configureResumable());

    this.setupResumableEvents(r, callback);

    r.addFile(file);
    r.upload();
};

/**
 * Get status of uploaded file
 * @param {string} fileId - File ID
 * @param {function} callback - Callback function
 */
FilesAPI.getStatusUploadFile = function(fileId, callback) {
    return this.callCustomMethod('uploadStatus', { id: fileId }, (response) => {
        if (response && response.result === true && response.data) {
            callback(response.data);
        } else {
            callback(false);
        }
    }, 'POST');
};

/**
 * Remove audio file
 * @param {string} filePath - File path
 * @param {string|null} fileId - File ID (optional)
 * @param {function|null} callback - Callback function (optional)
 */
FilesAPI.removeAudioFile = function(filePath, fileId = null, callback = null) {
    return this.deleteFile(filePath, (response) => {
        if (callback !== null) {
            if (response && response.result === true) {
                callback(fileId);
            } else {
                callback(false);
            }
        }
    });
};

/**
 * Download new firmware
 * @param {object} params - Download parameters
 * @param {function} callback - Callback function
 */
FilesAPI.downloadNewFirmware = function(params, callback) {
    const requestData = {
        md5: params.md5,
        size: params.size,
        version: params.version,
        url: params.updateLink
    };

    return this.callCustomMethod('downloadFirmware', requestData, (response) => {
        if (response && response.result === true && response.data) {
            callback(response.data);
        } else {
            callback(response);
        }
    }, 'POST');
};

/**
 * Get firmware download status
 * @param {string} filename - Firmware filename
 * @param {function} callback - Callback function
 */
FilesAPI.firmwareDownloadStatus = function(filename, callback) {
    return this.callCustomMethod('firmwareStatus', { filename }, (response) => {
        if (response && response.result === true && response.data) {
            callback(response.data);
        } else {
            callback(false);
        }
    }, 'POST');
};

/**
 * Attach to button
 * @param {string} buttonId - Button ID
 * @param {string[]} fileTypes - Array of allowed file types
 * @param {function} callback - Callback function
 * @param {string|null} inputName - Optional name attribute for the file input (for test compatibility)
 */
FilesAPI.attachToBtn = function(buttonId, fileTypes, callback, inputName = null) {
    const buttonElement = document.getElementById(buttonId);
    if (!buttonElement) {
        return;
    }

    const resumableConfig = this.configureResumable({
        fileType: fileTypes,
        query: function(file) {
            const originalName = file.name || file.fileName;
            const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
            const extension = originalName.split('.').pop();
            const finalFilename = nameWithoutExt + '.' + extension;

            return {
                resumableFilename: finalFilename
            };
        }
    });

    const r = new Resumable(resumableConfig);

    try {
        r.assignBrowse(buttonElement);

        // Add name attribute to the dynamically created file input for test compatibility
        // Resumable.js creates the input inside the button element
        const fileInput = buttonElement.querySelector('input[type="file"]');
        if (fileInput && inputName) {
            fileInput.setAttribute('name', inputName);
        }
    } catch (error) {
        return;
    }

    this.setupResumableEvents(r, callback, true); // autoUpload = true for button attachments
};

// Export for use in other modules
window.FilesAPI = FilesAPI;