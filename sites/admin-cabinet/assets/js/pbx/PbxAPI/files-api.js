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
    fileType: ['*'],
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZmlsZXMtYXBpLmpzIl0sIm5hbWVzIjpbIkZpbGVzQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwidXBsb2FkIiwidXBsb2FkU3RhdHVzIiwiZG93bmxvYWRGaXJtd2FyZSIsImZpcm13YXJlU3RhdHVzIiwiT2JqZWN0IiwiYXNzaWduIiwiZ2V0RmlsZUNvbnRlbnQiLCJmaWxlUGF0aCIsImNhbGxiYWNrIiwibmVlZE9yaWdpbmFsIiwiZW5jb2RlZFBhdGgiLCJlbmNvZGVVUklDb21wb25lbnQiLCJwYXJhbXMiLCJjYWxsR2V0IiwidXBsb2FkRmlsZUNvbnRlbnQiLCJjb250ZW50IiwiY29udGVudFR5cGUiLCJjYWxsUHV0IiwiZGVsZXRlRmlsZSIsImNhbGxEZWxldGUiLCJ1cGxvYWRDaHVua2VkIiwiZm9ybURhdGEiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiZ2V0VXBsb2FkU3RhdHVzIiwidXBsb2FkSWQiLCJpZCIsImdldEZpcm13YXJlU3RhdHVzIiwiZmlsZW5hbWUiLCJ1cGxvYWRGaWxlRnJvbVBhcmFtcyIsIkZvcm1EYXRhIiwia2V5cyIsImZvckVhY2giLCJrZXkiLCJBcnJheSIsImlzQXJyYXkiLCJmaWxlIiwiaW5kZXgiLCJmaWxlX3BhdGgiLCJmaWxlX25hbWUiLCJhcHBlbmQiLCJzdGF0dXNVcGxvYWRGaWxlIiwiY29uZmlndXJlUmVzdW1hYmxlIiwicmVzdW1hYmxlQ29uZmlnIiwiaGVhZGVyc0Z1bmN0aW9uIiwiaGVhZGVycyIsIlRva2VuTWFuYWdlciIsImFjY2Vzc1Rva2VuIiwidGFyZ2V0IiwiQ29uZmlnIiwicGJ4VXJsIiwidGVzdENodW5rcyIsImNodW5rU2l6ZSIsInNpbXVsdGFuZW91c1VwbG9hZHMiLCJtYXhGaWxlcyIsImZpbGVUeXBlIiwic2V0dXBSZXN1bWFibGVFdmVudHMiLCJyZXN1bWFibGVJbnN0YW5jZSIsImF1dG9VcGxvYWQiLCJvbiIsInJlc3BvbnNlIiwiZXZlbnQiLCJtZXNzYWdlIiwicGVyY2VudCIsInByb2dyZXNzIiwidXBsb2FkRmlsZSIsImFsbG93ZWRGaWxlVHlwZXMiLCJyIiwiUmVzdW1hYmxlIiwiYWRkRmlsZSIsImZpbGVzIiwibGVuZ3RoIiwic2V0VGltZW91dCIsImlzVXBsb2FkaW5nIiwiZ2V0U3RhdHVzVXBsb2FkRmlsZSIsImZpbGVJZCIsInJlc3VsdCIsImRhdGEiLCJyZW1vdmVBdWRpb0ZpbGUiLCJkb3dubG9hZE5ld0Zpcm13YXJlIiwicmVxdWVzdERhdGEiLCJtZDUiLCJzaXplIiwidmVyc2lvbiIsInVybCIsInVwZGF0ZUxpbmsiLCJmaXJtd2FyZURvd25sb2FkU3RhdHVzIiwiYXR0YWNoVG9CdG4iLCJidXR0b25JZCIsImZpbGVUeXBlcyIsImlucHV0TmFtZSIsImJ1dHRvbkVsZW1lbnQiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwicXVlcnkiLCJvcmlnaW5hbE5hbWUiLCJuYW1lIiwiZmlsZU5hbWUiLCJuYW1lV2l0aG91dEV4dCIsInJlcGxhY2UiLCJleHRlbnNpb24iLCJzcGxpdCIsInBvcCIsImZpbmFsRmlsZW5hbWUiLCJyZXN1bWFibGVGaWxlbmFtZSIsImFzc2lnbkJyb3dzZSIsImZpbGVJbnB1dCIsInF1ZXJ5U2VsZWN0b3IiLCJzZXRBdHRyaWJ1dGUiLCJlcnJvciIsIndpbmRvdyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUM5QkMsRUFBQUEsUUFBUSxFQUFFLHVCQURvQjtBQUU5QkMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLE1BQU0sRUFBRSxTQURHO0FBRVhDLElBQUFBLFlBQVksRUFBRSxlQUZI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LFVBQU1DLGNBQWMsR0FBR0gsWUFBWSxDQUFDSSxPQUFiLENBQXFCLFdBQXJCLEVBQWtDLEVBQWxDLENBQXZCO0FBQ0EsVUFBTUMsU0FBUyxHQUFHTCxZQUFZLENBQUNNLEtBQWIsQ0FBbUIsR0FBbkIsRUFBd0JDLEdBQXhCLEVBQWxCO0FBQ0EsVUFBTUMsYUFBYSxHQUFHTCxjQUFjLEdBQUcsR0FBakIsR0FBdUJFLFNBQTdDO0FBRUEsYUFBTztBQUNISSxRQUFBQSxpQkFBaUIsRUFBRUQ7QUFEaEIsT0FBUDtBQUdIO0FBWDJDLEdBQXhCLENBQXhCO0FBY0EsTUFBTXBDLENBQUMsR0FBRyxJQUFJQyxTQUFKLENBQWN6QixlQUFkLENBQVY7O0FBRUEsTUFBSTtBQUNBd0IsSUFBQUEsQ0FBQyxDQUFDc0MsWUFBRixDQUFlZCxhQUFmLEVBREEsQ0FHQTtBQUNBOztBQUNBLFFBQU1lLFNBQVMsR0FBR2YsYUFBYSxDQUFDZ0IsYUFBZCxDQUE0QixvQkFBNUIsQ0FBbEI7O0FBQ0EsUUFBSUQsU0FBUyxJQUFJaEIsU0FBakIsRUFBNEI7QUFDeEJnQixNQUFBQSxTQUFTLENBQUNFLFlBQVYsQ0FBdUIsTUFBdkIsRUFBK0JsQixTQUEvQjtBQUNIO0FBQ0osR0FURCxDQVNFLE9BQU9tQixLQUFQLEVBQWM7QUFDWjtBQUNIOztBQUVELE9BQUtyRCxvQkFBTCxDQUEwQlcsQ0FBMUIsRUFBNkIxRCxRQUE3QixFQUF1QyxJQUF2QyxFQW5DNkUsQ0FtQy9CO0FBQ2pELENBcENELEMsQ0FzQ0E7OztBQUNBcUcsTUFBTSxDQUFDakgsUUFBUCxHQUFrQkEsUUFBbEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpQ2xpZW50LCBQYnhBcGksIFJlc3VtYWJsZSwgQ29uZmlnLCBnbG9iYWxSb290VXJsICovIFxuXG4vKipcbiAqIEZpbGVzQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBmaWxlIG1hbmFnZW1lbnQgb3BlcmF0aW9uc1xuICpcbiAqIFByb3ZpZGVzIGJvdGggc3RhbmRhcmQgUkVTVCBvcGVyYXRpb25zIGZvciBmaWxlIENSVUQgYW5kIGN1c3RvbSBtZXRob2RzXG4gKiBmb3Igc3BlY2lhbGl6ZWQgb3BlcmF0aW9ucyBsaWtlIGNodW5rZWQgdXBsb2FkIGFuZCBmaXJtd2FyZSBkb3dubG9hZC5cbiAqXG4gKiBAY2xhc3MgRmlsZXNBUElcbiAqL1xuY29uc3QgRmlsZXNBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9maWxlcycsXG4gICAgY3VzdG9tTWV0aG9kczoge1xuICAgICAgICB1cGxvYWQ6ICc6dXBsb2FkJyxcbiAgICAgICAgdXBsb2FkU3RhdHVzOiAnOnVwbG9hZFN0YXR1cycsXG4gICAgICAgIGRvd25sb2FkRmlybXdhcmU6ICc6ZG93bmxvYWRGaXJtd2FyZScsXG4gICAgICAgIGZpcm13YXJlU3RhdHVzOiAnOmZpcm13YXJlU3RhdHVzJ1xuICAgIH1cbn0pO1xuXG4vLyBBZGQgbWV0aG9kcyB0byBGaWxlc0FQSSB1c2luZyBQYnhBcGkgdXRpbGl0eVxuT2JqZWN0LmFzc2lnbihGaWxlc0FQSSwge1xuXG4gICAgLyoqXG4gICAgICogR2V0IGZpbGUgY29udGVudCBieSBwYXRoXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gRmlsZSBwYXRoICh3aWxsIGJlIFVSTCBlbmNvZGVkKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtuZWVkT3JpZ2luYWw9ZmFsc2VdIC0gV2hldGhlciB0byByZXR1cm4gb3JpZ2luYWwgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IGpRdWVyeSBBUEkgY2FsbCBvYmplY3RcbiAgICAgKi9cbiAgICBnZXRGaWxlQ29udGVudChmaWxlUGF0aCwgY2FsbGJhY2ssIG5lZWRPcmlnaW5hbCA9IGZhbHNlKSB7XG4gICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZW5jb2RlZFBhdGggPSBlbmNvZGVVUklDb21wb25lbnQoZmlsZVBhdGgpO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gbmVlZE9yaWdpbmFsID8geyBuZWVkT3JpZ2luYWw6ICd0cnVlJyB9IDoge307XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxHZXQocGFyYW1zLCBjYWxsYmFjaywgZW5jb2RlZFBhdGgpO1xuICAgIFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGxvYWQgZmlsZSBjb250ZW50IHVzaW5nIFBVVCBtZXRob2QgKHNpbXBsZSB1cGxvYWQpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gRGVzdGluYXRpb24gZmlsZSBwYXRoXG4gICAgICogQHBhcmFtIHtzdHJpbmd8QmxvYn0gY29udGVudCAtIEZpbGUgY29udGVudFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2NvbnRlbnRUeXBlPSdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXSAtIENvbnRlbnQgdHlwZVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IGpRdWVyeSBBUEkgY2FsbCBvYmplY3RcbiAgICAgKi9cbiAgICB1cGxvYWRGaWxlQ29udGVudChmaWxlUGF0aCwgY29udGVudCwgY2FsbGJhY2ssIGNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScpIHtcbiAgICAgICAgY29uc3QgZW5jb2RlZFBhdGggPSBlbmNvZGVVUklDb21wb25lbnQoZmlsZVBhdGgpO1xuXG4gICAgICAgIC8vIFVzZSBjYWxsUHV0IG1ldGhvZCB3aXRoIHRoZSBlbmNvZGVkIHBhdGggYXMgSURcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbFB1dChjb250ZW50LCBjYWxsYmFjaywgZW5jb2RlZFBhdGgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgZmlsZSBieSBwYXRoXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gRmlsZSBwYXRoIHRvIGRlbGV0ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBqUXVlcnkgQVBJIGNhbGwgb2JqZWN0XG4gICAgICovXG4gICAgZGVsZXRlRmlsZShmaWxlUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGVuY29kZWRQYXRoID0gZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVQYXRoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxEZWxldGUoY2FsbGJhY2ssIGVuY29kZWRQYXRoKTtcbiAgICAgIFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaHVua2VkIGZpbGUgdXBsb2FkIChSZXN1bWFibGUuanMgc3VwcG9ydClcbiAgICAgKiBAcGFyYW0ge0Zvcm1EYXRhfSBmb3JtRGF0YSAtIEZvcm0gZGF0YSB3aXRoIGZpbGUgY2h1bmtzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEFQSSBjYWxsIHJlc3VsdFxuICAgICAqL1xuICAgIHVwbG9hZENodW5rZWQoZm9ybURhdGEsIGNhbGxiYWNrKSB7XG4gICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ3VwbG9hZCcsIGZvcm1EYXRhLCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICAgICBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHVwbG9hZCBzdGF0dXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXBsb2FkSWQgLSBVcGxvYWQgaWRlbnRpZmllclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBBUEkgY2FsbCByZXN1bHRcbiAgICAgKi9cbiAgICBnZXRVcGxvYWRTdGF0dXModXBsb2FkSWQsIGNhbGxiYWNrKSB7XG4gICAgICBcblxuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0geyBpZDogdXBsb2FkSWQgfTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ3VwbG9hZFN0YXR1cycsIHBhcmFtcywgY2FsbGJhY2ssICdHRVQnKTtcbiAgICAgICBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRG93bmxvYWQgZmlybXdhcmUgZnJvbSBleHRlcm5hbCBVUkxcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gRG93bmxvYWQgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudXJsIC0gRmlybXdhcmUgVVJMXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtwYXJhbXMubWQ1XSAtIEV4cGVjdGVkIE1ENSBoYXNoXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEFQSSBjYWxsIHJlc3VsdFxuICAgICAqL1xuICAgIGRvd25sb2FkRmlybXdhcmUocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgIFxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdkb3dubG9hZEZpcm13YXJlJywgcGFyYW1zLCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICAgIFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgZmlybXdhcmUgZG93bmxvYWQgc3RhdHVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gRmlybXdhcmUgZmlsZW5hbWVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge09iamVjdH0gQVBJIGNhbGwgcmVzdWx0XG4gICAgICovXG4gICAgZ2V0RmlybXdhcmVTdGF0dXMoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgXG5cbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHsgZmlsZW5hbWU6IGZpbGVuYW1lIH07XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdmaXJtd2FyZVN0YXR1cycsIHBhcmFtcywgY2FsbGJhY2ssICdHRVQnKTtcbiAgICAgICAgXG4gICAgfVxufSk7XG5cbi8qKlxuICogTGVnYWN5IGNvbXBhdGliaWxpdHkgbWV0aG9kcyAtIHRoZXNlIG1hcCB0byB0aGUgbmV3IFJFU1QgQVBJIG1ldGhvZHNcbiAqIFRoZXNlIG1haW50YWluIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2hpbGUgdXNpbmcgdGhlIG5ldyBzdGFuZGFyZGl6ZWQgbWV0aG9kc1xuICovXG5cbi8qKlxuICogTGVnYWN5OiBVcGxvYWQgZmlsZSB3aXRoIHBhcmFtcyAobWFwcyB0byB1cGxvYWRDaHVua2VkKVxuICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFVwbG9hZCBwYXJhbWV0ZXJzXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gKi9cbkZpbGVzQVBJLnVwbG9hZEZpbGVGcm9tUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFjaykge1xuICAgIC8vIENvbnZlcnQgb2JqZWN0IHRvIEZvcm1EYXRhIGZvciBjaHVua2VkIHVwbG9hZFxuICAgIGNvbnN0IGZvcm1EYXRhID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgT2JqZWN0LmtleXMocGFyYW1zKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgIGlmIChrZXkgPT09ICdmaWxlcycgJiYgQXJyYXkuaXNBcnJheShwYXJhbXNba2V5XSkpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBmaWxlIGFycmF5cyBmcm9tIGxlZ2FjeSBBUElcbiAgICAgICAgICAgIHBhcmFtc1trZXldLmZvckVhY2goKGZpbGUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGUuZmlsZV9wYXRoICYmIGZpbGUuZmlsZV9uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgd291bGQgbmVlZCB0byBiZSBoYW5kbGVkIGRpZmZlcmVudGx5IGluIHJlYWwgc2NlbmFyaW9cbiAgICAgICAgICAgICAgICAgICAgLy8gYXMgd2UgY2FuJ3QgcmVjcmVhdGUgRmlsZSBvYmplY3RzIGZyb20gcGF0aHNcbiAgICAgICAgICAgICAgICAgICAgZm9ybURhdGEuYXBwZW5kKGBmaWxlXyR7aW5kZXh9YCwgZmlsZS5maWxlX25hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9ybURhdGEuYXBwZW5kKGtleSwgcGFyYW1zW2tleV0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcy51cGxvYWRDaHVua2VkKGZvcm1EYXRhLCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIExlZ2FjeTogR2V0IHVwbG9hZCBzdGF0dXMgKG1hcHMgdG8gZ2V0VXBsb2FkU3RhdHVzKVxuICogQHBhcmFtIHtzdHJpbmd9IHVwbG9hZElkIC0gVXBsb2FkIGlkZW50aWZpZXJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAqL1xuRmlsZXNBUEkuc3RhdHVzVXBsb2FkRmlsZSA9IGZ1bmN0aW9uKHVwbG9hZElkLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmdldFVwbG9hZFN0YXR1cyh1cGxvYWRJZCwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBDb25maWd1cmUgUmVzdW1hYmxlLmpzIHRvIHVzZSB0aGUgbmV3IHYzIEFQSVxuICogQHBhcmFtIHtvYmplY3R9IHJlc3VtYWJsZUNvbmZpZyAtIFJlc3VtYWJsZS5qcyBjb25maWd1cmF0aW9uXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBVcGRhdGVkIGNvbmZpZ3VyYXRpb25cbiAqL1xuRmlsZXNBUEkuY29uZmlndXJlUmVzdW1hYmxlID0gZnVuY3Rpb24ocmVzdW1hYmxlQ29uZmlnID0ge30pIHtcbiAgICAvLyBVc2UgYSBmdW5jdGlvbiBmb3IgaGVhZGVycyB0byBnZXQgdGhlIGxhdGVzdCB0b2tlbiBkeW5hbWljYWxseVxuICAgIC8vIFJlc3VtYWJsZS5qcyB3aWxsIGNhbGwgdGhpcyBmdW5jdGlvbiBiZWZvcmUgZWFjaCByZXF1ZXN0XG4gICAgY29uc3QgaGVhZGVyc0Z1bmN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCdcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgQmVhcmVyIHRva2VuIGlmIGF2YWlsYWJsZSAoZm9yIEpXVCBhdXRoZW50aWNhdGlvbilcbiAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGhlYWRlcnM7XG4gICAgfTtcblxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgdGFyZ2V0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92My9maWxlczp1cGxvYWRgLFxuICAgICAgICB0ZXN0Q2h1bmtzOiBmYWxzZSxcbiAgICAgICAgY2h1bmtTaXplOiAzICogMTAyNCAqIDEwMjQsIC8vIDNNQiBjaHVua3NcbiAgICAgICAgc2ltdWx0YW5lb3VzVXBsb2FkczogMSxcbiAgICAgICAgbWF4RmlsZXM6IDEsXG4gICAgICAgIGZpbGVUeXBlOiBbJyonXSxcbiAgICAgICAgaGVhZGVyczogaGVhZGVyc0Z1bmN0aW9uXG4gICAgfSwgcmVzdW1hYmxlQ29uZmlnKTtcbn07XG5cbi8qKlxuICogU2V0dXAgY29tbW9uIFJlc3VtYWJsZS5qcyBldmVudCBoYW5kbGVyc1xuICogQHBhcmFtIHtvYmplY3R9IHJlc3VtYWJsZUluc3RhbmNlIC0gUmVzdW1hYmxlLmpzIGluc3RhbmNlXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIGZvciBldmVudHNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYXV0b1VwbG9hZCAtIFdoZXRoZXIgdG8gYXV0by11cGxvYWQgb24gZmlsZUFkZGVkIGV2ZW50XG4gKi9cbkZpbGVzQVBJLnNldHVwUmVzdW1hYmxlRXZlbnRzID0gZnVuY3Rpb24ocmVzdW1hYmxlSW5zdGFuY2UsIGNhbGxiYWNrLCBhdXRvVXBsb2FkID0gZmFsc2UpIHtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbignZmlsZVN1Y2Nlc3MnLCAoZmlsZSwgcmVzcG9uc2UpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ2ZpbGVTdWNjZXNzJywge2ZpbGUsIHJlc3BvbnNlfSk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdmaWxlQWRkZWQnLCAoZmlsZSwgZXZlbnQpID0+IHtcbiAgICAgICAgaWYgKGF1dG9VcGxvYWQpIHtcbiAgICAgICAgICAgIHJlc3VtYWJsZUluc3RhbmNlLnVwbG9hZCgpO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCd1cGxvYWRTdGFydCcsICgpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ2NvbXBsZXRlJywgKCkgPT4ge1xuICAgICAgICBjYWxsYmFjaygnY29tcGxldGUnKTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByZXN1bWFibGVJbnN0YW5jZS5wcm9ncmVzcygpO1xuICAgICAgICBjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdlcnJvcicsIChtZXNzYWdlLCBmaWxlKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ3BhdXNlJywgKCkgPT4ge1xuICAgICAgICBjYWxsYmFjaygncGF1c2UnKTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbignY2FuY2VsJywgKCkgPT4ge1xuICAgICAgICBjYWxsYmFjaygnY2FuY2VsJyk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFVwbG9hZCBmaWxlIHVzaW5nIFJlc3VtYWJsZS5qc1xuICogQHBhcmFtIHtGaWxlfSBmaWxlIC0gRmlsZSBvYmplY3QgdG8gdXBsb2FkXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ1tdfSBhbGxvd2VkRmlsZVR5cGVzIC0gT3B0aW9uYWwgYXJyYXkgb2YgYWxsb3dlZCBmaWxlIGV4dGVuc2lvbnMgKGUuZy4sIFsnd2F2JywgJ21wMyddKVxuICovXG5GaWxlc0FQSS51cGxvYWRGaWxlID0gZnVuY3Rpb24oZmlsZSwgY2FsbGJhY2ssIGFsbG93ZWRGaWxlVHlwZXMgPSBbJyonXSkge1xuICAgIGNvbnN0IHIgPSBuZXcgUmVzdW1hYmxlKHRoaXMuY29uZmlndXJlUmVzdW1hYmxlKHtcbiAgICAgICAgZmlsZVR5cGU6IGFsbG93ZWRGaWxlVHlwZXNcbiAgICB9KSk7XG5cbiAgICAvLyBTZXR1cCBldmVudHMgQkVGT1JFIGFkZGluZyBmaWxlIHRvIGNhcHR1cmUgZmlsZUFkZGVkIGV2ZW50XG4gICAgdGhpcy5zZXR1cFJlc3VtYWJsZUV2ZW50cyhyLCBjYWxsYmFjaywgZmFsc2UpO1xuXG4gICAgci5hZGRGaWxlKGZpbGUpO1xuXG4gICAgLy8gSWYgZmlsZSB3YXMgbm90IGFkZGVkICh2YWxpZGF0aW9uIGZhaWxlZCksIHN0b3AgaGVyZVxuICAgIGlmIChyLmZpbGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZTogJ0ZpbGUgdHlwZSBub3QgYWxsb3dlZCBvciB2YWxpZGF0aW9uIGZhaWxlZCd9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHIudXBsb2FkKCk7XG5cbiAgICAvLyBSZXRyeSBpZiB1cGxvYWQgZG9lc24ndCBzdGFydFxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBpZiAoIXIuaXNVcGxvYWRpbmcoKSAmJiByLmZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHIudXBsb2FkKCk7XG4gICAgICAgIH1cbiAgICB9LCAxMDApO1xufTtcblxuLyoqXG4gKiBHZXQgc3RhdHVzIG9mIHVwbG9hZGVkIGZpbGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlSWQgLSBGaWxlIElEXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gKi9cbkZpbGVzQVBJLmdldFN0YXR1c1VwbG9hZEZpbGUgPSBmdW5jdGlvbihmaWxlSWQsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgndXBsb2FkU3RhdHVzJywgeyBpZDogZmlsZUlkIH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICB9XG4gICAgfSwgJ1BPU1QnKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGF1ZGlvIGZpbGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIEZpbGUgcGF0aFxuICogQHBhcmFtIHtzdHJpbmd8bnVsbH0gZmlsZUlkIC0gRmlsZSBJRCAob3B0aW9uYWwpXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufG51bGx9IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gKG9wdGlvbmFsKVxuICovXG5GaWxlc0FQSS5yZW1vdmVBdWRpb0ZpbGUgPSBmdW5jdGlvbihmaWxlUGF0aCwgZmlsZUlkID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZXRlRmlsZShmaWxlUGF0aCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZpbGVJZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBEb3dubG9hZCBuZXcgZmlybXdhcmVcbiAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBEb3dubG9hZCBwYXJhbWV0ZXJzXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gKi9cbkZpbGVzQVBJLmRvd25sb2FkTmV3RmlybXdhcmUgPSBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgcmVxdWVzdERhdGEgPSB7XG4gICAgICAgIG1kNTogcGFyYW1zLm1kNSxcbiAgICAgICAgc2l6ZTogcGFyYW1zLnNpemUsXG4gICAgICAgIHZlcnNpb246IHBhcmFtcy52ZXJzaW9uLFxuICAgICAgICB1cmw6IHBhcmFtcy51cGRhdGVMaW5rXG4gICAgfTtcblxuICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2Rvd25sb2FkRmlybXdhcmUnLCByZXF1ZXN0RGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgIH1cbiAgICB9LCAnUE9TVCcpO1xufTtcblxuLyoqXG4gKiBHZXQgZmlybXdhcmUgZG93bmxvYWQgc3RhdHVzXG4gKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBGaXJtd2FyZSBmaWxlbmFtZVxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICovXG5GaWxlc0FQSS5maXJtd2FyZURvd25sb2FkU3RhdHVzID0gZnVuY3Rpb24oZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZmlybXdhcmVTdGF0dXMnLCB7IGZpbGVuYW1lIH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICB9XG4gICAgfSwgJ1BPU1QnKTtcbn07XG5cbi8qKlxuICogQXR0YWNoIHRvIGJ1dHRvblxuICogQHBhcmFtIHtzdHJpbmd9IGJ1dHRvbklkIC0gQnV0dG9uIElEXG4gKiBAcGFyYW0ge3N0cmluZ1tdfSBmaWxlVHlwZXMgLSBBcnJheSBvZiBhbGxvd2VkIGZpbGUgdHlwZXNcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAqIEBwYXJhbSB7c3RyaW5nfG51bGx9IGlucHV0TmFtZSAtIE9wdGlvbmFsIG5hbWUgYXR0cmlidXRlIGZvciB0aGUgZmlsZSBpbnB1dCAoZm9yIHRlc3QgY29tcGF0aWJpbGl0eSlcbiAqL1xuRmlsZXNBUEkuYXR0YWNoVG9CdG4gPSBmdW5jdGlvbihidXR0b25JZCwgZmlsZVR5cGVzLCBjYWxsYmFjaywgaW5wdXROYW1lID0gbnVsbCkge1xuICAgIGNvbnN0IGJ1dHRvbkVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChidXR0b25JZCk7XG4gICAgaWYgKCFidXR0b25FbGVtZW50KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bWFibGVDb25maWcgPSB0aGlzLmNvbmZpZ3VyZVJlc3VtYWJsZSh7XG4gICAgICAgIGZpbGVUeXBlOiBmaWxlVHlwZXMsXG4gICAgICAgIHF1ZXJ5OiBmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbE5hbWUgPSBmaWxlLm5hbWUgfHwgZmlsZS5maWxlTmFtZTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWVXaXRob3V0RXh0ID0gb3JpZ2luYWxOYW1lLnJlcGxhY2UoL1xcLlteLy5dKyQvLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb24gPSBvcmlnaW5hbE5hbWUuc3BsaXQoJy4nKS5wb3AoKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbmFsRmlsZW5hbWUgPSBuYW1lV2l0aG91dEV4dCArICcuJyArIGV4dGVuc2lvbjtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByZXN1bWFibGVGaWxlbmFtZTogZmluYWxGaWxlbmFtZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgciA9IG5ldyBSZXN1bWFibGUocmVzdW1hYmxlQ29uZmlnKTtcblxuICAgIHRyeSB7XG4gICAgICAgIHIuYXNzaWduQnJvd3NlKGJ1dHRvbkVsZW1lbnQpO1xuXG4gICAgICAgIC8vIEFkZCBuYW1lIGF0dHJpYnV0ZSB0byB0aGUgZHluYW1pY2FsbHkgY3JlYXRlZCBmaWxlIGlucHV0IGZvciB0ZXN0IGNvbXBhdGliaWxpdHlcbiAgICAgICAgLy8gUmVzdW1hYmxlLmpzIGNyZWF0ZXMgdGhlIGlucHV0IGluc2lkZSB0aGUgYnV0dG9uIGVsZW1lbnRcbiAgICAgICAgY29uc3QgZmlsZUlucHV0ID0gYnV0dG9uRWxlbWVudC5xdWVyeVNlbGVjdG9yKCdpbnB1dFt0eXBlPVwiZmlsZVwiXScpO1xuICAgICAgICBpZiAoZmlsZUlucHV0ICYmIGlucHV0TmFtZSkge1xuICAgICAgICAgICAgZmlsZUlucHV0LnNldEF0dHJpYnV0ZSgnbmFtZScsIGlucHV0TmFtZSk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zZXR1cFJlc3VtYWJsZUV2ZW50cyhyLCBjYWxsYmFjaywgdHJ1ZSk7IC8vIGF1dG9VcGxvYWQgPSB0cnVlIGZvciBidXR0b24gYXR0YWNobWVudHNcbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbndpbmRvdy5GaWxlc0FQSSA9IEZpbGVzQVBJOyJdfQ==