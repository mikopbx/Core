"use strict";

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

Object.assign(FilesAPI, {
  /**
   * Get file content by path
   * @param {string} filePath - File path (will be URL encoded)
   * @param {function} callback - Callback function
   * @param {boolean} [needOriginal=false] - Whether to return original content
   * @returns {Object} jQuery API call object
   */
  getFileContent: function getFileContent(filePath, callback) {
    var needOriginal = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var encodedPath = encodeURIComponent(filePath);
    var params = needOriginal ? {
      needOriginal: 'true'
    } : {};
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
  uploadFileContent: function uploadFileContent(filePath, content, callback) {
    var contentType = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'application/octet-stream';
    var encodedPath = encodeURIComponent(filePath); // Use callPut method with the encoded path as ID

    return this.callPut(content, callback, encodedPath);
  },

  /**
   * Delete file by path
   * @param {string} filePath - File path to delete
   * @param {function} callback - Callback function
   * @returns {Object} jQuery API call object
   */
  deleteFile: function deleteFile(filePath, callback) {
    var encodedPath = encodeURIComponent(filePath);
    return this.callDelete(callback, encodedPath);
  },

  /**
   * Chunked file upload (Resumable.js support)
   * @param {FormData} formData - Form data with file chunks
   * @param {function} callback - Callback function
   * @returns {Object} API call result
   */
  uploadChunked: function uploadChunked(formData, callback) {
    return this.callCustomMethod('upload', formData, callback, 'POST');
  },

  /**
   * Get upload status
   * @param {string} uploadId - Upload identifier
   * @param {function} callback - Callback function
   * @returns {Object} API call result
   */
  getUploadStatus: function getUploadStatus(uploadId, callback) {
    // Use 'resumableIdentifier' instead of 'id' to avoid conflict with resource ID routing
    // This ensures the URL becomes /files:uploadStatus?resumableIdentifier=xxx
    // instead of /files/{id}:uploadStatus
    var params = {
      resumableIdentifier: uploadId
    };
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
  downloadFirmware: function downloadFirmware(params, callback) {
    return this.callCustomMethod('downloadFirmware', params, callback, 'POST');
  },

  /**
   * Get firmware download status
   * @param {string} filename - Firmware filename
   * @param {function} callback - Callback function
   * @returns {Object} API call result
   */
  getFirmwareStatus: function getFirmwareStatus(filename, callback) {
    var params = {
      filename: filename
    };
    return this.callCustomMethod('firmwareStatus', params, callback, 'GET');
  }
});
/**
 * High-level API methods
 * These methods provide convenient wrappers around the core v3 REST API
 */

/**
 * Configure Resumable.js to use the new v3 API
 * @param {object} resumableConfig - Resumable.js configuration
 * @returns {object} Updated configuration
 */

FilesAPI.configureResumable = function () {
  var resumableConfig = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  // Use a function for headers to get the latest token dynamically
  // Resumable.js will call this function before each request
  var headersFunction = function headersFunction() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest'
    }; // Add Bearer token if available (for JWT authentication)

    if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
      headers['Authorization'] = "Bearer ".concat(TokenManager.accessToken);
    }

    return headers;
  };

  return Object.assign({
    target: "".concat(Config.pbxUrl, "/pbxcore/api/v3/files:upload"),
    testChunks: false,
    chunkSize: 3 * 1024 * 1024,
    // 3MB chunks
    simultaneousUploads: 1,
    maxFiles: 1,
    fileType: [],
    headers: headersFunction
  }, resumableConfig);
};
/**
 * Setup common Resumable.js event handlers
 * @param {object} resumableInstance - Resumable.js instance
 * @param {function} callback - Callback function for events
 * @param {boolean} autoUpload - Whether to auto-upload on fileAdded event
 */


FilesAPI.setupResumableEvents = function (resumableInstance, callback) {
  var autoUpload = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  resumableInstance.on('fileSuccess', function (file, response) {
    callback('fileSuccess', {
      file: file,
      response: response
    });
  });
  resumableInstance.on('fileProgress', function (file) {
    callback('fileProgress', {
      file: file
    });
  });
  resumableInstance.on('fileAdded', function (file, event) {
    if (autoUpload) {
      resumableInstance.upload();
    }

    callback('fileAdded', {
      file: file,
      event: event
    });
  });
  resumableInstance.on('fileRetry', function (file) {
    callback('fileRetry', {
      file: file
    });
  });
  resumableInstance.on('fileError', function (file, message) {
    callback('fileError', {
      file: file,
      message: message
    });
  });
  resumableInstance.on('uploadStart', function () {
    callback('uploadStart');
  });
  resumableInstance.on('complete', function () {
    callback('complete');
  });
  resumableInstance.on('progress', function () {
    var percent = 100 * resumableInstance.progress();
    callback('progress', {
      percent: percent
    });
  });
  resumableInstance.on('error', function (message, file) {
    callback('error', {
      message: message,
      file: file
    });
  });
  resumableInstance.on('pause', function () {
    callback('pause');
  });
  resumableInstance.on('cancel', function () {
    callback('cancel');
  });
};
/**
 * Upload file using Resumable.js
 * @param {File} file - File object to upload
 * @param {function} callback - Callback function
 * @param {string[]} allowedFileTypes - Optional array of allowed file extensions (e.g., ['wav', 'mp3'])
 * @param {string} category - Optional category for file type validation (e.g., 'firmware', 'sound')
 */


FilesAPI.uploadFile = function (file, callback) {
  var allowedFileTypes = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var category = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
  // Resumable.js treats ['*'] as literal extension match, not wildcard.
  // Empty array [] skips file type validation entirely (allows all files).
  var fileTypes = allowedFileTypes.includes('*') ? [] : allowedFileTypes;
  var resumableConfig = this.configureResumable({
    fileType: fileTypes
  }); // Add category to query parameters if provided

  if (category) {
    resumableConfig.query = function () {
      return {
        category: category
      };
    };
  }

  var r = new Resumable(resumableConfig); // Setup events BEFORE adding file to capture fileAdded event

  this.setupResumableEvents(r, callback, false);
  r.addFile(file); // If file was not added (validation failed), stop here

  if (r.files.length === 0) {
    callback('error', {
      message: 'File type not allowed or validation failed'
    });
    return;
  }

  r.upload(); // Retry if upload doesn't start

  setTimeout(function () {
    if (!r.isUploading() && r.files.length > 0) {
      r.upload();
    }
  }, 100);
};
/**
 * Get status of uploaded file (chunked upload)
 *
 * Uses v3 RESTful API: GET /files:uploadStatus?id={fileId}
 *
 * @param {string} fileId - Upload identifier from Resumable.js
 * @param {function} callback - Callback function receiving upload status data or false
 * @returns {Object} jQuery API call object
 */


FilesAPI.getStatusUploadFile = function (fileId, callback) {
  return this.callCustomMethod('uploadStatus', {
    resumableIdentifier: fileId
  }, function (response) {
    if (response && response.result === true && response.data) {
      callback(response.data);
    } else {
      callback(false);
    }
  }, 'GET');
};
/**
 * Remove audio file
 *
 * Uses v3 RESTful API: DELETE /files/{path}
 *
 * @param {string} filePath - File path to delete
 * @param {string|null} fileId - File ID (optional, for backward compatibility)
 * @param {function|null} callback - Callback function (optional)
 * @returns {Object} jQuery API call object
 */


FilesAPI.removeAudioFile = function (filePath) {
  var fileId = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  return this.deleteFile(filePath, function (response) {
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
 * Attach to button
 * @param {string} buttonId - Button ID
 * @param {string[]} fileTypes - Array of allowed file types
 * @param {function} callback - Callback function
 * @param {string|null} inputName - Optional name attribute for the file input (for test compatibility)
 */


FilesAPI.attachToBtn = function (buttonId, fileTypes, callback) {
  var inputName = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
  var buttonElement = document.getElementById(buttonId);

  if (!buttonElement) {
    return;
  }

  var resumableConfig = this.configureResumable({
    fileType: fileTypes,
    query: function query(file) {
      var originalName = file.name || file.fileName;
      var nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
      var extension = originalName.split('.').pop();
      var finalFilename = nameWithoutExt + '.' + extension;
      return {
        resumableFilename: finalFilename
      };
    }
  });
  var r = new Resumable(resumableConfig);

  try {
    r.assignBrowse(buttonElement); // Add name attribute to the dynamically created file input for test compatibility
    // Resumable.js creates the input inside the button element

    var fileInput = buttonElement.querySelector('input[type="file"]');

    if (fileInput && inputName) {
      fileInput.setAttribute('name', inputName);
    }
  } catch (error) {
    return;
  }

  this.setupResumableEvents(r, callback, true); // autoUpload = true for button attachments
}; // Export for use in other modules


window.FilesAPI = FilesAPI;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZmlsZXMtYXBpLmpzIl0sIm5hbWVzIjpbIkZpbGVzQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwidXBsb2FkIiwidXBsb2FkU3RhdHVzIiwiZG93bmxvYWRGaXJtd2FyZSIsImZpcm13YXJlU3RhdHVzIiwiT2JqZWN0IiwiYXNzaWduIiwiZ2V0RmlsZUNvbnRlbnQiLCJmaWxlUGF0aCIsImNhbGxiYWNrIiwibmVlZE9yaWdpbmFsIiwiZW5jb2RlZFBhdGgiLCJlbmNvZGVVUklDb21wb25lbnQiLCJwYXJhbXMiLCJjYWxsR2V0IiwidXBsb2FkRmlsZUNvbnRlbnQiLCJjb250ZW50IiwiY29udGVudFR5cGUiLCJjYWxsUHV0IiwiZGVsZXRlRmlsZSIsImNhbGxEZWxldGUiLCJ1cGxvYWRDaHVua2VkIiwiZm9ybURhdGEiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiZ2V0VXBsb2FkU3RhdHVzIiwidXBsb2FkSWQiLCJyZXN1bWFibGVJZGVudGlmaWVyIiwiZ2V0RmlybXdhcmVTdGF0dXMiLCJmaWxlbmFtZSIsImNvbmZpZ3VyZVJlc3VtYWJsZSIsInJlc3VtYWJsZUNvbmZpZyIsImhlYWRlcnNGdW5jdGlvbiIsImhlYWRlcnMiLCJUb2tlbk1hbmFnZXIiLCJhY2Nlc3NUb2tlbiIsInRhcmdldCIsIkNvbmZpZyIsInBieFVybCIsInRlc3RDaHVua3MiLCJjaHVua1NpemUiLCJzaW11bHRhbmVvdXNVcGxvYWRzIiwibWF4RmlsZXMiLCJmaWxlVHlwZSIsInNldHVwUmVzdW1hYmxlRXZlbnRzIiwicmVzdW1hYmxlSW5zdGFuY2UiLCJhdXRvVXBsb2FkIiwib24iLCJmaWxlIiwicmVzcG9uc2UiLCJldmVudCIsIm1lc3NhZ2UiLCJwZXJjZW50IiwicHJvZ3Jlc3MiLCJ1cGxvYWRGaWxlIiwiYWxsb3dlZEZpbGVUeXBlcyIsImNhdGVnb3J5IiwiZmlsZVR5cGVzIiwiaW5jbHVkZXMiLCJxdWVyeSIsInIiLCJSZXN1bWFibGUiLCJhZGRGaWxlIiwiZmlsZXMiLCJsZW5ndGgiLCJzZXRUaW1lb3V0IiwiaXNVcGxvYWRpbmciLCJnZXRTdGF0dXNVcGxvYWRGaWxlIiwiZmlsZUlkIiwicmVzdWx0IiwiZGF0YSIsInJlbW92ZUF1ZGlvRmlsZSIsImF0dGFjaFRvQnRuIiwiYnV0dG9uSWQiLCJpbnB1dE5hbWUiLCJidXR0b25FbGVtZW50IiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIm9yaWdpbmFsTmFtZSIsIm5hbWUiLCJmaWxlTmFtZSIsIm5hbWVXaXRob3V0RXh0IiwicmVwbGFjZSIsImV4dGVuc2lvbiIsInNwbGl0IiwicG9wIiwiZmluYWxGaWxlbmFtZSIsInJlc3VtYWJsZUZpbGVuYW1lIiwiYXNzaWduQnJvd3NlIiwiZmlsZUlucHV0IiwicXVlcnlTZWxlY3RvciIsInNldEF0dHJpYnV0ZSIsImVycm9yIiwid2luZG93Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQzlCQyxFQUFBQSxRQUFRLEVBQUUsdUJBRG9CO0FBRTlCQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsTUFBTSxFQUFFLFNBREc7QUFFWEMsSUFBQUEsWUFBWSxFQUFFLGVBRkg7QUFHWEMsSUFBQUEsZ0JBQWdCLEVBQUUsbUJBSFA7QUFJWEMsSUFBQUEsY0FBYyxFQUFFO0FBSkw7QUFGZSxDQUFqQixDQUFqQixDLENBVUE7O0FBQ0FDLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjVCxRQUFkLEVBQXdCO0FBRXBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lVLEVBQUFBLGNBVG9CLDBCQVNMQyxRQVRLLEVBU0tDLFFBVEws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QixVQUFNOEIsWUFBWSxHQUFHOUIsSUFBSSxDQUFDK0IsSUFBTCxJQUFhL0IsSUFBSSxDQUFDZ0MsUUFBdkM7QUFDQSxVQUFNQyxjQUFjLEdBQUdILFlBQVksQ0FBQ0ksT0FBYixDQUFxQixXQUFyQixFQUFrQyxFQUFsQyxDQUF2QjtBQUNBLFVBQU1DLFNBQVMsR0FBR0wsWUFBWSxDQUFDTSxLQUFiLENBQW1CLEdBQW5CLEVBQXdCQyxHQUF4QixFQUFsQjtBQUNBLFVBQU1DLGFBQWEsR0FBR0wsY0FBYyxHQUFHLEdBQWpCLEdBQXVCRSxTQUE3QztBQUVBLGFBQU87QUFDSEksUUFBQUEsaUJBQWlCLEVBQUVEO0FBRGhCLE9BQVA7QUFHSDtBQVgyQyxHQUF4QixDQUF4QjtBQWNBLE1BQU0xQixDQUFDLEdBQUcsSUFBSUMsU0FBSixDQUFjOUIsZUFBZCxDQUFWOztBQUVBLE1BQUk7QUFDQTZCLElBQUFBLENBQUMsQ0FBQzRCLFlBQUYsQ0FBZWIsYUFBZixFQURBLENBR0E7QUFDQTs7QUFDQSxRQUFNYyxTQUFTLEdBQUdkLGFBQWEsQ0FBQ2UsYUFBZCxDQUE0QixvQkFBNUIsQ0FBbEI7O0FBQ0EsUUFBSUQsU0FBUyxJQUFJZixTQUFqQixFQUE0QjtBQUN4QmUsTUFBQUEsU0FBUyxDQUFDRSxZQUFWLENBQXVCLE1BQXZCLEVBQStCakIsU0FBL0I7QUFDSDtBQUNKLEdBVEQsQ0FTRSxPQUFPa0IsS0FBUCxFQUFjO0FBQ1o7QUFDSDs7QUFFRCxPQUFLaEQsb0JBQUwsQ0FBMEJnQixDQUExQixFQUE2QmxELFFBQTdCLEVBQXVDLElBQXZDLEVBbkM2RSxDQW1DL0I7QUFDakQsQ0FwQ0QsQyxDQXNDQTs7O0FBQ0FtRixNQUFNLENBQUMvRixRQUFQLEdBQWtCQSxRQUFsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGlDbGllbnQsIFBieEFwaSwgUmVzdW1hYmxlLCBDb25maWcsIGdsb2JhbFJvb3RVcmwgKi8gXG5cbi8qKlxuICogRmlsZXNBUEkgLSBSRVNUIEFQSSB2MyBjbGllbnQgZm9yIGZpbGUgbWFuYWdlbWVudCBvcGVyYXRpb25zXG4gKlxuICogUHJvdmlkZXMgYm90aCBzdGFuZGFyZCBSRVNUIG9wZXJhdGlvbnMgZm9yIGZpbGUgQ1JVRCBhbmQgY3VzdG9tIG1ldGhvZHNcbiAqIGZvciBzcGVjaWFsaXplZCBvcGVyYXRpb25zIGxpa2UgY2h1bmtlZCB1cGxvYWQgYW5kIGZpcm13YXJlIGRvd25sb2FkLlxuICpcbiAqIEBjbGFzcyBGaWxlc0FQSVxuICovXG5jb25zdCBGaWxlc0FQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL2ZpbGVzJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIHVwbG9hZDogJzp1cGxvYWQnLFxuICAgICAgICB1cGxvYWRTdGF0dXM6ICc6dXBsb2FkU3RhdHVzJyxcbiAgICAgICAgZG93bmxvYWRGaXJtd2FyZTogJzpkb3dubG9hZEZpcm13YXJlJyxcbiAgICAgICAgZmlybXdhcmVTdGF0dXM6ICc6ZmlybXdhcmVTdGF0dXMnXG4gICAgfVxufSk7XG5cbi8vIEFkZCBtZXRob2RzIHRvIEZpbGVzQVBJIHVzaW5nIFBieEFwaSB1dGlsaXR5XG5PYmplY3QuYXNzaWduKEZpbGVzQVBJLCB7XG5cbiAgICAvKipcbiAgICAgKiBHZXQgZmlsZSBjb250ZW50IGJ5IHBhdGhcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBGaWxlIHBhdGggKHdpbGwgYmUgVVJMIGVuY29kZWQpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW25lZWRPcmlnaW5hbD1mYWxzZV0gLSBXaGV0aGVyIHRvIHJldHVybiBvcmlnaW5hbCBjb250ZW50XG4gICAgICogQHJldHVybnMge09iamVjdH0galF1ZXJ5IEFQSSBjYWxsIG9iamVjdFxuICAgICAqL1xuICAgIGdldEZpbGVDb250ZW50KGZpbGVQYXRoLCBjYWxsYmFjaywgbmVlZE9yaWdpbmFsID0gZmFsc2UpIHtcbiAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBlbmNvZGVkUGF0aCA9IGVuY29kZVVSSUNvbXBvbmVudChmaWxlUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBuZWVkT3JpZ2luYWwgPyB7IG5lZWRPcmlnaW5hbDogJ3RydWUnIH0gOiB7fTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEdldChwYXJhbXMsIGNhbGxiYWNrLCBlbmNvZGVkUGF0aCk7XG4gICAgXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwbG9hZCBmaWxlIGNvbnRlbnQgdXNpbmcgUFVUIG1ldGhvZCAoc2ltcGxlIHVwbG9hZClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBEZXN0aW5hdGlvbiBmaWxlIHBhdGhcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xCbG9ifSBjb250ZW50IC0gRmlsZSBjb250ZW50XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbY29udGVudFR5cGU9J2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSddIC0gQ29udGVudCB0eXBlXG4gICAgICogQHJldHVybnMge09iamVjdH0galF1ZXJ5IEFQSSBjYWxsIG9iamVjdFxuICAgICAqL1xuICAgIHVwbG9hZEZpbGVDb250ZW50KGZpbGVQYXRoLCBjb250ZW50LCBjYWxsYmFjaywgY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJykge1xuICAgICAgICBjb25zdCBlbmNvZGVkUGF0aCA9IGVuY29kZVVSSUNvbXBvbmVudChmaWxlUGF0aCk7XG5cbiAgICAgICAgLy8gVXNlIGNhbGxQdXQgbWV0aG9kIHdpdGggdGhlIGVuY29kZWQgcGF0aCBhcyBJRFxuICAgICAgICByZXR1cm4gdGhpcy5jYWxsUHV0KGNvbnRlbnQsIGNhbGxiYWNrLCBlbmNvZGVkUGF0aCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBmaWxlIGJ5IHBhdGhcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBGaWxlIHBhdGggdG8gZGVsZXRlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IGpRdWVyeSBBUEkgY2FsbCBvYmplY3RcbiAgICAgKi9cbiAgICBkZWxldGVGaWxlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZW5jb2RlZFBhdGggPSBlbmNvZGVVUklDb21wb25lbnQoZmlsZVBhdGgpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbERlbGV0ZShjYWxsYmFjaywgZW5jb2RlZFBhdGgpO1xuICAgICAgXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENodW5rZWQgZmlsZSB1cGxvYWQgKFJlc3VtYWJsZS5qcyBzdXBwb3J0KVxuICAgICAqIEBwYXJhbSB7Rm9ybURhdGF9IGZvcm1EYXRhIC0gRm9ybSBkYXRhIHdpdGggZmlsZSBjaHVua3NcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge09iamVjdH0gQVBJIGNhbGwgcmVzdWx0XG4gICAgICovXG4gICAgdXBsb2FkQ2h1bmtlZChmb3JtRGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgndXBsb2FkJywgZm9ybURhdGEsIGNhbGxiYWNrLCAnUE9TVCcpO1xuICAgICAgIFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdXBsb2FkIHN0YXR1c1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1cGxvYWRJZCAtIFVwbG9hZCBpZGVudGlmaWVyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEFQSSBjYWxsIHJlc3VsdFxuICAgICAqL1xuICAgIGdldFVwbG9hZFN0YXR1cyh1cGxvYWRJZCwgY2FsbGJhY2spIHtcblxuICAgICAgICAgICAgLy8gVXNlICdyZXN1bWFibGVJZGVudGlmaWVyJyBpbnN0ZWFkIG9mICdpZCcgdG8gYXZvaWQgY29uZmxpY3Qgd2l0aCByZXNvdXJjZSBJRCByb3V0aW5nXG4gICAgICAgICAgICAvLyBUaGlzIGVuc3VyZXMgdGhlIFVSTCBiZWNvbWVzIC9maWxlczp1cGxvYWRTdGF0dXM/cmVzdW1hYmxlSWRlbnRpZmllcj14eHhcbiAgICAgICAgICAgIC8vIGluc3RlYWQgb2YgL2ZpbGVzL3tpZH06dXBsb2FkU3RhdHVzXG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7IHJlc3VtYWJsZUlkZW50aWZpZXI6IHVwbG9hZElkIH07XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCd1cGxvYWRTdGF0dXMnLCBwYXJhbXMsIGNhbGxiYWNrLCAnR0VUJyk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRG93bmxvYWQgZmlybXdhcmUgZnJvbSBleHRlcm5hbCBVUkxcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gRG93bmxvYWQgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudXJsIC0gRmlybXdhcmUgVVJMXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtwYXJhbXMubWQ1XSAtIEV4cGVjdGVkIE1ENSBoYXNoXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEFQSSBjYWxsIHJlc3VsdFxuICAgICAqL1xuICAgIGRvd25sb2FkRmlybXdhcmUocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgIFxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdkb3dubG9hZEZpcm13YXJlJywgcGFyYW1zLCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICAgIFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgZmlybXdhcmUgZG93bmxvYWQgc3RhdHVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gRmlybXdhcmUgZmlsZW5hbWVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge09iamVjdH0gQVBJIGNhbGwgcmVzdWx0XG4gICAgICovXG4gICAgZ2V0RmlybXdhcmVTdGF0dXMoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgXG5cbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHsgZmlsZW5hbWU6IGZpbGVuYW1lIH07XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdmaXJtd2FyZVN0YXR1cycsIHBhcmFtcywgY2FsbGJhY2ssICdHRVQnKTtcbiAgICAgICAgXG4gICAgfVxufSk7XG5cbi8qKlxuICogSGlnaC1sZXZlbCBBUEkgbWV0aG9kc1xuICogVGhlc2UgbWV0aG9kcyBwcm92aWRlIGNvbnZlbmllbnQgd3JhcHBlcnMgYXJvdW5kIHRoZSBjb3JlIHYzIFJFU1QgQVBJXG4gKi9cblxuLyoqXG4gKiBDb25maWd1cmUgUmVzdW1hYmxlLmpzIHRvIHVzZSB0aGUgbmV3IHYzIEFQSVxuICogQHBhcmFtIHtvYmplY3R9IHJlc3VtYWJsZUNvbmZpZyAtIFJlc3VtYWJsZS5qcyBjb25maWd1cmF0aW9uXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBVcGRhdGVkIGNvbmZpZ3VyYXRpb25cbiAqL1xuRmlsZXNBUEkuY29uZmlndXJlUmVzdW1hYmxlID0gZnVuY3Rpb24ocmVzdW1hYmxlQ29uZmlnID0ge30pIHtcbiAgICAvLyBVc2UgYSBmdW5jdGlvbiBmb3IgaGVhZGVycyB0byBnZXQgdGhlIGxhdGVzdCB0b2tlbiBkeW5hbWljYWxseVxuICAgIC8vIFJlc3VtYWJsZS5qcyB3aWxsIGNhbGwgdGhpcyBmdW5jdGlvbiBiZWZvcmUgZWFjaCByZXF1ZXN0XG4gICAgY29uc3QgaGVhZGVyc0Z1bmN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCdcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgQmVhcmVyIHRva2VuIGlmIGF2YWlsYWJsZSAoZm9yIEpXVCBhdXRoZW50aWNhdGlvbilcbiAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGhlYWRlcnM7XG4gICAgfTtcblxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgdGFyZ2V0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92My9maWxlczp1cGxvYWRgLFxuICAgICAgICB0ZXN0Q2h1bmtzOiBmYWxzZSxcbiAgICAgICAgY2h1bmtTaXplOiAzICogMTAyNCAqIDEwMjQsIC8vIDNNQiBjaHVua3NcbiAgICAgICAgc2ltdWx0YW5lb3VzVXBsb2FkczogMSxcbiAgICAgICAgbWF4RmlsZXM6IDEsXG4gICAgICAgIGZpbGVUeXBlOiBbXSxcbiAgICAgICAgaGVhZGVyczogaGVhZGVyc0Z1bmN0aW9uXG4gICAgfSwgcmVzdW1hYmxlQ29uZmlnKTtcbn07XG5cbi8qKlxuICogU2V0dXAgY29tbW9uIFJlc3VtYWJsZS5qcyBldmVudCBoYW5kbGVyc1xuICogQHBhcmFtIHtvYmplY3R9IHJlc3VtYWJsZUluc3RhbmNlIC0gUmVzdW1hYmxlLmpzIGluc3RhbmNlXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIGZvciBldmVudHNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYXV0b1VwbG9hZCAtIFdoZXRoZXIgdG8gYXV0by11cGxvYWQgb24gZmlsZUFkZGVkIGV2ZW50XG4gKi9cbkZpbGVzQVBJLnNldHVwUmVzdW1hYmxlRXZlbnRzID0gZnVuY3Rpb24ocmVzdW1hYmxlSW5zdGFuY2UsIGNhbGxiYWNrLCBhdXRvVXBsb2FkID0gZmFsc2UpIHtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbignZmlsZVN1Y2Nlc3MnLCAoZmlsZSwgcmVzcG9uc2UpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ2ZpbGVTdWNjZXNzJywge2ZpbGUsIHJlc3BvbnNlfSk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdmaWxlQWRkZWQnLCAoZmlsZSwgZXZlbnQpID0+IHtcbiAgICAgICAgaWYgKGF1dG9VcGxvYWQpIHtcbiAgICAgICAgICAgIHJlc3VtYWJsZUluc3RhbmNlLnVwbG9hZCgpO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCd1cGxvYWRTdGFydCcsICgpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ2NvbXBsZXRlJywgKCkgPT4ge1xuICAgICAgICBjYWxsYmFjaygnY29tcGxldGUnKTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByZXN1bWFibGVJbnN0YW5jZS5wcm9ncmVzcygpO1xuICAgICAgICBjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdlcnJvcicsIChtZXNzYWdlLCBmaWxlKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ3BhdXNlJywgKCkgPT4ge1xuICAgICAgICBjYWxsYmFjaygncGF1c2UnKTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbignY2FuY2VsJywgKCkgPT4ge1xuICAgICAgICBjYWxsYmFjaygnY2FuY2VsJyk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFVwbG9hZCBmaWxlIHVzaW5nIFJlc3VtYWJsZS5qc1xuICogQHBhcmFtIHtGaWxlfSBmaWxlIC0gRmlsZSBvYmplY3QgdG8gdXBsb2FkXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ1tdfSBhbGxvd2VkRmlsZVR5cGVzIC0gT3B0aW9uYWwgYXJyYXkgb2YgYWxsb3dlZCBmaWxlIGV4dGVuc2lvbnMgKGUuZy4sIFsnd2F2JywgJ21wMyddKVxuICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IC0gT3B0aW9uYWwgY2F0ZWdvcnkgZm9yIGZpbGUgdHlwZSB2YWxpZGF0aW9uIChlLmcuLCAnZmlybXdhcmUnLCAnc291bmQnKVxuICovXG5GaWxlc0FQSS51cGxvYWRGaWxlID0gZnVuY3Rpb24oZmlsZSwgY2FsbGJhY2ssIGFsbG93ZWRGaWxlVHlwZXMgPSBbXSwgY2F0ZWdvcnkgPSBudWxsKSB7XG4gICAgLy8gUmVzdW1hYmxlLmpzIHRyZWF0cyBbJyonXSBhcyBsaXRlcmFsIGV4dGVuc2lvbiBtYXRjaCwgbm90IHdpbGRjYXJkLlxuICAgIC8vIEVtcHR5IGFycmF5IFtdIHNraXBzIGZpbGUgdHlwZSB2YWxpZGF0aW9uIGVudGlyZWx5IChhbGxvd3MgYWxsIGZpbGVzKS5cbiAgICBjb25zdCBmaWxlVHlwZXMgPSBhbGxvd2VkRmlsZVR5cGVzLmluY2x1ZGVzKCcqJykgPyBbXSA6IGFsbG93ZWRGaWxlVHlwZXM7XG4gICAgY29uc3QgcmVzdW1hYmxlQ29uZmlnID0gdGhpcy5jb25maWd1cmVSZXN1bWFibGUoe1xuICAgICAgICBmaWxlVHlwZTogZmlsZVR5cGVzXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgY2F0ZWdvcnkgdG8gcXVlcnkgcGFyYW1ldGVycyBpZiBwcm92aWRlZFxuICAgIGlmIChjYXRlZ29yeSkge1xuICAgICAgICByZXN1bWFibGVDb25maWcucXVlcnkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHIgPSBuZXcgUmVzdW1hYmxlKHJlc3VtYWJsZUNvbmZpZyk7XG5cbiAgICAvLyBTZXR1cCBldmVudHMgQkVGT1JFIGFkZGluZyBmaWxlIHRvIGNhcHR1cmUgZmlsZUFkZGVkIGV2ZW50XG4gICAgdGhpcy5zZXR1cFJlc3VtYWJsZUV2ZW50cyhyLCBjYWxsYmFjaywgZmFsc2UpO1xuXG4gICAgci5hZGRGaWxlKGZpbGUpO1xuXG4gICAgLy8gSWYgZmlsZSB3YXMgbm90IGFkZGVkICh2YWxpZGF0aW9uIGZhaWxlZCksIHN0b3AgaGVyZVxuICAgIGlmIChyLmZpbGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZTogJ0ZpbGUgdHlwZSBub3QgYWxsb3dlZCBvciB2YWxpZGF0aW9uIGZhaWxlZCd9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHIudXBsb2FkKCk7XG5cbiAgICAvLyBSZXRyeSBpZiB1cGxvYWQgZG9lc24ndCBzdGFydFxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBpZiAoIXIuaXNVcGxvYWRpbmcoKSAmJiByLmZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHIudXBsb2FkKCk7XG4gICAgICAgIH1cbiAgICB9LCAxMDApO1xufTtcblxuLyoqXG4gKiBHZXQgc3RhdHVzIG9mIHVwbG9hZGVkIGZpbGUgKGNodW5rZWQgdXBsb2FkKVxuICpcbiAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IEdFVCAvZmlsZXM6dXBsb2FkU3RhdHVzP2lkPXtmaWxlSWR9XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGZpbGVJZCAtIFVwbG9hZCBpZGVudGlmaWVyIGZyb20gUmVzdW1hYmxlLmpzXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHJlY2VpdmluZyB1cGxvYWQgc3RhdHVzIGRhdGEgb3IgZmFsc2VcbiAqIEByZXR1cm5zIHtPYmplY3R9IGpRdWVyeSBBUEkgY2FsbCBvYmplY3RcbiAqL1xuRmlsZXNBUEkuZ2V0U3RhdHVzVXBsb2FkRmlsZSA9IGZ1bmN0aW9uKGZpbGVJZCwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCd1cGxvYWRTdGF0dXMnLCB7IHJlc3VtYWJsZUlkZW50aWZpZXI6IGZpbGVJZCB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH0sICdHRVQnKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGF1ZGlvIGZpbGVcbiAqXG4gKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBERUxFVEUgL2ZpbGVzL3twYXRofVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIEZpbGUgcGF0aCB0byBkZWxldGVcbiAqIEBwYXJhbSB7c3RyaW5nfG51bGx9IGZpbGVJZCAtIEZpbGUgSUQgKG9wdGlvbmFsLCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcbiAqIEBwYXJhbSB7ZnVuY3Rpb258bnVsbH0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiAob3B0aW9uYWwpXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBqUXVlcnkgQVBJIGNhbGwgb2JqZWN0XG4gKi9cbkZpbGVzQVBJLnJlbW92ZUF1ZGlvRmlsZSA9IGZ1bmN0aW9uKGZpbGVQYXRoLCBmaWxlSWQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIHtcbiAgICByZXR1cm4gdGhpcy5kZWxldGVGaWxlKGZpbGVQYXRoLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmlsZUlkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEF0dGFjaCB0byBidXR0b25cbiAqIEBwYXJhbSB7c3RyaW5nfSBidXR0b25JZCAtIEJ1dHRvbiBJRFxuICogQHBhcmFtIHtzdHJpbmdbXX0gZmlsZVR5cGVzIC0gQXJyYXkgb2YgYWxsb3dlZCBmaWxlIHR5cGVzXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ3xudWxsfSBpbnB1dE5hbWUgLSBPcHRpb25hbCBuYW1lIGF0dHJpYnV0ZSBmb3IgdGhlIGZpbGUgaW5wdXQgKGZvciB0ZXN0IGNvbXBhdGliaWxpdHkpXG4gKi9cbkZpbGVzQVBJLmF0dGFjaFRvQnRuID0gZnVuY3Rpb24oYnV0dG9uSWQsIGZpbGVUeXBlcywgY2FsbGJhY2ssIGlucHV0TmFtZSA9IG51bGwpIHtcbiAgICBjb25zdCBidXR0b25FbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYnV0dG9uSWQpO1xuICAgIGlmICghYnV0dG9uRWxlbWVudCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdW1hYmxlQ29uZmlnID0gdGhpcy5jb25maWd1cmVSZXN1bWFibGUoe1xuICAgICAgICBmaWxlVHlwZTogZmlsZVR5cGVzLFxuICAgICAgICBxdWVyeTogZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxOYW1lID0gZmlsZS5uYW1lIHx8IGZpbGUuZmlsZU5hbWU7XG4gICAgICAgICAgICBjb25zdCBuYW1lV2l0aG91dEV4dCA9IG9yaWdpbmFsTmFtZS5yZXBsYWNlKC9cXC5bXi8uXSskLywgJycpO1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gb3JpZ2luYWxOYW1lLnNwbGl0KCcuJykucG9wKCk7XG4gICAgICAgICAgICBjb25zdCBmaW5hbEZpbGVuYW1lID0gbmFtZVdpdGhvdXRFeHQgKyAnLicgKyBleHRlbnNpb247XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVzdW1hYmxlRmlsZW5hbWU6IGZpbmFsRmlsZW5hbWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHIgPSBuZXcgUmVzdW1hYmxlKHJlc3VtYWJsZUNvbmZpZyk7XG5cbiAgICB0cnkge1xuICAgICAgICByLmFzc2lnbkJyb3dzZShidXR0b25FbGVtZW50KTtcblxuICAgICAgICAvLyBBZGQgbmFtZSBhdHRyaWJ1dGUgdG8gdGhlIGR5bmFtaWNhbGx5IGNyZWF0ZWQgZmlsZSBpbnB1dCBmb3IgdGVzdCBjb21wYXRpYmlsaXR5XG4gICAgICAgIC8vIFJlc3VtYWJsZS5qcyBjcmVhdGVzIHRoZSBpbnB1dCBpbnNpZGUgdGhlIGJ1dHRvbiBlbGVtZW50XG4gICAgICAgIGNvbnN0IGZpbGVJbnB1dCA9IGJ1dHRvbkVsZW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXRbdHlwZT1cImZpbGVcIl0nKTtcbiAgICAgICAgaWYgKGZpbGVJbnB1dCAmJiBpbnB1dE5hbWUpIHtcbiAgICAgICAgICAgIGZpbGVJbnB1dC5zZXRBdHRyaWJ1dGUoJ25hbWUnLCBpbnB1dE5hbWUpO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2V0dXBSZXN1bWFibGVFdmVudHMociwgY2FsbGJhY2ssIHRydWUpOyAvLyBhdXRvVXBsb2FkID0gdHJ1ZSBmb3IgYnV0dG9uIGF0dGFjaG1lbnRzXG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuRmlsZXNBUEkgPSBGaWxlc0FQSTsiXX0=