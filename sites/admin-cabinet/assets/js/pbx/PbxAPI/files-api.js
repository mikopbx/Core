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
    chunkSize: 10 * 1024 * 1024,
    // 10MB chunks (reduces request count for large files)
    // #1171: without it the remainder is glued to the last chunk, up to 2 x chunkSize
    forceChunkSize: true,
    simultaneousUploads: 1,
    maxFiles: 1,
    fileType: [],
    permanentErrors: [400, 401, 403, 404, 409, 415, 422, 429, 500, 501],
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
  var category = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
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
        resumableFilename: finalFilename,
        category: category
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZmlsZXMtYXBpLmpzIl0sIm5hbWVzIjpbIkZpbGVzQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwidXBsb2FkIiwidXBsb2FkU3RhdHVzIiwiZG93bmxvYWRGaXJtd2FyZSIsImZpcm13YXJlU3RhdHVzIiwiT2JqZWN0IiwiYXNzaWduIiwiZ2V0RmlsZUNvbnRlbnQiLCJmaWxlUGF0aCIsImNhbGxiYWNrIiwibmVlZE9yaWdpbmFsIiwiZW5jb2RlZFBhdGgiLCJlbmNvZGVVUklDb21wb25lbnQiLCJwYXJhbXMiLCJjYWxsR2V0IiwidXBsb2FkRmlsZUNvbnRlbnQiLCJjb250ZW50IiwiY29udGVudFR5cGUiLCJjYWxsUHV0IiwiZGVsZXRlRmlsZSIsImNhbGxEZWxldGUiLCJ1cGxvYWRDaHVua2VkIiwiZm9ybURhdGEiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiZ2V0VXBsb2FkU3RhdHVzIiwidXBsb2FkSWQiLCJyZXN1bWFibGVJZGVudGlmaWVyIiwiZ2V0RmlybXdhcmVTdGF0dXMiLCJmaWxlbmFtZSIsImNvbmZpZ3VyZVJlc3VtYWJsZSIsInJlc3VtYWJsZUNvbmZpZyIsImhlYWRlcnNGdW5jdGlvbiIsImhlYWRlcnMiLCJUb2tlbk1hbmFnZXIiLCJhY2Nlc3NUb2tlbiIsInRhcmdldCIsIkNvbmZpZyIsInBieFVybCIsInRlc3RDaHVua3MiLCJjaHVua1NpemUiLCJmb3JjZUNodW5rU2l6ZSIsInNpbXVsdGFuZW91c1VwbG9hZHMiLCJtYXhGaWxlcyIsImZpbGVUeXBlIiwicGVybWFuZW50RXJyb3JzIiwic2V0dXBSZXN1bWFibGVFdmVudHMiLCJyZXN1bWFibGVJbnN0YW5jZSIsImF1dG9VcGxvYWQiLCJvbiIsImZpbGUiLCJyZXNwb25zZSIsImV2ZW50IiwibWVzc2FnZSIsInBlcmNlbnQiLCJwcm9ncmVzcyIsInVwbG9hZEZpbGUiLCJhbGxvd2VkRmlsZVR5cGVzIiwiY2F0ZWdvcnkiLCJmaWxlVHlwZXMiLCJpbmNsdWRlcyIsInF1ZXJ5IiwiciIsIlJlc3VtYWJsZSIsImFkZEZpbGUiLCJmaWxlcyIsImxlbmd0aCIsInNldFRpbWVvdXQiLCJpc1VwbG9hZGluZyIsImdldFN0YXR1c1VwbG9hZEZpbGUiLCJmaWxlSWQiLCJyZXN1bHQiLCJkYXRhIiwicmVtb3ZlQXVkaW9GaWxlIiwiYXR0YWNoVG9CdG4iLCJidXR0b25JZCIsImlucHV0TmFtZSIsImJ1dHRvbkVsZW1lbnQiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwib3JpZ2luYWxOYW1lIiwibmFtZSIsImZpbGVOYW1lIiwibmFtZVdpdGhvdXRFeHQiLCJyZXBsYWNlIiwiZXh0ZW5zaW9uIiwic3BsaXQiLCJwb3AiLCJmaW5hbEZpbGVuYW1lIiwicmVzdW1hYmxlRmlsZW5hbWUiLCJhc3NpZ25Ccm93c2UiLCJmaWxlSW5wdXQiLCJxdWVyeVNlbGVjdG9yIiwic2V0QXR0cmlidXRlIiwiZXJyb3IiLCJ3aW5kb3ciXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHLElBQUlDLFlBQUosQ0FBaUI7QUFDOUJDLEVBQUFBLFFBQVEsRUFBRSx1QkFEb0I7QUFFOUJDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxNQUFNLEVBQUUsU0FERztBQUVYQyxJQUFBQSxZQUFZLEVBQUUsZUFGSDtBQUdYQyxJQUFBQSxnQkFBZ0IsRUFBRSxtQkFIUDtBQUlYQyxJQUFBQSxjQUFjLEVBQUU7QUFKTDtBQUZlLENBQWpCLENBQWpCLEMsQ0FVQTs7QUFDQUMsTUFBTSxDQUFDQyxNQUFQLENBQWNULFFBQWQsRUFBd0I7QUFFcEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSVUs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Q0g7O0FBRUQsT0FBS2hELG9CQUFMLENBQTBCZ0IsQ0FBMUIsRUFBNkJwRCxRQUE3QixFQUF1QyxJQUF2QyxFQXBDOEYsQ0FvQ2hEO0FBQ2pELENBckNELEMsQ0F1Q0E7OztBQUNBcUYsTUFBTSxDQUFDakcsUUFBUCxHQUFrQkEsUUFBbEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpQ2xpZW50LCBQYnhBcGksIFJlc3VtYWJsZSwgQ29uZmlnLCBnbG9iYWxSb290VXJsICovIFxuXG4vKipcbiAqIEZpbGVzQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBmaWxlIG1hbmFnZW1lbnQgb3BlcmF0aW9uc1xuICpcbiAqIFByb3ZpZGVzIGJvdGggc3RhbmRhcmQgUkVTVCBvcGVyYXRpb25zIGZvciBmaWxlIENSVUQgYW5kIGN1c3RvbSBtZXRob2RzXG4gKiBmb3Igc3BlY2lhbGl6ZWQgb3BlcmF0aW9ucyBsaWtlIGNodW5rZWQgdXBsb2FkIGFuZCBmaXJtd2FyZSBkb3dubG9hZC5cbiAqXG4gKiBAY2xhc3MgRmlsZXNBUElcbiAqL1xuY29uc3QgRmlsZXNBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9maWxlcycsXG4gICAgY3VzdG9tTWV0aG9kczoge1xuICAgICAgICB1cGxvYWQ6ICc6dXBsb2FkJyxcbiAgICAgICAgdXBsb2FkU3RhdHVzOiAnOnVwbG9hZFN0YXR1cycsXG4gICAgICAgIGRvd25sb2FkRmlybXdhcmU6ICc6ZG93bmxvYWRGaXJtd2FyZScsXG4gICAgICAgIGZpcm13YXJlU3RhdHVzOiAnOmZpcm13YXJlU3RhdHVzJ1xuICAgIH1cbn0pO1xuXG4vLyBBZGQgbWV0aG9kcyB0byBGaWxlc0FQSSB1c2luZyBQYnhBcGkgdXRpbGl0eVxuT2JqZWN0LmFzc2lnbihGaWxlc0FQSSwge1xuXG4gICAgLyoqXG4gICAgICogR2V0IGZpbGUgY29udGVudCBieSBwYXRoXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gRmlsZSBwYXRoICh3aWxsIGJlIFVSTCBlbmNvZGVkKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtuZWVkT3JpZ2luYWw9ZmFsc2VdIC0gV2hldGhlciB0byByZXR1cm4gb3JpZ2luYWwgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IGpRdWVyeSBBUEkgY2FsbCBvYmplY3RcbiAgICAgKi9cbiAgICBnZXRGaWxlQ29udGVudChmaWxlUGF0aCwgY2FsbGJhY2ssIG5lZWRPcmlnaW5hbCA9IGZhbHNlKSB7XG4gICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZW5jb2RlZFBhdGggPSBlbmNvZGVVUklDb21wb25lbnQoZmlsZVBhdGgpO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gbmVlZE9yaWdpbmFsID8geyBuZWVkT3JpZ2luYWw6ICd0cnVlJyB9IDoge307XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxHZXQocGFyYW1zLCBjYWxsYmFjaywgZW5jb2RlZFBhdGgpO1xuICAgIFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGxvYWQgZmlsZSBjb250ZW50IHVzaW5nIFBVVCBtZXRob2QgKHNpbXBsZSB1cGxvYWQpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gRGVzdGluYXRpb24gZmlsZSBwYXRoXG4gICAgICogQHBhcmFtIHtzdHJpbmd8QmxvYn0gY29udGVudCAtIEZpbGUgY29udGVudFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2NvbnRlbnRUeXBlPSdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXSAtIENvbnRlbnQgdHlwZVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IGpRdWVyeSBBUEkgY2FsbCBvYmplY3RcbiAgICAgKi9cbiAgICB1cGxvYWRGaWxlQ29udGVudChmaWxlUGF0aCwgY29udGVudCwgY2FsbGJhY2ssIGNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScpIHtcbiAgICAgICAgY29uc3QgZW5jb2RlZFBhdGggPSBlbmNvZGVVUklDb21wb25lbnQoZmlsZVBhdGgpO1xuXG4gICAgICAgIC8vIFVzZSBjYWxsUHV0IG1ldGhvZCB3aXRoIHRoZSBlbmNvZGVkIHBhdGggYXMgSURcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbFB1dChjb250ZW50LCBjYWxsYmFjaywgZW5jb2RlZFBhdGgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgZmlsZSBieSBwYXRoXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gRmlsZSBwYXRoIHRvIGRlbGV0ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBqUXVlcnkgQVBJIGNhbGwgb2JqZWN0XG4gICAgICovXG4gICAgZGVsZXRlRmlsZShmaWxlUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGVuY29kZWRQYXRoID0gZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVQYXRoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxEZWxldGUoY2FsbGJhY2ssIGVuY29kZWRQYXRoKTtcbiAgICAgIFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaHVua2VkIGZpbGUgdXBsb2FkIChSZXN1bWFibGUuanMgc3VwcG9ydClcbiAgICAgKiBAcGFyYW0ge0Zvcm1EYXRhfSBmb3JtRGF0YSAtIEZvcm0gZGF0YSB3aXRoIGZpbGUgY2h1bmtzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEFQSSBjYWxsIHJlc3VsdFxuICAgICAqL1xuICAgIHVwbG9hZENodW5rZWQoZm9ybURhdGEsIGNhbGxiYWNrKSB7XG4gICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ3VwbG9hZCcsIGZvcm1EYXRhLCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICAgICBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHVwbG9hZCBzdGF0dXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXBsb2FkSWQgLSBVcGxvYWQgaWRlbnRpZmllclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBBUEkgY2FsbCByZXN1bHRcbiAgICAgKi9cbiAgICBnZXRVcGxvYWRTdGF0dXModXBsb2FkSWQsIGNhbGxiYWNrKSB7XG5cbiAgICAgICAgICAgIC8vIFVzZSAncmVzdW1hYmxlSWRlbnRpZmllcicgaW5zdGVhZCBvZiAnaWQnIHRvIGF2b2lkIGNvbmZsaWN0IHdpdGggcmVzb3VyY2UgSUQgcm91dGluZ1xuICAgICAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHRoZSBVUkwgYmVjb21lcyAvZmlsZXM6dXBsb2FkU3RhdHVzP3Jlc3VtYWJsZUlkZW50aWZpZXI9eHh4XG4gICAgICAgICAgICAvLyBpbnN0ZWFkIG9mIC9maWxlcy97aWR9OnVwbG9hZFN0YXR1c1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0geyByZXN1bWFibGVJZGVudGlmaWVyOiB1cGxvYWRJZCB9O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgndXBsb2FkU3RhdHVzJywgcGFyYW1zLCBjYWxsYmFjaywgJ0dFVCcpO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERvd25sb2FkIGZpcm13YXJlIGZyb20gZXh0ZXJuYWwgVVJMXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIERvd25sb2FkIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVybCAtIEZpcm13YXJlIFVSTFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbcGFyYW1zLm1kNV0gLSBFeHBlY3RlZCBNRDUgaGFzaFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBBUEkgY2FsbCByZXN1bHRcbiAgICAgKi9cbiAgICBkb3dubG9hZEZpcm13YXJlKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICBcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZG93bmxvYWRGaXJtd2FyZScsIHBhcmFtcywgY2FsbGJhY2ssICdQT1NUJyk7XG4gICAgICBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGZpcm13YXJlIGRvd25sb2FkIHN0YXR1c1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIEZpcm13YXJlIGZpbGVuYW1lXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEFQSSBjYWxsIHJlc3VsdFxuICAgICAqL1xuICAgIGdldEZpcm13YXJlU3RhdHVzKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuICAgICAgIFxuXG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7IGZpbGVuYW1lOiBmaWxlbmFtZSB9O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZmlybXdhcmVTdGF0dXMnLCBwYXJhbXMsIGNhbGxiYWNrLCAnR0VUJyk7XG4gICAgICAgIFxuICAgIH1cbn0pO1xuXG4vKipcbiAqIEhpZ2gtbGV2ZWwgQVBJIG1ldGhvZHNcbiAqIFRoZXNlIG1ldGhvZHMgcHJvdmlkZSBjb252ZW5pZW50IHdyYXBwZXJzIGFyb3VuZCB0aGUgY29yZSB2MyBSRVNUIEFQSVxuICovXG5cbi8qKlxuICogQ29uZmlndXJlIFJlc3VtYWJsZS5qcyB0byB1c2UgdGhlIG5ldyB2MyBBUElcbiAqIEBwYXJhbSB7b2JqZWN0fSByZXN1bWFibGVDb25maWcgLSBSZXN1bWFibGUuanMgY29uZmlndXJhdGlvblxuICogQHJldHVybnMge29iamVjdH0gVXBkYXRlZCBjb25maWd1cmF0aW9uXG4gKi9cbkZpbGVzQVBJLmNvbmZpZ3VyZVJlc3VtYWJsZSA9IGZ1bmN0aW9uKHJlc3VtYWJsZUNvbmZpZyA9IHt9KSB7XG4gICAgLy8gVXNlIGEgZnVuY3Rpb24gZm9yIGhlYWRlcnMgdG8gZ2V0IHRoZSBsYXRlc3QgdG9rZW4gZHluYW1pY2FsbHlcbiAgICAvLyBSZXN1bWFibGUuanMgd2lsbCBjYWxsIHRoaXMgZnVuY3Rpb24gYmVmb3JlIGVhY2ggcmVxdWVzdFxuICAgIGNvbnN0IGhlYWRlcnNGdW5jdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCBoZWFkZXJzID0ge1xuICAgICAgICAgICAgJ1gtUmVxdWVzdGVkLVdpdGgnOiAnWE1MSHR0cFJlcXVlc3QnXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWRkIEJlYXJlciB0b2tlbiBpZiBhdmFpbGFibGUgKGZvciBKV1QgYXV0aGVudGljYXRpb24pXG4gICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBoZWFkZXJzO1xuICAgIH07XG5cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIHRhcmdldDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjMvZmlsZXM6dXBsb2FkYCxcbiAgICAgICAgdGVzdENodW5rczogZmFsc2UsXG4gICAgICAgIGNodW5rU2l6ZTogMTAgKiAxMDI0ICogMTAyNCwgLy8gMTBNQiBjaHVua3MgKHJlZHVjZXMgcmVxdWVzdCBjb3VudCBmb3IgbGFyZ2UgZmlsZXMpXG4gICAgICAgIC8vICMxMTcxOiB3aXRob3V0IGl0IHRoZSByZW1haW5kZXIgaXMgZ2x1ZWQgdG8gdGhlIGxhc3QgY2h1bmssIHVwIHRvIDIgeCBjaHVua1NpemVcbiAgICAgICAgZm9yY2VDaHVua1NpemU6IHRydWUsXG4gICAgICAgIHNpbXVsdGFuZW91c1VwbG9hZHM6IDEsXG4gICAgICAgIG1heEZpbGVzOiAxLFxuICAgICAgICBmaWxlVHlwZTogW10sXG4gICAgICAgIHBlcm1hbmVudEVycm9yczogWzQwMCwgNDAxLCA0MDMsIDQwNCwgNDA5LCA0MTUsIDQyMiwgNDI5LCA1MDAsIDUwMV0sXG4gICAgICAgIGhlYWRlcnM6IGhlYWRlcnNGdW5jdGlvblxuICAgIH0sIHJlc3VtYWJsZUNvbmZpZyk7XG59O1xuXG4vKipcbiAqIFNldHVwIGNvbW1vbiBSZXN1bWFibGUuanMgZXZlbnQgaGFuZGxlcnNcbiAqIEBwYXJhbSB7b2JqZWN0fSByZXN1bWFibGVJbnN0YW5jZSAtIFJlc3VtYWJsZS5qcyBpbnN0YW5jZVxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiBmb3IgZXZlbnRzXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGF1dG9VcGxvYWQgLSBXaGV0aGVyIHRvIGF1dG8tdXBsb2FkIG9uIGZpbGVBZGRlZCBldmVudFxuICovXG5GaWxlc0FQSS5zZXR1cFJlc3VtYWJsZUV2ZW50cyA9IGZ1bmN0aW9uKHJlc3VtYWJsZUluc3RhbmNlLCBjYWxsYmFjaywgYXV0b1VwbG9hZCA9IGZhbHNlKSB7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCdmaWxlU3VjY2VzcycsIHtmaWxlLCByZXNwb25zZX0pO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdmaWxlUHJvZ3Jlc3MnLCAoZmlsZSkgPT4ge1xuICAgICAgICBjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbignZmlsZUFkZGVkJywgKGZpbGUsIGV2ZW50KSA9PiB7XG4gICAgICAgIGlmIChhdXRvVXBsb2FkKSB7XG4gICAgICAgICAgICByZXN1bWFibGVJbnN0YW5jZS51cGxvYWQoKTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjaygnZmlsZUFkZGVkJywge2ZpbGUsIGV2ZW50fSk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ2ZpbGVSZXRyeScsIChmaWxlKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCdmaWxlUmV0cnknLCB7ZmlsZX0pO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdmaWxlRXJyb3InLCAoZmlsZSwgbWVzc2FnZSkgPT4ge1xuICAgICAgICBjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCd1cGxvYWRTdGFydCcpO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdjb21wbGV0ZScsICgpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ2NvbXBsZXRlJyk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ3Byb2dyZXNzJywgKCkgPT4ge1xuICAgICAgICBjb25zdCBwZXJjZW50ID0gMTAwICogcmVzdW1hYmxlSW5zdGFuY2UucHJvZ3Jlc3MoKTtcbiAgICAgICAgY2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbignZXJyb3InLCAobWVzc2FnZSwgZmlsZSkgPT4ge1xuICAgICAgICBjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZSwgZmlsZX0pO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdwYXVzZScsICgpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ3BhdXNlJyk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ2NhbmNlbCcsICgpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ2NhbmNlbCcpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBVcGxvYWQgZmlsZSB1c2luZyBSZXN1bWFibGUuanNcbiAqIEBwYXJhbSB7RmlsZX0gZmlsZSAtIEZpbGUgb2JqZWN0IHRvIHVwbG9hZFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICogQHBhcmFtIHtzdHJpbmdbXX0gYWxsb3dlZEZpbGVUeXBlcyAtIE9wdGlvbmFsIGFycmF5IG9mIGFsbG93ZWQgZmlsZSBleHRlbnNpb25zIChlLmcuLCBbJ3dhdicsICdtcDMnXSlcbiAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSAtIE9wdGlvbmFsIGNhdGVnb3J5IGZvciBmaWxlIHR5cGUgdmFsaWRhdGlvbiAoZS5nLiwgJ2Zpcm13YXJlJywgJ3NvdW5kJylcbiAqL1xuRmlsZXNBUEkudXBsb2FkRmlsZSA9IGZ1bmN0aW9uKGZpbGUsIGNhbGxiYWNrLCBhbGxvd2VkRmlsZVR5cGVzID0gW10sIGNhdGVnb3J5ID0gbnVsbCkge1xuICAgIC8vIFJlc3VtYWJsZS5qcyB0cmVhdHMgWycqJ10gYXMgbGl0ZXJhbCBleHRlbnNpb24gbWF0Y2gsIG5vdCB3aWxkY2FyZC5cbiAgICAvLyBFbXB0eSBhcnJheSBbXSBza2lwcyBmaWxlIHR5cGUgdmFsaWRhdGlvbiBlbnRpcmVseSAoYWxsb3dzIGFsbCBmaWxlcykuXG4gICAgY29uc3QgZmlsZVR5cGVzID0gYWxsb3dlZEZpbGVUeXBlcy5pbmNsdWRlcygnKicpID8gW10gOiBhbGxvd2VkRmlsZVR5cGVzO1xuICAgIGNvbnN0IHJlc3VtYWJsZUNvbmZpZyA9IHRoaXMuY29uZmlndXJlUmVzdW1hYmxlKHtcbiAgICAgICAgZmlsZVR5cGU6IGZpbGVUeXBlc1xuICAgIH0pO1xuXG4gICAgLy8gQWRkIGNhdGVnb3J5IHRvIHF1ZXJ5IHBhcmFtZXRlcnMgaWYgcHJvdmlkZWRcbiAgICBpZiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgcmVzdW1hYmxlQ29uZmlnLnF1ZXJ5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCByID0gbmV3IFJlc3VtYWJsZShyZXN1bWFibGVDb25maWcpO1xuXG4gICAgLy8gU2V0dXAgZXZlbnRzIEJFRk9SRSBhZGRpbmcgZmlsZSB0byBjYXB0dXJlIGZpbGVBZGRlZCBldmVudFxuICAgIHRoaXMuc2V0dXBSZXN1bWFibGVFdmVudHMociwgY2FsbGJhY2ssIGZhbHNlKTtcblxuICAgIHIuYWRkRmlsZShmaWxlKTtcblxuICAgIC8vIElmIGZpbGUgd2FzIG5vdCBhZGRlZCAodmFsaWRhdGlvbiBmYWlsZWQpLCBzdG9wIGhlcmVcbiAgICBpZiAoci5maWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgY2FsbGJhY2soJ2Vycm9yJywge21lc3NhZ2U6ICdGaWxlIHR5cGUgbm90IGFsbG93ZWQgb3IgdmFsaWRhdGlvbiBmYWlsZWQnfSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICByLnVwbG9hZCgpO1xuXG4gICAgLy8gUmV0cnkgaWYgdXBsb2FkIGRvZXNuJ3Qgc3RhcnRcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaWYgKCFyLmlzVXBsb2FkaW5nKCkgJiYgci5maWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByLnVwbG9hZCgpO1xuICAgICAgICB9XG4gICAgfSwgMTAwKTtcbn07XG5cbi8qKlxuICogR2V0IHN0YXR1cyBvZiB1cGxvYWRlZCBmaWxlIChjaHVua2VkIHVwbG9hZClcbiAqXG4gKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBHRVQgL2ZpbGVzOnVwbG9hZFN0YXR1cz9pZD17ZmlsZUlkfVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlSWQgLSBVcGxvYWQgaWRlbnRpZmllciBmcm9tIFJlc3VtYWJsZS5qc1xuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiByZWNlaXZpbmcgdXBsb2FkIHN0YXR1cyBkYXRhIG9yIGZhbHNlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBqUXVlcnkgQVBJIGNhbGwgb2JqZWN0XG4gKi9cbkZpbGVzQVBJLmdldFN0YXR1c1VwbG9hZEZpbGUgPSBmdW5jdGlvbihmaWxlSWQsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgndXBsb2FkU3RhdHVzJywgeyByZXN1bWFibGVJZGVudGlmaWVyOiBmaWxlSWQgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9LCAnR0VUJyk7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhdWRpbyBmaWxlXG4gKlxuICogVXNlcyB2MyBSRVNUZnVsIEFQSTogREVMRVRFIC9maWxlcy97cGF0aH1cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBGaWxlIHBhdGggdG8gZGVsZXRlXG4gKiBAcGFyYW0ge3N0cmluZ3xudWxsfSBmaWxlSWQgLSBGaWxlIElEIChvcHRpb25hbCwgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkpXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufG51bGx9IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gKG9wdGlvbmFsKVxuICogQHJldHVybnMge09iamVjdH0galF1ZXJ5IEFQSSBjYWxsIG9iamVjdFxuICovXG5GaWxlc0FQSS5yZW1vdmVBdWRpb0ZpbGUgPSBmdW5jdGlvbihmaWxlUGF0aCwgZmlsZUlkID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZXRlRmlsZShmaWxlUGF0aCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZpbGVJZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBBdHRhY2ggdG8gYnV0dG9uXG4gKiBAcGFyYW0ge3N0cmluZ30gYnV0dG9uSWQgLSBCdXR0b24gSURcbiAqIEBwYXJhbSB7c3RyaW5nW119IGZpbGVUeXBlcyAtIEFycmF5IG9mIGFsbG93ZWQgZmlsZSB0eXBlc1xuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICogQHBhcmFtIHtzdHJpbmd8bnVsbH0gaW5wdXROYW1lIC0gT3B0aW9uYWwgbmFtZSBhdHRyaWJ1dGUgZm9yIHRoZSBmaWxlIGlucHV0IChmb3IgdGVzdCBjb21wYXRpYmlsaXR5KVxuICovXG5GaWxlc0FQSS5hdHRhY2hUb0J0biA9IGZ1bmN0aW9uKGJ1dHRvbklkLCBmaWxlVHlwZXMsIGNhbGxiYWNrLCBpbnB1dE5hbWUgPSBudWxsLCBjYXRlZ29yeSA9IG51bGwpIHtcbiAgICBjb25zdCBidXR0b25FbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYnV0dG9uSWQpO1xuICAgIGlmICghYnV0dG9uRWxlbWVudCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdW1hYmxlQ29uZmlnID0gdGhpcy5jb25maWd1cmVSZXN1bWFibGUoe1xuICAgICAgICBmaWxlVHlwZTogZmlsZVR5cGVzLFxuICAgICAgICBxdWVyeTogZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxOYW1lID0gZmlsZS5uYW1lIHx8IGZpbGUuZmlsZU5hbWU7XG4gICAgICAgICAgICBjb25zdCBuYW1lV2l0aG91dEV4dCA9IG9yaWdpbmFsTmFtZS5yZXBsYWNlKC9cXC5bXi8uXSskLywgJycpO1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gb3JpZ2luYWxOYW1lLnNwbGl0KCcuJykucG9wKCk7XG4gICAgICAgICAgICBjb25zdCBmaW5hbEZpbGVuYW1lID0gbmFtZVdpdGhvdXRFeHQgKyAnLicgKyBleHRlbnNpb247XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVzdW1hYmxlRmlsZW5hbWU6IGZpbmFsRmlsZW5hbWUsXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCByID0gbmV3IFJlc3VtYWJsZShyZXN1bWFibGVDb25maWcpO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgci5hc3NpZ25Ccm93c2UoYnV0dG9uRWxlbWVudCk7XG5cbiAgICAgICAgLy8gQWRkIG5hbWUgYXR0cmlidXRlIHRvIHRoZSBkeW5hbWljYWxseSBjcmVhdGVkIGZpbGUgaW5wdXQgZm9yIHRlc3QgY29tcGF0aWJpbGl0eVxuICAgICAgICAvLyBSZXN1bWFibGUuanMgY3JlYXRlcyB0aGUgaW5wdXQgaW5zaWRlIHRoZSBidXR0b24gZWxlbWVudFxuICAgICAgICBjb25zdCBmaWxlSW5wdXQgPSBidXR0b25FbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W3R5cGU9XCJmaWxlXCJdJyk7XG4gICAgICAgIGlmIChmaWxlSW5wdXQgJiYgaW5wdXROYW1lKSB7XG4gICAgICAgICAgICBmaWxlSW5wdXQuc2V0QXR0cmlidXRlKCduYW1lJywgaW5wdXROYW1lKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnNldHVwUmVzdW1hYmxlRXZlbnRzKHIsIGNhbGxiYWNrLCB0cnVlKTsgLy8gYXV0b1VwbG9hZCA9IHRydWUgZm9yIGJ1dHRvbiBhdHRhY2htZW50c1xufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93LkZpbGVzQVBJID0gRmlsZXNBUEk7XG4iXX0=