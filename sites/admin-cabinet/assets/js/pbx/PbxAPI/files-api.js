"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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
var FilesAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/files',
  customMethods: {
    upload: ':upload',
    uploadStatus: ':uploadStatus',
    downloadFirmware: ':downloadFirmware',
    firmwareStatus: ':firmwareStatus'
  }
}); // Add methods to FilesAPI using PbxApi utility

PbxApi.extendApiClient(FilesAPI, {
  /**
   * Get file content by path
   * @param {string} filePath - File path (will be URL encoded)
   * @param {function} callback - Callback function
   * @param {boolean} [needOriginal=false] - Whether to return original content
   * @returns {Object} jQuery API call object
   */
  getFileContent: function getFileContent(filePath, callback) {
    var needOriginal = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    try {
      // Validate parameters
      var validation = PbxApi.validateApiParams({
        filePath: filePath,
        callback: callback
      }, {
        required: ['filePath', 'callback'],
        types: {
          filePath: 'string',
          callback: 'function'
        }
      });

      if (!validation.isValid) {
        return PbxApi.handleApiError('FilesAPI.getFileContent', validation.errors.join(', '), callback);
      }

      var encodedPath = encodeURIComponent(filePath);
      var params = needOriginal ? {
        needOriginal: 'true'
      } : {};
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
  uploadFileContent: function uploadFileContent(filePath, content, callback) {
    var contentType = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'application/octet-stream';

    try {
      // Validate parameters
      var validation = PbxApi.validateApiParams({
        filePath: filePath,
        content: content,
        callback: callback
      }, {
        required: ['filePath', 'content', 'callback'],
        types: {
          filePath: 'string',
          callback: 'function'
        }
      });

      if (!validation.isValid) {
        return PbxApi.handleApiError('FilesAPI.uploadFileContent', validation.errors.join(', '), callback);
      }

      var encodedPath = encodeURIComponent(filePath); // Use custom PUT call with content type header

      return $.api({
        url: "".concat(this.apiUrl, "/").concat(encodedPath),
        on: 'now',
        method: 'PUT',
        data: content,
        beforeXHR: function beforeXHR(xhr) {
          xhr.setRequestHeader('Content-Type', contentType);
          return xhr;
        },
        successTest: PbxApi.successTest,
        onSuccess: function onSuccess(response) {
          callback(response);
        },
        onFailure: function onFailure(response) {
          callback(response);
        },
        onError: function onError(error) {
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
  deleteFile: function deleteFile(filePath, callback) {
    try {
      // Validate parameters
      var validation = PbxApi.validateApiParams({
        filePath: filePath,
        callback: callback
      }, {
        required: ['filePath', 'callback'],
        types: {
          filePath: 'string',
          callback: 'function'
        }
      });

      if (!validation.isValid) {
        return PbxApi.handleApiError('FilesAPI.deleteFile', validation.errors.join(', '), callback);
      }

      var encodedPath = encodeURIComponent(filePath);
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
  uploadChunked: function uploadChunked(formData, callback) {
    try {
      var validation = PbxApi.validateApiParams({
        formData: formData,
        callback: callback
      }, {
        required: ['formData', 'callback'],
        types: {
          callback: 'function'
        }
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
  getUploadStatus: function getUploadStatus(uploadId, callback) {
    try {
      var validation = PbxApi.validateApiParams({
        uploadId: uploadId,
        callback: callback
      }, {
        required: ['uploadId', 'callback'],
        types: {
          uploadId: 'string',
          callback: 'function'
        }
      });

      if (!validation.isValid) {
        return PbxApi.handleApiError('FilesAPI.getUploadStatus', validation.errors.join(', '), callback);
      }

      var params = {
        id: uploadId
      };
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
  downloadFirmware: function downloadFirmware(params, callback) {
    try {
      var validation = PbxApi.validateApiParams({
        params: params,
        callback: callback
      }, {
        required: ['params', 'callback'],
        types: {
          params: 'object',
          callback: 'function'
        }
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
  getFirmwareStatus: function getFirmwareStatus(filename, callback) {
    try {
      var validation = PbxApi.validateApiParams({
        filename: filename,
        callback: callback
      }, {
        required: ['filename', 'callback'],
        types: {
          filename: 'string',
          callback: 'function'
        }
      });

      if (!validation.isValid) {
        return PbxApi.handleApiError('FilesAPI.getFirmwareStatus', validation.errors.join(', '), callback);
      }

      var params = {
        filename: filename
      };
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

FilesAPI.removeAudioFile = function (filename, callback) {
  return this.deleteFile(filename, callback);
};
/**
 * Legacy: Upload file with params (maps to uploadChunked)
 * @param {object} params - Upload parameters
 * @param {function} callback - Callback function
 */


FilesAPI.uploadFileFromParams = function (params, callback) {
  // Convert object to FormData for chunked upload
  var formData = new FormData();
  Object.keys(params).forEach(function (key) {
    if (key === 'files' && Array.isArray(params[key])) {
      // Handle file arrays from legacy API
      params[key].forEach(function (file, index) {
        if (file.file_path && file.file_name) {
          // This would need to be handled differently in real scenario
          // as we can't recreate File objects from paths
          formData.append("file_".concat(index), file.file_name);
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


FilesAPI.statusUploadFile = function (uploadId, callback) {
  return this.getUploadStatus(uploadId, callback);
};
/**
 * Configure Resumable.js to use the new v3 API
 * @param {object} resumableConfig - Resumable.js configuration
 * @returns {object} Updated configuration
 */


FilesAPI.configureResumable = function () {
  var resumableConfig = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return Object.assign({
    target: "".concat(Config.pbxUrl, "/pbxcore/api/v3/files:upload"),
    testChunks: false,
    chunkSize: 3 * 1024 * 1024,
    // 3MB chunks
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


FilesAPI.uploadFile = function (file, callback) {
  console.log('🔵 FilesAPI.uploadFile started', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  });
  var r = new Resumable({
    target: "".concat(Config.pbxUrl, "/pbxcore/api/v3/files:upload"),
    testChunks: false,
    chunkSize: 3 * 1024 * 1024,
    simultaneousUploads: 1,
    maxFiles: 1
  });
  console.log('🔧 Resumable.js configured', {
    target: "".concat(Config.pbxUrl, "/pbxcore/api/v3/files:upload"),
    chunkSize: 3 * 1024 * 1024
  }); // Set up event handlers first

  r.on('fileSuccess', function (file, response) {
    console.log('✅ File upload success', {
      fileName: file.fileName || file.name,
      response: response
    });
    callback('fileSuccess', {
      file: file,
      response: response
    });
  });
  r.on('fileProgress', function (file) {
    var progress = Math.round(file.progress() * 100);
    console.log('📈 File upload progress', {
      fileName: file.fileName || file.name,
      progress: progress + '%'
    });
    callback('fileProgress', {
      file: file
    });
  });
  r.on('fileAdded', function (file, event) {
    console.log('📁 File added to upload queue', {
      fileName: file.fileName || file.name,
      uniqueIdentifier: file.uniqueIdentifier,
      size: file.size
    });
    callback('fileAdded', {
      file: file,
      event: event
    }); // Upload will start automatically after fileAdded
  });
  r.on('fileRetry', function (file) {
    console.log('🔄 File upload retry', {
      fileName: file.fileName || file.name
    });
    callback('fileRetry', {
      file: file
    });
  });
  r.on('fileError', function (file, message) {
    console.error('❌ File upload error', {
      fileName: file.fileName || file.name,
      message: message
    });
    callback('fileError', {
      file: file,
      message: message
    });
  });
  r.on('uploadStart', function () {
    console.log('🚀 Upload process started');
    callback('uploadStart');
  });
  r.on('complete', function () {
    console.log('🏁 All uploads completed');
    callback('complete');
  });
  r.on('progress', function () {
    var percent = 100 * r.progress();
    console.log('📊 Overall upload progress', {
      percent: Math.round(percent) + '%'
    });
    callback('progress', {
      percent: percent
    });
  });
  r.on('error', function (message, file) {
    console.error('💥 Upload error', {
      message: message,
      file: file
    });
    callback('error', {
      message: message,
      file: file
    });
  });
  r.on('pause', function () {
    console.log('⏸️ Upload paused');
    callback('pause');
  });
  r.on('cancel', function () {
    console.log('⏹️ Upload cancelled');
    callback('cancel');
  }); // Add file and upload - this will trigger fileAdded then uploadStart

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


FilesAPI.getStatusUploadFile = function (fileId, callback) {
  $.api({
    url: "".concat(Config.pbxUrl, "/pbxcore/api/v3/files:uploadStatus"),
    on: 'now',
    method: 'POST',
    data: {
      id: fileId
    },
    successTest: PbxApi.successTest,
    onSuccess: function onSuccess(response) {
      callback(response.data);
    },
    onFailure: function onFailure() {
      callback(false);
    },
    onError: function onError() {
      callback(false);
    }
  });
};
/**
 * Remove audio file
 * @param {string} filePath - File path
 * @param {string|null} fileId - File ID (optional)
 * @param {function|null} callback - Callback function (optional)
 */


FilesAPI.removeAudioFile = function (filePath) {
  var fileId = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  $.api({
    url: "".concat(Config.pbxUrl, "/pbxcore/api/v3/files"),
    on: 'now',
    method: 'POST',
    data: {
      filename: filePath
    },
    successTest: PbxApi.successTest,
    onSuccess: function onSuccess() {
      if (callback !== null) {
        callback(fileId);
      }
    }
  });
};
/**
 * Download new firmware
 * @param {object} params - Download parameters
 * @param {function} callback - Callback function
 */


FilesAPI.downloadNewFirmware = function (params, callback) {
  $.api({
    url: "".concat(Config.pbxUrl, "/pbxcore/api/v3/files:downloadFirmware"),
    on: 'now',
    method: 'POST',
    data: {
      md5: params.md5,
      size: params.size,
      version: params.version,
      url: params.updateLink
    },
    successTest: PbxApi.successTest,
    onSuccess: function onSuccess(response) {
      callback(response.data);
    },
    onFailure: function onFailure(response) {
      callback(response);
    },
    onError: function onError(response) {
      callback(response);
    }
  });
};
/**
 * Get firmware download status
 * @param {string} filename - Firmware filename
 * @param {function} callback - Callback function
 */


FilesAPI.firmwareDownloadStatus = function (filename, callback) {
  $.api({
    url: "".concat(Config.pbxUrl, "/pbxcore/api/v3/files:firmwareStatus"),
    on: 'now',
    method: 'POST',
    data: {
      filename: filename
    },
    successTest: PbxApi.successTest,
    onSuccess: function onSuccess(response) {
      callback(response.data);
    },
    onFailure: function onFailure() {
      callback(false);
    },
    onError: function onError() {
      callback(false);
    }
  });
};
/**
 * Attach to button
 * @param {string} buttonId - Button ID
 * @param {string[]} fileTypes - Array of allowed file types
 * @param {function} callback - Callback function
 */


FilesAPI.attachToBtn = function (buttonId, fileTypes, callback) {
  var _Config;

  console.log('🔗 FilesAPI.attachToBtn initialized', {
    buttonId: buttonId,
    fileTypes: fileTypes,
    callbackType: _typeof(callback)
  });
  var buttonElement = document.getElementById(buttonId);

  if (!buttonElement) {
    console.error('❌ Button element not found', {
      buttonId: buttonId
    });
    return;
  }

  console.log('✅ Button element found', {
    buttonId: buttonId,
    tagName: buttonElement.tagName,
    className: buttonElement.className
  });
  var uploadUrl = "".concat(Config.pbxUrl, "/pbxcore/api/v3/files:upload");
  var resumableConfig = {
    target: uploadUrl,
    testChunks: false,
    chunkSize: 3 * 1024 * 1024,
    maxFiles: 1,
    simultaneousUploads: 1,
    fileType: fileTypes
  };
  console.log('🔧 Resumable.js configuration', {
    config: resumableConfig,
    uploadUrl: uploadUrl,
    configPbxUrl: (_Config = Config) === null || _Config === void 0 ? void 0 : _Config.pbxUrl,
    fullTarget: resumableConfig.target
  });
  var r = new Resumable(resumableConfig);
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

  r.on('fileSuccess', function (file, response) {
    console.log('✅ [attachToBtn] File upload success', {
      fileName: file.fileName || file.name,
      response: response,
      responseType: _typeof(response),
      responseLength: response ? response.length : 0
    }); // Try to parse and log the response structure

    try {
      var parsedResponse = JSON.parse(response);
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

    callback('fileSuccess', {
      file: file,
      response: response
    });
  });
  r.on('fileProgress', function (file) {
    var progress = Math.round(file.progress() * 100);
    console.log('📈 [attachToBtn] File upload progress', {
      fileName: file.fileName || file.name,
      progress: progress + '%'
    });
    callback('fileProgress', {
      file: file
    });
  });
  r.on('fileAdded', function (file, event) {
    console.log('📁 [attachToBtn] File added to upload queue', {
      fileName: file.fileName || file.name,
      uniqueIdentifier: file.uniqueIdentifier,
      size: file.size,
      buttonId: buttonId
    });
    console.log('▶️ [attachToBtn] Starting upload automatically');
    r.upload();
    callback('fileAdded', {
      file: file,
      event: event
    });
  });
  r.on('fileRetry', function (file) {
    console.log('🔄 [attachToBtn] File upload retry', {
      fileName: file.fileName || file.name
    });
    callback('fileRetry', {
      file: file
    });
  });
  r.on('fileError', function (file, message) {
    console.error('❌ [attachToBtn] File upload error', {
      fileName: file.fileName || file.name,
      message: message,
      messageType: _typeof(message),
      buttonId: buttonId,
      fileUniqueId: file.uniqueIdentifier,
      fileSize: file.size
    }); // Try to get more detailed error information

    if (message && typeof message === 'string') {
      try {
        var errorObj = JSON.parse(message);
        console.error('📊 [attachToBtn] Detailed error info', errorObj);
      } catch (e) {
        console.error('📊 [attachToBtn] Error message (raw):', message);
      }
    }

    callback('fileError', {
      file: file,
      message: message
    });
  });
  r.on('uploadStart', function () {
    console.log('🚀 [attachToBtn] Upload process started');
    callback('uploadStart');
  });
  r.on('complete', function () {
    console.log('🏁 [attachToBtn] All uploads completed');
    callback('complete');
  });
  r.on('progress', function () {
    var percent = 100 * r.progress();
    console.log('📊 [attachToBtn] Overall upload progress', {
      percent: Math.round(percent) + '%'
    });
    callback('progress', {
      percent: percent
    });
  });
  r.on('error', function (message, file) {
    console.error('💥 [attachToBtn] Upload error', {
      message: message,
      file: file,
      buttonId: buttonId
    });
    callback('error', {
      message: message,
      file: file
    });
  });
  r.on('pause', function () {
    console.log('⏸️ [attachToBtn] Upload paused');
    callback('pause');
  });
  r.on('cancel', function () {
    console.log('⏹️ [attachToBtn] Upload cancelled');
    callback('cancel');
  });
  console.log('🎯 [attachToBtn] All event handlers registered successfully');
}; // Export for use in other modules


window.FilesAPI = FilesAPI;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZmlsZXMtYXBpLmpzIl0sIm5hbWVzIjpbIkZpbGVzQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwidXBsb2FkIiwidXBsb2FkU3RhdHVzIiwiZG93bmxvYWRGaXJtd2FyZSIsImZpcm13YXJlU3RhdHVzIiwiUGJ4QXBpIiwiZXh0ZW5kQXBpQ2xpZW50IiwiZ2V0RmlsZUNvbnRlbnQiLCJmaWxlUGF0aCIsImNhbGxiYWNrIiwibmVlZE9yaWdpbmFsIiwidmFsaWRhdGlvbiIsInZhbGlkYXRlQXBpUGFyYW1zIiwicmVxdWlyZWQiLCJ0eXBlcyIsImlzVmFsaWQiLCJoYW5kbGVBcGlFcnJvciIsImVycm9ycyIsImpvaW4iLCJlbmNvZGVkUGF0aCIsImVuY29kZVVSSUNvbXBvbmVudCIsInBhcmFtcyIsImNhbGxHZXQiLCJlcnJvciIsInVwbG9hZEZpbGVDb250ZW50IiwiY29udGVudCIsImNvbnRlbnRUeXBlIiwiJCIsImFwaSIsInVybCIsImFwaVVybCIsIm9uIiwibWV0aG9kIiwiZGF0YSIsImJlZm9yZVhIUiIsInhociIsInNldFJlcXVlc3RIZWFkZXIiLCJzdWNjZXNzVGVzdCIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwib25GYWlsdXJlIiwib25FcnJvciIsImRlbGV0ZUZpbGUiLCJjYWxsRGVsZXRlIiwidXBsb2FkQ2h1bmtlZCIsImZvcm1EYXRhIiwiY2FsbEN1c3RvbU1ldGhvZCIsImdldFVwbG9hZFN0YXR1cyIsInVwbG9hZElkIiwiaWQiLCJnZXRGaXJtd2FyZVN0YXR1cyIsImZpbGVuYW1lIiwicmVtb3ZlQXVkaW9GaWxlIiwidXBsb2FkRmlsZUZyb21QYXJhbXMiLCJGb3JtRGF0YSIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwia2V5IiwiQXJyYXkiLCJpc0FycmF5IiwiZmlsZSIsImluZGV4IiwiZmlsZV9wYXRoIiwiZmlsZV9uYW1lIiwiYXBwZW5kIiwic3RhdHVzVXBsb2FkRmlsZSIsImNvbmZpZ3VyZVJlc3VtYWJsZSIsInJlc3VtYWJsZUNvbmZpZyIsImFzc2lnbiIsInRhcmdldCIsIkNvbmZpZyIsInBieFVybCIsInRlc3RDaHVua3MiLCJjaHVua1NpemUiLCJzaW11bHRhbmVvdXNVcGxvYWRzIiwibWF4RmlsZXMiLCJmaWxlVHlwZSIsImhlYWRlcnMiLCJ1cGxvYWRGaWxlIiwiY29uc29sZSIsImxvZyIsImZpbGVOYW1lIiwibmFtZSIsImZpbGVTaXplIiwic2l6ZSIsInR5cGUiLCJyIiwiUmVzdW1hYmxlIiwicHJvZ3Jlc3MiLCJNYXRoIiwicm91bmQiLCJldmVudCIsInVuaXF1ZUlkZW50aWZpZXIiLCJtZXNzYWdlIiwicGVyY2VudCIsImFkZEZpbGUiLCJnZXRTdGF0dXNVcGxvYWRGaWxlIiwiZmlsZUlkIiwiZG93bmxvYWROZXdGaXJtd2FyZSIsIm1kNSIsInZlcnNpb24iLCJ1cGRhdGVMaW5rIiwiZmlybXdhcmVEb3dubG9hZFN0YXR1cyIsImF0dGFjaFRvQnRuIiwiYnV0dG9uSWQiLCJmaWxlVHlwZXMiLCJjYWxsYmFja1R5cGUiLCJidXR0b25FbGVtZW50IiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsInRhZ05hbWUiLCJjbGFzc05hbWUiLCJ1cGxvYWRVcmwiLCJjb25maWciLCJjb25maWdQYnhVcmwiLCJmdWxsVGFyZ2V0Iiwib3B0cyIsImlzVmFsaWRUYXJnZXQiLCJzdXBwb3J0IiwiYXNzaWduQnJvd3NlIiwicmVzcG9uc2VUeXBlIiwicmVzcG9uc2VMZW5ndGgiLCJsZW5ndGgiLCJwYXJzZWRSZXNwb25zZSIsIkpTT04iLCJwYXJzZSIsInJlc3VsdCIsImhhc0RhdGEiLCJkYXRhS2V5cyIsIm1lc3NhZ2VzIiwiZnVsbFJlc3BvbnNlIiwiZSIsInJhd1Jlc3BvbnNlIiwicGFyc2VFcnJvciIsIm1lc3NhZ2VUeXBlIiwiZmlsZVVuaXF1ZUlkIiwiZXJyb3JPYmoiLCJ3aW5kb3ciXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUM5QkMsRUFBQUEsUUFBUSxFQUFFLHVCQURvQjtBQUU5QkMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLE1BQU0sRUFBRSxTQURHO0FBRVhDLElBQUFBLFlBQVksRUFBRSxlQUZIO0FBR1hDLElBQUFBLGdCQUFnQixFQUFFLG1CQUhQO0FBSVhDLElBQUFBLGNBQWMsRUFBRTtBQUpMO0FBRmUsQ0FBakIsQ0FBakIsQyxDQVVBOztBQUNBQyxNQUFNLENBQUNDLGVBQVAsQ0FBdUJULFFBQXZCLEVBQWlDO0FBRTdCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lVLEVBQUFBLGNBVDZCLDBCQVNkQyxRQVRjLEVBU0pDLFFBVEksRUFTNEI7QUFBQSxRQUF0QkMsWUFBc0IsdUVBQVAsS0FBTzs7QUFDckQsUUFBSTtBQUNBO0FBQ0EsVUFBTUMsVUFBVSxHQUFHTixNQUFNLENBQUNPLGlCQUFQLENBQXlCO0FBQUVKLFFBQUFBLFFBQVEsRUFBUkEsUUFBRjtBQUFZQyxRQUFBQSxRQUFRLEVBQVJBO0FBQVosT0FBekIsRUFBaUQ7QUFDaEVJLFFBQUFBLFFBQVEsRUFBRSxDQUFDLFVBQUQsRUFBYSxVQUFiLENBRHNEO0FBRWhFQyxRQUFBQSxLQUFLLEVBQUU7QUFBRU4sVUFBQUEsUUFBUSxFQUFFLFFBQVo7QUFBc0JDLFVBQUFBLFFBQVEsRUFBRTtBQUFoQztBQUZ5RCxPQUFqRCxDQUFuQjs7QUFLQSxVQUFJLENBQUNFLFVBQVUsQ0FBQ0ksT0FBaEIsRUFBeUI7QUFDckIsZUFBT1YsTUFBTSxDQUFDVyxjQUFQLENBQXNCLHlCQUF0QixFQUFpREwsVUFBVSxDQUFDTSxNQUFYLENBQWtCQyxJQUFsQixDQUF1QixJQUF2QixDQUFqRCxFQUErRVQsUUFBL0UsQ0FBUDtBQUNIOztBQUVELFVBQU1VLFdBQVcsR0FBR0Msa0JBQWtCLENBQUNaLFFBQUQsQ0FBdEM7QUFDQSxVQUFNYSxNQUFNLEdBQUdYLFlBQVksR0FBRztBQUFFQSxRQUFBQSxZQUFZLEVBQUU7QUFBaEIsT0FBSCxHQUE4QixFQUF6RDtBQUVBLGFBQU8sS0FBS1ksT0FBTCxDQUFhRCxNQUFiLEVBQXFCWixRQUFyQixFQUErQlUsV0FBL0IsQ0FBUDtBQUNILEtBZkQsQ0FlRSxPQUFPSSxLQUFQLEVBQWM7QUFDWixhQUFPbEIsTUFBTSxDQUFDVyxjQUFQLENBQXNCLHlCQUF0QixFQUFpRE8sS0FBakQsRUFBd0RkLFFBQXhELENBQVA7QUFDSDtBQUNKLEdBNUI0Qjs7QUE4QjdCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSWUsRUFBQUEsaUJBdEM2Qiw2QkFzQ1hoQixRQXRDVyxFQXNDRGlCLE9BdENDLEVBc0NRaEIsUUF0Q1IsRUFzQzREO0FBQUEsUUFBMUNpQixXQUEwQyx1RUFBNUIsMEJBQTRCOztBQUNyRixRQUFJO0FBQ0E7QUFDQSxVQUFNZixVQUFVLEdBQUdOLE1BQU0sQ0FBQ08saUJBQVAsQ0FBeUI7QUFBRUosUUFBQUEsUUFBUSxFQUFSQSxRQUFGO0FBQVlpQixRQUFBQSxPQUFPLEVBQVBBLE9BQVo7QUFBcUJoQixRQUFBQSxRQUFRLEVBQVJBO0FBQXJCLE9BQXpCLEVBQTBEO0FBQ3pFSSxRQUFBQSxRQUFRLEVBQUUsQ0FBQyxVQUFELEVBQWEsU0FBYixFQUF3QixVQUF4QixDQUQrRDtBQUV6RUMsUUFBQUEsS0FBSyxFQUFFO0FBQUVOLFVBQUFBLFFBQVEsRUFBRSxRQUFaO0FBQXNCQyxVQUFBQSxRQUFRLEVBQUU7QUFBaEM7QUFGa0UsT0FBMUQsQ0FBbkI7O0FBS0EsVUFBSSxDQUFDRSxVQUFVLENBQUNJLE9BQWhCLEVBQXlCO0FBQ3JCLGVBQU9WLE1BQU0sQ0FBQ1csY0FBUCxDQUFzQiw0QkFBdEIsRUFBb0RMLFVBQVUsQ0FBQ00sTUFBWCxDQUFrQkMsSUFBbEIsQ0FBdUIsSUFBdkIsQ0FBcEQsRUFBa0ZULFFBQWxGLENBQVA7QUFDSDs7QUFFRCxVQUFNVSxXQUFXLEdBQUdDLGtCQUFrQixDQUFDWixRQUFELENBQXRDLENBWEEsQ0FhQTs7QUFDQSxhQUFPbUIsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDVEMsUUFBQUEsR0FBRyxZQUFLLEtBQUtDLE1BQVYsY0FBb0JYLFdBQXBCLENBRE07QUFFVFksUUFBQUEsRUFBRSxFQUFFLEtBRks7QUFHVEMsUUFBQUEsTUFBTSxFQUFFLEtBSEM7QUFJVEMsUUFBQUEsSUFBSSxFQUFFUixPQUpHO0FBS1RTLFFBQUFBLFNBTFMscUJBS0NDLEdBTEQsRUFLTTtBQUNYQSxVQUFBQSxHQUFHLENBQUNDLGdCQUFKLENBQXFCLGNBQXJCLEVBQXFDVixXQUFyQztBQUNBLGlCQUFPUyxHQUFQO0FBQ0gsU0FSUTtBQVNURSxRQUFBQSxXQUFXLEVBQUVoQyxNQUFNLENBQUNnQyxXQVRYO0FBVVRDLFFBQUFBLFNBVlMscUJBVUNDLFFBVkQsRUFVVztBQUNoQjlCLFVBQUFBLFFBQVEsQ0FBQzhCLFFBQUQsQ0FBUjtBQUNILFNBWlE7QUFhVEMsUUFBQUEsU0FiUyxxQkFhQ0QsUUFiRCxFQWFXO0FBQ2hCOUIsVUFBQUEsUUFBUSxDQUFDOEIsUUFBRCxDQUFSO0FBQ0gsU0FmUTtBQWdCVEUsUUFBQUEsT0FoQlMsbUJBZ0JEbEIsS0FoQkMsRUFnQk07QUFDWGxCLFVBQUFBLE1BQU0sQ0FBQ1csY0FBUCxDQUFzQiw0QkFBdEIsRUFBb0RPLEtBQXBELEVBQTJEZCxRQUEzRDtBQUNIO0FBbEJRLE9BQU4sQ0FBUDtBQW9CSCxLQWxDRCxDQWtDRSxPQUFPYyxLQUFQLEVBQWM7QUFDWixhQUFPbEIsTUFBTSxDQUFDVyxjQUFQLENBQXNCLDRCQUF0QixFQUFvRE8sS0FBcEQsRUFBMkRkLFFBQTNELENBQVA7QUFDSDtBQUNKLEdBNUU0Qjs7QUE4RTdCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJaUMsRUFBQUEsVUFwRjZCLHNCQW9GbEJsQyxRQXBGa0IsRUFvRlJDLFFBcEZRLEVBb0ZFO0FBQzNCLFFBQUk7QUFDQTtBQUNBLFVBQU1FLFVBQVUsR0FBR04sTUFBTSxDQUFDTyxpQkFBUCxDQUF5QjtBQUFFSixRQUFBQSxRQUFRLEVBQVJBLFFBQUY7QUFBWUMsUUFBQUEsUUFBUSxFQUFSQTtBQUFaLE9BQXpCLEVBQWlEO0FBQ2hFSSxRQUFBQSxRQUFRLEVBQUUsQ0FBQyxVQUFELEVBQWEsVUFBYixDQURzRDtBQUVoRUMsUUFBQUEsS0FBSyxFQUFFO0FBQUVOLFVBQUFBLFFBQVEsRUFBRSxRQUFaO0FBQXNCQyxVQUFBQSxRQUFRLEVBQUU7QUFBaEM7QUFGeUQsT0FBakQsQ0FBbkI7O0FBS0EsVUFBSSxDQUFDRSxVQUFVLENBQUNJLE9BQWhCLEVBQXlCO0FBQ3JCLGVBQU9WLE1BQU0sQ0FBQ1csY0FBUCxDQUFzQixxQkFBdEIsRUFBNkNMLFVBQVUsQ0FBQ00sTUFBWCxDQUFrQkMsSUFBbEIsQ0FBdUIsSUFBdkIsQ0FBN0MsRUFBMkVULFFBQTNFLENBQVA7QUFDSDs7QUFFRCxVQUFNVSxXQUFXLEdBQUdDLGtCQUFrQixDQUFDWixRQUFELENBQXRDO0FBQ0EsYUFBTyxLQUFLbUMsVUFBTCxDQUFnQmxDLFFBQWhCLEVBQTBCVSxXQUExQixDQUFQO0FBQ0gsS0FiRCxDQWFFLE9BQU9JLEtBQVAsRUFBYztBQUNaLGFBQU9sQixNQUFNLENBQUNXLGNBQVAsQ0FBc0IscUJBQXRCLEVBQTZDTyxLQUE3QyxFQUFvRGQsUUFBcEQsQ0FBUDtBQUNIO0FBQ0osR0FyRzRCOztBQXVHN0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0ltQyxFQUFBQSxhQTdHNkIseUJBNkdmQyxRQTdHZSxFQTZHTHBDLFFBN0dLLEVBNkdLO0FBQzlCLFFBQUk7QUFDQSxVQUFNRSxVQUFVLEdBQUdOLE1BQU0sQ0FBQ08saUJBQVAsQ0FBeUI7QUFBRWlDLFFBQUFBLFFBQVEsRUFBUkEsUUFBRjtBQUFZcEMsUUFBQUEsUUFBUSxFQUFSQTtBQUFaLE9BQXpCLEVBQWlEO0FBQ2hFSSxRQUFBQSxRQUFRLEVBQUUsQ0FBQyxVQUFELEVBQWEsVUFBYixDQURzRDtBQUVoRUMsUUFBQUEsS0FBSyxFQUFFO0FBQUVMLFVBQUFBLFFBQVEsRUFBRTtBQUFaO0FBRnlELE9BQWpELENBQW5COztBQUtBLFVBQUksQ0FBQ0UsVUFBVSxDQUFDSSxPQUFoQixFQUF5QjtBQUNyQixlQUFPVixNQUFNLENBQUNXLGNBQVAsQ0FBc0Isd0JBQXRCLEVBQWdETCxVQUFVLENBQUNNLE1BQVgsQ0FBa0JDLElBQWxCLENBQXVCLElBQXZCLENBQWhELEVBQThFVCxRQUE5RSxDQUFQO0FBQ0g7O0FBRUQsYUFBTyxLQUFLcUMsZ0JBQUwsQ0FBc0IsUUFBdEIsRUFBZ0NELFFBQWhDLEVBQTBDcEMsUUFBMUMsRUFBb0QsTUFBcEQsQ0FBUDtBQUNILEtBWEQsQ0FXRSxPQUFPYyxLQUFQLEVBQWM7QUFDWixhQUFPbEIsTUFBTSxDQUFDVyxjQUFQLENBQXNCLHdCQUF0QixFQUFnRE8sS0FBaEQsRUFBdURkLFFBQXZELENBQVA7QUFDSDtBQUNKLEdBNUg0Qjs7QUE4SDdCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJc0MsRUFBQUEsZUFwSTZCLDJCQW9JYkMsUUFwSWEsRUFvSUh2QyxRQXBJRyxFQW9JTztBQUNoQyxRQUFJO0FBQ0EsVUFBTUUsVUFBVSxHQUFHTixNQUFNLENBQUNPLGlCQUFQLENBQXlCO0FBQUVvQyxRQUFBQSxRQUFRLEVBQVJBLFFBQUY7QUFBWXZDLFFBQUFBLFFBQVEsRUFBUkE7QUFBWixPQUF6QixFQUFpRDtBQUNoRUksUUFBQUEsUUFBUSxFQUFFLENBQUMsVUFBRCxFQUFhLFVBQWIsQ0FEc0Q7QUFFaEVDLFFBQUFBLEtBQUssRUFBRTtBQUFFa0MsVUFBQUEsUUFBUSxFQUFFLFFBQVo7QUFBc0J2QyxVQUFBQSxRQUFRLEVBQUU7QUFBaEM7QUFGeUQsT0FBakQsQ0FBbkI7O0FBS0EsVUFBSSxDQUFDRSxVQUFVLENBQUNJLE9BQWhCLEVBQXlCO0FBQ3JCLGVBQU9WLE1BQU0sQ0FBQ1csY0FBUCxDQUFzQiwwQkFBdEIsRUFBa0RMLFVBQVUsQ0FBQ00sTUFBWCxDQUFrQkMsSUFBbEIsQ0FBdUIsSUFBdkIsQ0FBbEQsRUFBZ0ZULFFBQWhGLENBQVA7QUFDSDs7QUFFRCxVQUFNWSxNQUFNLEdBQUc7QUFBRTRCLFFBQUFBLEVBQUUsRUFBRUQ7QUFBTixPQUFmO0FBQ0EsYUFBTyxLQUFLRixnQkFBTCxDQUFzQixjQUF0QixFQUFzQ3pCLE1BQXRDLEVBQThDWixRQUE5QyxFQUF3RCxLQUF4RCxDQUFQO0FBQ0gsS0FaRCxDQVlFLE9BQU9jLEtBQVAsRUFBYztBQUNaLGFBQU9sQixNQUFNLENBQUNXLGNBQVAsQ0FBc0IsMEJBQXRCLEVBQWtETyxLQUFsRCxFQUF5RGQsUUFBekQsQ0FBUDtBQUNIO0FBQ0osR0FwSjRCOztBQXNKN0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJTixFQUFBQSxnQkE5SjZCLDRCQThKWmtCLE1BOUpZLEVBOEpKWixRQTlKSSxFQThKTTtBQUMvQixRQUFJO0FBQ0EsVUFBTUUsVUFBVSxHQUFHTixNQUFNLENBQUNPLGlCQUFQLENBQXlCO0FBQUVTLFFBQUFBLE1BQU0sRUFBTkEsTUFBRjtBQUFVWixRQUFBQSxRQUFRLEVBQVJBO0FBQVYsT0FBekIsRUFBK0M7QUFDOURJLFFBQUFBLFFBQVEsRUFBRSxDQUFDLFFBQUQsRUFBVyxVQUFYLENBRG9EO0FBRTlEQyxRQUFBQSxLQUFLLEVBQUU7QUFBRU8sVUFBQUEsTUFBTSxFQUFFLFFBQVY7QUFBb0JaLFVBQUFBLFFBQVEsRUFBRTtBQUE5QjtBQUZ1RCxPQUEvQyxDQUFuQjs7QUFLQSxVQUFJLENBQUNFLFVBQVUsQ0FBQ0ksT0FBaEIsRUFBeUI7QUFDckIsZUFBT1YsTUFBTSxDQUFDVyxjQUFQLENBQXNCLDJCQUF0QixFQUFtREwsVUFBVSxDQUFDTSxNQUFYLENBQWtCQyxJQUFsQixDQUF1QixJQUF2QixDQUFuRCxFQUFpRlQsUUFBakYsQ0FBUDtBQUNIOztBQUVELGFBQU8sS0FBS3FDLGdCQUFMLENBQXNCLGtCQUF0QixFQUEwQ3pCLE1BQTFDLEVBQWtEWixRQUFsRCxFQUE0RCxNQUE1RCxDQUFQO0FBQ0gsS0FYRCxDQVdFLE9BQU9jLEtBQVAsRUFBYztBQUNaLGFBQU9sQixNQUFNLENBQUNXLGNBQVAsQ0FBc0IsMkJBQXRCLEVBQW1ETyxLQUFuRCxFQUEwRGQsUUFBMUQsQ0FBUDtBQUNIO0FBQ0osR0E3SzRCOztBQStLN0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0l5QyxFQUFBQSxpQkFyTDZCLDZCQXFMWEMsUUFyTFcsRUFxTEQxQyxRQXJMQyxFQXFMUztBQUNsQyxRQUFJO0FBQ0EsVUFBTUUsVUFBVSxHQUFHTixNQUFNLENBQUNPLGlCQUFQLENBQXlCO0FBQUV1QyxRQUFBQSxRQUFRLEVBQVJBLFFBQUY7QUFBWTFDLFFBQUFBLFFBQVEsRUFBUkE7QUFBWixPQUF6QixFQUFpRDtBQUNoRUksUUFBQUEsUUFBUSxFQUFFLENBQUMsVUFBRCxFQUFhLFVBQWIsQ0FEc0Q7QUFFaEVDLFFBQUFBLEtBQUssRUFBRTtBQUFFcUMsVUFBQUEsUUFBUSxFQUFFLFFBQVo7QUFBc0IxQyxVQUFBQSxRQUFRLEVBQUU7QUFBaEM7QUFGeUQsT0FBakQsQ0FBbkI7O0FBS0EsVUFBSSxDQUFDRSxVQUFVLENBQUNJLE9BQWhCLEVBQXlCO0FBQ3JCLGVBQU9WLE1BQU0sQ0FBQ1csY0FBUCxDQUFzQiw0QkFBdEIsRUFBb0RMLFVBQVUsQ0FBQ00sTUFBWCxDQUFrQkMsSUFBbEIsQ0FBdUIsSUFBdkIsQ0FBcEQsRUFBa0ZULFFBQWxGLENBQVA7QUFDSDs7QUFFRCxVQUFNWSxNQUFNLEdBQUc7QUFBRThCLFFBQUFBLFFBQVEsRUFBRUE7QUFBWixPQUFmO0FBQ0EsYUFBTyxLQUFLTCxnQkFBTCxDQUFzQixnQkFBdEIsRUFBd0N6QixNQUF4QyxFQUFnRFosUUFBaEQsRUFBMEQsS0FBMUQsQ0FBUDtBQUNILEtBWkQsQ0FZRSxPQUFPYyxLQUFQLEVBQWM7QUFDWixhQUFPbEIsTUFBTSxDQUFDVyxjQUFQLENBQXNCLDRCQUF0QixFQUFvRE8sS0FBcEQsRUFBMkRkLFFBQTNELENBQVA7QUFDSDtBQUNKO0FBck00QixDQUFqQztBQXdNQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBWixRQUFRLENBQUN1RCxlQUFULEdBQTJCLFVBQVNELFFBQVQsRUFBbUIxQyxRQUFuQixFQUE2QjtBQUNwRCxTQUFPLEtBQUtpQyxVQUFMLENBQWdCUyxRQUFoQixFQUEwQjFDLFFBQTFCLENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FaLFFBQVEsQ0FBQ3dELG9CQUFULEdBQWdDLFVBQVNoQyxNQUFULEVBQWlCWixRQUFqQixFQUEyQjtBQUN2RDtBQUNBLE1BQU1vQyxRQUFRLEdBQUcsSUFBSVMsUUFBSixFQUFqQjtBQUNBQyxFQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWW5DLE1BQVosRUFBb0JvQyxPQUFwQixDQUE0QixVQUFBQyxHQUFHLEVBQUk7QUFDL0IsUUFBSUEsR0FBRyxLQUFLLE9BQVIsSUFBbUJDLEtBQUssQ0FBQ0MsT0FBTixDQUFjdkMsTUFBTSxDQUFDcUMsR0FBRCxDQUFwQixDQUF2QixFQUFtRDtBQUMvQztBQUNBckMsTUFBQUEsTUFBTSxDQUFDcUMsR0FBRCxDQUFOLENBQVlELE9BQVosQ0FBb0IsVUFBQ0ksSUFBRCxFQUFPQyxLQUFQLEVBQWlCO0FBQ2pDLFlBQUlELElBQUksQ0FBQ0UsU0FBTCxJQUFrQkYsSUFBSSxDQUFDRyxTQUEzQixFQUFzQztBQUNsQztBQUNBO0FBQ0FuQixVQUFBQSxRQUFRLENBQUNvQixNQUFULGdCQUF3QkgsS0FBeEIsR0FBaUNELElBQUksQ0FBQ0csU0FBdEM7QUFDSDtBQUNKLE9BTkQ7QUFPSCxLQVRELE1BU087QUFDSG5CLE1BQUFBLFFBQVEsQ0FBQ29CLE1BQVQsQ0FBZ0JQLEdBQWhCLEVBQXFCckMsTUFBTSxDQUFDcUMsR0FBRCxDQUEzQjtBQUNIO0FBQ0osR0FiRDtBQWVBLFNBQU8sS0FBS2QsYUFBTCxDQUFtQkMsUUFBbkIsRUFBNkJwQyxRQUE3QixDQUFQO0FBQ0gsQ0FuQkQ7QUFxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FaLFFBQVEsQ0FBQ3FFLGdCQUFULEdBQTRCLFVBQVNsQixRQUFULEVBQW1CdkMsUUFBbkIsRUFBNkI7QUFDckQsU0FBTyxLQUFLc0MsZUFBTCxDQUFxQkMsUUFBckIsRUFBK0J2QyxRQUEvQixDQUFQO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBWixRQUFRLENBQUNzRSxrQkFBVCxHQUE4QixZQUErQjtBQUFBLE1BQXRCQyxlQUFzQix1RUFBSixFQUFJO0FBQ3pELFNBQU9iLE1BQU0sQ0FBQ2MsTUFBUCxDQUFjO0FBQ2pCQyxJQUFBQSxNQUFNLFlBQUtDLE1BQU0sQ0FBQ0MsTUFBWixpQ0FEVztBQUVqQkMsSUFBQUEsVUFBVSxFQUFFLEtBRks7QUFHakJDLElBQUFBLFNBQVMsRUFBRSxJQUFJLElBQUosR0FBVyxJQUhMO0FBR1c7QUFDNUJDLElBQUFBLG1CQUFtQixFQUFFLENBSko7QUFLakJDLElBQUFBLFFBQVEsRUFBRSxDQUxPO0FBTWpCQyxJQUFBQSxRQUFRLEVBQUUsQ0FBQyxHQUFELENBTk87QUFPakJDLElBQUFBLE9BQU8sRUFBRTtBQUNMLDBCQUFvQjtBQURmO0FBUFEsR0FBZCxFQVVKVixlQVZJLENBQVA7QUFXSCxDQVpEO0FBY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0F2RSxRQUFRLENBQUNrRixVQUFULEdBQXNCLFVBQVNsQixJQUFULEVBQWVwRCxRQUFmLEVBQXlCO0FBQzNDdUUsRUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksZ0NBQVosRUFBOEM7QUFDMUNDLElBQUFBLFFBQVEsRUFBRXJCLElBQUksQ0FBQ3NCLElBRDJCO0FBRTFDQyxJQUFBQSxRQUFRLEVBQUV2QixJQUFJLENBQUN3QixJQUYyQjtBQUcxQ1IsSUFBQUEsUUFBUSxFQUFFaEIsSUFBSSxDQUFDeUI7QUFIMkIsR0FBOUM7QUFNQSxNQUFNQyxDQUFDLEdBQUcsSUFBSUMsU0FBSixDQUFjO0FBQ3BCbEIsSUFBQUEsTUFBTSxZQUFLQyxNQUFNLENBQUNDLE1BQVosaUNBRGM7QUFFcEJDLElBQUFBLFVBQVUsRUFBRSxLQUZRO0FBR3BCQyxJQUFBQSxTQUFTLEVBQUUsSUFBSSxJQUFKLEdBQVcsSUFIRjtBQUlwQkMsSUFBQUEsbUJBQW1CLEVBQUUsQ0FKRDtBQUtwQkMsSUFBQUEsUUFBUSxFQUFFO0FBTFUsR0FBZCxDQUFWO0FBUUFJLEVBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLDRCQUFaLEVBQTBDO0FBQ3RDWCxJQUFBQSxNQUFNLFlBQUtDLE1BQU0sQ0FBQ0MsTUFBWixpQ0FEZ0M7QUFFdENFLElBQUFBLFNBQVMsRUFBRSxJQUFJLElBQUosR0FBVztBQUZnQixHQUExQyxFQWYyQyxDQW9CM0M7O0FBQ0FhLEVBQUFBLENBQUMsQ0FBQ3hELEVBQUYsQ0FBSyxhQUFMLEVBQW9CLFVBQUM4QixJQUFELEVBQU90QixRQUFQLEVBQW9CO0FBQ3BDeUMsSUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksdUJBQVosRUFBcUM7QUFDakNDLE1BQUFBLFFBQVEsRUFBRXJCLElBQUksQ0FBQ3FCLFFBQUwsSUFBaUJyQixJQUFJLENBQUNzQixJQURDO0FBRWpDNUMsTUFBQUEsUUFBUSxFQUFFQTtBQUZ1QixLQUFyQztBQUlBOUIsSUFBQUEsUUFBUSxDQUFDLGFBQUQsRUFBZ0I7QUFBQ29ELE1BQUFBLElBQUksRUFBSkEsSUFBRDtBQUFPdEIsTUFBQUEsUUFBUSxFQUFSQTtBQUFQLEtBQWhCLENBQVI7QUFDSCxHQU5EO0FBT0FnRCxFQUFBQSxDQUFDLENBQUN4RCxFQUFGLENBQUssY0FBTCxFQUFxQixVQUFDOEIsSUFBRCxFQUFVO0FBQzNCLFFBQU00QixRQUFRLEdBQUdDLElBQUksQ0FBQ0MsS0FBTCxDQUFXOUIsSUFBSSxDQUFDNEIsUUFBTCxLQUFrQixHQUE3QixDQUFqQjtBQUNBVCxJQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSx5QkFBWixFQUF1QztBQUNuQ0MsTUFBQUEsUUFBUSxFQUFFckIsSUFBSSxDQUFDcUIsUUFBTCxJQUFpQnJCLElBQUksQ0FBQ3NCLElBREc7QUFFbkNNLE1BQUFBLFFBQVEsRUFBRUEsUUFBUSxHQUFHO0FBRmMsS0FBdkM7QUFJQWhGLElBQUFBLFFBQVEsQ0FBQyxjQUFELEVBQWlCO0FBQUNvRCxNQUFBQSxJQUFJLEVBQUpBO0FBQUQsS0FBakIsQ0FBUjtBQUNILEdBUEQ7QUFRQTBCLEVBQUFBLENBQUMsQ0FBQ3hELEVBQUYsQ0FBSyxXQUFMLEVBQWtCLFVBQUM4QixJQUFELEVBQU8rQixLQUFQLEVBQWlCO0FBQy9CWixJQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSwrQkFBWixFQUE2QztBQUN6Q0MsTUFBQUEsUUFBUSxFQUFFckIsSUFBSSxDQUFDcUIsUUFBTCxJQUFpQnJCLElBQUksQ0FBQ3NCLElBRFM7QUFFekNVLE1BQUFBLGdCQUFnQixFQUFFaEMsSUFBSSxDQUFDZ0MsZ0JBRmtCO0FBR3pDUixNQUFBQSxJQUFJLEVBQUV4QixJQUFJLENBQUN3QjtBQUg4QixLQUE3QztBQUtBNUUsSUFBQUEsUUFBUSxDQUFDLFdBQUQsRUFBYztBQUFDb0QsTUFBQUEsSUFBSSxFQUFKQSxJQUFEO0FBQU8rQixNQUFBQSxLQUFLLEVBQUxBO0FBQVAsS0FBZCxDQUFSLENBTitCLENBTy9CO0FBQ0gsR0FSRDtBQVNBTCxFQUFBQSxDQUFDLENBQUN4RCxFQUFGLENBQUssV0FBTCxFQUFrQixVQUFDOEIsSUFBRCxFQUFVO0FBQ3hCbUIsSUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksc0JBQVosRUFBb0M7QUFDaENDLE1BQUFBLFFBQVEsRUFBRXJCLElBQUksQ0FBQ3FCLFFBQUwsSUFBaUJyQixJQUFJLENBQUNzQjtBQURBLEtBQXBDO0FBR0ExRSxJQUFBQSxRQUFRLENBQUMsV0FBRCxFQUFjO0FBQUNvRCxNQUFBQSxJQUFJLEVBQUpBO0FBQUQsS0FBZCxDQUFSO0FBQ0gsR0FMRDtBQU1BMEIsRUFBQUEsQ0FBQyxDQUFDeEQsRUFBRixDQUFLLFdBQUwsRUFBa0IsVUFBQzhCLElBQUQsRUFBT2lDLE9BQVAsRUFBbUI7QUFDakNkLElBQUFBLE9BQU8sQ0FBQ3pELEtBQVIsQ0FBYyxxQkFBZCxFQUFxQztBQUNqQzJELE1BQUFBLFFBQVEsRUFBRXJCLElBQUksQ0FBQ3FCLFFBQUwsSUFBaUJyQixJQUFJLENBQUNzQixJQURDO0FBRWpDVyxNQUFBQSxPQUFPLEVBQUVBO0FBRndCLEtBQXJDO0FBSUFyRixJQUFBQSxRQUFRLENBQUMsV0FBRCxFQUFjO0FBQUNvRCxNQUFBQSxJQUFJLEVBQUpBLElBQUQ7QUFBT2lDLE1BQUFBLE9BQU8sRUFBUEE7QUFBUCxLQUFkLENBQVI7QUFDSCxHQU5EO0FBT0FQLEVBQUFBLENBQUMsQ0FBQ3hELEVBQUYsQ0FBSyxhQUFMLEVBQW9CLFlBQU07QUFDdEJpRCxJQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSwyQkFBWjtBQUNBeEUsSUFBQUEsUUFBUSxDQUFDLGFBQUQsQ0FBUjtBQUNILEdBSEQ7QUFJQThFLEVBQUFBLENBQUMsQ0FBQ3hELEVBQUYsQ0FBSyxVQUFMLEVBQWlCLFlBQU07QUFDbkJpRCxJQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSwwQkFBWjtBQUNBeEUsSUFBQUEsUUFBUSxDQUFDLFVBQUQsQ0FBUjtBQUNILEdBSEQ7QUFJQThFLEVBQUFBLENBQUMsQ0FBQ3hELEVBQUYsQ0FBSyxVQUFMLEVBQWlCLFlBQU07QUFDbkIsUUFBTWdFLE9BQU8sR0FBRyxNQUFNUixDQUFDLENBQUNFLFFBQUYsRUFBdEI7QUFDQVQsSUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksNEJBQVosRUFBMEM7QUFDdENjLE1BQUFBLE9BQU8sRUFBRUwsSUFBSSxDQUFDQyxLQUFMLENBQVdJLE9BQVgsSUFBc0I7QUFETyxLQUExQztBQUdBdEYsSUFBQUEsUUFBUSxDQUFDLFVBQUQsRUFBYTtBQUFDc0YsTUFBQUEsT0FBTyxFQUFQQTtBQUFELEtBQWIsQ0FBUjtBQUNILEdBTkQ7QUFPQVIsRUFBQUEsQ0FBQyxDQUFDeEQsRUFBRixDQUFLLE9BQUwsRUFBYyxVQUFDK0QsT0FBRCxFQUFVakMsSUFBVixFQUFtQjtBQUM3Qm1CLElBQUFBLE9BQU8sQ0FBQ3pELEtBQVIsQ0FBYyxpQkFBZCxFQUFpQztBQUM3QnVFLE1BQUFBLE9BQU8sRUFBRUEsT0FEb0I7QUFFN0JqQyxNQUFBQSxJQUFJLEVBQUVBO0FBRnVCLEtBQWpDO0FBSUFwRCxJQUFBQSxRQUFRLENBQUMsT0FBRCxFQUFVO0FBQUNxRixNQUFBQSxPQUFPLEVBQVBBLE9BQUQ7QUFBVWpDLE1BQUFBLElBQUksRUFBSkE7QUFBVixLQUFWLENBQVI7QUFDSCxHQU5EO0FBT0EwQixFQUFBQSxDQUFDLENBQUN4RCxFQUFGLENBQUssT0FBTCxFQUFjLFlBQU07QUFDaEJpRCxJQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxrQkFBWjtBQUNBeEUsSUFBQUEsUUFBUSxDQUFDLE9BQUQsQ0FBUjtBQUNILEdBSEQ7QUFJQThFLEVBQUFBLENBQUMsQ0FBQ3hELEVBQUYsQ0FBSyxRQUFMLEVBQWUsWUFBTTtBQUNqQmlELElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLHFCQUFaO0FBQ0F4RSxJQUFBQSxRQUFRLENBQUMsUUFBRCxDQUFSO0FBQ0gsR0FIRCxFQXBGMkMsQ0F5RjNDOztBQUNBdUUsRUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksK0JBQVo7QUFDQU0sRUFBQUEsQ0FBQyxDQUFDUyxPQUFGLENBQVVuQyxJQUFWO0FBQ0FtQixFQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxvQkFBWjtBQUNBTSxFQUFBQSxDQUFDLENBQUN0RixNQUFGO0FBQ0gsQ0E5RkQ7QUFnR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FKLFFBQVEsQ0FBQ29HLG1CQUFULEdBQStCLFVBQVNDLE1BQVQsRUFBaUJ6RixRQUFqQixFQUEyQjtBQUN0RGtCLEVBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLElBQUFBLEdBQUcsWUFBSzBDLE1BQU0sQ0FBQ0MsTUFBWix1Q0FERDtBQUVGekMsSUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRkMsSUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkMsSUFBQUEsSUFBSSxFQUFFO0FBQUNnQixNQUFBQSxFQUFFLEVBQUVpRDtBQUFMLEtBSko7QUFLRjdELElBQUFBLFdBQVcsRUFBRWhDLE1BQU0sQ0FBQ2dDLFdBTGxCO0FBTUZDLElBQUFBLFNBTkUscUJBTVFDLFFBTlIsRUFNa0I7QUFDaEI5QixNQUFBQSxRQUFRLENBQUM4QixRQUFRLENBQUNOLElBQVYsQ0FBUjtBQUNILEtBUkM7QUFTRk8sSUFBQUEsU0FURSx1QkFTVTtBQUNSL0IsTUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNILEtBWEM7QUFZRmdDLElBQUFBLE9BWkUscUJBWVE7QUFDTmhDLE1BQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSDtBQWRDLEdBQU47QUFnQkgsQ0FqQkQ7QUFtQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQVosUUFBUSxDQUFDdUQsZUFBVCxHQUEyQixVQUFTNUMsUUFBVCxFQUFtRDtBQUFBLE1BQWhDMEYsTUFBZ0MsdUVBQXZCLElBQXVCO0FBQUEsTUFBakJ6RixRQUFpQix1RUFBTixJQUFNO0FBQzFFa0IsRUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsSUFBQUEsR0FBRyxZQUFLMEMsTUFBTSxDQUFDQyxNQUFaLDBCQUREO0FBRUZ6QyxJQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGQyxJQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGQyxJQUFBQSxJQUFJLEVBQUU7QUFBQ2tCLE1BQUFBLFFBQVEsRUFBRTNDO0FBQVgsS0FKSjtBQUtGNkIsSUFBQUEsV0FBVyxFQUFFaEMsTUFBTSxDQUFDZ0MsV0FMbEI7QUFNRkMsSUFBQUEsU0FORSx1QkFNVTtBQUNSLFVBQUk3QixRQUFRLEtBQUssSUFBakIsRUFBdUI7QUFDbkJBLFFBQUFBLFFBQVEsQ0FBQ3lGLE1BQUQsQ0FBUjtBQUNIO0FBQ0o7QUFWQyxHQUFOO0FBWUgsQ0FiRDtBQWVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBckcsUUFBUSxDQUFDc0csbUJBQVQsR0FBK0IsVUFBUzlFLE1BQVQsRUFBaUJaLFFBQWpCLEVBQTJCO0FBQ3REa0IsRUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsSUFBQUEsR0FBRyxZQUFLMEMsTUFBTSxDQUFDQyxNQUFaLDJDQUREO0FBRUZ6QyxJQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGQyxJQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGQyxJQUFBQSxJQUFJLEVBQUU7QUFDRm1FLE1BQUFBLEdBQUcsRUFBRS9FLE1BQU0sQ0FBQytFLEdBRFY7QUFFRmYsTUFBQUEsSUFBSSxFQUFFaEUsTUFBTSxDQUFDZ0UsSUFGWDtBQUdGZ0IsTUFBQUEsT0FBTyxFQUFFaEYsTUFBTSxDQUFDZ0YsT0FIZDtBQUlGeEUsTUFBQUEsR0FBRyxFQUFFUixNQUFNLENBQUNpRjtBQUpWLEtBSko7QUFVRmpFLElBQUFBLFdBQVcsRUFBRWhDLE1BQU0sQ0FBQ2dDLFdBVmxCO0FBV0ZDLElBQUFBLFNBWEUscUJBV1FDLFFBWFIsRUFXa0I7QUFDaEI5QixNQUFBQSxRQUFRLENBQUM4QixRQUFRLENBQUNOLElBQVYsQ0FBUjtBQUNILEtBYkM7QUFjRk8sSUFBQUEsU0FkRSxxQkFjUUQsUUFkUixFQWNrQjtBQUNoQjlCLE1BQUFBLFFBQVEsQ0FBQzhCLFFBQUQsQ0FBUjtBQUNILEtBaEJDO0FBaUJGRSxJQUFBQSxPQWpCRSxtQkFpQk1GLFFBakJOLEVBaUJnQjtBQUNkOUIsTUFBQUEsUUFBUSxDQUFDOEIsUUFBRCxDQUFSO0FBQ0g7QUFuQkMsR0FBTjtBQXFCSCxDQXRCRDtBQXdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQTFDLFFBQVEsQ0FBQzBHLHNCQUFULEdBQWtDLFVBQVNwRCxRQUFULEVBQW1CMUMsUUFBbkIsRUFBNkI7QUFDM0RrQixFQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxJQUFBQSxHQUFHLFlBQUswQyxNQUFNLENBQUNDLE1BQVoseUNBREQ7QUFFRnpDLElBQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZDLElBQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZDLElBQUFBLElBQUksRUFBRTtBQUFDa0IsTUFBQUEsUUFBUSxFQUFSQTtBQUFELEtBSko7QUFLRmQsSUFBQUEsV0FBVyxFQUFFaEMsTUFBTSxDQUFDZ0MsV0FMbEI7QUFNRkMsSUFBQUEsU0FORSxxQkFNUUMsUUFOUixFQU1rQjtBQUNoQjlCLE1BQUFBLFFBQVEsQ0FBQzhCLFFBQVEsQ0FBQ04sSUFBVixDQUFSO0FBQ0gsS0FSQztBQVNGTyxJQUFBQSxTQVRFLHVCQVNVO0FBQ1IvQixNQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0gsS0FYQztBQVlGZ0MsSUFBQUEsT0FaRSxxQkFZUTtBQUNOaEMsTUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBZEMsR0FBTjtBQWdCSCxDQWpCRDtBQW1CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBWixRQUFRLENBQUMyRyxXQUFULEdBQXVCLFVBQVNDLFFBQVQsRUFBbUJDLFNBQW5CLEVBQThCakcsUUFBOUIsRUFBd0M7QUFBQTs7QUFDM0R1RSxFQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxxQ0FBWixFQUFtRDtBQUMvQ3dCLElBQUFBLFFBQVEsRUFBRUEsUUFEcUM7QUFFL0NDLElBQUFBLFNBQVMsRUFBRUEsU0FGb0M7QUFHL0NDLElBQUFBLFlBQVksVUFBU2xHLFFBQVQ7QUFIbUMsR0FBbkQ7QUFNQSxNQUFNbUcsYUFBYSxHQUFHQyxRQUFRLENBQUNDLGNBQVQsQ0FBd0JMLFFBQXhCLENBQXRCOztBQUNBLE1BQUksQ0FBQ0csYUFBTCxFQUFvQjtBQUNoQjVCLElBQUFBLE9BQU8sQ0FBQ3pELEtBQVIsQ0FBYyw0QkFBZCxFQUE0QztBQUFFa0YsTUFBQUEsUUFBUSxFQUFFQTtBQUFaLEtBQTVDO0FBQ0E7QUFDSDs7QUFFRHpCLEVBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLHdCQUFaLEVBQXNDO0FBQ2xDd0IsSUFBQUEsUUFBUSxFQUFFQSxRQUR3QjtBQUVsQ00sSUFBQUEsT0FBTyxFQUFFSCxhQUFhLENBQUNHLE9BRlc7QUFHbENDLElBQUFBLFNBQVMsRUFBRUosYUFBYSxDQUFDSTtBQUhTLEdBQXRDO0FBTUEsTUFBTUMsU0FBUyxhQUFNMUMsTUFBTSxDQUFDQyxNQUFiLGlDQUFmO0FBRUEsTUFBTUosZUFBZSxHQUFHO0FBQ3BCRSxJQUFBQSxNQUFNLEVBQUUyQyxTQURZO0FBRXBCeEMsSUFBQUEsVUFBVSxFQUFFLEtBRlE7QUFHcEJDLElBQUFBLFNBQVMsRUFBRSxJQUFJLElBQUosR0FBVyxJQUhGO0FBSXBCRSxJQUFBQSxRQUFRLEVBQUUsQ0FKVTtBQUtwQkQsSUFBQUEsbUJBQW1CLEVBQUUsQ0FMRDtBQU1wQkUsSUFBQUEsUUFBUSxFQUFFNkI7QUFOVSxHQUF4QjtBQVNBMUIsRUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksK0JBQVosRUFBNkM7QUFDekNpQyxJQUFBQSxNQUFNLEVBQUU5QyxlQURpQztBQUV6QzZDLElBQUFBLFNBQVMsRUFBRUEsU0FGOEI7QUFHekNFLElBQUFBLFlBQVksYUFBRTVDLE1BQUYsNENBQUUsUUFBUUMsTUFIbUI7QUFJekM0QyxJQUFBQSxVQUFVLEVBQUVoRCxlQUFlLENBQUNFO0FBSmEsR0FBN0M7QUFPQSxNQUFNaUIsQ0FBQyxHQUFHLElBQUlDLFNBQUosQ0FBY3BCLGVBQWQsQ0FBVjtBQUVBWSxFQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxpQ0FBWixFQUErQztBQUMzQ1gsSUFBQUEsTUFBTSxFQUFFaUIsQ0FBQyxDQUFDOEIsSUFBRixDQUFPL0MsTUFENEI7QUFFM0NnRCxJQUFBQSxhQUFhLEVBQUUsQ0FBQyxDQUFDL0IsQ0FBQyxDQUFDOEIsSUFBRixDQUFPL0MsTUFGbUI7QUFHM0NpRCxJQUFBQSxPQUFPLEVBQUVoQyxDQUFDLENBQUNnQztBQUhnQyxHQUEvQzs7QUFNQSxNQUFJO0FBQ0FoQyxJQUFBQSxDQUFDLENBQUNpQyxZQUFGLENBQWVaLGFBQWY7QUFDQTVCLElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLGdEQUFaO0FBQ0gsR0FIRCxDQUdFLE9BQU8xRCxLQUFQLEVBQWM7QUFDWnlELElBQUFBLE9BQU8sQ0FBQ3pELEtBQVIsQ0FBYyxzQ0FBZCxFQUFzRDtBQUNsRGtGLE1BQUFBLFFBQVEsRUFBRUEsUUFEd0M7QUFFbERsRixNQUFBQSxLQUFLLEVBQUVBLEtBQUssQ0FBQ3VFO0FBRnFDLEtBQXREO0FBSUE7QUFDSDs7QUFFRFAsRUFBQUEsQ0FBQyxDQUFDeEQsRUFBRixDQUFLLGFBQUwsRUFBb0IsVUFBQzhCLElBQUQsRUFBT3RCLFFBQVAsRUFBb0I7QUFDcEN5QyxJQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxxQ0FBWixFQUFtRDtBQUMvQ0MsTUFBQUEsUUFBUSxFQUFFckIsSUFBSSxDQUFDcUIsUUFBTCxJQUFpQnJCLElBQUksQ0FBQ3NCLElBRGU7QUFFL0M1QyxNQUFBQSxRQUFRLEVBQUVBLFFBRnFDO0FBRy9Da0YsTUFBQUEsWUFBWSxVQUFTbEYsUUFBVCxDQUhtQztBQUkvQ21GLE1BQUFBLGNBQWMsRUFBRW5GLFFBQVEsR0FBR0EsUUFBUSxDQUFDb0YsTUFBWixHQUFxQjtBQUpFLEtBQW5ELEVBRG9DLENBUXBDOztBQUNBLFFBQUk7QUFDQSxVQUFNQyxjQUFjLEdBQUdDLElBQUksQ0FBQ0MsS0FBTCxDQUFXdkYsUUFBWCxDQUF2QjtBQUNBeUMsTUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksNENBQVosRUFBMEQ7QUFDdEQ4QyxRQUFBQSxNQUFNLEVBQUVILGNBQWMsQ0FBQ0csTUFEK0I7QUFFdERDLFFBQUFBLE9BQU8sRUFBRSxDQUFDLENBQUNKLGNBQWMsQ0FBQzNGLElBRjRCO0FBR3REZ0csUUFBQUEsUUFBUSxFQUFFTCxjQUFjLENBQUMzRixJQUFmLEdBQXNCc0IsTUFBTSxDQUFDQyxJQUFQLENBQVlvRSxjQUFjLENBQUMzRixJQUEzQixDQUF0QixHQUF5RCxFQUhiO0FBSXREaUcsUUFBQUEsUUFBUSxFQUFFTixjQUFjLENBQUNNLFFBSjZCO0FBS3REQyxRQUFBQSxZQUFZLEVBQUVQO0FBTHdDLE9BQTFEO0FBT0gsS0FURCxDQVNFLE9BQU9RLENBQVAsRUFBVTtBQUNScEQsTUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksdUNBQVosRUFBcUQ7QUFDakRvRCxRQUFBQSxXQUFXLEVBQUU5RixRQURvQztBQUVqRCtGLFFBQUFBLFVBQVUsRUFBRUYsQ0FBQyxDQUFDdEM7QUFGbUMsT0FBckQ7QUFJSDs7QUFFRHJGLElBQUFBLFFBQVEsQ0FBQyxhQUFELEVBQWdCO0FBQUNvRCxNQUFBQSxJQUFJLEVBQUpBLElBQUQ7QUFBT3RCLE1BQUFBLFFBQVEsRUFBUkE7QUFBUCxLQUFoQixDQUFSO0FBQ0gsR0ExQkQ7QUEyQkFnRCxFQUFBQSxDQUFDLENBQUN4RCxFQUFGLENBQUssY0FBTCxFQUFxQixVQUFDOEIsSUFBRCxFQUFVO0FBQzNCLFFBQU00QixRQUFRLEdBQUdDLElBQUksQ0FBQ0MsS0FBTCxDQUFXOUIsSUFBSSxDQUFDNEIsUUFBTCxLQUFrQixHQUE3QixDQUFqQjtBQUNBVCxJQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSx1Q0FBWixFQUFxRDtBQUNqREMsTUFBQUEsUUFBUSxFQUFFckIsSUFBSSxDQUFDcUIsUUFBTCxJQUFpQnJCLElBQUksQ0FBQ3NCLElBRGlCO0FBRWpETSxNQUFBQSxRQUFRLEVBQUVBLFFBQVEsR0FBRztBQUY0QixLQUFyRDtBQUlBaEYsSUFBQUEsUUFBUSxDQUFDLGNBQUQsRUFBaUI7QUFBQ29ELE1BQUFBLElBQUksRUFBSkE7QUFBRCxLQUFqQixDQUFSO0FBQ0gsR0FQRDtBQVFBMEIsRUFBQUEsQ0FBQyxDQUFDeEQsRUFBRixDQUFLLFdBQUwsRUFBa0IsVUFBQzhCLElBQUQsRUFBTytCLEtBQVAsRUFBaUI7QUFDL0JaLElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLDZDQUFaLEVBQTJEO0FBQ3ZEQyxNQUFBQSxRQUFRLEVBQUVyQixJQUFJLENBQUNxQixRQUFMLElBQWlCckIsSUFBSSxDQUFDc0IsSUFEdUI7QUFFdkRVLE1BQUFBLGdCQUFnQixFQUFFaEMsSUFBSSxDQUFDZ0MsZ0JBRmdDO0FBR3ZEUixNQUFBQSxJQUFJLEVBQUV4QixJQUFJLENBQUN3QixJQUg0QztBQUl2RG9CLE1BQUFBLFFBQVEsRUFBRUE7QUFKNkMsS0FBM0Q7QUFNQXpCLElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLGdEQUFaO0FBQ0FNLElBQUFBLENBQUMsQ0FBQ3RGLE1BQUY7QUFDQVEsSUFBQUEsUUFBUSxDQUFDLFdBQUQsRUFBYztBQUFDb0QsTUFBQUEsSUFBSSxFQUFKQSxJQUFEO0FBQU8rQixNQUFBQSxLQUFLLEVBQUxBO0FBQVAsS0FBZCxDQUFSO0FBQ0gsR0FWRDtBQVdBTCxFQUFBQSxDQUFDLENBQUN4RCxFQUFGLENBQUssV0FBTCxFQUFrQixVQUFDOEIsSUFBRCxFQUFVO0FBQ3hCbUIsSUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksb0NBQVosRUFBa0Q7QUFDOUNDLE1BQUFBLFFBQVEsRUFBRXJCLElBQUksQ0FBQ3FCLFFBQUwsSUFBaUJyQixJQUFJLENBQUNzQjtBQURjLEtBQWxEO0FBR0ExRSxJQUFBQSxRQUFRLENBQUMsV0FBRCxFQUFjO0FBQUNvRCxNQUFBQSxJQUFJLEVBQUpBO0FBQUQsS0FBZCxDQUFSO0FBQ0gsR0FMRDtBQU1BMEIsRUFBQUEsQ0FBQyxDQUFDeEQsRUFBRixDQUFLLFdBQUwsRUFBa0IsVUFBQzhCLElBQUQsRUFBT2lDLE9BQVAsRUFBbUI7QUFDakNkLElBQUFBLE9BQU8sQ0FBQ3pELEtBQVIsQ0FBYyxtQ0FBZCxFQUFtRDtBQUMvQzJELE1BQUFBLFFBQVEsRUFBRXJCLElBQUksQ0FBQ3FCLFFBQUwsSUFBaUJyQixJQUFJLENBQUNzQixJQURlO0FBRS9DVyxNQUFBQSxPQUFPLEVBQUVBLE9BRnNDO0FBRy9DeUMsTUFBQUEsV0FBVyxVQUFTekMsT0FBVCxDQUhvQztBQUkvQ1csTUFBQUEsUUFBUSxFQUFFQSxRQUpxQztBQUsvQytCLE1BQUFBLFlBQVksRUFBRTNFLElBQUksQ0FBQ2dDLGdCQUw0QjtBQU0vQ1QsTUFBQUEsUUFBUSxFQUFFdkIsSUFBSSxDQUFDd0I7QUFOZ0MsS0FBbkQsRUFEaUMsQ0FVakM7O0FBQ0EsUUFBSVMsT0FBTyxJQUFJLE9BQU9BLE9BQVAsS0FBbUIsUUFBbEMsRUFBNEM7QUFDeEMsVUFBSTtBQUNBLFlBQU0yQyxRQUFRLEdBQUdaLElBQUksQ0FBQ0MsS0FBTCxDQUFXaEMsT0FBWCxDQUFqQjtBQUNBZCxRQUFBQSxPQUFPLENBQUN6RCxLQUFSLENBQWMsc0NBQWQsRUFBc0RrSCxRQUF0RDtBQUNILE9BSEQsQ0FHRSxPQUFPTCxDQUFQLEVBQVU7QUFDUnBELFFBQUFBLE9BQU8sQ0FBQ3pELEtBQVIsQ0FBYyx1Q0FBZCxFQUF1RHVFLE9BQXZEO0FBQ0g7QUFDSjs7QUFFRHJGLElBQUFBLFFBQVEsQ0FBQyxXQUFELEVBQWM7QUFBQ29ELE1BQUFBLElBQUksRUFBSkEsSUFBRDtBQUFPaUMsTUFBQUEsT0FBTyxFQUFQQTtBQUFQLEtBQWQsQ0FBUjtBQUNILEdBckJEO0FBc0JBUCxFQUFBQSxDQUFDLENBQUN4RCxFQUFGLENBQUssYUFBTCxFQUFvQixZQUFNO0FBQ3RCaUQsSUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVkseUNBQVo7QUFDQXhFLElBQUFBLFFBQVEsQ0FBQyxhQUFELENBQVI7QUFDSCxHQUhEO0FBSUE4RSxFQUFBQSxDQUFDLENBQUN4RCxFQUFGLENBQUssVUFBTCxFQUFpQixZQUFNO0FBQ25CaUQsSUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksd0NBQVo7QUFDQXhFLElBQUFBLFFBQVEsQ0FBQyxVQUFELENBQVI7QUFDSCxHQUhEO0FBSUE4RSxFQUFBQSxDQUFDLENBQUN4RCxFQUFGLENBQUssVUFBTCxFQUFpQixZQUFNO0FBQ25CLFFBQU1nRSxPQUFPLEdBQUcsTUFBTVIsQ0FBQyxDQUFDRSxRQUFGLEVBQXRCO0FBQ0FULElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLDBDQUFaLEVBQXdEO0FBQ3BEYyxNQUFBQSxPQUFPLEVBQUVMLElBQUksQ0FBQ0MsS0FBTCxDQUFXSSxPQUFYLElBQXNCO0FBRHFCLEtBQXhEO0FBR0F0RixJQUFBQSxRQUFRLENBQUMsVUFBRCxFQUFhO0FBQUNzRixNQUFBQSxPQUFPLEVBQVBBO0FBQUQsS0FBYixDQUFSO0FBQ0gsR0FORDtBQU9BUixFQUFBQSxDQUFDLENBQUN4RCxFQUFGLENBQUssT0FBTCxFQUFjLFVBQUMrRCxPQUFELEVBQVVqQyxJQUFWLEVBQW1CO0FBQzdCbUIsSUFBQUEsT0FBTyxDQUFDekQsS0FBUixDQUFjLCtCQUFkLEVBQStDO0FBQzNDdUUsTUFBQUEsT0FBTyxFQUFFQSxPQURrQztBQUUzQ2pDLE1BQUFBLElBQUksRUFBRUEsSUFGcUM7QUFHM0M0QyxNQUFBQSxRQUFRLEVBQUVBO0FBSGlDLEtBQS9DO0FBS0FoRyxJQUFBQSxRQUFRLENBQUMsT0FBRCxFQUFVO0FBQUNxRixNQUFBQSxPQUFPLEVBQVBBLE9BQUQ7QUFBVWpDLE1BQUFBLElBQUksRUFBSkE7QUFBVixLQUFWLENBQVI7QUFDSCxHQVBEO0FBUUEwQixFQUFBQSxDQUFDLENBQUN4RCxFQUFGLENBQUssT0FBTCxFQUFjLFlBQU07QUFDaEJpRCxJQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxnQ0FBWjtBQUNBeEUsSUFBQUEsUUFBUSxDQUFDLE9BQUQsQ0FBUjtBQUNILEdBSEQ7QUFJQThFLEVBQUFBLENBQUMsQ0FBQ3hELEVBQUYsQ0FBSyxRQUFMLEVBQWUsWUFBTTtBQUNqQmlELElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLG1DQUFaO0FBQ0F4RSxJQUFBQSxRQUFRLENBQUMsUUFBRCxDQUFSO0FBQ0gsR0FIRDtBQUtBdUUsRUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksNkRBQVo7QUFDSCxDQW5LRCxDLENBcUtBOzs7QUFDQXlELE1BQU0sQ0FBQzdJLFFBQVAsR0FBa0JBLFFBQWxCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaUNsaWVudCwgUGJ4QXBpLCBSZXN1bWFibGUsIENvbmZpZywgZ2xvYmFsUm9vdFVybCAqLyBcblxuLyoqXG4gKiBGaWxlc0FQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgZmlsZSBtYW5hZ2VtZW50IG9wZXJhdGlvbnNcbiAqXG4gKiBQcm92aWRlcyBib3RoIHN0YW5kYXJkIFJFU1Qgb3BlcmF0aW9ucyBmb3IgZmlsZSBDUlVEIGFuZCBjdXN0b20gbWV0aG9kc1xuICogZm9yIHNwZWNpYWxpemVkIG9wZXJhdGlvbnMgbGlrZSBjaHVua2VkIHVwbG9hZCBhbmQgZmlybXdhcmUgZG93bmxvYWQuXG4gKlxuICogQGNsYXNzIEZpbGVzQVBJXG4gKi9cbmNvbnN0IEZpbGVzQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvZmlsZXMnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgdXBsb2FkOiAnOnVwbG9hZCcsXG4gICAgICAgIHVwbG9hZFN0YXR1czogJzp1cGxvYWRTdGF0dXMnLFxuICAgICAgICBkb3dubG9hZEZpcm13YXJlOiAnOmRvd25sb2FkRmlybXdhcmUnLFxuICAgICAgICBmaXJtd2FyZVN0YXR1czogJzpmaXJtd2FyZVN0YXR1cydcbiAgICB9XG59KTtcblxuLy8gQWRkIG1ldGhvZHMgdG8gRmlsZXNBUEkgdXNpbmcgUGJ4QXBpIHV0aWxpdHlcblBieEFwaS5leHRlbmRBcGlDbGllbnQoRmlsZXNBUEksIHtcblxuICAgIC8qKlxuICAgICAqIEdldCBmaWxlIGNvbnRlbnQgYnkgcGF0aFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIEZpbGUgcGF0aCAod2lsbCBiZSBVUkwgZW5jb2RlZClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbbmVlZE9yaWdpbmFsPWZhbHNlXSAtIFdoZXRoZXIgdG8gcmV0dXJuIG9yaWdpbmFsIGNvbnRlbnRcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBqUXVlcnkgQVBJIGNhbGwgb2JqZWN0XG4gICAgICovXG4gICAgZ2V0RmlsZUNvbnRlbnQoZmlsZVBhdGgsIGNhbGxiYWNrLCBuZWVkT3JpZ2luYWwgPSBmYWxzZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gVmFsaWRhdGUgcGFyYW1ldGVyc1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IFBieEFwaS52YWxpZGF0ZUFwaVBhcmFtcyh7IGZpbGVQYXRoLCBjYWxsYmFjayB9LCB7XG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnZmlsZVBhdGgnLCAnY2FsbGJhY2snXSxcbiAgICAgICAgICAgICAgICB0eXBlczogeyBmaWxlUGF0aDogJ3N0cmluZycsIGNhbGxiYWNrOiAnZnVuY3Rpb24nIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIXZhbGlkYXRpb24uaXNWYWxpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0ZpbGVzQVBJLmdldEZpbGVDb250ZW50JywgdmFsaWRhdGlvbi5lcnJvcnMuam9pbignLCAnKSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBlbmNvZGVkUGF0aCA9IGVuY29kZVVSSUNvbXBvbmVudChmaWxlUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBuZWVkT3JpZ2luYWwgPyB7IG5lZWRPcmlnaW5hbDogJ3RydWUnIH0gOiB7fTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEdldChwYXJhbXMsIGNhbGxiYWNrLCBlbmNvZGVkUGF0aCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gUGJ4QXBpLmhhbmRsZUFwaUVycm9yKCdGaWxlc0FQSS5nZXRGaWxlQ29udGVudCcsIGVycm9yLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBsb2FkIGZpbGUgY29udGVudCB1c2luZyBQVVQgbWV0aG9kIChzaW1wbGUgdXBsb2FkKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIERlc3RpbmF0aW9uIGZpbGUgcGF0aFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfEJsb2J9IGNvbnRlbnQgLSBGaWxlIGNvbnRlbnRcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtjb250ZW50VHlwZT0nYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ10gLSBDb250ZW50IHR5cGVcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBqUXVlcnkgQVBJIGNhbGwgb2JqZWN0XG4gICAgICovXG4gICAgdXBsb2FkRmlsZUNvbnRlbnQoZmlsZVBhdGgsIGNvbnRlbnQsIGNhbGxiYWNrLCBjb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBwYXJhbWV0ZXJzXG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gUGJ4QXBpLnZhbGlkYXRlQXBpUGFyYW1zKHsgZmlsZVBhdGgsIGNvbnRlbnQsIGNhbGxiYWNrIH0sIHtcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWydmaWxlUGF0aCcsICdjb250ZW50JywgJ2NhbGxiYWNrJ10sXG4gICAgICAgICAgICAgICAgdHlwZXM6IHsgZmlsZVBhdGg6ICdzdHJpbmcnLCBjYWxsYmFjazogJ2Z1bmN0aW9uJyB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCF2YWxpZGF0aW9uLmlzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUGJ4QXBpLmhhbmRsZUFwaUVycm9yKCdGaWxlc0FQSS51cGxvYWRGaWxlQ29udGVudCcsIHZhbGlkYXRpb24uZXJyb3JzLmpvaW4oJywgJyksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZW5jb2RlZFBhdGggPSBlbmNvZGVVUklDb21wb25lbnQoZmlsZVBhdGgpO1xuXG4gICAgICAgICAgICAvLyBVc2UgY3VzdG9tIFBVVCBjYWxsIHdpdGggY29udGVudCB0eXBlIGhlYWRlclxuICAgICAgICAgICAgcmV0dXJuICQuYXBpKHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke3RoaXMuYXBpVXJsfS8ke2VuY29kZWRQYXRofWAsXG4gICAgICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgICAgICAgICAgZGF0YTogY29udGVudCxcbiAgICAgICAgICAgICAgICBiZWZvcmVYSFIoeGhyKSB7XG4gICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCBjb250ZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4aHI7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25FcnJvcihlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0ZpbGVzQVBJLnVwbG9hZEZpbGVDb250ZW50JywgZXJyb3IsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0ZpbGVzQVBJLnVwbG9hZEZpbGVDb250ZW50JywgZXJyb3IsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgZmlsZSBieSBwYXRoXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gRmlsZSBwYXRoIHRvIGRlbGV0ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBqUXVlcnkgQVBJIGNhbGwgb2JqZWN0XG4gICAgICovXG4gICAgZGVsZXRlRmlsZShmaWxlUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHBhcmFtZXRlcnNcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSBQYnhBcGkudmFsaWRhdGVBcGlQYXJhbXMoeyBmaWxlUGF0aCwgY2FsbGJhY2sgfSwge1xuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2ZpbGVQYXRoJywgJ2NhbGxiYWNrJ10sXG4gICAgICAgICAgICAgICAgdHlwZXM6IHsgZmlsZVBhdGg6ICdzdHJpbmcnLCBjYWxsYmFjazogJ2Z1bmN0aW9uJyB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCF2YWxpZGF0aW9uLmlzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUGJ4QXBpLmhhbmRsZUFwaUVycm9yKCdGaWxlc0FQSS5kZWxldGVGaWxlJywgdmFsaWRhdGlvbi5lcnJvcnMuam9pbignLCAnKSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBlbmNvZGVkUGF0aCA9IGVuY29kZVVSSUNvbXBvbmVudChmaWxlUGF0aCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsRGVsZXRlKGNhbGxiYWNrLCBlbmNvZGVkUGF0aCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gUGJ4QXBpLmhhbmRsZUFwaUVycm9yKCdGaWxlc0FQSS5kZWxldGVGaWxlJywgZXJyb3IsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaHVua2VkIGZpbGUgdXBsb2FkIChSZXN1bWFibGUuanMgc3VwcG9ydClcbiAgICAgKiBAcGFyYW0ge0Zvcm1EYXRhfSBmb3JtRGF0YSAtIEZvcm0gZGF0YSB3aXRoIGZpbGUgY2h1bmtzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEFQSSBjYWxsIHJlc3VsdFxuICAgICAqL1xuICAgIHVwbG9hZENodW5rZWQoZm9ybURhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gUGJ4QXBpLnZhbGlkYXRlQXBpUGFyYW1zKHsgZm9ybURhdGEsIGNhbGxiYWNrIH0sIHtcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWydmb3JtRGF0YScsICdjYWxsYmFjayddLFxuICAgICAgICAgICAgICAgIHR5cGVzOiB7IGNhbGxiYWNrOiAnZnVuY3Rpb24nIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIXZhbGlkYXRpb24uaXNWYWxpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0ZpbGVzQVBJLnVwbG9hZENodW5rZWQnLCB2YWxpZGF0aW9uLmVycm9ycy5qb2luKCcsICcpLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ3VwbG9hZCcsIGZvcm1EYXRhLCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0ZpbGVzQVBJLnVwbG9hZENodW5rZWQnLCBlcnJvciwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCB1cGxvYWQgc3RhdHVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVwbG9hZElkIC0gVXBsb2FkIGlkZW50aWZpZXJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge09iamVjdH0gQVBJIGNhbGwgcmVzdWx0XG4gICAgICovXG4gICAgZ2V0VXBsb2FkU3RhdHVzKHVwbG9hZElkLCBjYWxsYmFjaykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IFBieEFwaS52YWxpZGF0ZUFwaVBhcmFtcyh7IHVwbG9hZElkLCBjYWxsYmFjayB9LCB7XG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXBsb2FkSWQnLCAnY2FsbGJhY2snXSxcbiAgICAgICAgICAgICAgICB0eXBlczogeyB1cGxvYWRJZDogJ3N0cmluZycsIGNhbGxiYWNrOiAnZnVuY3Rpb24nIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIXZhbGlkYXRpb24uaXNWYWxpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0ZpbGVzQVBJLmdldFVwbG9hZFN0YXR1cycsIHZhbGlkYXRpb24uZXJyb3JzLmpvaW4oJywgJyksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0geyBpZDogdXBsb2FkSWQgfTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ3VwbG9hZFN0YXR1cycsIHBhcmFtcywgY2FsbGJhY2ssICdHRVQnKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0ZpbGVzQVBJLmdldFVwbG9hZFN0YXR1cycsIGVycm9yLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRG93bmxvYWQgZmlybXdhcmUgZnJvbSBleHRlcm5hbCBVUkxcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gRG93bmxvYWQgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudXJsIC0gRmlybXdhcmUgVVJMXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtwYXJhbXMubWQ1XSAtIEV4cGVjdGVkIE1ENSBoYXNoXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEFQSSBjYWxsIHJlc3VsdFxuICAgICAqL1xuICAgIGRvd25sb2FkRmlybXdhcmUocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IFBieEFwaS52YWxpZGF0ZUFwaVBhcmFtcyh7IHBhcmFtcywgY2FsbGJhY2sgfSwge1xuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3BhcmFtcycsICdjYWxsYmFjayddLFxuICAgICAgICAgICAgICAgIHR5cGVzOiB7IHBhcmFtczogJ29iamVjdCcsIGNhbGxiYWNrOiAnZnVuY3Rpb24nIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIXZhbGlkYXRpb24uaXNWYWxpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0ZpbGVzQVBJLmRvd25sb2FkRmlybXdhcmUnLCB2YWxpZGF0aW9uLmVycm9ycy5qb2luKCcsICcpLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2Rvd25sb2FkRmlybXdhcmUnLCBwYXJhbXMsIGNhbGxiYWNrLCAnUE9TVCcpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIFBieEFwaS5oYW5kbGVBcGlFcnJvcignRmlsZXNBUEkuZG93bmxvYWRGaXJtd2FyZScsIGVycm9yLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGZpcm13YXJlIGRvd25sb2FkIHN0YXR1c1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIEZpcm13YXJlIGZpbGVuYW1lXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEFQSSBjYWxsIHJlc3VsdFxuICAgICAqL1xuICAgIGdldEZpcm13YXJlU3RhdHVzKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IFBieEFwaS52YWxpZGF0ZUFwaVBhcmFtcyh7IGZpbGVuYW1lLCBjYWxsYmFjayB9LCB7XG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnZmlsZW5hbWUnLCAnY2FsbGJhY2snXSxcbiAgICAgICAgICAgICAgICB0eXBlczogeyBmaWxlbmFtZTogJ3N0cmluZycsIGNhbGxiYWNrOiAnZnVuY3Rpb24nIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIXZhbGlkYXRpb24uaXNWYWxpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0ZpbGVzQVBJLmdldEZpcm13YXJlU3RhdHVzJywgdmFsaWRhdGlvbi5lcnJvcnMuam9pbignLCAnKSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7IGZpbGVuYW1lOiBmaWxlbmFtZSB9O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZmlybXdhcmVTdGF0dXMnLCBwYXJhbXMsIGNhbGxiYWNrLCAnR0VUJyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gUGJ4QXBpLmhhbmRsZUFwaUVycm9yKCdGaWxlc0FQSS5nZXRGaXJtd2FyZVN0YXR1cycsIGVycm9yLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuLyoqXG4gKiBMZWdhY3kgY29tcGF0aWJpbGl0eSBtZXRob2RzIC0gdGhlc2UgbWFwIHRvIHRoZSBuZXcgUkVTVCBBUEkgbWV0aG9kc1xuICogVGhlc2UgbWFpbnRhaW4gYmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aGlsZSB1c2luZyB0aGUgbmV3IHN0YW5kYXJkaXplZCBtZXRob2RzXG4gKi9cblxuLyoqXG4gKiBMZWdhY3k6IFJlbW92ZSBhdWRpbyBmaWxlIChtYXBzIHRvIGRlbGV0ZUZpbGUpXG4gKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBBdWRpbyBmaWxlIHBhdGhcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAqL1xuRmlsZXNBUEkucmVtb3ZlQXVkaW9GaWxlID0gZnVuY3Rpb24oZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZXRlRmlsZShmaWxlbmFtZSwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBMZWdhY3k6IFVwbG9hZCBmaWxlIHdpdGggcGFyYW1zIChtYXBzIHRvIHVwbG9hZENodW5rZWQpXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gVXBsb2FkIHBhcmFtZXRlcnNcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAqL1xuRmlsZXNBUEkudXBsb2FkRmlsZUZyb21QYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgLy8gQ29udmVydCBvYmplY3QgdG8gRm9ybURhdGEgZm9yIGNodW5rZWQgdXBsb2FkXG4gICAgY29uc3QgZm9ybURhdGEgPSBuZXcgRm9ybURhdGEoKTtcbiAgICBPYmplY3Qua2V5cyhwYXJhbXMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgaWYgKGtleSA9PT0gJ2ZpbGVzJyAmJiBBcnJheS5pc0FycmF5KHBhcmFtc1trZXldKSkge1xuICAgICAgICAgICAgLy8gSGFuZGxlIGZpbGUgYXJyYXlzIGZyb20gbGVnYWN5IEFQSVxuICAgICAgICAgICAgcGFyYW1zW2tleV0uZm9yRWFjaCgoZmlsZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZS5maWxlX3BhdGggJiYgZmlsZS5maWxlX25hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyB3b3VsZCBuZWVkIHRvIGJlIGhhbmRsZWQgZGlmZmVyZW50bHkgaW4gcmVhbCBzY2VuYXJpb1xuICAgICAgICAgICAgICAgICAgICAvLyBhcyB3ZSBjYW4ndCByZWNyZWF0ZSBGaWxlIG9iamVjdHMgZnJvbSBwYXRoc1xuICAgICAgICAgICAgICAgICAgICBmb3JtRGF0YS5hcHBlbmQoYGZpbGVfJHtpbmRleH1gLCBmaWxlLmZpbGVfbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3JtRGF0YS5hcHBlbmQoa2V5LCBwYXJhbXNba2V5XSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB0aGlzLnVwbG9hZENodW5rZWQoZm9ybURhdGEsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogTGVnYWN5OiBHZXQgdXBsb2FkIHN0YXR1cyAobWFwcyB0byBnZXRVcGxvYWRTdGF0dXMpXG4gKiBAcGFyYW0ge3N0cmluZ30gdXBsb2FkSWQgLSBVcGxvYWQgaWRlbnRpZmllclxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICovXG5GaWxlc0FQSS5zdGF0dXNVcGxvYWRGaWxlID0gZnVuY3Rpb24odXBsb2FkSWQsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0VXBsb2FkU3RhdHVzKHVwbG9hZElkLCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIENvbmZpZ3VyZSBSZXN1bWFibGUuanMgdG8gdXNlIHRoZSBuZXcgdjMgQVBJXG4gKiBAcGFyYW0ge29iamVjdH0gcmVzdW1hYmxlQ29uZmlnIC0gUmVzdW1hYmxlLmpzIGNvbmZpZ3VyYXRpb25cbiAqIEByZXR1cm5zIHtvYmplY3R9IFVwZGF0ZWQgY29uZmlndXJhdGlvblxuICovXG5GaWxlc0FQSS5jb25maWd1cmVSZXN1bWFibGUgPSBmdW5jdGlvbihyZXN1bWFibGVDb25maWcgPSB7fSkge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgdGFyZ2V0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92My9maWxlczp1cGxvYWRgLFxuICAgICAgICB0ZXN0Q2h1bmtzOiBmYWxzZSxcbiAgICAgICAgY2h1bmtTaXplOiAzICogMTAyNCAqIDEwMjQsIC8vIDNNQiBjaHVua3NcbiAgICAgICAgc2ltdWx0YW5lb3VzVXBsb2FkczogMSxcbiAgICAgICAgbWF4RmlsZXM6IDEsXG4gICAgICAgIGZpbGVUeXBlOiBbJyonXSxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ1gtUmVxdWVzdGVkLVdpdGgnOiAnWE1MSHR0cFJlcXVlc3QnXG4gICAgICAgIH1cbiAgICB9LCByZXN1bWFibGVDb25maWcpO1xufTtcblxuLyoqXG4gKiBVcGxvYWQgZmlsZSB1c2luZyBSZXN1bWFibGUuanNcbiAqIEBwYXJhbSB7RmlsZX0gZmlsZSAtIEZpbGUgb2JqZWN0IHRvIHVwbG9hZFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICovXG5GaWxlc0FQSS51cGxvYWRGaWxlID0gZnVuY3Rpb24oZmlsZSwgY2FsbGJhY2spIHtcbiAgICBjb25zb2xlLmxvZygn8J+UtSBGaWxlc0FQSS51cGxvYWRGaWxlIHN0YXJ0ZWQnLCB7XG4gICAgICAgIGZpbGVOYW1lOiBmaWxlLm5hbWUsXG4gICAgICAgIGZpbGVTaXplOiBmaWxlLnNpemUsXG4gICAgICAgIGZpbGVUeXBlOiBmaWxlLnR5cGVcbiAgICB9KTtcblxuICAgIGNvbnN0IHIgPSBuZXcgUmVzdW1hYmxlKHtcbiAgICAgICAgdGFyZ2V0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92My9maWxlczp1cGxvYWRgLFxuICAgICAgICB0ZXN0Q2h1bmtzOiBmYWxzZSxcbiAgICAgICAgY2h1bmtTaXplOiAzICogMTAyNCAqIDEwMjQsXG4gICAgICAgIHNpbXVsdGFuZW91c1VwbG9hZHM6IDEsXG4gICAgICAgIG1heEZpbGVzOiAxLFxuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coJ/CflKcgUmVzdW1hYmxlLmpzIGNvbmZpZ3VyZWQnLCB7XG4gICAgICAgIHRhcmdldDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjMvZmlsZXM6dXBsb2FkYCxcbiAgICAgICAgY2h1bmtTaXplOiAzICogMTAyNCAqIDEwMjRcbiAgICB9KTtcblxuICAgIC8vIFNldCB1cCBldmVudCBoYW5kbGVycyBmaXJzdFxuICAgIHIub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfinIUgRmlsZSB1cGxvYWQgc3VjY2VzcycsIHtcbiAgICAgICAgICAgIGZpbGVOYW1lOiBmaWxlLmZpbGVOYW1lIHx8IGZpbGUubmFtZSxcbiAgICAgICAgICAgIHJlc3BvbnNlOiByZXNwb25zZVxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbGJhY2soJ2ZpbGVTdWNjZXNzJywge2ZpbGUsIHJlc3BvbnNlfSk7XG4gICAgfSk7XG4gICAgci5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBNYXRoLnJvdW5kKGZpbGUucHJvZ3Jlc3MoKSAqIDEwMCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5OIIEZpbGUgdXBsb2FkIHByb2dyZXNzJywge1xuICAgICAgICAgICAgZmlsZU5hbWU6IGZpbGUuZmlsZU5hbWUgfHwgZmlsZS5uYW1lLFxuICAgICAgICAgICAgcHJvZ3Jlc3M6IHByb2dyZXNzICsgJyUnXG4gICAgICAgIH0pO1xuICAgICAgICBjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcbiAgICB9KTtcbiAgICByLm9uKCdmaWxlQWRkZWQnLCAoZmlsZSwgZXZlbnQpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk4EgRmlsZSBhZGRlZCB0byB1cGxvYWQgcXVldWUnLCB7XG4gICAgICAgICAgICBmaWxlTmFtZTogZmlsZS5maWxlTmFtZSB8fCBmaWxlLm5hbWUsXG4gICAgICAgICAgICB1bmlxdWVJZGVudGlmaWVyOiBmaWxlLnVuaXF1ZUlkZW50aWZpZXIsXG4gICAgICAgICAgICBzaXplOiBmaWxlLnNpemVcbiAgICAgICAgfSk7XG4gICAgICAgIGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcbiAgICAgICAgLy8gVXBsb2FkIHdpbGwgc3RhcnQgYXV0b21hdGljYWxseSBhZnRlciBmaWxlQWRkZWRcbiAgICB9KTtcbiAgICByLm9uKCdmaWxlUmV0cnknLCAoZmlsZSkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBGaWxlIHVwbG9hZCByZXRyeScsIHtcbiAgICAgICAgICAgIGZpbGVOYW1lOiBmaWxlLmZpbGVOYW1lIHx8IGZpbGUubmFtZVxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG4gICAgfSk7XG4gICAgci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZpbGUgdXBsb2FkIGVycm9yJywge1xuICAgICAgICAgICAgZmlsZU5hbWU6IGZpbGUuZmlsZU5hbWUgfHwgZmlsZS5uYW1lLFxuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbGJhY2soJ2ZpbGVFcnJvcicsIHtmaWxlLCBtZXNzYWdlfSk7XG4gICAgfSk7XG4gICAgci5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5qAIFVwbG9hZCBwcm9jZXNzIHN0YXJ0ZWQnKTtcbiAgICAgICAgY2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG4gICAgfSk7XG4gICAgci5vbignY29tcGxldGUnLCAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn4+BIEFsbCB1cGxvYWRzIGNvbXBsZXRlZCcpO1xuICAgICAgICBjYWxsYmFjaygnY29tcGxldGUnKTtcbiAgICB9KTtcbiAgICByLm9uKCdwcm9ncmVzcycsICgpID0+IHtcbiAgICAgICAgY29uc3QgcGVyY2VudCA9IDEwMCAqIHIucHJvZ3Jlc3MoKTtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk4ogT3ZlcmFsbCB1cGxvYWQgcHJvZ3Jlc3MnLCB7XG4gICAgICAgICAgICBwZXJjZW50OiBNYXRoLnJvdW5kKHBlcmNlbnQpICsgJyUnXG4gICAgICAgIH0pO1xuICAgICAgICBjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuICAgIH0pO1xuICAgIHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcign8J+SpSBVcGxvYWQgZXJyb3InLCB7XG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgZmlsZTogZmlsZVxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbGJhY2soJ2Vycm9yJywge21lc3NhZ2UsIGZpbGV9KTtcbiAgICB9KTtcbiAgICByLm9uKCdwYXVzZScsICgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ+KPuO+4jyBVcGxvYWQgcGF1c2VkJyk7XG4gICAgICAgIGNhbGxiYWNrKCdwYXVzZScpO1xuICAgIH0pO1xuICAgIHIub24oJ2NhbmNlbCcsICgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ+KPue+4jyBVcGxvYWQgY2FuY2VsbGVkJyk7XG4gICAgICAgIGNhbGxiYWNrKCdjYW5jZWwnKTtcbiAgICB9KTtcblxuICAgIC8vIEFkZCBmaWxlIGFuZCB1cGxvYWQgLSB0aGlzIHdpbGwgdHJpZ2dlciBmaWxlQWRkZWQgdGhlbiB1cGxvYWRTdGFydFxuICAgIGNvbnNvbGUubG9nKCfinpUgQWRkaW5nIGZpbGUgdG8gUmVzdW1hYmxlLmpzJyk7XG4gICAgci5hZGRGaWxlKGZpbGUpO1xuICAgIGNvbnNvbGUubG9nKCfilrbvuI8gU3RhcnRpbmcgdXBsb2FkJyk7XG4gICAgci51cGxvYWQoKTtcbn07XG5cbi8qKlxuICogR2V0IHN0YXR1cyBvZiB1cGxvYWRlZCBmaWxlXG4gKiBAcGFyYW0ge3N0cmluZ30gZmlsZUlkIC0gRmlsZSBJRFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICovXG5GaWxlc0FQSS5nZXRTdGF0dXNVcGxvYWRGaWxlID0gZnVuY3Rpb24oZmlsZUlkLCBjYWxsYmFjaykge1xuICAgICQuYXBpKHtcbiAgICAgICAgdXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92My9maWxlczp1cGxvYWRTdGF0dXNgLFxuICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBkYXRhOiB7aWQ6IGZpbGVJZH0sXG4gICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgfSxcbiAgICB9KTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGF1ZGlvIGZpbGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIEZpbGUgcGF0aFxuICogQHBhcmFtIHtzdHJpbmd8bnVsbH0gZmlsZUlkIC0gRmlsZSBJRCAob3B0aW9uYWwpXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufG51bGx9IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gKG9wdGlvbmFsKVxuICovXG5GaWxlc0FQSS5yZW1vdmVBdWRpb0ZpbGUgPSBmdW5jdGlvbihmaWxlUGF0aCwgZmlsZUlkID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSB7XG4gICAgJC5hcGkoe1xuICAgICAgICB1cmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YzL2ZpbGVzYCxcbiAgICAgICAgb246ICdub3cnLFxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgZGF0YToge2ZpbGVuYW1lOiBmaWxlUGF0aH0sXG4gICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZpbGVJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfSk7XG59O1xuXG4vKipcbiAqIERvd25sb2FkIG5ldyBmaXJtd2FyZVxuICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIERvd25sb2FkIHBhcmFtZXRlcnNcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAqL1xuRmlsZXNBUEkuZG93bmxvYWROZXdGaXJtd2FyZSA9IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAkLmFwaSh7XG4gICAgICAgIHVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjMvZmlsZXM6ZG93bmxvYWRGaXJtd2FyZWAsXG4gICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIG1kNTogcGFyYW1zLm1kNSxcbiAgICAgICAgICAgIHNpemU6IHBhcmFtcy5zaXplLFxuICAgICAgICAgICAgdmVyc2lvbjogcGFyYW1zLnZlcnNpb24sXG4gICAgICAgICAgICB1cmw6IHBhcmFtcy51cGRhdGVMaW5rXG4gICAgICAgIH0sXG4gICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICB9LFxuICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgIH0sXG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEdldCBmaXJtd2FyZSBkb3dubG9hZCBzdGF0dXNcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIEZpcm13YXJlIGZpbGVuYW1lXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gKi9cbkZpbGVzQVBJLmZpcm13YXJlRG93bmxvYWRTdGF0dXMgPSBmdW5jdGlvbihmaWxlbmFtZSwgY2FsbGJhY2spIHtcbiAgICAkLmFwaSh7XG4gICAgICAgIHVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjMvZmlsZXM6ZmlybXdhcmVTdGF0dXNgLFxuICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBkYXRhOiB7ZmlsZW5hbWV9LFxuICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICB9LFxuICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgIH0sXG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEF0dGFjaCB0byBidXR0b25cbiAqIEBwYXJhbSB7c3RyaW5nfSBidXR0b25JZCAtIEJ1dHRvbiBJRFxuICogQHBhcmFtIHtzdHJpbmdbXX0gZmlsZVR5cGVzIC0gQXJyYXkgb2YgYWxsb3dlZCBmaWxlIHR5cGVzXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gKi9cbkZpbGVzQVBJLmF0dGFjaFRvQnRuID0gZnVuY3Rpb24oYnV0dG9uSWQsIGZpbGVUeXBlcywgY2FsbGJhY2spIHtcbiAgICBjb25zb2xlLmxvZygn8J+UlyBGaWxlc0FQSS5hdHRhY2hUb0J0biBpbml0aWFsaXplZCcsIHtcbiAgICAgICAgYnV0dG9uSWQ6IGJ1dHRvbklkLFxuICAgICAgICBmaWxlVHlwZXM6IGZpbGVUeXBlcyxcbiAgICAgICAgY2FsbGJhY2tUeXBlOiB0eXBlb2YgY2FsbGJhY2tcbiAgICB9KTtcblxuICAgIGNvbnN0IGJ1dHRvbkVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChidXR0b25JZCk7XG4gICAgaWYgKCFidXR0b25FbGVtZW50KSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBCdXR0b24gZWxlbWVudCBub3QgZm91bmQnLCB7IGJ1dHRvbklkOiBidXR0b25JZCB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKCfinIUgQnV0dG9uIGVsZW1lbnQgZm91bmQnLCB7XG4gICAgICAgIGJ1dHRvbklkOiBidXR0b25JZCxcbiAgICAgICAgdGFnTmFtZTogYnV0dG9uRWxlbWVudC50YWdOYW1lLFxuICAgICAgICBjbGFzc05hbWU6IGJ1dHRvbkVsZW1lbnQuY2xhc3NOYW1lXG4gICAgfSk7XG5cbiAgICBjb25zdCB1cGxvYWRVcmwgPSBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92My9maWxlczp1cGxvYWRgO1xuXG4gICAgY29uc3QgcmVzdW1hYmxlQ29uZmlnID0ge1xuICAgICAgICB0YXJnZXQ6IHVwbG9hZFVybCxcbiAgICAgICAgdGVzdENodW5rczogZmFsc2UsXG4gICAgICAgIGNodW5rU2l6ZTogMyAqIDEwMjQgKiAxMDI0LFxuICAgICAgICBtYXhGaWxlczogMSxcbiAgICAgICAgc2ltdWx0YW5lb3VzVXBsb2FkczogMSxcbiAgICAgICAgZmlsZVR5cGU6IGZpbGVUeXBlcyxcbiAgICB9O1xuXG4gICAgY29uc29sZS5sb2coJ/CflKcgUmVzdW1hYmxlLmpzIGNvbmZpZ3VyYXRpb24nLCB7XG4gICAgICAgIGNvbmZpZzogcmVzdW1hYmxlQ29uZmlnLFxuICAgICAgICB1cGxvYWRVcmw6IHVwbG9hZFVybCxcbiAgICAgICAgY29uZmlnUGJ4VXJsOiBDb25maWc/LnBieFVybCxcbiAgICAgICAgZnVsbFRhcmdldDogcmVzdW1hYmxlQ29uZmlnLnRhcmdldFxuICAgIH0pO1xuXG4gICAgY29uc3QgciA9IG5ldyBSZXN1bWFibGUocmVzdW1hYmxlQ29uZmlnKTtcblxuICAgIGNvbnNvbGUubG9nKCfinIUgUmVzdW1hYmxlLmpzIGluc3RhbmNlIGNyZWF0ZWQnLCB7XG4gICAgICAgIHRhcmdldDogci5vcHRzLnRhcmdldCxcbiAgICAgICAgaXNWYWxpZFRhcmdldDogISFyLm9wdHMudGFyZ2V0LFxuICAgICAgICBzdXBwb3J0OiByLnN1cHBvcnRcbiAgICB9KTtcblxuICAgIHRyeSB7XG4gICAgICAgIHIuYXNzaWduQnJvd3NlKGJ1dHRvbkVsZW1lbnQpO1xuICAgICAgICBjb25zb2xlLmxvZygn4pyFIEZpbGUgYnJvd3NlciBhc3NpZ25lZCB0byBidXR0b24gc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byBhc3NpZ24gYnJvd3NlciB0byBidXR0b24nLCB7XG4gICAgICAgICAgICBidXR0b25JZDogYnV0dG9uSWQsXG4gICAgICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHIub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfinIUgW2F0dGFjaFRvQnRuXSBGaWxlIHVwbG9hZCBzdWNjZXNzJywge1xuICAgICAgICAgICAgZmlsZU5hbWU6IGZpbGUuZmlsZU5hbWUgfHwgZmlsZS5uYW1lLFxuICAgICAgICAgICAgcmVzcG9uc2U6IHJlc3BvbnNlLFxuICAgICAgICAgICAgcmVzcG9uc2VUeXBlOiB0eXBlb2YgcmVzcG9uc2UsXG4gICAgICAgICAgICByZXNwb25zZUxlbmd0aDogcmVzcG9uc2UgPyByZXNwb25zZS5sZW5ndGggOiAwXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyeSB0byBwYXJzZSBhbmQgbG9nIHRoZSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnNlZFJlc3BvbnNlID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TiiBbYXR0YWNoVG9CdG5dIFBhcnNlZCByZXNwb25zZSBzdHJ1Y3R1cmUnLCB7XG4gICAgICAgICAgICAgICAgcmVzdWx0OiBwYXJzZWRSZXNwb25zZS5yZXN1bHQsXG4gICAgICAgICAgICAgICAgaGFzRGF0YTogISFwYXJzZWRSZXNwb25zZS5kYXRhLFxuICAgICAgICAgICAgICAgIGRhdGFLZXlzOiBwYXJzZWRSZXNwb25zZS5kYXRhID8gT2JqZWN0LmtleXMocGFyc2VkUmVzcG9uc2UuZGF0YSkgOiBbXSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlczogcGFyc2VkUmVzcG9uc2UubWVzc2FnZXMsXG4gICAgICAgICAgICAgICAgZnVsbFJlc3BvbnNlOiBwYXJzZWRSZXNwb25zZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OKIFthdHRhY2hUb0J0bl0gUmVzcG9uc2UgaXMgbm90IEpTT04nLCB7XG4gICAgICAgICAgICAgICAgcmF3UmVzcG9uc2U6IHJlc3BvbnNlLFxuICAgICAgICAgICAgICAgIHBhcnNlRXJyb3I6IGUubWVzc2FnZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsYmFjaygnZmlsZVN1Y2Nlc3MnLCB7ZmlsZSwgcmVzcG9uc2V9KTtcbiAgICB9KTtcbiAgICByLm9uKCdmaWxlUHJvZ3Jlc3MnLCAoZmlsZSkgPT4ge1xuICAgICAgICBjb25zdCBwcm9ncmVzcyA9IE1hdGgucm91bmQoZmlsZS5wcm9ncmVzcygpICogMTAwKTtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk4ggW2F0dGFjaFRvQnRuXSBGaWxlIHVwbG9hZCBwcm9ncmVzcycsIHtcbiAgICAgICAgICAgIGZpbGVOYW1lOiBmaWxlLmZpbGVOYW1lIHx8IGZpbGUubmFtZSxcbiAgICAgICAgICAgIHByb2dyZXNzOiBwcm9ncmVzcyArICclJ1xuICAgICAgICB9KTtcbiAgICAgICAgY2FsbGJhY2soJ2ZpbGVQcm9ncmVzcycsIHtmaWxlfSk7XG4gICAgfSk7XG4gICAgci5vbignZmlsZUFkZGVkJywgKGZpbGUsIGV2ZW50KSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5OBIFthdHRhY2hUb0J0bl0gRmlsZSBhZGRlZCB0byB1cGxvYWQgcXVldWUnLCB7XG4gICAgICAgICAgICBmaWxlTmFtZTogZmlsZS5maWxlTmFtZSB8fCBmaWxlLm5hbWUsXG4gICAgICAgICAgICB1bmlxdWVJZGVudGlmaWVyOiBmaWxlLnVuaXF1ZUlkZW50aWZpZXIsXG4gICAgICAgICAgICBzaXplOiBmaWxlLnNpemUsXG4gICAgICAgICAgICBidXR0b25JZDogYnV0dG9uSWRcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCfilrbvuI8gW2F0dGFjaFRvQnRuXSBTdGFydGluZyB1cGxvYWQgYXV0b21hdGljYWxseScpO1xuICAgICAgICByLnVwbG9hZCgpO1xuICAgICAgICBjYWxsYmFjaygnZmlsZUFkZGVkJywge2ZpbGUsIGV2ZW50fSk7XG4gICAgfSk7XG4gICAgci5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflIQgW2F0dGFjaFRvQnRuXSBGaWxlIHVwbG9hZCByZXRyeScsIHtcbiAgICAgICAgICAgIGZpbGVOYW1lOiBmaWxlLmZpbGVOYW1lIHx8IGZpbGUubmFtZVxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG4gICAgfSk7XG4gICAgci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIFthdHRhY2hUb0J0bl0gRmlsZSB1cGxvYWQgZXJyb3InLCB7XG4gICAgICAgICAgICBmaWxlTmFtZTogZmlsZS5maWxlTmFtZSB8fCBmaWxlLm5hbWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgbWVzc2FnZVR5cGU6IHR5cGVvZiBtZXNzYWdlLFxuICAgICAgICAgICAgYnV0dG9uSWQ6IGJ1dHRvbklkLFxuICAgICAgICAgICAgZmlsZVVuaXF1ZUlkOiBmaWxlLnVuaXF1ZUlkZW50aWZpZXIsXG4gICAgICAgICAgICBmaWxlU2l6ZTogZmlsZS5zaXplXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyeSB0byBnZXQgbW9yZSBkZXRhaWxlZCBlcnJvciBpbmZvcm1hdGlvblxuICAgICAgICBpZiAobWVzc2FnZSAmJiB0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JPYmogPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ/Cfk4ogW2F0dGFjaFRvQnRuXSBEZXRhaWxlZCBlcnJvciBpbmZvJywgZXJyb3JPYmopO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ/Cfk4ogW2F0dGFjaFRvQnRuXSBFcnJvciBtZXNzYWdlIChyYXcpOicsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY2FsbGJhY2soJ2ZpbGVFcnJvcicsIHtmaWxlLCBtZXNzYWdlfSk7XG4gICAgfSk7XG4gICAgci5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5qAIFthdHRhY2hUb0J0bl0gVXBsb2FkIHByb2Nlc3Mgc3RhcnRlZCcpO1xuICAgICAgICBjYWxsYmFjaygndXBsb2FkU3RhcnQnKTtcbiAgICB9KTtcbiAgICByLm9uKCdjb21wbGV0ZScsICgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfj4EgW2F0dGFjaFRvQnRuXSBBbGwgdXBsb2FkcyBjb21wbGV0ZWQnKTtcbiAgICAgICAgY2FsbGJhY2soJ2NvbXBsZXRlJyk7XG4gICAgfSk7XG4gICAgci5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByLnByb2dyZXNzKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5OKIFthdHRhY2hUb0J0bl0gT3ZlcmFsbCB1cGxvYWQgcHJvZ3Jlc3MnLCB7XG4gICAgICAgICAgICBwZXJjZW50OiBNYXRoLnJvdW5kKHBlcmNlbnQpICsgJyUnXG4gICAgICAgIH0pO1xuICAgICAgICBjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuICAgIH0pO1xuICAgIHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcign8J+SpSBbYXR0YWNoVG9CdG5dIFVwbG9hZCBlcnJvcicsIHtcbiAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgICAgICBmaWxlOiBmaWxlLFxuICAgICAgICAgICAgYnV0dG9uSWQ6IGJ1dHRvbklkXG4gICAgICAgIH0pO1xuICAgICAgICBjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZSwgZmlsZX0pO1xuICAgIH0pO1xuICAgIHIub24oJ3BhdXNlJywgKCkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygn4o+477iPIFthdHRhY2hUb0J0bl0gVXBsb2FkIHBhdXNlZCcpO1xuICAgICAgICBjYWxsYmFjaygncGF1c2UnKTtcbiAgICB9KTtcbiAgICByLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfij7nvuI8gW2F0dGFjaFRvQnRuXSBVcGxvYWQgY2FuY2VsbGVkJyk7XG4gICAgICAgIGNhbGxiYWNrKCdjYW5jZWwnKTtcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKCfwn46vIFthdHRhY2hUb0J0bl0gQWxsIGV2ZW50IGhhbmRsZXJzIHJlZ2lzdGVyZWQgc3VjY2Vzc2Z1bGx5Jyk7XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuRmlsZXNBUEkgPSBGaWxlc0FQSTsiXX0=