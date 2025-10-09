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
    var params = {
      id: uploadId
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
 * Legacy compatibility methods - these map to the new REST API methods
 * These maintain backward compatibility while using the new standardized methods
 */

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
  // Get Authorization header from TokenManager
  var headers = {
    'X-Requested-With': 'XMLHttpRequest'
  }; // Add Bearer token if available (for JWT authentication)

  if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
    headers['Authorization'] = "Bearer ".concat(TokenManager.accessToken);
  }

  return Object.assign({
    target: "".concat(Config.pbxUrl, "/pbxcore/api/v3/files:upload"),
    testChunks: false,
    chunkSize: 3 * 1024 * 1024,
    // 3MB chunks
    simultaneousUploads: 1,
    maxFiles: 1,
    fileType: ['*'],
    headers: headers
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
 */


FilesAPI.uploadFile = function (file, callback) {
  var allowedFileTypes = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ['*'];
  var r = new Resumable(this.configureResumable({
    fileType: allowedFileTypes
  })); // Setup events BEFORE adding file to capture fileAdded event

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
 * Get status of uploaded file
 * @param {string} fileId - File ID
 * @param {function} callback - Callback function
 */


FilesAPI.getStatusUploadFile = function (fileId, callback) {
  return this.callCustomMethod('uploadStatus', {
    id: fileId
  }, function (response) {
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
 * Download new firmware
 * @param {object} params - Download parameters
 * @param {function} callback - Callback function
 */


FilesAPI.downloadNewFirmware = function (params, callback) {
  var requestData = {
    md5: params.md5,
    size: params.size,
    version: params.version,
    url: params.updateLink
  };
  return this.callCustomMethod('downloadFirmware', requestData, function (response) {
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


FilesAPI.firmwareDownloadStatus = function (filename, callback) {
  return this.callCustomMethod('firmwareStatus', {
    filename: filename
  }, function (response) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZmlsZXMtYXBpLmpzIl0sIm5hbWVzIjpbIkZpbGVzQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwidXBsb2FkIiwidXBsb2FkU3RhdHVzIiwiZG93bmxvYWRGaXJtd2FyZSIsImZpcm13YXJlU3RhdHVzIiwiT2JqZWN0IiwiYXNzaWduIiwiZ2V0RmlsZUNvbnRlbnQiLCJmaWxlUGF0aCIsImNhbGxiYWNrIiwibmVlZE9yaWdpbmFsIiwiZW5jb2RlZFBhdGgiLCJlbmNvZGVVUklDb21wb25lbnQiLCJwYXJhbXMiLCJjYWxsR2V0IiwidXBsb2FkRmlsZUNvbnRlbnQiLCJjb250ZW50IiwiY29udGVudFR5cGUiLCJjYWxsUHV0IiwiZGVsZXRlRmlsZSIsImNhbGxEZWxldGUiLCJ1cGxvYWRDaHVua2VkIiwiZm9ybURhdGEiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiZ2V0VXBsb2FkU3RhdHVzIiwidXBsb2FkSWQiLCJpZCIsImdldEZpcm13YXJlU3RhdHVzIiwiZmlsZW5hbWUiLCJ1cGxvYWRGaWxlRnJvbVBhcmFtcyIsIkZvcm1EYXRhIiwia2V5cyIsImZvckVhY2giLCJrZXkiLCJBcnJheSIsImlzQXJyYXkiLCJmaWxlIiwiaW5kZXgiLCJmaWxlX3BhdGgiLCJmaWxlX25hbWUiLCJhcHBlbmQiLCJzdGF0dXNVcGxvYWRGaWxlIiwiY29uZmlndXJlUmVzdW1hYmxlIiwicmVzdW1hYmxlQ29uZmlnIiwiaGVhZGVycyIsIlRva2VuTWFuYWdlciIsImFjY2Vzc1Rva2VuIiwidGFyZ2V0IiwiQ29uZmlnIiwicGJ4VXJsIiwidGVzdENodW5rcyIsImNodW5rU2l6ZSIsInNpbXVsdGFuZW91c1VwbG9hZHMiLCJtYXhGaWxlcyIsImZpbGVUeXBlIiwic2V0dXBSZXN1bWFibGVFdmVudHMiLCJyZXN1bWFibGVJbnN0YW5jZSIsImF1dG9VcGxvYWQiLCJvbiIsInJlc3BvbnNlIiwiZXZlbnQiLCJtZXNzYWdlIiwicGVyY2VudCIsInByb2dyZXNzIiwidXBsb2FkRmlsZSIsImFsbG93ZWRGaWxlVHlwZXMiLCJyIiwiUmVzdW1hYmxlIiwiYWRkRmlsZSIsImZpbGVzIiwibGVuZ3RoIiwic2V0VGltZW91dCIsImlzVXBsb2FkaW5nIiwiZ2V0U3RhdHVzVXBsb2FkRmlsZSIsImZpbGVJZCIsInJlc3VsdCIsImRhdGEiLCJyZW1vdmVBdWRpb0ZpbGUiLCJkb3dubG9hZE5ld0Zpcm13YXJlIiwicmVxdWVzdERhdGEiLCJtZDUiLCJzaXplIiwidmVyc2lvbiIsInVybCIsInVwZGF0ZUxpbmsiLCJmaXJtd2FyZURvd25sb2FkU3RhdHVzIiwiYXR0YWNoVG9CdG4iLCJidXR0b25JZCIsImZpbGVUeXBlcyIsImlucHV0TmFtZSIsImJ1dHRvbkVsZW1lbnQiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwicXVlcnkiLCJvcmlnaW5hbE5hbWUiLCJuYW1lIiwiZmlsZU5hbWUiLCJuYW1lV2l0aG91dEV4dCIsInJlcGxhY2UiLCJleHRlbnNpb24iLCJzcGxpdCIsInBvcCIsImZpbmFsRmlsZW5hbWUiLCJyZXN1bWFibGVGaWxlbmFtZSIsImFzc2lnbkJyb3dzZSIsImZpbGVJbnB1dCIsInF1ZXJ5U2VsZWN0b3IiLCJzZXRBdHRyaWJ1dGUiLCJlcnJvciIsIndpbmRvdyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUM5QkMsRUFBQUEsUUFBUSxFQUFFLHVCQURvQjtBQUU5QkMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLE1BQU0sRUFBRSxTQURHO0FBRVhDLElBQUFBLFlBQVksRUFBRSxlQUZIO0FBR1hDLElBQUFBLGdCQUFn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Q0FBQ00sS0FBYixDQUFtQixHQUFuQixFQUF3QkMsR0FBeEIsRUFBbEI7QUFDQSxVQUFNQyxhQUFhLEdBQUdMLGNBQWMsR0FBRyxHQUFqQixHQUF1QkUsU0FBN0M7QUFFQSxhQUFPO0FBQ0hJLFFBQUFBLGlCQUFpQixFQUFFRDtBQURoQixPQUFQO0FBR0g7QUFYMkMsR0FBeEIsQ0FBeEI7QUFjQSxNQUFNcEMsQ0FBQyxHQUFHLElBQUlDLFNBQUosQ0FBY3hCLGVBQWQsQ0FBVjs7QUFFQSxNQUFJO0FBQ0F1QixJQUFBQSxDQUFDLENBQUNzQyxZQUFGLENBQWVkLGFBQWYsRUFEQSxDQUdBO0FBQ0E7O0FBQ0EsUUFBTWUsU0FBUyxHQUFHZixhQUFhLENBQUNnQixhQUFkLENBQTRCLG9CQUE1QixDQUFsQjs7QUFDQSxRQUFJRCxTQUFTLElBQUloQixTQUFqQixFQUE0QjtBQUN4QmdCLE1BQUFBLFNBQVMsQ0FBQ0UsWUFBVixDQUF1QixNQUF2QixFQUErQmxCLFNBQS9CO0FBQ0g7QUFDSixHQVRELENBU0UsT0FBT21CLEtBQVAsRUFBYztBQUNaO0FBQ0g7O0FBRUQsT0FBS3JELG9CQUFMLENBQTBCVyxDQUExQixFQUE2QnpELFFBQTdCLEVBQXVDLElBQXZDLEVBbkM2RSxDQW1DL0I7QUFDakQsQ0FwQ0QsQyxDQXNDQTs7O0FBQ0FvRyxNQUFNLENBQUNoSCxRQUFQLEdBQWtCQSxRQUFsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGlDbGllbnQsIFBieEFwaSwgUmVzdW1hYmxlLCBDb25maWcsIGdsb2JhbFJvb3RVcmwgKi8gXG5cbi8qKlxuICogRmlsZXNBUEkgLSBSRVNUIEFQSSB2MyBjbGllbnQgZm9yIGZpbGUgbWFuYWdlbWVudCBvcGVyYXRpb25zXG4gKlxuICogUHJvdmlkZXMgYm90aCBzdGFuZGFyZCBSRVNUIG9wZXJhdGlvbnMgZm9yIGZpbGUgQ1JVRCBhbmQgY3VzdG9tIG1ldGhvZHNcbiAqIGZvciBzcGVjaWFsaXplZCBvcGVyYXRpb25zIGxpa2UgY2h1bmtlZCB1cGxvYWQgYW5kIGZpcm13YXJlIGRvd25sb2FkLlxuICpcbiAqIEBjbGFzcyBGaWxlc0FQSVxuICovXG5jb25zdCBGaWxlc0FQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL2ZpbGVzJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIHVwbG9hZDogJzp1cGxvYWQnLFxuICAgICAgICB1cGxvYWRTdGF0dXM6ICc6dXBsb2FkU3RhdHVzJyxcbiAgICAgICAgZG93bmxvYWRGaXJtd2FyZTogJzpkb3dubG9hZEZpcm13YXJlJyxcbiAgICAgICAgZmlybXdhcmVTdGF0dXM6ICc6ZmlybXdhcmVTdGF0dXMnXG4gICAgfVxufSk7XG5cbi8vIEFkZCBtZXRob2RzIHRvIEZpbGVzQVBJIHVzaW5nIFBieEFwaSB1dGlsaXR5XG5PYmplY3QuYXNzaWduKEZpbGVzQVBJLCB7XG5cbiAgICAvKipcbiAgICAgKiBHZXQgZmlsZSBjb250ZW50IGJ5IHBhdGhcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBGaWxlIHBhdGggKHdpbGwgYmUgVVJMIGVuY29kZWQpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW25lZWRPcmlnaW5hbD1mYWxzZV0gLSBXaGV0aGVyIHRvIHJldHVybiBvcmlnaW5hbCBjb250ZW50XG4gICAgICogQHJldHVybnMge09iamVjdH0galF1ZXJ5IEFQSSBjYWxsIG9iamVjdFxuICAgICAqL1xuICAgIGdldEZpbGVDb250ZW50KGZpbGVQYXRoLCBjYWxsYmFjaywgbmVlZE9yaWdpbmFsID0gZmFsc2UpIHtcbiAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBlbmNvZGVkUGF0aCA9IGVuY29kZVVSSUNvbXBvbmVudChmaWxlUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBuZWVkT3JpZ2luYWwgPyB7IG5lZWRPcmlnaW5hbDogJ3RydWUnIH0gOiB7fTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEdldChwYXJhbXMsIGNhbGxiYWNrLCBlbmNvZGVkUGF0aCk7XG4gICAgXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwbG9hZCBmaWxlIGNvbnRlbnQgdXNpbmcgUFVUIG1ldGhvZCAoc2ltcGxlIHVwbG9hZClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBEZXN0aW5hdGlvbiBmaWxlIHBhdGhcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xCbG9ifSBjb250ZW50IC0gRmlsZSBjb250ZW50XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbY29udGVudFR5cGU9J2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSddIC0gQ29udGVudCB0eXBlXG4gICAgICogQHJldHVybnMge09iamVjdH0galF1ZXJ5IEFQSSBjYWxsIG9iamVjdFxuICAgICAqL1xuICAgIHVwbG9hZEZpbGVDb250ZW50KGZpbGVQYXRoLCBjb250ZW50LCBjYWxsYmFjaywgY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJykge1xuICAgICAgICBjb25zdCBlbmNvZGVkUGF0aCA9IGVuY29kZVVSSUNvbXBvbmVudChmaWxlUGF0aCk7XG5cbiAgICAgICAgLy8gVXNlIGNhbGxQdXQgbWV0aG9kIHdpdGggdGhlIGVuY29kZWQgcGF0aCBhcyBJRFxuICAgICAgICByZXR1cm4gdGhpcy5jYWxsUHV0KGNvbnRlbnQsIGNhbGxiYWNrLCBlbmNvZGVkUGF0aCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBmaWxlIGJ5IHBhdGhcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBGaWxlIHBhdGggdG8gZGVsZXRlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IGpRdWVyeSBBUEkgY2FsbCBvYmplY3RcbiAgICAgKi9cbiAgICBkZWxldGVGaWxlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZW5jb2RlZFBhdGggPSBlbmNvZGVVUklDb21wb25lbnQoZmlsZVBhdGgpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbERlbGV0ZShjYWxsYmFjaywgZW5jb2RlZFBhdGgpO1xuICAgICAgXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENodW5rZWQgZmlsZSB1cGxvYWQgKFJlc3VtYWJsZS5qcyBzdXBwb3J0KVxuICAgICAqIEBwYXJhbSB7Rm9ybURhdGF9IGZvcm1EYXRhIC0gRm9ybSBkYXRhIHdpdGggZmlsZSBjaHVua3NcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge09iamVjdH0gQVBJIGNhbGwgcmVzdWx0XG4gICAgICovXG4gICAgdXBsb2FkQ2h1bmtlZChmb3JtRGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgndXBsb2FkJywgZm9ybURhdGEsIGNhbGxiYWNrLCAnUE9TVCcpO1xuICAgICAgIFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdXBsb2FkIHN0YXR1c1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1cGxvYWRJZCAtIFVwbG9hZCBpZGVudGlmaWVyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEFQSSBjYWxsIHJlc3VsdFxuICAgICAqL1xuICAgIGdldFVwbG9hZFN0YXR1cyh1cGxvYWRJZCwgY2FsbGJhY2spIHtcbiAgICAgIFxuXG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7IGlkOiB1cGxvYWRJZCB9O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgndXBsb2FkU3RhdHVzJywgcGFyYW1zLCBjYWxsYmFjaywgJ0dFVCcpO1xuICAgICAgIFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEb3dubG9hZCBmaXJtd2FyZSBmcm9tIGV4dGVybmFsIFVSTFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBEb3dubG9hZCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51cmwgLSBGaXJtd2FyZSBVUkxcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3BhcmFtcy5tZDVdIC0gRXhwZWN0ZWQgTUQ1IGhhc2hcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge09iamVjdH0gQVBJIGNhbGwgcmVzdWx0XG4gICAgICovXG4gICAgZG93bmxvYWRGaXJtd2FyZShwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgXG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2Rvd25sb2FkRmlybXdhcmUnLCBwYXJhbXMsIGNhbGxiYWNrLCAnUE9TVCcpO1xuICAgICAgXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBmaXJtd2FyZSBkb3dubG9hZCBzdGF0dXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBGaXJtd2FyZSBmaWxlbmFtZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBBUEkgY2FsbCByZXN1bHRcbiAgICAgKi9cbiAgICBnZXRGaXJtd2FyZVN0YXR1cyhmaWxlbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICBcblxuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0geyBmaWxlbmFtZTogZmlsZW5hbWUgfTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2Zpcm13YXJlU3RhdHVzJywgcGFyYW1zLCBjYWxsYmFjaywgJ0dFVCcpO1xuICAgICAgICBcbiAgICB9XG59KTtcblxuLyoqXG4gKiBMZWdhY3kgY29tcGF0aWJpbGl0eSBtZXRob2RzIC0gdGhlc2UgbWFwIHRvIHRoZSBuZXcgUkVTVCBBUEkgbWV0aG9kc1xuICogVGhlc2UgbWFpbnRhaW4gYmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aGlsZSB1c2luZyB0aGUgbmV3IHN0YW5kYXJkaXplZCBtZXRob2RzXG4gKi9cblxuLyoqXG4gKiBMZWdhY3k6IFVwbG9hZCBmaWxlIHdpdGggcGFyYW1zIChtYXBzIHRvIHVwbG9hZENodW5rZWQpXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gVXBsb2FkIHBhcmFtZXRlcnNcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAqL1xuRmlsZXNBUEkudXBsb2FkRmlsZUZyb21QYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgLy8gQ29udmVydCBvYmplY3QgdG8gRm9ybURhdGEgZm9yIGNodW5rZWQgdXBsb2FkXG4gICAgY29uc3QgZm9ybURhdGEgPSBuZXcgRm9ybURhdGEoKTtcbiAgICBPYmplY3Qua2V5cyhwYXJhbXMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgaWYgKGtleSA9PT0gJ2ZpbGVzJyAmJiBBcnJheS5pc0FycmF5KHBhcmFtc1trZXldKSkge1xuICAgICAgICAgICAgLy8gSGFuZGxlIGZpbGUgYXJyYXlzIGZyb20gbGVnYWN5IEFQSVxuICAgICAgICAgICAgcGFyYW1zW2tleV0uZm9yRWFjaCgoZmlsZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZS5maWxlX3BhdGggJiYgZmlsZS5maWxlX25hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyB3b3VsZCBuZWVkIHRvIGJlIGhhbmRsZWQgZGlmZmVyZW50bHkgaW4gcmVhbCBzY2VuYXJpb1xuICAgICAgICAgICAgICAgICAgICAvLyBhcyB3ZSBjYW4ndCByZWNyZWF0ZSBGaWxlIG9iamVjdHMgZnJvbSBwYXRoc1xuICAgICAgICAgICAgICAgICAgICBmb3JtRGF0YS5hcHBlbmQoYGZpbGVfJHtpbmRleH1gLCBmaWxlLmZpbGVfbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3JtRGF0YS5hcHBlbmQoa2V5LCBwYXJhbXNba2V5XSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB0aGlzLnVwbG9hZENodW5rZWQoZm9ybURhdGEsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogTGVnYWN5OiBHZXQgdXBsb2FkIHN0YXR1cyAobWFwcyB0byBnZXRVcGxvYWRTdGF0dXMpXG4gKiBAcGFyYW0ge3N0cmluZ30gdXBsb2FkSWQgLSBVcGxvYWQgaWRlbnRpZmllclxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICovXG5GaWxlc0FQSS5zdGF0dXNVcGxvYWRGaWxlID0gZnVuY3Rpb24odXBsb2FkSWQsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0VXBsb2FkU3RhdHVzKHVwbG9hZElkLCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIENvbmZpZ3VyZSBSZXN1bWFibGUuanMgdG8gdXNlIHRoZSBuZXcgdjMgQVBJXG4gKiBAcGFyYW0ge29iamVjdH0gcmVzdW1hYmxlQ29uZmlnIC0gUmVzdW1hYmxlLmpzIGNvbmZpZ3VyYXRpb25cbiAqIEByZXR1cm5zIHtvYmplY3R9IFVwZGF0ZWQgY29uZmlndXJhdGlvblxuICovXG5GaWxlc0FQSS5jb25maWd1cmVSZXN1bWFibGUgPSBmdW5jdGlvbihyZXN1bWFibGVDb25maWcgPSB7fSkge1xuICAgIC8vIEdldCBBdXRob3JpemF0aW9uIGhlYWRlciBmcm9tIFRva2VuTWFuYWdlclxuICAgIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0J1xuICAgIH07XG5cbiAgICAvLyBBZGQgQmVhcmVyIHRva2VuIGlmIGF2YWlsYWJsZSAoZm9yIEpXVCBhdXRoZW50aWNhdGlvbilcbiAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIHRhcmdldDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjMvZmlsZXM6dXBsb2FkYCxcbiAgICAgICAgdGVzdENodW5rczogZmFsc2UsXG4gICAgICAgIGNodW5rU2l6ZTogMyAqIDEwMjQgKiAxMDI0LCAvLyAzTUIgY2h1bmtzXG4gICAgICAgIHNpbXVsdGFuZW91c1VwbG9hZHM6IDEsXG4gICAgICAgIG1heEZpbGVzOiAxLFxuICAgICAgICBmaWxlVHlwZTogWycqJ10sXG4gICAgICAgIGhlYWRlcnM6IGhlYWRlcnNcbiAgICB9LCByZXN1bWFibGVDb25maWcpO1xufTtcblxuLyoqXG4gKiBTZXR1cCBjb21tb24gUmVzdW1hYmxlLmpzIGV2ZW50IGhhbmRsZXJzXG4gKiBAcGFyYW0ge29iamVjdH0gcmVzdW1hYmxlSW5zdGFuY2UgLSBSZXN1bWFibGUuanMgaW5zdGFuY2VcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gZm9yIGV2ZW50c1xuICogQHBhcmFtIHtib29sZWFufSBhdXRvVXBsb2FkIC0gV2hldGhlciB0byBhdXRvLXVwbG9hZCBvbiBmaWxlQWRkZWQgZXZlbnRcbiAqL1xuRmlsZXNBUEkuc2V0dXBSZXN1bWFibGVFdmVudHMgPSBmdW5jdGlvbihyZXN1bWFibGVJbnN0YW5jZSwgY2FsbGJhY2ssIGF1dG9VcGxvYWQgPSBmYWxzZSkge1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdmaWxlU3VjY2VzcycsIChmaWxlLCByZXNwb25zZSkgPT4ge1xuICAgICAgICBjYWxsYmFjaygnZmlsZVN1Y2Nlc3MnLCB7ZmlsZSwgcmVzcG9uc2V9KTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ2ZpbGVQcm9ncmVzcycsIHtmaWxlfSk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuICAgICAgICBpZiAoYXV0b1VwbG9hZCkge1xuICAgICAgICAgICAgcmVzdW1hYmxlSW5zdGFuY2UudXBsb2FkKCk7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2soJ2ZpbGVBZGRlZCcsIHtmaWxlLCBldmVudH0pO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdmaWxlUmV0cnknLCAoZmlsZSkgPT4ge1xuICAgICAgICBjYWxsYmFjaygnZmlsZVJldHJ5Jywge2ZpbGV9KTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ2ZpbGVFcnJvcicsIHtmaWxlLCBtZXNzYWdlfSk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuICAgICAgICBjYWxsYmFjaygndXBsb2FkU3RhcnQnKTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbignY29tcGxldGUnLCAoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCdjb21wbGV0ZScpO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdwcm9ncmVzcycsICgpID0+IHtcbiAgICAgICAgY29uc3QgcGVyY2VudCA9IDEwMCAqIHJlc3VtYWJsZUluc3RhbmNlLnByb2dyZXNzKCk7XG4gICAgICAgIGNhbGxiYWNrKCdwcm9ncmVzcycsIHtwZXJjZW50fSk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ2Vycm9yJywge21lc3NhZ2UsIGZpbGV9KTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbigncGF1c2UnLCAoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCdwYXVzZScpO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCdjYW5jZWwnKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogVXBsb2FkIGZpbGUgdXNpbmcgUmVzdW1hYmxlLmpzXG4gKiBAcGFyYW0ge0ZpbGV9IGZpbGUgLSBGaWxlIG9iamVjdCB0byB1cGxvYWRcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAqIEBwYXJhbSB7c3RyaW5nW119IGFsbG93ZWRGaWxlVHlwZXMgLSBPcHRpb25hbCBhcnJheSBvZiBhbGxvd2VkIGZpbGUgZXh0ZW5zaW9ucyAoZS5nLiwgWyd3YXYnLCAnbXAzJ10pXG4gKi9cbkZpbGVzQVBJLnVwbG9hZEZpbGUgPSBmdW5jdGlvbihmaWxlLCBjYWxsYmFjaywgYWxsb3dlZEZpbGVUeXBlcyA9IFsnKiddKSB7XG4gICAgY29uc3QgciA9IG5ldyBSZXN1bWFibGUodGhpcy5jb25maWd1cmVSZXN1bWFibGUoe1xuICAgICAgICBmaWxlVHlwZTogYWxsb3dlZEZpbGVUeXBlc1xuICAgIH0pKTtcblxuICAgIC8vIFNldHVwIGV2ZW50cyBCRUZPUkUgYWRkaW5nIGZpbGUgdG8gY2FwdHVyZSBmaWxlQWRkZWQgZXZlbnRcbiAgICB0aGlzLnNldHVwUmVzdW1hYmxlRXZlbnRzKHIsIGNhbGxiYWNrLCBmYWxzZSk7XG5cbiAgICByLmFkZEZpbGUoZmlsZSk7XG5cbiAgICAvLyBJZiBmaWxlIHdhcyBub3QgYWRkZWQgKHZhbGlkYXRpb24gZmFpbGVkKSwgc3RvcCBoZXJlXG4gICAgaWYgKHIuZmlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlOiAnRmlsZSB0eXBlIG5vdCBhbGxvd2VkIG9yIHZhbGlkYXRpb24gZmFpbGVkJ30pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgci51cGxvYWQoKTtcblxuICAgIC8vIFJldHJ5IGlmIHVwbG9hZCBkb2Vzbid0IHN0YXJ0XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGlmICghci5pc1VwbG9hZGluZygpICYmIHIuZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgci51cGxvYWQoKTtcbiAgICAgICAgfVxuICAgIH0sIDEwMCk7XG59O1xuXG4vKipcbiAqIEdldCBzdGF0dXMgb2YgdXBsb2FkZWQgZmlsZVxuICogQHBhcmFtIHtzdHJpbmd9IGZpbGVJZCAtIEZpbGUgSURcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAqL1xuRmlsZXNBUEkuZ2V0U3RhdHVzVXBsb2FkRmlsZSA9IGZ1bmN0aW9uKGZpbGVJZCwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCd1cGxvYWRTdGF0dXMnLCB7IGlkOiBmaWxlSWQgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9LCAnUE9TVCcpO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYXVkaW8gZmlsZVxuICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gRmlsZSBwYXRoXG4gKiBAcGFyYW0ge3N0cmluZ3xudWxsfSBmaWxlSWQgLSBGaWxlIElEIChvcHRpb25hbClcbiAqIEBwYXJhbSB7ZnVuY3Rpb258bnVsbH0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiAob3B0aW9uYWwpXG4gKi9cbkZpbGVzQVBJLnJlbW92ZUF1ZGlvRmlsZSA9IGZ1bmN0aW9uKGZpbGVQYXRoLCBmaWxlSWQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIHtcbiAgICByZXR1cm4gdGhpcy5kZWxldGVGaWxlKGZpbGVQYXRoLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmlsZUlkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIERvd25sb2FkIG5ldyBmaXJtd2FyZVxuICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIERvd25sb2FkIHBhcmFtZXRlcnNcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAqL1xuRmlsZXNBUEkuZG93bmxvYWROZXdGaXJtd2FyZSA9IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICBjb25zdCByZXF1ZXN0RGF0YSA9IHtcbiAgICAgICAgbWQ1OiBwYXJhbXMubWQ1LFxuICAgICAgICBzaXplOiBwYXJhbXMuc2l6ZSxcbiAgICAgICAgdmVyc2lvbjogcGFyYW1zLnZlcnNpb24sXG4gICAgICAgIHVybDogcGFyYW1zLnVwZGF0ZUxpbmtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZG93bmxvYWRGaXJtd2FyZScsIHJlcXVlc3REYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfVxuICAgIH0sICdQT1NUJyk7XG59O1xuXG4vKipcbiAqIEdldCBmaXJtd2FyZSBkb3dubG9hZCBzdGF0dXNcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIEZpcm13YXJlIGZpbGVuYW1lXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gKi9cbkZpbGVzQVBJLmZpcm13YXJlRG93bmxvYWRTdGF0dXMgPSBmdW5jdGlvbihmaWxlbmFtZSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdmaXJtd2FyZVN0YXR1cycsIHsgZmlsZW5hbWUgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9LCAnUE9TVCcpO1xufTtcblxuLyoqXG4gKiBBdHRhY2ggdG8gYnV0dG9uXG4gKiBAcGFyYW0ge3N0cmluZ30gYnV0dG9uSWQgLSBCdXR0b24gSURcbiAqIEBwYXJhbSB7c3RyaW5nW119IGZpbGVUeXBlcyAtIEFycmF5IG9mIGFsbG93ZWQgZmlsZSB0eXBlc1xuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICogQHBhcmFtIHtzdHJpbmd8bnVsbH0gaW5wdXROYW1lIC0gT3B0aW9uYWwgbmFtZSBhdHRyaWJ1dGUgZm9yIHRoZSBmaWxlIGlucHV0IChmb3IgdGVzdCBjb21wYXRpYmlsaXR5KVxuICovXG5GaWxlc0FQSS5hdHRhY2hUb0J0biA9IGZ1bmN0aW9uKGJ1dHRvbklkLCBmaWxlVHlwZXMsIGNhbGxiYWNrLCBpbnB1dE5hbWUgPSBudWxsKSB7XG4gICAgY29uc3QgYnV0dG9uRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGJ1dHRvbklkKTtcbiAgICBpZiAoIWJ1dHRvbkVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VtYWJsZUNvbmZpZyA9IHRoaXMuY29uZmlndXJlUmVzdW1hYmxlKHtcbiAgICAgICAgZmlsZVR5cGU6IGZpbGVUeXBlcyxcbiAgICAgICAgcXVlcnk6IGZ1bmN0aW9uKGZpbGUpIHtcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsTmFtZSA9IGZpbGUubmFtZSB8fCBmaWxlLmZpbGVOYW1lO1xuICAgICAgICAgICAgY29uc3QgbmFtZVdpdGhvdXRFeHQgPSBvcmlnaW5hbE5hbWUucmVwbGFjZSgvXFwuW14vLl0rJC8sICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IG9yaWdpbmFsTmFtZS5zcGxpdCgnLicpLnBvcCgpO1xuICAgICAgICAgICAgY29uc3QgZmluYWxGaWxlbmFtZSA9IG5hbWVXaXRob3V0RXh0ICsgJy4nICsgZXh0ZW5zaW9uO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlc3VtYWJsZUZpbGVuYW1lOiBmaW5hbEZpbGVuYW1lXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCByID0gbmV3IFJlc3VtYWJsZShyZXN1bWFibGVDb25maWcpO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgci5hc3NpZ25Ccm93c2UoYnV0dG9uRWxlbWVudCk7XG5cbiAgICAgICAgLy8gQWRkIG5hbWUgYXR0cmlidXRlIHRvIHRoZSBkeW5hbWljYWxseSBjcmVhdGVkIGZpbGUgaW5wdXQgZm9yIHRlc3QgY29tcGF0aWJpbGl0eVxuICAgICAgICAvLyBSZXN1bWFibGUuanMgY3JlYXRlcyB0aGUgaW5wdXQgaW5zaWRlIHRoZSBidXR0b24gZWxlbWVudFxuICAgICAgICBjb25zdCBmaWxlSW5wdXQgPSBidXR0b25FbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W3R5cGU9XCJmaWxlXCJdJyk7XG4gICAgICAgIGlmIChmaWxlSW5wdXQgJiYgaW5wdXROYW1lKSB7XG4gICAgICAgICAgICBmaWxlSW5wdXQuc2V0QXR0cmlidXRlKCduYW1lJywgaW5wdXROYW1lKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnNldHVwUmVzdW1hYmxlRXZlbnRzKHIsIGNhbGxiYWNrLCB0cnVlKTsgLy8gYXV0b1VwbG9hZCA9IHRydWUgZm9yIGJ1dHRvbiBhdHRhY2htZW50c1xufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93LkZpbGVzQVBJID0gRmlsZXNBUEk7Il19