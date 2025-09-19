"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
var customFilesAPI = new PbxApiClient({
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

customFilesAPI.getDefault = function (callback) {
  $.api({
    url: "".concat(this.apiUrl, ":getDefault"),
    method: 'GET',
    on: 'now',
    onSuccess: function onSuccess(response) {
      callback(response);
    },
    onFailure: function onFailure(response) {
      callback(response);
    },
    onError: function onError() {
      callback({
        result: false,
        messages: {
          error: ['Network error']
        }
      });
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


customFilesAPI.save = function (data, callback) {
  // Prepare data for API
  var apiData = _objectSpread({}, data); // Handle content encoding - check if it's already base64


  if (apiData.content) {
    // Simple check if content is already base64 encoded
    // Base64 strings match the pattern: ^[A-Za-z0-9+/]*={0,2}$
    var isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(apiData.content.replace(/\s/g, ''));

    if (!isBase64) {
      // Encode to base64 if not already encoded
      apiData.content = btoa(apiData.content);
    }
  }

  if (apiData.id && apiData.id !== '') {
    // Update existing file using PATCH for partial update
    var id = apiData.id;
    delete apiData.id;
    delete apiData.isNew;
    $.api({
      url: "".concat(this.apiUrl, "/").concat(id),
      method: 'PATCH',
      data: apiData,
      on: 'now',
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          messages: {
            error: ['Network error']
          }
        });
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
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          messages: {
            error: ['Network error']
          }
        });
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


customFilesAPI.getRecord = function (id, callback) {
  $.api({
    url: "".concat(this.apiUrl, "/").concat(id),
    method: 'GET',
    on: 'now',
    onSuccess: function onSuccess(response) {
      callback(response);
    },
    onFailure: function onFailure(response) {
      callback(response);
    },
    onError: function onError() {
      callback({
        result: false,
        messages: {
          error: ['Network error']
        }
      });
    }
  });
};
/**
 * Get all records with optional filtering
 * This method is needed for PbxDataTableIndex compatibility
 */


customFilesAPI.getRecords = function (callback) {
  $.api({
    url: this.apiUrl,
    method: 'GET',
    on: 'now',
    onSuccess: function onSuccess(response) {
      callback(response);
    },
    onFailure: function onFailure(response) {
      callback(response);
    },
    onError: function onError() {
      callback({
        result: false,
        messages: {
          error: ['Network error']
        }
      });
    }
  });
};
/**
 * Delete a custom file record
 *
 * @param {string} id - The ID of the custom file to delete
 * @param {Function} callback - Callback function to handle the response
 */


customFilesAPI.deleteRecord = function (id, callback) {
  $.api({
    url: "".concat(this.apiUrl, "/").concat(id),
    method: 'DELETE',
    on: 'now',
    onSuccess: function onSuccess(response) {
      callback(response);
    },
    onFailure: function onFailure(response) {
      callback(response);
    },
    onError: function onError() {
      callback({
        result: false,
        messages: {
          error: ['Network error']
        }
      });
    }
  });
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvY3VzdG9tRmlsZXNBUEkuanMiXSwibmFtZXMiOlsiY3VzdG9tRmlsZXNBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXREZWZhdWx0IiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwiYXBpVXJsIiwibWV0aG9kIiwib24iLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsIm9uRmFpbHVyZSIsIm9uRXJyb3IiLCJyZXN1bHQiLCJtZXNzYWdlcyIsImVycm9yIiwic2F2ZSIsImRhdGEiLCJhcGlEYXRhIiwiY29udGVudCIsImlzQmFzZTY0IiwidGVzdCIsInJlcGxhY2UiLCJidG9hIiwiaWQiLCJpc05ldyIsImdldFJlY29yZCIsImdldFJlY29yZHMiLCJkZWxldGVSZWNvcmQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsY0FBYyxHQUFHLElBQUlDLFlBQUosQ0FBaUI7QUFDcENDLEVBQUFBLFFBQVEsRUFBRSw4QkFEMEI7QUFFcENDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxVQUFVLEVBQUU7QUFERDtBQUZxQixDQUFqQixDQUF2QjtBQU9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBSixjQUFjLENBQUNJLFVBQWYsR0FBNEIsVUFBU0MsUUFBVCxFQUFtQjtBQUMzQ0MsRUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsSUFBQUEsR0FBRyxZQUFLLEtBQUtDLE1BQVYsZ0JBREQ7QUFFRkMsSUFBQUEsTUFBTSxFQUFFLEtBRk47QUFHRkMsSUFBQUEs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U0FBUyxFQUFFLG1CQUFDRCxRQUFELEVBQWM7QUFDckJSLE1BQUFBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ0gsS0FUQztBQVVGRSxJQUFBQSxPQUFPLEVBQUUsbUJBQU07QUFDWFYsTUFBQUEsUUFBUSxDQUFDO0FBQUNXLFFBQUFBLE1BQU0sRUFBRSxLQUFUO0FBQWdCQyxRQUFBQSxRQUFRLEVBQUU7QUFBQ0MsVUFBQUEsS0FBSyxFQUFFLENBQUMsZUFBRDtBQUFSO0FBQTFCLE9BQUQsQ0FBUjtBQUNIO0FBWkMsR0FBTjtBQWNILENBZkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpQ2xpZW50LCAkICovXG5cbi8qKlxuICogQ3VzdG9tRmlsZXNBUEkgLSBSRVNUZnVsIEFQSSBjbGllbnQgZm9yIGN1c3RvbSBmaWxlcyBtYW5hZ2VtZW50XG4gKlxuICogVGhpcyBtb2R1bGUgcHJvdmlkZXMgbWV0aG9kcyB0byBpbnRlcmFjdCB3aXRoIHRoZSBjdXN0b20gZmlsZXMgQVBJIHYzXG4gKiB1c2luZyB0aGUgY2VudHJhbGl6ZWQgUGJ4QXBpQ2xpZW50IGZvciBhbGwgSFRUUCBvcGVyYXRpb25zLlxuICpcbiAqIEBtb2R1bGUgY3VzdG9tRmlsZXNBUElcbiAqL1xuY29uc3QgY3VzdG9tRmlsZXNBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9jdXN0b20tZmlsZXMnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0RGVmYXVsdDogJzpnZXREZWZhdWx0J1xuICAgIH1cbn0pO1xuXG4vKipcbiAqIEdldCBkZWZhdWx0IHZhbHVlcyBmb3IgYSBuZXcgY3VzdG9tIGZpbGVcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqXG4gKiBAZXhhbXBsZVxuICogY3VzdG9tRmlsZXNBUEkuZ2V0RGVmYXVsdCgocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIC8vIFVzZSBkZWZhdWx0IHZhbHVlcyB0byBpbml0aWFsaXplIG5ldyBmaWxlIGZvcm1cbiAqICAgICAgICAgaW5pdGlhbGl6ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cbmN1c3RvbUZpbGVzQVBJLmdldERlZmF1bHQgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICQuYXBpKHtcbiAgICAgICAgdXJsOiBgJHt0aGlzLmFwaVVybH06Z2V0RGVmYXVsdGAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciddfX0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFNhdmUgY3VzdG9tIGZpbGUgKGludGVsbGlnZW50IGNyZWF0ZSBvciB1cGRhdGUpXG4gKiBUaGlzIGlzIGEgY29udmVuaWVuY2UgbWV0aG9kIHRoYXQgZGV0ZXJtaW5lcyB3aGV0aGVyIHRvIGNyZWF0ZSBvciB1cGRhdGVcbiAqIGJhc2VkIG9uIHRoZSBwcmVzZW5jZSBvZiBhbiBJRC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEN1c3RvbSBmaWxlIGRhdGFcbiAqIEBwYXJhbSB7c3RyaW5nfSBbZGF0YS5pZF0gLSBGaWxlIElEIChpZiBwcmVzZW50LCB1cGRhdGVzOyBpZiBub3QsIGNyZWF0ZXMpXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YS5maWxlcGF0aCAtIEZpbGUgcGF0aFxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGEuY29udGVudCAtIEZpbGUgY29udGVudCAod2lsbCBiZSBiYXNlNjQgZW5jb2RlZCBpZiBub3QgYWxyZWFkeSlcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhLm1vZGUgLSBGaWxlIG1vZGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhLmRlc2NyaXB0aW9uIC0gRmlsZSBkZXNjcmlwdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKlxuICogQGV4YW1wbGVcbiAqIC8vIE5ldyBmaWxlIChubyBJRClcbiAqIGN1c3RvbUZpbGVzQVBJLnNhdmUoe1xuICogICAgIGZpbGVwYXRoOiAnL2V0Yy9uZXcuY29uZicsXG4gKiAgICAgY29udGVudDogJ2RhdGEnLFxuICogICAgIG1vZGU6ICdub25lJ1xuICogfSwgY2FsbGJhY2spO1xuICpcbiAqIC8vIEV4aXN0aW5nIGZpbGUgKHdpdGggSUQpXG4gKiBjdXN0b21GaWxlc0FQSS5zYXZlKHtcbiAqICAgICBpZDogJzEyMycsXG4gKiAgICAgZmlsZXBhdGg6ICcvZXRjL2V4aXN0aW5nLmNvbmYnLFxuICogICAgIGNvbnRlbnQ6ICd1cGRhdGVkIGRhdGEnLFxuICogICAgIG1vZGU6ICdvdmVycmlkZSdcbiAqIH0sIGNhbGxiYWNrKTtcbiAqL1xuY3VzdG9tRmlsZXNBUEkuc2F2ZSA9IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgLy8gUHJlcGFyZSBkYXRhIGZvciBBUElcbiAgICBjb25zdCBhcGlEYXRhID0geyAuLi5kYXRhIH07XG5cbiAgICAvLyBIYW5kbGUgY29udGVudCBlbmNvZGluZyAtIGNoZWNrIGlmIGl0J3MgYWxyZWFkeSBiYXNlNjRcbiAgICBpZiAoYXBpRGF0YS5jb250ZW50KSB7XG4gICAgICAgIC8vIFNpbXBsZSBjaGVjayBpZiBjb250ZW50IGlzIGFscmVhZHkgYmFzZTY0IGVuY29kZWRcbiAgICAgICAgLy8gQmFzZTY0IHN0cmluZ3MgbWF0Y2ggdGhlIHBhdHRlcm46IF5bQS1aYS16MC05Ky9dKj17MCwyfSRcbiAgICAgICAgY29uc3QgaXNCYXNlNjQgPSAvXltBLVphLXowLTkrL10qPXswLDJ9JC8udGVzdChhcGlEYXRhLmNvbnRlbnQucmVwbGFjZSgvXFxzL2csICcnKSk7XG4gICAgICAgIGlmICghaXNCYXNlNjQpIHtcbiAgICAgICAgICAgIC8vIEVuY29kZSB0byBiYXNlNjQgaWYgbm90IGFscmVhZHkgZW5jb2RlZFxuICAgICAgICAgICAgYXBpRGF0YS5jb250ZW50ID0gYnRvYShhcGlEYXRhLmNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGFwaURhdGEuaWQgJiYgYXBpRGF0YS5pZCAhPT0gJycpIHtcbiAgICAgICAgLy8gVXBkYXRlIGV4aXN0aW5nIGZpbGUgdXNpbmcgUEFUQ0ggZm9yIHBhcnRpYWwgdXBkYXRlXG4gICAgICAgIGNvbnN0IGlkID0gYXBpRGF0YS5pZDtcbiAgICAgICAgZGVsZXRlIGFwaURhdGEuaWQ7XG4gICAgICAgIGRlbGV0ZSBhcGlEYXRhLmlzTmV3O1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9LyR7aWR9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgICAgICAgIGRhdGE6IGFwaURhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciddfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBDcmVhdGUgbmV3IGZpbGVcbiAgICAgICAgZGVsZXRlIGFwaURhdGEuaWQ7XG4gICAgICAgIGRlbGV0ZSBhcGlEYXRhLmlzTmV3O1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5hcGlVcmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IGFwaURhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciddfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEdldCBhIHNpbmdsZSBjdXN0b20gZmlsZSByZWNvcmQgYnkgSURcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBUaGUgSUQgb2YgdGhlIGN1c3RvbSBmaWxlIHRvIHJldHJpZXZlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqXG4gKiBAZXhhbXBsZVxuICogY3VzdG9tRmlsZXNBUEkuZ2V0UmVjb3JkKCcxMjMnLCAocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdGaWxlIGRhdGE6JywgcmVzcG9uc2UuZGF0YSk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cbmN1c3RvbUZpbGVzQVBJLmdldFJlY29yZCA9IGZ1bmN0aW9uKGlkLCBjYWxsYmFjaykge1xuICAgICQuYXBpKHtcbiAgICAgICAgdXJsOiBgJHt0aGlzLmFwaVVybH0vJHtpZH1gLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3InXX19KTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBHZXQgYWxsIHJlY29yZHMgd2l0aCBvcHRpb25hbCBmaWx0ZXJpbmdcbiAqIFRoaXMgbWV0aG9kIGlzIG5lZWRlZCBmb3IgUGJ4RGF0YVRhYmxlSW5kZXggY29tcGF0aWJpbGl0eVxuICovXG5jdXN0b21GaWxlc0FQSS5nZXRSZWNvcmRzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAkLmFwaSh7XG4gICAgICAgIHVybDogdGhpcy5hcGlVcmwsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciddfX0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIERlbGV0ZSBhIGN1c3RvbSBmaWxlIHJlY29yZFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFRoZSBJRCBvZiB0aGUgY3VzdG9tIGZpbGUgdG8gZGVsZXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqL1xuY3VzdG9tRmlsZXNBUEkuZGVsZXRlUmVjb3JkID0gZnVuY3Rpb24oaWQsIGNhbGxiYWNrKSB7XG4gICAgJC5hcGkoe1xuICAgICAgICB1cmw6IGAke3RoaXMuYXBpVXJsfS8ke2lkfWAsXG4gICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciddfX0pO1xuICAgICAgICB9XG4gICAgfSk7XG59OyJdfQ==