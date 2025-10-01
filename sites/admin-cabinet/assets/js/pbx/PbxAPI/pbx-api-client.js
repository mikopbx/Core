"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

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

/* global Config, PbxApi, $ */

/**
 * PbxApiClient - Unified REST API v3 client for all entities
 * 
 * This class provides a standard interface for all CRUD operations
 * and eliminates code duplication across API modules.
 * 
 * Features:
 * - Standard RESTful operations (GET, POST, PUT, DELETE)
 * - Custom methods support via colon notation (:getDefault)
 * - Automatic HTTP method selection based on data
 * - CSRF token management
 * - Backward compatibility with PbxDataTableIndex
 * 
 * @class PbxApiClient 
 */
var PbxApiClient = /*#__PURE__*/function () {
  /**
   * Create a new API client instance
   * @param {object} config - Configuration object
   * @param {string} config.endpoint - Base API endpoint (e.g., '/pbxcore/api/v3/ivr-menu')
   * @param {object} [config.customMethods] - Map of custom methods (e.g., {getDefault: ':getDefault'})
   * @param {boolean} [config.singleton] - Whether this is a singleton resource (no IDs in URLs)
   */
  function PbxApiClient(config) {
    _classCallCheck(this, PbxApiClient);

    this.endpoint = config.endpoint;
    this.customMethods = config.customMethods || {};
    this.isSingleton = config.singleton || false; // Extract base URL for Config.pbxUrl

    this.apiUrl = "".concat(Config.pbxUrl).concat(this.endpoint); // Create endpoints property for backward compatibility with PbxDataTableIndex

    this.endpoints = {
      getList: this.apiUrl
    }; // Add custom method endpoints

    for (var _i = 0, _Object$entries = Object.entries(this.customMethods); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
          methodName = _Object$entries$_i[0],
          methodPath = _Object$entries$_i[1];

      this.endpoints[methodName] = "".concat(this.apiUrl).concat(methodPath);
    }
  }
  /**
   * Custom success test for RESTful API with proper HTTP codes
   * Treats business errors (4xx) as failures, not network errors
   *
   * @param {object} response - Server response
   * @param {XMLHttpRequest} xhr - XMLHttpRequest object
   * @returns {boolean} - True if request was successful
   */


  _createClass(PbxApiClient, [{
    key: "successTest",
    value: function successTest(response, xhr) {
      // If we have a valid response object with result field, use it
      if (response && typeof response.result !== 'undefined') {
        return response.result === true;
      } // For responses without result field, check HTTP status
      // 2xx = success, 4xx/5xx = failure (but not network error)


      var status = xhr ? xhr.status : 200;
      return status >= 200 && status < 300;
    }
    /**
     * Custom error handler for RESTful API
     * Distinguishes between business errors (4xx) and real network errors
     *
     * @param {XMLHttpRequest} xhr - XMLHttpRequest object
     * @param {function} onFailureCallback - Callback for business errors (4xx)
     * @param {function} onErrorCallback - Callback for network errors
     */

  }, {
    key: "handleError",
    value: function handleError(xhr, onFailureCallback, onErrorCallback) {
      var status = xhr.status; // Business errors (4xx) - validation, conflicts, etc.
      // These have response body with error details

      if (status >= 400 && status < 500) {
        try {
          var response = JSON.parse(xhr.responseText); // Call onFailure with parsed response

          onFailureCallback(response);
        } catch (e) {
          // If can't parse JSON, treat as network error
          onErrorCallback();
        }
      } // Server errors (5xx) or network errors (0)
      else {
        onErrorCallback();
      }
    }
    /**
     * Get base API settings with proper error handling
     * This standardizes error handling across all API calls
     *
     * @param {function} successCallback - Called on successful response (2xx + result=true)
     * @param {function} failureCallback - Called on business errors (4xx or result=false)
     * @returns {object} - API settings object for $.api()
     */

  }, {
    key: "getBaseApiSettings",
    value: function getBaseApiSettings(successCallback, failureCallback) {
      var self = this;
      return {
        on: 'now',
        successTest: function successTest(response, xhr) {
          return self.successTest(response, xhr);
        },
        onSuccess: function onSuccess(response) {
          successCallback(response, true);
        },
        onFailure: function onFailure(response) {
          failureCallback(response, false);
        },
        onError: function onError(errorMessage, element, xhr) {
          // Only handle real network errors (5xx, timeout, connection refused)
          // For 4xx errors, Semantic UI already called onFailure, so skip
          var status = xhr ? xhr.status : 0; // Skip if this is a business error (4xx) - already handled by onFailure

          if (status >= 400 && status < 500) {
            return;
          } // Real network/server error - show generic message


          failureCallback({
            result: false,
            messages: {
              error: ['Network error occurred']
            }
          }, false);
        }
      };
    }
    /**
     * Get record by ID or get default values for new record
     * @param {string} recordId - Record ID or empty/null for new record
     * @param {function} callback - Callback function
     */

  }, {
    key: "getRecord",
    value: function getRecord(recordId, callback) {
      // Check if we should use a custom method for new records
      var isNew = !recordId || recordId === '' || recordId === 'new';
      var url;

      if (isNew && this.customMethods.getDefault) {
        // Use custom method for new records
        url = "".concat(this.apiUrl).concat(this.customMethods.getDefault);
      } else {
        // Get existing record by ID
        url = "".concat(this.apiUrl, "/").concat(recordId);
      }

      var apiSettings = this.getBaseApiSettings(function (response) {
        // Set _isNew flag for new records to indicate POST should be used
        if (isNew && response.data) {
          response.data._isNew = true;
        }

        callback(response, true);
      }, callback);
      $.api(_objectSpread({
        url: url,
        method: 'GET'
      }, apiSettings));
    }
    /**
     * Get list of records (or single record for singleton)
     * @param {object|function} dataOrCallback - Optional params or callback
     * @param {function} [callback] - Callback if first param is data
     */

  }, {
    key: "getList",
    value: function getList(dataOrCallback, callback) {
      // For singleton resources, redirect to get() method
      if (this.isSingleton) {
        if (typeof this.get === 'function') {
          return this.get(dataOrCallback, callback);
        }
      } // Handle overloaded parameters


      var actualCallback;
      var params = {};

      if (typeof dataOrCallback === 'function') {
        actualCallback = dataOrCallback;
      } else {
        params = dataOrCallback || {};
        actualCallback = callback;
      }

      var apiSettings = this.getBaseApiSettings(function (response) {
        return actualCallback(response, true);
      }, function (response) {
        // Ensure we return a structure with result and data fields
        if (response && !response.hasOwnProperty('data')) {
          response.data = [];
        }

        actualCallback(response, false);
      });
      $.api(_objectSpread({
        url: this.apiUrl,
        method: 'GET',
        data: params
      }, apiSettings));
    }
    /**
     * Save record (create or update)
     * @param {object} data - Data to save
     * @param {function} callback - Callback function
     */

  }, {
    key: "saveRecord",
    value: function saveRecord(data, callback) {
      // Determine if this is a new record
      var isNew = this.isNewRecord(data); // Clean up internal flags

      var cleanData = _objectSpread({}, data);

      if (cleanData._isNew !== undefined) {
        delete cleanData._isNew;
      } // Remove _method as it's handled by the actual HTTP method


      if (cleanData._method !== undefined) {
        delete cleanData._method;
      } // Get the record ID for updates


      var recordId = this.getRecordId(cleanData); // v3 API: POST for new records, PUT for updates

      var method = isNew ? 'POST' : 'PUT';
      var url = isNew ? this.apiUrl : "".concat(this.apiUrl, "/").concat(recordId);
      $.api({
        url: url,
        method: method,
        data: cleanData,
        on: 'now',
        beforeSend: function beforeSend(settings) {
          // Add CSRF token if available
          if (typeof globalCsrfTokenKey !== 'undefined' && typeof globalCsrfToken !== 'undefined') {
            cleanData[globalCsrfTokenKey] = globalCsrfToken;
          } // Check if we need to send as JSON (for complex structures)


          if (PbxApiClient.hasComplexData(cleanData)) {
            settings.contentType = 'application/json';
            settings.data = JSON.stringify(cleanData);
          }

          return settings;
        },
        onSuccess: function onSuccess(response) {
          callback(response, true);
        },
        onFailure: function onFailure(response) {
          callback(response, false);
        },
        onError: function onError() {
          callback({
            result: false,
            messages: {
              error: ['Network error occurred']
            }
          }, false);
        }
      });
    }
    /**
     * Delete record
     * @param {string} recordId - Record ID to delete
     * @param {function} callback - Callback function
     */

  }, {
    key: "deleteRecord",
    value: function deleteRecord(recordId, callback) {
      var data = {}; // Add CSRF token if available

      if (typeof globalCsrfTokenKey !== 'undefined' && typeof globalCsrfToken !== 'undefined') {
        data[globalCsrfTokenKey] = globalCsrfToken;
      }

      var apiSettings = this.getBaseApiSettings(function (response) {
        return callback(response, true);
      }, callback);
      $.api(_objectSpread({
        url: "".concat(this.apiUrl, "/").concat(recordId),
        method: 'DELETE',
        data: data
      }, apiSettings));
    }
    /**
     * Call a custom method
     * @param {string} methodName - Method name
     * @param {object|function} dataOrCallback - Data or callback
     * @param {function} [callback] - Callback if first param is data
     * @param {string} [httpMethod] - HTTP method to use (GET or POST), defaults to GET
     * @param {string} [resourceId] - Resource ID for resource-level methods
     */

  }, {
    key: "callCustomMethod",
    value: function callCustomMethod(methodName, dataOrCallback, callback) {
      var httpMethod = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'GET';
      var resourceId = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
      // Handle overloaded parameters
      var actualCallback;
      var data = {};

      if (typeof dataOrCallback === 'function') {
        actualCallback = dataOrCallback;
      } else {
        data = dataOrCallback || {};
        actualCallback = callback;
      }

      var methodPath = this.customMethods[methodName];

      if (!methodPath) {
        actualCallback({
          result: false,
          messages: {
            error: ["Unknown custom method: ".concat(methodName)]
          }
        });
        return;
      } // Build URL with ID if provided (for resource-level custom methods)


      var url = this.apiUrl;

      if (resourceId) {
        // Resource-level method: /api/v3/resource/{id}:method (RESTful standard)
        url = "".concat(this.apiUrl, "/").concat(resourceId).concat(methodPath);
      } else if (data.id) {
        // Fallback: Resource-level method: /api/v3/resource/{id}:method
        url = "".concat(this.apiUrl, "/").concat(data.id).concat(methodPath); // Remove id from data since it's in the URL

        var requestData = _objectSpread({}, data);

        delete requestData.id;
        data = requestData;
      } else {
        // Collection-level method: /api/v3/resource:method
        url = "".concat(this.apiUrl).concat(methodPath);
      } // Add CSRF token for POST requests


      if (httpMethod === 'POST' && typeof globalCsrfTokenKey !== 'undefined' && typeof globalCsrfToken !== 'undefined') {
        data[globalCsrfTokenKey] = globalCsrfToken;
      } // Check if data contains boolean or complex values


      var hasComplexData = false;

      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          var value = data[key];

          if (typeof value === 'boolean' || _typeof(value) === 'object' || Array.isArray(value)) {
            hasComplexData = true;
            break;
          }
        }
      } // Use JSON for complex data, form encoding for simple data


      var apiSettings = this.getBaseApiSettings(function (response) {
        return actualCallback(response, true);
      }, actualCallback);

      var ajaxSettings = _objectSpread({
        url: url,
        method: httpMethod
      }, apiSettings);

      if (hasComplexData) {
        // Send as JSON to preserve boolean values and complex structures
        ajaxSettings.data = JSON.stringify(data);
        ajaxSettings.contentType = 'application/json';
      } else {
        // Send as regular form data
        ajaxSettings.data = data;
      }

      $.api(ajaxSettings);
    }
    /**
     * Determine if data represents a new record
     * Can be overridden in specific API modules
     * @param {object} data - Data to check
     * @returns {boolean} True if new record
     */

  }, {
    key: "isNewRecord",
    value: function isNewRecord(data) {
      // The only way to determine - _isNew flag
      // If flag is not explicitly set, check ID
      if (data._isNew !== undefined) {
        return data._isNew === true || data._isNew === 'true';
      } // Fallback to ID check only if flag is not set


      return !data.id || data.id === '' || data.id === 'new';
    }
    /**
     * Get record ID from data
     * Can be overridden in specific API modules
     * @param {object} data - Data object
     * @returns {string} Record ID
     */

  }, {
    key: "getRecordId",
    value: function getRecordId(data) {
      // REST API v3 uses only 'id' field
      return data.id;
    }
    /**
     * Check if data contains complex structures that need JSON encoding
     * @param {object} data - Data to check
     * @returns {boolean} True if contains complex data
     */

  }, {
    key: "callGet",
    value:
    /**
     * Perform GET request (backward compatibility method)
     * @param {object} params - Query parameters
     * @param {function} callback - Callback function
     * @param {string} [id] - Optional record ID for resource-specific requests
     */
    function callGet(params, callback, id) {
      var url = this.apiUrl; // For non-singleton resources with ID, append ID to URL

      if (!this.isSingleton && id) {
        url = "".concat(this.apiUrl, "/").concat(id);
      }

      var apiSettings = this.getBaseApiSettings(function (response) {
        return callback(response, true);
      }, callback);
      $.api(_objectSpread({
        url: url,
        method: 'GET',
        data: params || {}
      }, apiSettings));
    }
    /**
     * Perform POST request (backward compatibility method)
     * @param {object} data - Data to send
     * @param {function} callback - Callback function
     * @param {string} [id] - Optional resource ID for resource-specific requests
     */

  }, {
    key: "callPost",
    value: function callPost(data, callback, id) {
      var url = this.apiUrl;

      if (id) {
        url = "".concat(this.apiUrl, "/").concat(id);
      }

      var hasComplexData = PbxApiClient.hasComplexData(data);
      var apiSettings = this.getBaseApiSettings(function (response) {
        return callback(response, true);
      }, callback);

      var ajaxSettings = _objectSpread({
        url: url,
        method: 'POST'
      }, apiSettings);

      if (hasComplexData) {
        ajaxSettings.data = JSON.stringify(data);
        ajaxSettings.contentType = 'application/json';
      } else {
        ajaxSettings.data = data;
      }

      $.api(ajaxSettings);
    }
    /**
     * Perform PUT request (backward compatibility method)
     * @param {object} data - Data to send
     * @param {function} callback - Callback function
     * @param {string} [id] - Optional resource ID for resource-specific requests
     */

  }, {
    key: "callPut",
    value: function callPut(data, callback, id) {
      var url = this.apiUrl;

      if (id) {
        url = "".concat(this.apiUrl, "/").concat(id);
      }

      var hasComplexData = PbxApiClient.hasComplexData(data);
      var apiSettings = this.getBaseApiSettings(function (response) {
        return callback(response, true);
      }, callback);

      var ajaxSettings = _objectSpread({
        url: url,
        method: 'PUT'
      }, apiSettings);

      if (hasComplexData) {
        ajaxSettings.data = JSON.stringify(data);
        ajaxSettings.contentType = 'application/json';
      } else {
        ajaxSettings.data = data;
      }

      $.api(ajaxSettings);
    }
    /**
     * Perform DELETE request (backward compatibility method)
     * @param {function} callback - Callback function
     * @param {string} id - Resource ID to delete
     */

  }, {
    key: "callDelete",
    value: function callDelete(callback, id) {
      var data = {};

      if (typeof globalCsrfTokenKey !== 'undefined' && typeof globalCsrfToken !== 'undefined') {
        data[globalCsrfTokenKey] = globalCsrfToken;
      }

      var apiSettings = this.getBaseApiSettings(function (response) {
        return callback(response, true);
      }, callback);
      $.api(_objectSpread({
        url: "".concat(this.apiUrl, "/").concat(id),
        method: 'DELETE',
        data: data
      }, apiSettings));
    }
    /**
     * Perform PATCH request (backward compatibility method)
     * @param {object} data - Data to send
     * @param {function} callback - Callback function
     */

  }, {
    key: "callPatch",
    value: function callPatch(data, callback) {
      var hasComplexData = PbxApiClient.hasComplexData(data);
      var apiSettings = this.getBaseApiSettings(function (response) {
        return callback(response, true);
      }, callback);

      var ajaxSettings = _objectSpread({
        url: this.apiUrl,
        method: 'PATCH'
      }, apiSettings);

      if (hasComplexData) {
        ajaxSettings.data = JSON.stringify(data);
        ajaxSettings.contentType = 'application/json';
      } else {
        ajaxSettings.data = data;
      }

      $.api(ajaxSettings);
    }
  }], [{
    key: "hasComplexData",
    value: function hasComplexData(data) {
      for (var _i2 = 0, _Object$values = Object.values(data); _i2 < _Object$values.length; _i2++) {
        var value = _Object$values[_i2];

        if (Array.isArray(value) || _typeof(value) === 'object' && value !== null) {
          return true;
        }
      }

      return false;
    }
  }]);

  return PbxApiClient;
}(); // Export for use in other modules


window.PbxApiClient = PbxApiClient;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4LWFwaS1jbGllbnQuanMiXSwibmFtZXMiOlsiUGJ4QXBpQ2xpZW50IiwiY29uZmlnIiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiaXNTaW5nbGV0b24iLCJzaW5nbGV0b24iLCJhcGlVcmwiLCJDb25maWciLCJwYnhVcmwiLCJlbmRwb2ludHMiLCJnZXRMaXN0IiwiT2JqZWN0IiwiZW50cmllcyIsIm1ldGhvZE5hbWUiLCJtZXRob2RQYXRoIiwicmVzcG9uc2UiLCJ4aHIiLCJyZXN1bHQiLCJzdGF0dXMiLCJvbkZhaWx1cmVDYWxsYmFjayIsIm9uRXJyb3JDYWxsYmFjayIsIkpTT04iLCJwYXJzZSIsInJlc3BvbnNlVGV4dCIsImUiLCJzdWNjZXNzQ2FsbGJhY2siLCJmYWlsdXJlQ2FsbGJhY2siLCJzZWxmIiwib24iLCJzdWNjZXNzVGVzdCIsIm9uU3VjY2VzcyIsIm9uRmFpbHVyZSIsIm9uRXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwibWVzc2FnZXMiLCJlcnJvciIsInJlY29yZElkIiwiY2FsbGJhY2siLCJpc05ldyIsInVybCIsImdldERlZmF1bHQiLCJhcGlTZXR0aW5ncyIsImdldEJhc2VBcGlTZXR0aW5ncyIsImRhdGEiLCJfaXNOZXciLCIkIiwiYXBpIiwibWV0aG9kIiwiZGF0YU9yQ2FsbGJhY2siLCJnZXQiLCJhY3R1YWxDYWxsYmFjayIsInBhcmFtcyIsImhhc093blByb3BlcnR5IiwiaXNOZXdSZWNvcmQiLCJjbGVhbkRhdGEiLCJ1bmRlZmluZWQiLCJfbWV0aG9kIiwiZ2V0UmVjb3JkSWQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJnbG9iYWxDc3JmVG9rZW5LZXkiLCJnbG9iYWxDc3JmVG9rZW4iLCJoYXNDb21wbGV4RGF0YSIsImNvbnRlbnRUeXBlIiwic3RyaW5naWZ5IiwiaHR0cE1ldGhvZCIsInJlc291cmNlSWQiLCJpZCIsInJlcXVlc3REYXRhIiwia2V5IiwidmFsdWUi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QkFBTyxJQUFQO0FBQ0g7QUFDSjs7QUFDRCxhQUFPLEtBQVA7QUFDSDs7OztLQXVKTDs7O0FBQ0FLLE1BQU0sQ0FBQzVFLFlBQVAsR0FBc0JBLFlBQXRCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIENvbmZpZywgUGJ4QXBpLCAkICovXG5cbi8qKlxuICogUGJ4QXBpQ2xpZW50IC0gVW5pZmllZCBSRVNUIEFQSSB2MyBjbGllbnQgZm9yIGFsbCBlbnRpdGllc1xuICogXG4gKiBUaGlzIGNsYXNzIHByb3ZpZGVzIGEgc3RhbmRhcmQgaW50ZXJmYWNlIGZvciBhbGwgQ1JVRCBvcGVyYXRpb25zXG4gKiBhbmQgZWxpbWluYXRlcyBjb2RlIGR1cGxpY2F0aW9uIGFjcm9zcyBBUEkgbW9kdWxlcy5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIFN0YW5kYXJkIFJFU1RmdWwgb3BlcmF0aW9ucyAoR0VULCBQT1NULCBQVVQsIERFTEVURSlcbiAqIC0gQ3VzdG9tIG1ldGhvZHMgc3VwcG9ydCB2aWEgY29sb24gbm90YXRpb24gKDpnZXREZWZhdWx0KVxuICogLSBBdXRvbWF0aWMgSFRUUCBtZXRob2Qgc2VsZWN0aW9uIGJhc2VkIG9uIGRhdGFcbiAqIC0gQ1NSRiB0b2tlbiBtYW5hZ2VtZW50XG4gKiAtIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBQYnhEYXRhVGFibGVJbmRleFxuICogXG4gKiBAY2xhc3MgUGJ4QXBpQ2xpZW50IFxuICovXG5jbGFzcyBQYnhBcGlDbGllbnQge1xuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyBBUEkgY2xpZW50IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbmZpZy5lbmRwb2ludCAtIEJhc2UgQVBJIGVuZHBvaW50IChlLmcuLCAnL3BieGNvcmUvYXBpL3YzL2l2ci1tZW51JylcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbmZpZy5jdXN0b21NZXRob2RzXSAtIE1hcCBvZiBjdXN0b20gbWV0aG9kcyAoZS5nLiwge2dldERlZmF1bHQ6ICc6Z2V0RGVmYXVsdCd9KVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5zaW5nbGV0b25dIC0gV2hldGhlciB0aGlzIGlzIGEgc2luZ2xldG9uIHJlc291cmNlIChubyBJRHMgaW4gVVJMcylcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICAgICAgdGhpcy5lbmRwb2ludCA9IGNvbmZpZy5lbmRwb2ludDtcbiAgICAgICAgdGhpcy5jdXN0b21NZXRob2RzID0gY29uZmlnLmN1c3RvbU1ldGhvZHMgfHwge307XG4gICAgICAgIHRoaXMuaXNTaW5nbGV0b24gPSBjb25maWcuc2luZ2xldG9uIHx8IGZhbHNlO1xuXG4gICAgICAgIC8vIEV4dHJhY3QgYmFzZSBVUkwgZm9yIENvbmZpZy5wYnhVcmxcbiAgICAgICAgdGhpcy5hcGlVcmwgPSBgJHtDb25maWcucGJ4VXJsfSR7dGhpcy5lbmRwb2ludH1gO1xuXG4gICAgICAgIC8vIENyZWF0ZSBlbmRwb2ludHMgcHJvcGVydHkgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBQYnhEYXRhVGFibGVJbmRleFxuICAgICAgICB0aGlzLmVuZHBvaW50cyA9IHtcbiAgICAgICAgICAgIGdldExpc3Q6IHRoaXMuYXBpVXJsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWRkIGN1c3RvbSBtZXRob2QgZW5kcG9pbnRzXG4gICAgICAgIGZvciAoY29uc3QgW21ldGhvZE5hbWUsIG1ldGhvZFBhdGhdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMuY3VzdG9tTWV0aG9kcykpIHtcbiAgICAgICAgICAgIHRoaXMuZW5kcG9pbnRzW21ldGhvZE5hbWVdID0gYCR7dGhpcy5hcGlVcmx9JHttZXRob2RQYXRofWA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gc3VjY2VzcyB0ZXN0IGZvciBSRVNUZnVsIEFQSSB3aXRoIHByb3BlciBIVFRQIGNvZGVzXG4gICAgICogVHJlYXRzIGJ1c2luZXNzIGVycm9ycyAoNHh4KSBhcyBmYWlsdXJlcywgbm90IG5ldHdvcmsgZXJyb3JzXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBTZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge1hNTEh0dHBSZXF1ZXN0fSB4aHIgLSBYTUxIdHRwUmVxdWVzdCBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBzdWNjZXNzVGVzdChyZXNwb25zZSwgeGhyKSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgYSB2YWxpZCByZXNwb25zZSBvYmplY3Qgd2l0aCByZXN1bHQgZmllbGQsIHVzZSBpdFxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgdHlwZW9mIHJlc3BvbnNlLnJlc3VsdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5yZXN1bHQgPT09IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGb3IgcmVzcG9uc2VzIHdpdGhvdXQgcmVzdWx0IGZpZWxkLCBjaGVjayBIVFRQIHN0YXR1c1xuICAgICAgICAvLyAyeHggPSBzdWNjZXNzLCA0eHgvNXh4ID0gZmFpbHVyZSAoYnV0IG5vdCBuZXR3b3JrIGVycm9yKVxuICAgICAgICBjb25zdCBzdGF0dXMgPSB4aHIgPyB4aHIuc3RhdHVzIDogMjAwO1xuICAgICAgICByZXR1cm4gc3RhdHVzID49IDIwMCAmJiBzdGF0dXMgPCAzMDA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGVycm9yIGhhbmRsZXIgZm9yIFJFU1RmdWwgQVBJXG4gICAgICogRGlzdGluZ3Vpc2hlcyBiZXR3ZWVuIGJ1c2luZXNzIGVycm9ycyAoNHh4KSBhbmQgcmVhbCBuZXR3b3JrIGVycm9yc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtYTUxIdHRwUmVxdWVzdH0geGhyIC0gWE1MSHR0cFJlcXVlc3Qgb2JqZWN0XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb25GYWlsdXJlQ2FsbGJhY2sgLSBDYWxsYmFjayBmb3IgYnVzaW5lc3MgZXJyb3JzICg0eHgpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb25FcnJvckNhbGxiYWNrIC0gQ2FsbGJhY2sgZm9yIG5ldHdvcmsgZXJyb3JzXG4gICAgICovXG4gICAgaGFuZGxlRXJyb3IoeGhyLCBvbkZhaWx1cmVDYWxsYmFjaywgb25FcnJvckNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IHhoci5zdGF0dXM7XG5cbiAgICAgICAgLy8gQnVzaW5lc3MgZXJyb3JzICg0eHgpIC0gdmFsaWRhdGlvbiwgY29uZmxpY3RzLCBldGMuXG4gICAgICAgIC8vIFRoZXNlIGhhdmUgcmVzcG9uc2UgYm9keSB3aXRoIGVycm9yIGRldGFpbHNcbiAgICAgICAgaWYgKHN0YXR1cyA+PSA0MDAgJiYgc3RhdHVzIDwgNTAwKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICAvLyBDYWxsIG9uRmFpbHVyZSB3aXRoIHBhcnNlZCByZXNwb25zZVxuICAgICAgICAgICAgICAgIG9uRmFpbHVyZUNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBjYW4ndCBwYXJzZSBKU09OLCB0cmVhdCBhcyBuZXR3b3JrIGVycm9yXG4gICAgICAgICAgICAgICAgb25FcnJvckNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2VydmVyIGVycm9ycyAoNXh4KSBvciBuZXR3b3JrIGVycm9ycyAoMClcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvbkVycm9yQ2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBiYXNlIEFQSSBzZXR0aW5ncyB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZ1xuICAgICAqIFRoaXMgc3RhbmRhcmRpemVzIGVycm9yIGhhbmRsaW5nIGFjcm9zcyBhbGwgQVBJIGNhbGxzXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdWNjZXNzQ2FsbGJhY2sgLSBDYWxsZWQgb24gc3VjY2Vzc2Z1bCByZXNwb25zZSAoMnh4ICsgcmVzdWx0PXRydWUpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gZmFpbHVyZUNhbGxiYWNrIC0gQ2FsbGVkIG9uIGJ1c2luZXNzIGVycm9ycyAoNHh4IG9yIHJlc3VsdD1mYWxzZSlcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIEFQSSBzZXR0aW5ncyBvYmplY3QgZm9yICQuYXBpKClcbiAgICAgKi9cbiAgICBnZXRCYXNlQXBpU2V0dGluZ3Moc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdChyZXNwb25zZSwgeGhyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuc3VjY2Vzc1Rlc3QocmVzcG9uc2UsIHhocik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgc3VjY2Vzc0NhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgLy8gT25seSBoYW5kbGUgcmVhbCBuZXR3b3JrIGVycm9ycyAoNXh4LCB0aW1lb3V0LCBjb25uZWN0aW9uIHJlZnVzZWQpXG4gICAgICAgICAgICAgICAgLy8gRm9yIDR4eCBlcnJvcnMsIFNlbWFudGljIFVJIGFscmVhZHkgY2FsbGVkIG9uRmFpbHVyZSwgc28gc2tpcFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IHhociA/IHhoci5zdGF0dXMgOiAwO1xuXG4gICAgICAgICAgICAgICAgLy8gU2tpcCBpZiB0aGlzIGlzIGEgYnVzaW5lc3MgZXJyb3IgKDR4eCkgLSBhbHJlYWR5IGhhbmRsZWQgYnkgb25GYWlsdXJlXG4gICAgICAgICAgICAgICAgaWYgKHN0YXR1cyA+PSA0MDAgJiYgc3RhdHVzIDwgNTAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBSZWFsIG5ldHdvcmsvc2VydmVyIGVycm9yIC0gc2hvdyBnZW5lcmljIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXX1cbiAgICAgICAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgYnkgSUQgb3IgZ2V0IGRlZmF1bHQgdmFsdWVzIGZvciBuZXcgcmVjb3JkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gUmVjb3JkIElEIG9yIGVtcHR5L251bGwgZm9yIG5ldyByZWNvcmRcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0UmVjb3JkKHJlY29yZElkLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBDaGVjayBpZiB3ZSBzaG91bGQgdXNlIGEgY3VzdG9tIG1ldGhvZCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgY29uc3QgaXNOZXcgPSAhcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnIHx8IHJlY29yZElkID09PSAnbmV3JztcbiAgICAgICAgbGV0IHVybDtcblxuICAgICAgICBpZiAoaXNOZXcgJiYgdGhpcy5jdXN0b21NZXRob2RzLmdldERlZmF1bHQpIHtcbiAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gbWV0aG9kIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9JHt0aGlzLmN1c3RvbU1ldGhvZHMuZ2V0RGVmYXVsdH1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gR2V0IGV4aXN0aW5nIHJlY29yZCBieSBJRFxuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7cmVjb3JkSWR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgX2lzTmV3IGZsYWcgZm9yIG5ldyByZWNvcmRzIHRvIGluZGljYXRlIFBPU1Qgc2hvdWxkIGJlIHVzZWRcbiAgICAgICAgICAgICAgICBpZiAoaXNOZXcgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgbGlzdCBvZiByZWNvcmRzIChvciBzaW5nbGUgcmVjb3JkIGZvciBzaW5nbGV0b24pXG4gICAgICogQHBhcmFtIHtvYmplY3R8ZnVuY3Rpb259IGRhdGFPckNhbGxiYWNrIC0gT3B0aW9uYWwgcGFyYW1zIG9yIGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIENhbGxiYWNrIGlmIGZpcnN0IHBhcmFtIGlzIGRhdGFcbiAgICAgKi9cbiAgICBnZXRMaXN0KGRhdGFPckNhbGxiYWNrLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBGb3Igc2luZ2xldG9uIHJlc291cmNlcywgcmVkaXJlY3QgdG8gZ2V0KCkgbWV0aG9kXG4gICAgICAgIGlmICh0aGlzLmlzU2luZ2xldG9uKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuZ2V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KGRhdGFPckNhbGxiYWNrLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgb3ZlcmxvYWRlZCBwYXJhbWV0ZXJzXG4gICAgICAgIGxldCBhY3R1YWxDYWxsYmFjaztcbiAgICAgICAgbGV0IHBhcmFtcyA9IHt9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgZGF0YU9yQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gZGF0YU9yQ2FsbGJhY2s7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYXJhbXMgPSBkYXRhT3JDYWxsYmFjayB8fCB7fTtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBhY3R1YWxDYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2UgcmV0dXJuIGEgc3RydWN0dXJlIHdpdGggcmVzdWx0IGFuZCBkYXRhIGZpZWxkc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiAhcmVzcG9uc2UuaGFzT3duUHJvcGVydHkoJ2RhdGEnKSkge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmFwaVVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2F2ZSByZWNvcmQgKGNyZWF0ZSBvciB1cGRhdGUpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNhdmVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgc2F2ZVJlY29yZChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmRcbiAgICAgICAgY29uc3QgaXNOZXcgPSB0aGlzLmlzTmV3UmVjb3JkKGRhdGEpO1xuXG4gICAgICAgIC8vIENsZWFuIHVwIGludGVybmFsIGZsYWdzXG4gICAgICAgIGNvbnN0IGNsZWFuRGF0YSA9IHsuLi5kYXRhfTtcbiAgICAgICAgaWYgKGNsZWFuRGF0YS5faXNOZXcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVsZXRlIGNsZWFuRGF0YS5faXNOZXc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVtb3ZlIF9tZXRob2QgYXMgaXQncyBoYW5kbGVkIGJ5IHRoZSBhY3R1YWwgSFRUUCBtZXRob2RcbiAgICAgICAgaWYgKGNsZWFuRGF0YS5fbWV0aG9kICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBjbGVhbkRhdGEuX21ldGhvZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCB0aGUgcmVjb3JkIElEIGZvciB1cGRhdGVzXG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gdGhpcy5nZXRSZWNvcmRJZChjbGVhbkRhdGEpO1xuXG4gICAgICAgIC8vIHYzIEFQSTogUE9TVCBmb3IgbmV3IHJlY29yZHMsIFBVVCBmb3IgdXBkYXRlc1xuICAgICAgICBjb25zdCBtZXRob2QgPSBpc05ldyA/ICdQT1NUJyA6ICdQVVQnO1xuICAgICAgICBjb25zdCB1cmwgPSBpc05ldyA/IHRoaXMuYXBpVXJsIDogYCR7dGhpcy5hcGlVcmx9LyR7cmVjb3JkSWR9YDtcblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICAgICAgZGF0YTogY2xlYW5EYXRhLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgYmVmb3JlU2VuZChzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBDU1JGIHRva2VuIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuS2V5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBjbGVhbkRhdGFbZ2xvYmFsQ3NyZlRva2VuS2V5XSA9IGdsb2JhbENzcmZUb2tlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UgbmVlZCB0byBzZW5kIGFzIEpTT04gKGZvciBjb21wbGV4IHN0cnVjdHVyZXMpXG4gICAgICAgICAgICAgICAgaWYgKFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShjbGVhbkRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoY2xlYW5EYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXX1cbiAgICAgICAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSByZWNvcmRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBSZWNvcmQgSUQgdG8gZGVsZXRlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGRlbGV0ZVJlY29yZChyZWNvcmRJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIENTUkYgdG9rZW4gaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuS2V5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZGF0YVtnbG9iYWxDc3JmVG9rZW5LZXldID0gZ2xvYmFsQ3NyZlRva2VuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9LyR7cmVjb3JkSWR9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbCBhIGN1c3RvbSBtZXRob2RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kTmFtZSAtIE1ldGhvZCBuYW1lXG4gICAgICogQHBhcmFtIHtvYmplY3R8ZnVuY3Rpb259IGRhdGFPckNhbGxiYWNrIC0gRGF0YSBvciBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gLSBDYWxsYmFjayBpZiBmaXJzdCBwYXJhbSBpcyBkYXRhXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtodHRwTWV0aG9kXSAtIEhUVFAgbWV0aG9kIHRvIHVzZSAoR0VUIG9yIFBPU1QpLCBkZWZhdWx0cyB0byBHRVRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3Jlc291cmNlSWRdIC0gUmVzb3VyY2UgSUQgZm9yIHJlc291cmNlLWxldmVsIG1ldGhvZHNcbiAgICAgKi9cbiAgICBjYWxsQ3VzdG9tTWV0aG9kKG1ldGhvZE5hbWUsIGRhdGFPckNhbGxiYWNrLCBjYWxsYmFjaywgaHR0cE1ldGhvZCA9ICdHRVQnLCByZXNvdXJjZUlkID0gbnVsbCkge1xuICAgICAgICAvLyBIYW5kbGUgb3ZlcmxvYWRlZCBwYXJhbWV0ZXJzXG4gICAgICAgIGxldCBhY3R1YWxDYWxsYmFjaztcbiAgICAgICAgbGV0IGRhdGEgPSB7fTtcblxuICAgICAgICBpZiAodHlwZW9mIGRhdGFPckNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9IGRhdGFPckNhbGxiYWNrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGF0YSA9IGRhdGFPckNhbGxiYWNrIHx8IHt9O1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1ldGhvZFBhdGggPSB0aGlzLmN1c3RvbU1ldGhvZHNbbWV0aG9kTmFtZV07XG4gICAgICAgIGlmICghbWV0aG9kUGF0aCkge1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZXM6IHtlcnJvcjogW2BVbmtub3duIGN1c3RvbSBtZXRob2Q6ICR7bWV0aG9kTmFtZX1gXX1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBVUkwgd2l0aCBJRCBpZiBwcm92aWRlZCAoZm9yIHJlc291cmNlLWxldmVsIGN1c3RvbSBtZXRob2RzKVxuICAgICAgICBsZXQgdXJsID0gdGhpcy5hcGlVcmw7XG4gICAgICAgIGlmIChyZXNvdXJjZUlkKSB7XG4gICAgICAgICAgICAvLyBSZXNvdXJjZS1sZXZlbCBtZXRob2Q6IC9hcGkvdjMvcmVzb3VyY2Uve2lkfTptZXRob2QgKFJFU1RmdWwgc3RhbmRhcmQpXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtyZXNvdXJjZUlkfSR7bWV0aG9kUGF0aH1gO1xuICAgICAgICB9IGVsc2UgaWYgKGRhdGEuaWQpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBSZXNvdXJjZS1sZXZlbCBtZXRob2Q6IC9hcGkvdjMvcmVzb3VyY2Uve2lkfTptZXRob2RcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke2RhdGEuaWR9JHttZXRob2RQYXRofWA7XG4gICAgICAgICAgICAvLyBSZW1vdmUgaWQgZnJvbSBkYXRhIHNpbmNlIGl0J3MgaW4gdGhlIFVSTFxuICAgICAgICAgICAgY29uc3QgcmVxdWVzdERhdGEgPSB7Li4uZGF0YX07XG4gICAgICAgICAgICBkZWxldGUgcmVxdWVzdERhdGEuaWQ7XG4gICAgICAgICAgICBkYXRhID0gcmVxdWVzdERhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDb2xsZWN0aW9uLWxldmVsIG1ldGhvZDogL2FwaS92My9yZXNvdXJjZTptZXRob2RcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfSR7bWV0aG9kUGF0aH1gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgQ1NSRiB0b2tlbiBmb3IgUE9TVCByZXF1ZXN0c1xuICAgICAgICBpZiAoaHR0cE1ldGhvZCA9PT0gJ1BPU1QnICYmIHR5cGVvZiBnbG9iYWxDc3JmVG9rZW5LZXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBnbG9iYWxDc3JmVG9rZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBkYXRhW2dsb2JhbENzcmZUb2tlbktleV0gPSBnbG9iYWxDc3JmVG9rZW47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBkYXRhIGNvbnRhaW5zIGJvb2xlYW4gb3IgY29tcGxleCB2YWx1ZXNcbiAgICAgICAgbGV0IGhhc0NvbXBsZXhEYXRhID0gZmFsc2U7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGFba2V5XTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicgfHwgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyB8fCBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBoYXNDb21wbGV4RGF0YSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSBKU09OIGZvciBjb21wbGV4IGRhdGEsIGZvcm0gZW5jb2RpbmcgZm9yIHNpbXBsZSBkYXRhXG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IGFjdHVhbENhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKSxcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgYWpheFNldHRpbmdzID0ge1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IGh0dHBNZXRob2QsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNDb21wbGV4RGF0YSkge1xuICAgICAgICAgICAgLy8gU2VuZCBhcyBKU09OIHRvIHByZXNlcnZlIGJvb2xlYW4gdmFsdWVzIGFuZCBjb21wbGV4IHN0cnVjdHVyZXNcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTZW5kIGFzIHJlZ3VsYXIgZm9ybSBkYXRhXG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaShhamF4U2V0dGluZ3MpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXRlcm1pbmUgaWYgZGF0YSByZXByZXNlbnRzIGEgbmV3IHJlY29yZFxuICAgICAqIENhbiBiZSBvdmVycmlkZGVuIGluIHNwZWNpZmljIEFQSSBtb2R1bGVzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIGNoZWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgbmV3IHJlY29yZFxuICAgICAqL1xuICAgIGlzTmV3UmVjb3JkKGRhdGEpIHtcbiAgICAgICAgLy8gVGhlIG9ubHkgd2F5IHRvIGRldGVybWluZSAtIF9pc05ldyBmbGFnXG4gICAgICAgIC8vIElmIGZsYWcgaXMgbm90IGV4cGxpY2l0bHkgc2V0LCBjaGVjayBJRFxuICAgICAgICBpZiAoZGF0YS5faXNOZXcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEuX2lzTmV3ID09PSB0cnVlIHx8IGRhdGEuX2lzTmV3ID09PSAndHJ1ZSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGYWxsYmFjayB0byBJRCBjaGVjayBvbmx5IGlmIGZsYWcgaXMgbm90IHNldFxuICAgICAgICByZXR1cm4gIWRhdGEuaWQgfHwgZGF0YS5pZCA9PT0gJycgfHwgZGF0YS5pZCA9PT0gJ25ldyc7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBkYXRhXG4gICAgICogQ2FuIGJlIG92ZXJyaWRkZW4gaW4gc3BlY2lmaWMgQVBJIG1vZHVsZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmVjb3JkIElEXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoZGF0YSkge1xuICAgICAgICAvLyBSRVNUIEFQSSB2MyB1c2VzIG9ubHkgJ2lkJyBmaWVsZFxuICAgICAgICByZXR1cm4gZGF0YS5pZDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgZGF0YSBjb250YWlucyBjb21wbGV4IHN0cnVjdHVyZXMgdGhhdCBuZWVkIEpTT04gZW5jb2RpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gY2hlY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBjb250YWlucyBjb21wbGV4IGRhdGFcbiAgICAgKi9cbiAgICBzdGF0aWMgaGFzQ29tcGxleERhdGEoZGF0YSkge1xuICAgICAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIE9iamVjdC52YWx1ZXMoZGF0YSkpIHtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSB8fCAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBHRVQgcmVxdWVzdCAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFF1ZXJ5IHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtpZF0gLSBPcHRpb25hbCByZWNvcmQgSUQgZm9yIHJlc291cmNlLXNwZWNpZmljIHJlcXVlc3RzXG4gICAgICovXG4gICAgY2FsbEdldChwYXJhbXMsIGNhbGxiYWNrLCBpZCkge1xuICAgICAgICBsZXQgdXJsID0gdGhpcy5hcGlVcmw7XG5cbiAgICAgICAgLy8gRm9yIG5vbi1zaW5nbGV0b24gcmVzb3VyY2VzIHdpdGggSUQsIGFwcGVuZCBJRCB0byBVUkxcbiAgICAgICAgaWYgKCF0aGlzLmlzU2luZ2xldG9uICYmIGlkKSB7XG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtpZH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gY2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMgfHwge30sXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIFBPU1QgcmVxdWVzdCAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNlbmRcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtpZF0gLSBPcHRpb25hbCByZXNvdXJjZSBJRCBmb3IgcmVzb3VyY2Utc3BlY2lmaWMgcmVxdWVzdHNcbiAgICAgKi9cbiAgICBjYWxsUG9zdChkYXRhLCBjYWxsYmFjaywgaWQpIHtcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke2lkfWA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYXNDb21wbGV4RGF0YSA9IFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShkYXRhKTtcbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gY2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzQ29tcGxleERhdGEpIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaShhamF4U2V0dGluZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gUFVUIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzZW5kXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaWRdIC0gT3B0aW9uYWwgcmVzb3VyY2UgSUQgZm9yIHJlc291cmNlLXNwZWNpZmljIHJlcXVlc3RzXG4gICAgICovXG4gICAgY2FsbFB1dChkYXRhLCBjYWxsYmFjaywgaWQpIHtcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke2lkfWA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYXNDb21wbGV4RGF0YSA9IFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShkYXRhKTtcbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gY2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNDb21wbGV4RGF0YSkge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5jb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKGFqYXhTZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBERUxFVEUgcmVxdWVzdCAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlc291cmNlIElEIHRvIGRlbGV0ZVxuICAgICAqL1xuICAgIGNhbGxEZWxldGUoY2FsbGJhY2ssIGlkKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB7fTtcblxuICAgICAgICBpZiAodHlwZW9mIGdsb2JhbENzcmZUb2tlbktleSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGdsb2JhbENzcmZUb2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGRhdGFbZ2xvYmFsQ3NyZlRva2VuS2V5XSA9IGdsb2JhbENzcmZUb2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKSxcbiAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmFwaVVybH0vJHtpZH1gLFxuICAgICAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIFBBVENIIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzZW5kXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGNhbGxQYXRjaChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBoYXNDb21wbGV4RGF0YSA9IFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShkYXRhKTtcbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gY2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHRoaXMuYXBpVXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzQ29tcGxleERhdGEpIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaShhamF4U2V0dGluZ3MpO1xuICAgIH1cbn1cblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93LlBieEFwaUNsaWVudCA9IFBieEFwaUNsaWVudDsiXX0=