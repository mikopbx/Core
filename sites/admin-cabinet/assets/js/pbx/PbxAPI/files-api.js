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
 */


FilesAPI.uploadFile = function (file, callback) {
  var r = new Resumable(this.configureResumable());
  this.setupResumableEvents(r, callback);
  r.addFile(file);
  r.upload();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZmlsZXMtYXBpLmpzIl0sIm5hbWVzIjpbIkZpbGVzQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwidXBsb2FkIiwidXBsb2FkU3RhdHVzIiwiZG93bmxvYWRGaXJtd2FyZSIsImZpcm13YXJlU3RhdHVzIiwiT2JqZWN0IiwiYXNzaWduIiwiZ2V0RmlsZUNvbnRlbnQiLCJmaWxlUGF0aCIsImNhbGxiYWNrIiwibmVlZE9yaWdpbmFsIiwiZW5jb2RlZFBhdGgiLCJlbmNvZGVVUklDb21wb25lbnQiLCJwYXJhbXMiLCJjYWxsR2V0IiwidXBsb2FkRmlsZUNvbnRlbnQiLCJjb250ZW50IiwiY29udGVudFR5cGUiLCJjYWxsUHV0IiwiZGVsZXRlRmlsZSIsImNhbGxEZWxldGUiLCJ1cGxvYWRDaHVua2VkIiwiZm9ybURhdGEiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiZ2V0VXBsb2FkU3RhdHVzIiwidXBsb2FkSWQiLCJpZCIsImdldEZpcm13YXJlU3RhdHVzIiwiZmlsZW5hbWUiLCJ1cGxvYWRGaWxlRnJvbVBhcmFtcyIsIkZvcm1EYXRhIiwia2V5cyIsImZvckVhY2giLCJrZXkiLCJBcnJheSIsImlzQXJyYXkiLCJmaWxlIiwiaW5kZXgiLCJmaWxlX3BhdGgiLCJmaWxlX25hbWUiLCJhcHBlbmQiLCJzdGF0dXNVcGxvYWRGaWxlIiwiY29uZmlndXJlUmVzdW1hYmxlIiwicmVzdW1hYmxlQ29uZmlnIiwidGFyZ2V0IiwiQ29uZmlnIiwicGJ4VXJsIiwidGVzdENodW5rcyIsImNodW5rU2l6ZSIsInNpbXVsdGFuZW91c1VwbG9hZHMiLCJtYXhGaWxlcyIsImZpbGVUeXBlIiwiaGVhZGVycyIsInNldHVwUmVzdW1hYmxlRXZlbnRzIiwicmVzdW1hYmxlSW5zdGFuY2UiLCJhdXRvVXBsb2FkIiwib24iLCJyZXNwb25zZSIsImV2ZW50IiwibWVzc2FnZSIsInBlcmNlbnQiLCJwcm9ncmVzcyIsInVwbG9hZEZpbGUiLCJyIiwiUmVzdW1hYmxlIiwiYWRkRmlsZSIsImdldFN0YXR1c1VwbG9hZEZpbGUiLCJmaWxlSWQiLCJyZXN1bHQiLCJkYXRhIiwicmVtb3ZlQXVkaW9GaWxlIiwiZG93bmxvYWROZXdGaXJtd2FyZSIsInJlcXVlc3REYXRhIiwibWQ1Iiwic2l6ZSIsInZlcnNpb24iLCJ1cmwiLCJ1cGRhdGVMaW5rIiwiZmlybXdhcmVEb3dubG9hZFN0YXR1cyIsImF0dGFjaFRvQnRuIiwiYnV0dG9uSWQiLCJmaWxlVHlwZXMiLCJpbnB1dE5hbWUiLCJidXR0b25FbGVtZW50IiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsInF1ZXJ5Iiwib3JpZ2luYWxOYW1lIiwibmFtZSIsImZpbGVOYW1lIiwibmFtZVdpdGhvdXRFeHQiLCJyZXBsYWNlIiwiZXh0ZW5zaW9uIiwic3BsaXQiLCJwb3AiLCJmaW5hbEZpbGVuYW1lIiwicmVzdW1hYmxlRmlsZW5hbWUiLCJhc3NpZ25Ccm93c2UiLCJmaWxlSW5wdXQiLCJxdWVyeVNlbGVjdG9yIiwic2V0QXR0cmlidXRlIiwiZXJyb3IiLCJ3aW5kb3ciXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHLElBQUlDLFlBQUosQ0FBaUI7QUFDOUJDLEVBQUFBLFFBQVEsRUFBRSx1QkFEb0I7QUFFOUJDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxNQUFNLEVBQUUsU0FERztBQUVYQyxJQUFBQSxZQUFZLEVBQUUsZUFGSDtBQUdYQyxJQUFBQSxnQkFBZ0IsRUFBRSxtQkFIUDtBQUlYQyxJQUFBQSxjQUFjLEVBQUU7QUFKTDtBQUZlLENBQWpCLENBQWpCLEMsQ0FVQTs7QUFDQUMsTUFBTSxDQUFDQyxNQUFQLENBQWNU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QUNsQixVQUFNbUQsWUFBWSxHQUFHbkQsSUFBSSxDQUFDb0QsSUFBTCxJQUFhcEQsSUFBSSxDQUFDcUQsUUFBdkM7QUFDQSxVQUFNQyxjQUFjLEdBQUdILFlBQVksQ0FBQ0ksT0FBYixDQUFxQixXQUFyQixFQUFrQyxFQUFsQyxDQUF2QjtBQUNBLFVBQU1DLFNBQVMsR0FBR0wsWUFBWSxDQUFDTSxLQUFiLENBQW1CLEdBQW5CLEVBQXdCQyxHQUF4QixFQUFsQjtBQUNBLFVBQU1DLGFBQWEsR0FBR0wsY0FBYyxHQUFHLEdBQWpCLEdBQXVCRSxTQUE3QztBQUVBLGFBQU87QUFDSEksUUFBQUEsaUJBQWlCLEVBQUVEO0FBRGhCLE9BQVA7QUFHSDtBQVgyQyxHQUF4QixDQUF4QjtBQWNBLE1BQU1oQyxDQUFDLEdBQUcsSUFBSUMsU0FBSixDQUFjckIsZUFBZCxDQUFWOztBQUVBLE1BQUk7QUFDQW9CLElBQUFBLENBQUMsQ0FBQ2tDLFlBQUYsQ0FBZWQsYUFBZixFQURBLENBR0E7QUFDQTs7QUFDQSxRQUFNZSxTQUFTLEdBQUdmLGFBQWEsQ0FBQ2dCLGFBQWQsQ0FBNEIsb0JBQTVCLENBQWxCOztBQUNBLFFBQUlELFNBQVMsSUFBSWhCLFNBQWpCLEVBQTRCO0FBQ3hCZ0IsTUFBQUEsU0FBUyxDQUFDRSxZQUFWLENBQXVCLE1BQXZCLEVBQStCbEIsU0FBL0I7QUFDSDtBQUNKLEdBVEQsQ0FTRSxPQUFPbUIsS0FBUCxFQUFjO0FBQ1o7QUFDSDs7QUFFRCxPQUFLaEQsb0JBQUwsQ0FBMEJVLENBQTFCLEVBQTZCdEQsUUFBN0IsRUFBdUMsSUFBdkMsRUFuQzZFLENBbUMvQjtBQUNqRCxDQXBDRCxDLENBc0NBOzs7QUFDQTZGLE1BQU0sQ0FBQ3pHLFFBQVAsR0FBa0JBLFFBQWxCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaUNsaWVudCwgUGJ4QXBpLCBSZXN1bWFibGUsIENvbmZpZywgZ2xvYmFsUm9vdFVybCAqLyBcblxuLyoqXG4gKiBGaWxlc0FQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgZmlsZSBtYW5hZ2VtZW50IG9wZXJhdGlvbnNcbiAqXG4gKiBQcm92aWRlcyBib3RoIHN0YW5kYXJkIFJFU1Qgb3BlcmF0aW9ucyBmb3IgZmlsZSBDUlVEIGFuZCBjdXN0b20gbWV0aG9kc1xuICogZm9yIHNwZWNpYWxpemVkIG9wZXJhdGlvbnMgbGlrZSBjaHVua2VkIHVwbG9hZCBhbmQgZmlybXdhcmUgZG93bmxvYWQuXG4gKlxuICogQGNsYXNzIEZpbGVzQVBJXG4gKi9cbmNvbnN0IEZpbGVzQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvZmlsZXMnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgdXBsb2FkOiAnOnVwbG9hZCcsXG4gICAgICAgIHVwbG9hZFN0YXR1czogJzp1cGxvYWRTdGF0dXMnLFxuICAgICAgICBkb3dubG9hZEZpcm13YXJlOiAnOmRvd25sb2FkRmlybXdhcmUnLFxuICAgICAgICBmaXJtd2FyZVN0YXR1czogJzpmaXJtd2FyZVN0YXR1cydcbiAgICB9XG59KTtcblxuLy8gQWRkIG1ldGhvZHMgdG8gRmlsZXNBUEkgdXNpbmcgUGJ4QXBpIHV0aWxpdHlcbk9iamVjdC5hc3NpZ24oRmlsZXNBUEksIHtcblxuICAgIC8qKlxuICAgICAqIEdldCBmaWxlIGNvbnRlbnQgYnkgcGF0aFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIEZpbGUgcGF0aCAod2lsbCBiZSBVUkwgZW5jb2RlZClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbbmVlZE9yaWdpbmFsPWZhbHNlXSAtIFdoZXRoZXIgdG8gcmV0dXJuIG9yaWdpbmFsIGNvbnRlbnRcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBqUXVlcnkgQVBJIGNhbGwgb2JqZWN0XG4gICAgICovXG4gICAgZ2V0RmlsZUNvbnRlbnQoZmlsZVBhdGgsIGNhbGxiYWNrLCBuZWVkT3JpZ2luYWwgPSBmYWxzZSkge1xuICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGVuY29kZWRQYXRoID0gZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVQYXRoKTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IG5lZWRPcmlnaW5hbCA/IHsgbmVlZE9yaWdpbmFsOiAndHJ1ZScgfSA6IHt9O1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsR2V0KHBhcmFtcywgY2FsbGJhY2ssIGVuY29kZWRQYXRoKTtcbiAgICBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBsb2FkIGZpbGUgY29udGVudCB1c2luZyBQVVQgbWV0aG9kIChzaW1wbGUgdXBsb2FkKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIERlc3RpbmF0aW9uIGZpbGUgcGF0aFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfEJsb2J9IGNvbnRlbnQgLSBGaWxlIGNvbnRlbnRcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtjb250ZW50VHlwZT0nYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ10gLSBDb250ZW50IHR5cGVcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBqUXVlcnkgQVBJIGNhbGwgb2JqZWN0XG4gICAgICovXG4gICAgdXBsb2FkRmlsZUNvbnRlbnQoZmlsZVBhdGgsIGNvbnRlbnQsIGNhbGxiYWNrLCBjb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nKSB7XG4gICAgICAgIGNvbnN0IGVuY29kZWRQYXRoID0gZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVQYXRoKTtcblxuICAgICAgICAvLyBVc2UgY2FsbFB1dCBtZXRob2Qgd2l0aCB0aGUgZW5jb2RlZCBwYXRoIGFzIElEXG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxQdXQoY29udGVudCwgY2FsbGJhY2ssIGVuY29kZWRQYXRoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIGZpbGUgYnkgcGF0aFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIEZpbGUgcGF0aCB0byBkZWxldGVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge09iamVjdH0galF1ZXJ5IEFQSSBjYWxsIG9iamVjdFxuICAgICAqL1xuICAgIGRlbGV0ZUZpbGUoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBlbmNvZGVkUGF0aCA9IGVuY29kZVVSSUNvbXBvbmVudChmaWxlUGF0aCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsRGVsZXRlKGNhbGxiYWNrLCBlbmNvZGVkUGF0aCk7XG4gICAgICBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2h1bmtlZCBmaWxlIHVwbG9hZCAoUmVzdW1hYmxlLmpzIHN1cHBvcnQpXG4gICAgICogQHBhcmFtIHtGb3JtRGF0YX0gZm9ybURhdGEgLSBGb3JtIGRhdGEgd2l0aCBmaWxlIGNodW5rc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBBUEkgY2FsbCByZXN1bHRcbiAgICAgKi9cbiAgICB1cGxvYWRDaHVua2VkKGZvcm1EYXRhLCBjYWxsYmFjaykge1xuICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCd1cGxvYWQnLCBmb3JtRGF0YSwgY2FsbGJhY2ssICdQT1NUJyk7XG4gICAgICAgXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCB1cGxvYWQgc3RhdHVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVwbG9hZElkIC0gVXBsb2FkIGlkZW50aWZpZXJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge09iamVjdH0gQVBJIGNhbGwgcmVzdWx0XG4gICAgICovXG4gICAgZ2V0VXBsb2FkU3RhdHVzKHVwbG9hZElkLCBjYWxsYmFjaykge1xuICAgICAgXG5cbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHsgaWQ6IHVwbG9hZElkIH07XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCd1cGxvYWRTdGF0dXMnLCBwYXJhbXMsIGNhbGxiYWNrLCAnR0VUJyk7XG4gICAgICAgXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERvd25sb2FkIGZpcm13YXJlIGZyb20gZXh0ZXJuYWwgVVJMXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIERvd25sb2FkIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVybCAtIEZpcm13YXJlIFVSTFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbcGFyYW1zLm1kNV0gLSBFeHBlY3RlZCBNRDUgaGFzaFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBBUEkgY2FsbCByZXN1bHRcbiAgICAgKi9cbiAgICBkb3dubG9hZEZpcm13YXJlKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICBcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZG93bmxvYWRGaXJtd2FyZScsIHBhcmFtcywgY2FsbGJhY2ssICdQT1NUJyk7XG4gICAgICBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGZpcm13YXJlIGRvd25sb2FkIHN0YXR1c1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIEZpcm13YXJlIGZpbGVuYW1lXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEFQSSBjYWxsIHJlc3VsdFxuICAgICAqL1xuICAgIGdldEZpcm13YXJlU3RhdHVzKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuICAgICAgIFxuXG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7IGZpbGVuYW1lOiBmaWxlbmFtZSB9O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZmlybXdhcmVTdGF0dXMnLCBwYXJhbXMsIGNhbGxiYWNrLCAnR0VUJyk7XG4gICAgICAgIFxuICAgIH1cbn0pO1xuXG4vKipcbiAqIExlZ2FjeSBjb21wYXRpYmlsaXR5IG1ldGhvZHMgLSB0aGVzZSBtYXAgdG8gdGhlIG5ldyBSRVNUIEFQSSBtZXRob2RzXG4gKiBUaGVzZSBtYWludGFpbiBiYWNrd2FyZCBjb21wYXRpYmlsaXR5IHdoaWxlIHVzaW5nIHRoZSBuZXcgc3RhbmRhcmRpemVkIG1ldGhvZHNcbiAqL1xuXG4vKipcbiAqIExlZ2FjeTogVXBsb2FkIGZpbGUgd2l0aCBwYXJhbXMgKG1hcHMgdG8gdXBsb2FkQ2h1bmtlZClcbiAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBVcGxvYWQgcGFyYW1ldGVyc1xuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICovXG5GaWxlc0FQSS51cGxvYWRGaWxlRnJvbVBhcmFtcyA9IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAvLyBDb252ZXJ0IG9iamVjdCB0byBGb3JtRGF0YSBmb3IgY2h1bmtlZCB1cGxvYWRcbiAgICBjb25zdCBmb3JtRGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgIE9iamVjdC5rZXlzKHBhcmFtcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICBpZiAoa2V5ID09PSAnZmlsZXMnICYmIEFycmF5LmlzQXJyYXkocGFyYW1zW2tleV0pKSB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgZmlsZSBhcnJheXMgZnJvbSBsZWdhY3kgQVBJXG4gICAgICAgICAgICBwYXJhbXNba2V5XS5mb3JFYWNoKChmaWxlLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChmaWxlLmZpbGVfcGF0aCAmJiBmaWxlLmZpbGVfbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIHdvdWxkIG5lZWQgdG8gYmUgaGFuZGxlZCBkaWZmZXJlbnRseSBpbiByZWFsIHNjZW5hcmlvXG4gICAgICAgICAgICAgICAgICAgIC8vIGFzIHdlIGNhbid0IHJlY3JlYXRlIEZpbGUgb2JqZWN0cyBmcm9tIHBhdGhzXG4gICAgICAgICAgICAgICAgICAgIGZvcm1EYXRhLmFwcGVuZChgZmlsZV8ke2luZGV4fWAsIGZpbGUuZmlsZV9uYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvcm1EYXRhLmFwcGVuZChrZXksIHBhcmFtc1trZXldKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXMudXBsb2FkQ2h1bmtlZChmb3JtRGF0YSwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBMZWdhY3k6IEdldCB1cGxvYWQgc3RhdHVzIChtYXBzIHRvIGdldFVwbG9hZFN0YXR1cylcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cGxvYWRJZCAtIFVwbG9hZCBpZGVudGlmaWVyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gKi9cbkZpbGVzQVBJLnN0YXR1c1VwbG9hZEZpbGUgPSBmdW5jdGlvbih1cGxvYWRJZCwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5nZXRVcGxvYWRTdGF0dXModXBsb2FkSWQsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogQ29uZmlndXJlIFJlc3VtYWJsZS5qcyB0byB1c2UgdGhlIG5ldyB2MyBBUElcbiAqIEBwYXJhbSB7b2JqZWN0fSByZXN1bWFibGVDb25maWcgLSBSZXN1bWFibGUuanMgY29uZmlndXJhdGlvblxuICogQHJldHVybnMge29iamVjdH0gVXBkYXRlZCBjb25maWd1cmF0aW9uXG4gKi9cbkZpbGVzQVBJLmNvbmZpZ3VyZVJlc3VtYWJsZSA9IGZ1bmN0aW9uKHJlc3VtYWJsZUNvbmZpZyA9IHt9KSB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe1xuICAgICAgICB0YXJnZXQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YzL2ZpbGVzOnVwbG9hZGAsXG4gICAgICAgIHRlc3RDaHVua3M6IGZhbHNlLFxuICAgICAgICBjaHVua1NpemU6IDMgKiAxMDI0ICogMTAyNCwgLy8gM01CIGNodW5rc1xuICAgICAgICBzaW11bHRhbmVvdXNVcGxvYWRzOiAxLFxuICAgICAgICBtYXhGaWxlczogMSxcbiAgICAgICAgZmlsZVR5cGU6IFsnKiddLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCdcbiAgICAgICAgfVxuICAgIH0sIHJlc3VtYWJsZUNvbmZpZyk7XG59O1xuXG4vKipcbiAqIFNldHVwIGNvbW1vbiBSZXN1bWFibGUuanMgZXZlbnQgaGFuZGxlcnNcbiAqIEBwYXJhbSB7b2JqZWN0fSByZXN1bWFibGVJbnN0YW5jZSAtIFJlc3VtYWJsZS5qcyBpbnN0YW5jZVxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiBmb3IgZXZlbnRzXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGF1dG9VcGxvYWQgLSBXaGV0aGVyIHRvIGF1dG8tdXBsb2FkIG9uIGZpbGVBZGRlZCBldmVudFxuICovXG5GaWxlc0FQSS5zZXR1cFJlc3VtYWJsZUV2ZW50cyA9IGZ1bmN0aW9uKHJlc3VtYWJsZUluc3RhbmNlLCBjYWxsYmFjaywgYXV0b1VwbG9hZCA9IGZhbHNlKSB7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCdmaWxlU3VjY2VzcycsIHtmaWxlLCByZXNwb25zZX0pO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdmaWxlUHJvZ3Jlc3MnLCAoZmlsZSkgPT4ge1xuICAgICAgICBjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbignZmlsZUFkZGVkJywgKGZpbGUsIGV2ZW50KSA9PiB7XG4gICAgICAgIGlmIChhdXRvVXBsb2FkKSB7XG4gICAgICAgICAgICByZXN1bWFibGVJbnN0YW5jZS51cGxvYWQoKTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjaygnZmlsZUFkZGVkJywge2ZpbGUsIGV2ZW50fSk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ2ZpbGVSZXRyeScsIChmaWxlKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCdmaWxlUmV0cnknLCB7ZmlsZX0pO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdmaWxlRXJyb3InLCAoZmlsZSwgbWVzc2FnZSkgPT4ge1xuICAgICAgICBjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCd1cGxvYWRTdGFydCcpO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdjb21wbGV0ZScsICgpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ2NvbXBsZXRlJyk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ3Byb2dyZXNzJywgKCkgPT4ge1xuICAgICAgICBjb25zdCBwZXJjZW50ID0gMTAwICogcmVzdW1hYmxlSW5zdGFuY2UucHJvZ3Jlc3MoKTtcbiAgICAgICAgY2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcbiAgICB9KTtcbiAgICByZXN1bWFibGVJbnN0YW5jZS5vbignZXJyb3InLCAobWVzc2FnZSwgZmlsZSkgPT4ge1xuICAgICAgICBjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZSwgZmlsZX0pO1xuICAgIH0pO1xuICAgIHJlc3VtYWJsZUluc3RhbmNlLm9uKCdwYXVzZScsICgpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ3BhdXNlJyk7XG4gICAgfSk7XG4gICAgcmVzdW1hYmxlSW5zdGFuY2Uub24oJ2NhbmNlbCcsICgpID0+IHtcbiAgICAgICAgY2FsbGJhY2soJ2NhbmNlbCcpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBVcGxvYWQgZmlsZSB1c2luZyBSZXN1bWFibGUuanNcbiAqIEBwYXJhbSB7RmlsZX0gZmlsZSAtIEZpbGUgb2JqZWN0IHRvIHVwbG9hZFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICovXG5GaWxlc0FQSS51cGxvYWRGaWxlID0gZnVuY3Rpb24oZmlsZSwgY2FsbGJhY2spIHtcbiAgICBjb25zdCByID0gbmV3IFJlc3VtYWJsZSh0aGlzLmNvbmZpZ3VyZVJlc3VtYWJsZSgpKTtcblxuICAgIHRoaXMuc2V0dXBSZXN1bWFibGVFdmVudHMociwgY2FsbGJhY2spO1xuXG4gICAgci5hZGRGaWxlKGZpbGUpO1xuICAgIHIudXBsb2FkKCk7XG59O1xuXG4vKipcbiAqIEdldCBzdGF0dXMgb2YgdXBsb2FkZWQgZmlsZVxuICogQHBhcmFtIHtzdHJpbmd9IGZpbGVJZCAtIEZpbGUgSURcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAqL1xuRmlsZXNBUEkuZ2V0U3RhdHVzVXBsb2FkRmlsZSA9IGZ1bmN0aW9uKGZpbGVJZCwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCd1cGxvYWRTdGF0dXMnLCB7IGlkOiBmaWxlSWQgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9LCAnUE9TVCcpO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYXVkaW8gZmlsZVxuICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gRmlsZSBwYXRoXG4gKiBAcGFyYW0ge3N0cmluZ3xudWxsfSBmaWxlSWQgLSBGaWxlIElEIChvcHRpb25hbClcbiAqIEBwYXJhbSB7ZnVuY3Rpb258bnVsbH0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiAob3B0aW9uYWwpXG4gKi9cbkZpbGVzQVBJLnJlbW92ZUF1ZGlvRmlsZSA9IGZ1bmN0aW9uKGZpbGVQYXRoLCBmaWxlSWQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIHtcbiAgICByZXR1cm4gdGhpcy5kZWxldGVGaWxlKGZpbGVQYXRoLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmlsZUlkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIERvd25sb2FkIG5ldyBmaXJtd2FyZVxuICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIERvd25sb2FkIHBhcmFtZXRlcnNcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAqL1xuRmlsZXNBUEkuZG93bmxvYWROZXdGaXJtd2FyZSA9IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICBjb25zdCByZXF1ZXN0RGF0YSA9IHtcbiAgICAgICAgbWQ1OiBwYXJhbXMubWQ1LFxuICAgICAgICBzaXplOiBwYXJhbXMuc2l6ZSxcbiAgICAgICAgdmVyc2lvbjogcGFyYW1zLnZlcnNpb24sXG4gICAgICAgIHVybDogcGFyYW1zLnVwZGF0ZUxpbmtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZG93bmxvYWRGaXJtd2FyZScsIHJlcXVlc3REYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfVxuICAgIH0sICdQT1NUJyk7XG59O1xuXG4vKipcbiAqIEdldCBmaXJtd2FyZSBkb3dubG9hZCBzdGF0dXNcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIEZpcm13YXJlIGZpbGVuYW1lXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gKi9cbkZpbGVzQVBJLmZpcm13YXJlRG93bmxvYWRTdGF0dXMgPSBmdW5jdGlvbihmaWxlbmFtZSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdmaXJtd2FyZVN0YXR1cycsIHsgZmlsZW5hbWUgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9LCAnUE9TVCcpO1xufTtcblxuLyoqXG4gKiBBdHRhY2ggdG8gYnV0dG9uXG4gKiBAcGFyYW0ge3N0cmluZ30gYnV0dG9uSWQgLSBCdXR0b24gSURcbiAqIEBwYXJhbSB7c3RyaW5nW119IGZpbGVUeXBlcyAtIEFycmF5IG9mIGFsbG93ZWQgZmlsZSB0eXBlc1xuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICogQHBhcmFtIHtzdHJpbmd8bnVsbH0gaW5wdXROYW1lIC0gT3B0aW9uYWwgbmFtZSBhdHRyaWJ1dGUgZm9yIHRoZSBmaWxlIGlucHV0IChmb3IgdGVzdCBjb21wYXRpYmlsaXR5KVxuICovXG5GaWxlc0FQSS5hdHRhY2hUb0J0biA9IGZ1bmN0aW9uKGJ1dHRvbklkLCBmaWxlVHlwZXMsIGNhbGxiYWNrLCBpbnB1dE5hbWUgPSBudWxsKSB7XG4gICAgY29uc3QgYnV0dG9uRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGJ1dHRvbklkKTtcbiAgICBpZiAoIWJ1dHRvbkVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VtYWJsZUNvbmZpZyA9IHRoaXMuY29uZmlndXJlUmVzdW1hYmxlKHtcbiAgICAgICAgZmlsZVR5cGU6IGZpbGVUeXBlcyxcbiAgICAgICAgcXVlcnk6IGZ1bmN0aW9uKGZpbGUpIHtcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsTmFtZSA9IGZpbGUubmFtZSB8fCBmaWxlLmZpbGVOYW1lO1xuICAgICAgICAgICAgY29uc3QgbmFtZVdpdGhvdXRFeHQgPSBvcmlnaW5hbE5hbWUucmVwbGFjZSgvXFwuW14vLl0rJC8sICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IG9yaWdpbmFsTmFtZS5zcGxpdCgnLicpLnBvcCgpO1xuICAgICAgICAgICAgY29uc3QgZmluYWxGaWxlbmFtZSA9IG5hbWVXaXRob3V0RXh0ICsgJy4nICsgZXh0ZW5zaW9uO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlc3VtYWJsZUZpbGVuYW1lOiBmaW5hbEZpbGVuYW1lXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCByID0gbmV3IFJlc3VtYWJsZShyZXN1bWFibGVDb25maWcpO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgci5hc3NpZ25Ccm93c2UoYnV0dG9uRWxlbWVudCk7XG5cbiAgICAgICAgLy8gQWRkIG5hbWUgYXR0cmlidXRlIHRvIHRoZSBkeW5hbWljYWxseSBjcmVhdGVkIGZpbGUgaW5wdXQgZm9yIHRlc3QgY29tcGF0aWJpbGl0eVxuICAgICAgICAvLyBSZXN1bWFibGUuanMgY3JlYXRlcyB0aGUgaW5wdXQgaW5zaWRlIHRoZSBidXR0b24gZWxlbWVudFxuICAgICAgICBjb25zdCBmaWxlSW5wdXQgPSBidXR0b25FbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W3R5cGU9XCJmaWxlXCJdJyk7XG4gICAgICAgIGlmIChmaWxlSW5wdXQgJiYgaW5wdXROYW1lKSB7XG4gICAgICAgICAgICBmaWxlSW5wdXQuc2V0QXR0cmlidXRlKCduYW1lJywgaW5wdXROYW1lKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnNldHVwUmVzdW1hYmxlRXZlbnRzKHIsIGNhbGxiYWNrLCB0cnVlKTsgLy8gYXV0b1VwbG9hZCA9IHRydWUgZm9yIGJ1dHRvbiBhdHRhY2htZW50c1xufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93LkZpbGVzQVBJID0gRmlsZXNBUEk7Il19