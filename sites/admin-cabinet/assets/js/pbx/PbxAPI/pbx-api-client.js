"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

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
 * - Global authorization error handling (401/403)
 *
 * @class PbxApiClient
 */
var PbxApiClient = /*#__PURE__*/function () {
  /**
   * Flag to prevent multiple redirects on auth errors
   * @type {boolean}
   * @static
   */

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
   * Handle authorization errors (401) by redirecting to login
   * Note: 403 Forbidden is NOT handled here as it may indicate access denied to a specific resource,
   * not session expiration. Session loss is indicated by 401 Unauthorized only.
   * @param {number} status - HTTP status code
   * @static
   */


  _createClass(PbxApiClient, [{
    key: "successTest",
    value:
    /**
     * Custom success test for RESTful API with proper HTTP codes
     * Treats business errors (4xx) as failures, not network errors
     *
     * @param {object} response - Server response
     * @param {XMLHttpRequest} xhr - XMLHttpRequest object
     * @returns {boolean} - True if request was successful
     */
    function successTest(response, xhr) {
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
        onFailure: function onFailure(response, xhr) {
          // Check for authorization errors and redirect to login if needed
          var status = xhr ? xhr.status : 0;

          if (PbxApiClient.handleAuthError(status)) {
            return; // Don't call callback if redirecting
          }

          failureCallback(response, false);
        },
        onError: function onError(errorMessage, element, xhr) {
          // Only handle real network errors (5xx, timeout, connection refused)
          // For 4xx errors, Semantic UI already called onFailure, so skip
          var status = xhr ? xhr.status : 0; // Check for authorization errors and redirect to login if needed

          if (PbxApiClient.handleAuthError(status)) {
            return; // Don't call callback if redirecting
          } // Skip if this is a business error (4xx) - already handled by onFailure


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
      } // Ensure callback is a function


      if (typeof actualCallback !== 'function') {
        actualCallback = function actualCallback() {};
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
          // Check if we need to send as JSON (for complex structures)
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
      var apiSettings = this.getBaseApiSettings(function (response) {
        return callback(response, true);
      }, callback);
      $.api(_objectSpread({
        url: "".concat(this.apiUrl, "/").concat(recordId),
        method: 'DELETE'
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
      } // Ensure callback is a function (use noop if not provided)


      if (typeof actualCallback !== 'function') {
        actualCallback = function actualCallback() {}; // Empty callback for fire-and-forget calls

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
      } // Extract async channel ID if present (used for long-running operations)


      var asyncChannelId = data.asyncChannelId || data.channelId; // Build URL with ID if provided (for resource-level custom methods)

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
      } // Use JSON for complex data, form encoding for simple data


      var apiSettings = this.getBaseApiSettings(function (response) {
        return actualCallback(response, true);
      }, actualCallback);

      var ajaxSettings = _objectSpread({
        url: url,
        method: httpMethod
      }, apiSettings); // Add async channel header if provided


      if (asyncChannelId) {
        ajaxSettings.beforeXHR = function (xhr) {
          xhr.setRequestHeader('X-Async-Response-Channel-Id', asyncChannelId);
          return xhr;
        };
      } // For GET requests, always use query parameters (no JSON in body)
      // For POST/PUT/DELETE, use JSON for complex data (objects, arrays)


      if (httpMethod === 'GET') {
        // GET requests: send as query parameters
        ajaxSettings.data = data;
      } else {
        // POST/PUT/DELETE: check if we need JSON encoding
        var hasComplexData = PbxApiClient.hasComplexData(data);

        if (hasComplexData) {
          // Send as JSON to preserve complex structures
          ajaxSettings.data = JSON.stringify(data);
          ajaxSettings.contentType = 'application/json';
        } else {
          // Send as regular form data
          ajaxSettings.data = data;
        }
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
      var apiSettings = this.getBaseApiSettings(function (response) {
        return callback(response, true);
      }, callback);
      $.api(_objectSpread({
        url: "".concat(this.apiUrl, "/").concat(id),
        method: 'DELETE'
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
    key: "handleAuthError",
    value: function handleAuthError(status) {
      // Only handle 401 Unauthorized - this indicates session loss
      // 403 Forbidden means access denied to a resource (user lacks permissions)
      if (status === 401) {
        // Prevent multiple redirects
        if (!PbxApiClient.isRedirectingToLogin) {
          PbxApiClient.isRedirectingToLogin = true; // Redirect to login page after a short delay to allow any pending operations to complete

          setTimeout(function () {
            window.location.href = "".concat(globalRootUrl, "session/index");
          }, 100);
        }

        return true;
      }

      return false;
    }
  }, {
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


_defineProperty(PbxApiClient, "isRedirectingToLogin", false);

window.PbxApiClient = PbxApiClient;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4LWFwaS1jbGllbnQuanMiXSwibmFtZXMiOlsiUGJ4QXBpQ2xpZW50IiwiY29uZmlnIiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiaXNTaW5nbGV0b24iLCJzaW5nbGV0b24iLCJhcGlVcmwiLCJDb25maWciLCJwYnhVcmwiLCJlbmRwb2ludHMiLCJnZXRMaXN0IiwiT2JqZWN0IiwiZW50cmllcyIsIm1ldGhvZE5hbWUiLCJtZXRob2RQYXRoIiwicmVzcG9uc2UiLCJ4aHIiLCJyZXN1bHQiLCJzdGF0dXMiLCJvbkZhaWx1cmVDYWxsYmFjayIsIm9uRXJyb3JDYWxsYmFjayIsIkpTT04iLCJwYXJzZSIsInJlc3BvbnNlVGV4dCIsImUiLCJzdWNjZXNzQ2FsbGJhY2siLCJmYWlsdXJlQ2FsbGJhY2siLCJzZWxmIiwib24iLCJzdWNjZXNzVGVzdCIsIm9uU3VjY2VzcyIsIm9uRmFpbHVyZSIsImhhbmRsZUF1dGhFcnJvciIsIm9uRXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwibWVzc2FnZXMiLCJlcnJvciIsInJlY29yZElkIiwiY2FsbGJhY2siLCJpc05ldyIsInVybCIsImdldERlZmF1bHQiLCJhcGlTZXR0aW5ncyIsImdldEJhc2VBcGlTZXR0aW5ncyIsImRhdGEiLCJfaXNOZXciLCIkIiwiYXBpIiwibWV0aG9kIiwiZGF0YU9yQ2FsbGJhY2siLCJnZXQiLCJhY3R1YWxDYWxsYmFjayIsInBhcmFtcyIsImhhc093blByb3BlcnR5IiwiaXNOZXdSZWNvcmQiLCJjbGVhbkRhdGEiLCJ1bmRlZmluZWQiLCJfbWV0aG9kIiwiZ2V0UmVjb3JkSWQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJoYXNDb21wbGV4RGF0YSIsImNvbnRlbnRUeXBlIiwic3RyaW5naWZ5IiwiaHR0cE1ldGhvZCIsInJlc291cmNlSWQiLCJhc3luY0NoYW5uZWxJZCIsImNoYW5uZWxJZCIsImlkIiwicmVxdWVzdERhdGEiLCJhamF4U2V0dGluZ3MiLCJiZWZvcmVYSFIiLCJzZXRSZXF1ZXN0SGVhZGVyIiwiaXNSZWRpcmVjdGluZ1RvTG9naW4iLCJzZXRUaW1lb3V0Iiwid2luZG93IiwibG9jYXRpb24iLCJocmVmIiwiZ2xvYmFsUm9vdFVybCIsInZhbHVlcyIsInZhbHVlIiwiQXJyYXkiLCJpc0FycmF5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxZO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7QUFHSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJLHdCQUFZQyxNQUFaLEVBQW9CO0FBQUE7O0FBQ2hCLFNBQUtDLFFBQUwsR0FBZ0JELE1BQU0sQ0FBQ0MsUUFBdkI7QUFDQSxTQUFLQyxhQUFMLEdBQXFCRixNQUFNLENBQUNFLGFBQVAsSUFBd0IsRUFBN0M7QUFDQSxTQUFLQyxXQUFMLEdBQW1CSCxNQUFNLENBQUNJLFNBQVAsSUFBb0IsS0FBdkMsQ0FIZ0IsQ0FLaEI7O0FBQ0EsU0FBS0MsTUFBTCxhQUFpQkMsTUFBTSxDQUFDQyxNQUF4QixTQUFpQyxLQUFLTixRQUF0QyxFQU5nQixDQVFoQjs7QUFDQSxTQUFLTyxTQUFMLEdBQWlCO0FBQ2JDLE1BQUFBLE9BQU8sRUFBRSxLQUFLSjtBQURELEtBQWpCLENBVGdCLENBYWhCOztBQUNBLHVDQUF1Q0ssTUFBTSxDQUFDQyxPQUFQLENBQWUsS0FBS1QsYUFBcEIsQ0FBdkMscUNBQTJFO0FBQXRFO0FBQUEsVUFBT1UsVUFBUDtBQUFBLFVBQW1CQyxVQUFuQjs7QUFDRCxXQUFLTCxTQUFMLENBQWVJLFVBQWYsY0FBZ0Ms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b0JBQWIsR0FBb0MsSUFBcEMsQ0FEb0MsQ0FHcEM7O0FBQ0FDLFVBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2JDLFlBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsSUFBaEIsYUFBMEJDLGFBQTFCO0FBQ0gsV0FGUyxFQUVQLEdBRk8sQ0FBVjtBQUdIOztBQUNELGVBQU8sSUFBUDtBQUNIOztBQUNELGFBQU8sS0FBUDtBQUNIOzs7V0FrWUQsd0JBQXNCbEMsSUFBdEIsRUFBNEI7QUFDeEIseUNBQW9CbEMsTUFBTSxDQUFDcUUsTUFBUCxDQUFjbkMsSUFBZCxDQUFwQixzQ0FBeUM7QUFBcEMsWUFBTW9DLEtBQUssc0JBQVg7O0FBQ0QsWUFBSUMsS0FBSyxDQUFDQyxPQUFOLENBQWNGLEtBQWQsS0FBeUIsUUFBT0EsS0FBUCxNQUFpQixRQUFqQixJQUE2QkEsS0FBSyxLQUFLLElBQXBFLEVBQTJFO0FBQ3ZFLGlCQUFPLElBQVA7QUFDSDtBQUNKOztBQUNELGFBQU8sS0FBUDtBQUNIOzs7O0tBZ0pMOzs7Z0JBbGxCTWpGLFksMEJBTTRCLEs7O0FBNmtCbEM0RSxNQUFNLENBQUM1RSxZQUFQLEdBQXNCQSxZQUF0QiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBDb25maWcsIFBieEFwaSwgJCAqL1xuXG4vKipcbiAqIFBieEFwaUNsaWVudCAtIFVuaWZpZWQgUkVTVCBBUEkgdjMgY2xpZW50IGZvciBhbGwgZW50aXRpZXNcbiAqXG4gKiBUaGlzIGNsYXNzIHByb3ZpZGVzIGEgc3RhbmRhcmQgaW50ZXJmYWNlIGZvciBhbGwgQ1JVRCBvcGVyYXRpb25zXG4gKiBhbmQgZWxpbWluYXRlcyBjb2RlIGR1cGxpY2F0aW9uIGFjcm9zcyBBUEkgbW9kdWxlcy5cbiAqXG4gKiBGZWF0dXJlczpcbiAqIC0gU3RhbmRhcmQgUkVTVGZ1bCBvcGVyYXRpb25zIChHRVQsIFBPU1QsIFBVVCwgREVMRVRFKVxuICogLSBDdXN0b20gbWV0aG9kcyBzdXBwb3J0IHZpYSBjb2xvbiBub3RhdGlvbiAoOmdldERlZmF1bHQpXG4gKiAtIEF1dG9tYXRpYyBIVFRQIG1ldGhvZCBzZWxlY3Rpb24gYmFzZWQgb24gZGF0YVxuICogLSBDU1JGIHRva2VuIG1hbmFnZW1lbnRcbiAqIC0gQmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aXRoIFBieERhdGFUYWJsZUluZGV4XG4gKiAtIEdsb2JhbCBhdXRob3JpemF0aW9uIGVycm9yIGhhbmRsaW5nICg0MDEvNDAzKVxuICpcbiAqIEBjbGFzcyBQYnhBcGlDbGllbnRcbiAqL1xuY2xhc3MgUGJ4QXBpQ2xpZW50IHtcbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHByZXZlbnQgbXVsdGlwbGUgcmVkaXJlY3RzIG9uIGF1dGggZXJyb3JzXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuICAgIHN0YXRpYyBpc1JlZGlyZWN0aW5nVG9Mb2dpbiA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgbmV3IEFQSSBjbGllbnQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLmVuZHBvaW50IC0gQmFzZSBBUEkgZW5kcG9pbnQgKGUuZy4sICcvcGJ4Y29yZS9hcGkvdjMvaXZyLW1lbnUnKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbY29uZmlnLmN1c3RvbU1ldGhvZHNdIC0gTWFwIG9mIGN1c3RvbSBtZXRob2RzIChlLmcuLCB7Z2V0RGVmYXVsdDogJzpnZXREZWZhdWx0J30pXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNpbmdsZXRvbl0gLSBXaGV0aGVyIHRoaXMgaXMgYSBzaW5nbGV0b24gcmVzb3VyY2UgKG5vIElEcyBpbiBVUkxzKVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbmZpZykge1xuICAgICAgICB0aGlzLmVuZHBvaW50ID0gY29uZmlnLmVuZHBvaW50O1xuICAgICAgICB0aGlzLmN1c3RvbU1ldGhvZHMgPSBjb25maWcuY3VzdG9tTWV0aG9kcyB8fCB7fTtcbiAgICAgICAgdGhpcy5pc1NpbmdsZXRvbiA9IGNvbmZpZy5zaW5nbGV0b24gfHwgZmFsc2U7XG5cbiAgICAgICAgLy8gRXh0cmFjdCBiYXNlIFVSTCBmb3IgQ29uZmlnLnBieFVybFxuICAgICAgICB0aGlzLmFwaVVybCA9IGAke0NvbmZpZy5wYnhVcmx9JHt0aGlzLmVuZHBvaW50fWA7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGVuZHBvaW50cyBwcm9wZXJ0eSBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aXRoIFBieERhdGFUYWJsZUluZGV4XG4gICAgICAgIHRoaXMuZW5kcG9pbnRzID0ge1xuICAgICAgICAgICAgZ2V0TGlzdDogdGhpcy5hcGlVcmxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgY3VzdG9tIG1ldGhvZCBlbmRwb2ludHNcbiAgICAgICAgZm9yIChjb25zdCBbbWV0aG9kTmFtZSwgbWV0aG9kUGF0aF0gb2YgT2JqZWN0LmVudHJpZXModGhpcy5jdXN0b21NZXRob2RzKSkge1xuICAgICAgICAgICAgdGhpcy5lbmRwb2ludHNbbWV0aG9kTmFtZV0gPSBgJHt0aGlzLmFwaVVybH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBhdXRob3JpemF0aW9uIGVycm9ycyAoNDAxKSBieSByZWRpcmVjdGluZyB0byBsb2dpblxuICAgICAqIE5vdGU6IDQwMyBGb3JiaWRkZW4gaXMgTk9UIGhhbmRsZWQgaGVyZSBhcyBpdCBtYXkgaW5kaWNhdGUgYWNjZXNzIGRlbmllZCB0byBhIHNwZWNpZmljIHJlc291cmNlLFxuICAgICAqIG5vdCBzZXNzaW9uIGV4cGlyYXRpb24uIFNlc3Npb24gbG9zcyBpcyBpbmRpY2F0ZWQgYnkgNDAxIFVuYXV0aG9yaXplZCBvbmx5LlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGF0dXMgLSBIVFRQIHN0YXR1cyBjb2RlXG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuICAgIHN0YXRpYyBoYW5kbGVBdXRoRXJyb3Ioc3RhdHVzKSB7XG4gICAgICAgIC8vIE9ubHkgaGFuZGxlIDQwMSBVbmF1dGhvcml6ZWQgLSB0aGlzIGluZGljYXRlcyBzZXNzaW9uIGxvc3NcbiAgICAgICAgLy8gNDAzIEZvcmJpZGRlbiBtZWFucyBhY2Nlc3MgZGVuaWVkIHRvIGEgcmVzb3VyY2UgKHVzZXIgbGFja3MgcGVybWlzc2lvbnMpXG4gICAgICAgIGlmIChzdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgLy8gUHJldmVudCBtdWx0aXBsZSByZWRpcmVjdHNcbiAgICAgICAgICAgIGlmICghUGJ4QXBpQ2xpZW50LmlzUmVkaXJlY3RpbmdUb0xvZ2luKSB7XG4gICAgICAgICAgICAgICAgUGJ4QXBpQ2xpZW50LmlzUmVkaXJlY3RpbmdUb0xvZ2luID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIC8vIFJlZGlyZWN0IHRvIGxvZ2luIHBhZ2UgYWZ0ZXIgYSBzaG9ydCBkZWxheSB0byBhbGxvdyBhbnkgcGVuZGluZyBvcGVyYXRpb25zIHRvIGNvbXBsZXRlXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBzdWNjZXNzIHRlc3QgZm9yIFJFU1RmdWwgQVBJIHdpdGggcHJvcGVyIEhUVFAgY29kZXNcbiAgICAgKiBUcmVhdHMgYnVzaW5lc3MgZXJyb3JzICg0eHgpIGFzIGZhaWx1cmVzLCBub3QgbmV0d29yayBlcnJvcnNcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFNlcnZlciByZXNwb25zZVxuICAgICAqIEBwYXJhbSB7WE1MSHR0cFJlcXVlc3R9IHhociAtIFhNTEh0dHBSZXF1ZXN0IG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgcmVxdWVzdCB3YXMgc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIHN1Y2Nlc3NUZXN0KHJlc3BvbnNlLCB4aHIpIHtcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIHZhbGlkIHJlc3BvbnNlIG9iamVjdCB3aXRoIHJlc3VsdCBmaWVsZCwgdXNlIGl0XG4gICAgICAgIGlmIChyZXNwb25zZSAmJiB0eXBlb2YgcmVzcG9uc2UucmVzdWx0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZvciByZXNwb25zZXMgd2l0aG91dCByZXN1bHQgZmllbGQsIGNoZWNrIEhUVFAgc3RhdHVzXG4gICAgICAgIC8vIDJ4eCA9IHN1Y2Nlc3MsIDR4eC81eHggPSBmYWlsdXJlIChidXQgbm90IG5ldHdvcmsgZXJyb3IpXG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IHhociA/IHhoci5zdGF0dXMgOiAyMDA7XG4gICAgICAgIHJldHVybiBzdGF0dXMgPj0gMjAwICYmIHN0YXR1cyA8IDMwMDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gZXJyb3IgaGFuZGxlciBmb3IgUkVTVGZ1bCBBUElcbiAgICAgKiBEaXN0aW5ndWlzaGVzIGJldHdlZW4gYnVzaW5lc3MgZXJyb3JzICg0eHgpIGFuZCByZWFsIG5ldHdvcmsgZXJyb3JzXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1hNTEh0dHBSZXF1ZXN0fSB4aHIgLSBYTUxIdHRwUmVxdWVzdCBvYmplY3RcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvbkZhaWx1cmVDYWxsYmFjayAtIENhbGxiYWNrIGZvciBidXNpbmVzcyBlcnJvcnMgKDR4eClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvbkVycm9yQ2FsbGJhY2sgLSBDYWxsYmFjayBmb3IgbmV0d29yayBlcnJvcnNcbiAgICAgKi9cbiAgICBoYW5kbGVFcnJvcih4aHIsIG9uRmFpbHVyZUNhbGxiYWNrLCBvbkVycm9yQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc3Qgc3RhdHVzID0geGhyLnN0YXR1cztcblxuICAgICAgICAvLyBCdXNpbmVzcyBlcnJvcnMgKDR4eCkgLSB2YWxpZGF0aW9uLCBjb25mbGljdHMsIGV0Yy5cbiAgICAgICAgLy8gVGhlc2UgaGF2ZSByZXNwb25zZSBib2R5IHdpdGggZXJyb3IgZGV0YWlsc1xuICAgICAgICBpZiAoc3RhdHVzID49IDQwMCAmJiBzdGF0dXMgPCA1MDApIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgIC8vIENhbGwgb25GYWlsdXJlIHdpdGggcGFyc2VkIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlQ2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIElmIGNhbid0IHBhcnNlIEpTT04sIHRyZWF0IGFzIG5ldHdvcmsgZXJyb3JcbiAgICAgICAgICAgICAgICBvbkVycm9yQ2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBTZXJ2ZXIgZXJyb3JzICg1eHgpIG9yIG5ldHdvcmsgZXJyb3JzICgwKVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG9uRXJyb3JDYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGJhc2UgQVBJIHNldHRpbmdzIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nXG4gICAgICogVGhpcyBzdGFuZGFyZGl6ZXMgZXJyb3IgaGFuZGxpbmcgYWNyb3NzIGFsbCBBUEkgY2FsbHNcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1Y2Nlc3NDYWxsYmFjayAtIENhbGxlZCBvbiBzdWNjZXNzZnVsIHJlc3BvbnNlICgyeHggKyByZXN1bHQ9dHJ1ZSlcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmYWlsdXJlQ2FsbGJhY2sgLSBDYWxsZWQgb24gYnVzaW5lc3MgZXJyb3JzICg0eHggb3IgcmVzdWx0PWZhbHNlKVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gQVBJIHNldHRpbmdzIG9iamVjdCBmb3IgJC5hcGkoKVxuICAgICAqL1xuICAgIGdldEJhc2VBcGlTZXR0aW5ncyhzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0KHJlc3BvbnNlLCB4aHIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5zdWNjZXNzVGVzdChyZXNwb25zZSwgeGhyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzQ2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSwgeGhyKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGF1dGhvcml6YXRpb24gZXJyb3JzIGFuZCByZWRpcmVjdCB0byBsb2dpbiBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSB4aHIgPyB4aHIuc3RhdHVzIDogMDtcbiAgICAgICAgICAgICAgICBpZiAoUGJ4QXBpQ2xpZW50LmhhbmRsZUF1dGhFcnJvcihzdGF0dXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjsgLy8gRG9uJ3QgY2FsbCBjYWxsYmFjayBpZiByZWRpcmVjdGluZ1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGhhbmRsZSByZWFsIG5ldHdvcmsgZXJyb3JzICg1eHgsIHRpbWVvdXQsIGNvbm5lY3Rpb24gcmVmdXNlZClcbiAgICAgICAgICAgICAgICAvLyBGb3IgNHh4IGVycm9ycywgU2VtYW50aWMgVUkgYWxyZWFkeSBjYWxsZWQgb25GYWlsdXJlLCBzbyBza2lwXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0geGhyID8geGhyLnN0YXR1cyA6IDA7XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgYXV0aG9yaXphdGlvbiBlcnJvcnMgYW5kIHJlZGlyZWN0IHRvIGxvZ2luIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIGlmIChQYnhBcGlDbGllbnQuaGFuZGxlQXV0aEVycm9yKHN0YXR1cykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBEb24ndCBjYWxsIGNhbGxiYWNrIGlmIHJlZGlyZWN0aW5nXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2tpcCBpZiB0aGlzIGlzIGEgYnVzaW5lc3MgZXJyb3IgKDR4eCkgLSBhbHJlYWR5IGhhbmRsZWQgYnkgb25GYWlsdXJlXG4gICAgICAgICAgICAgICAgaWYgKHN0YXR1cyA+PSA0MDAgJiYgc3RhdHVzIDwgNTAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBSZWFsIG5ldHdvcmsvc2VydmVyIGVycm9yIC0gc2hvdyBnZW5lcmljIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXX1cbiAgICAgICAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgYnkgSUQgb3IgZ2V0IGRlZmF1bHQgdmFsdWVzIGZvciBuZXcgcmVjb3JkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gUmVjb3JkIElEIG9yIGVtcHR5L251bGwgZm9yIG5ldyByZWNvcmRcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0UmVjb3JkKHJlY29yZElkLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBDaGVjayBpZiB3ZSBzaG91bGQgdXNlIGEgY3VzdG9tIG1ldGhvZCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgY29uc3QgaXNOZXcgPSAhcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnIHx8IHJlY29yZElkID09PSAnbmV3JztcbiAgICAgICAgbGV0IHVybDtcblxuICAgICAgICBpZiAoaXNOZXcgJiYgdGhpcy5jdXN0b21NZXRob2RzLmdldERlZmF1bHQpIHtcbiAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gbWV0aG9kIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9JHt0aGlzLmN1c3RvbU1ldGhvZHMuZ2V0RGVmYXVsdH1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gR2V0IGV4aXN0aW5nIHJlY29yZCBieSBJRFxuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7cmVjb3JkSWR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgX2lzTmV3IGZsYWcgZm9yIG5ldyByZWNvcmRzIHRvIGluZGljYXRlIFBPU1Qgc2hvdWxkIGJlIHVzZWRcbiAgICAgICAgICAgICAgICBpZiAoaXNOZXcgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgbGlzdCBvZiByZWNvcmRzIChvciBzaW5nbGUgcmVjb3JkIGZvciBzaW5nbGV0b24pXG4gICAgICogQHBhcmFtIHtvYmplY3R8ZnVuY3Rpb259IGRhdGFPckNhbGxiYWNrIC0gT3B0aW9uYWwgcGFyYW1zIG9yIGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIENhbGxiYWNrIGlmIGZpcnN0IHBhcmFtIGlzIGRhdGFcbiAgICAgKi9cbiAgICBnZXRMaXN0KGRhdGFPckNhbGxiYWNrLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBGb3Igc2luZ2xldG9uIHJlc291cmNlcywgcmVkaXJlY3QgdG8gZ2V0KCkgbWV0aG9kXG4gICAgICAgIGlmICh0aGlzLmlzU2luZ2xldG9uKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuZ2V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KGRhdGFPckNhbGxiYWNrLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgb3ZlcmxvYWRlZCBwYXJhbWV0ZXJzXG4gICAgICAgIGxldCBhY3R1YWxDYWxsYmFjaztcbiAgICAgICAgbGV0IHBhcmFtcyA9IHt9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgZGF0YU9yQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gZGF0YU9yQ2FsbGJhY2s7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYXJhbXMgPSBkYXRhT3JDYWxsYmFjayB8fCB7fTtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFbnN1cmUgY2FsbGJhY2sgaXMgYSBmdW5jdGlvblxuICAgICAgICBpZiAodHlwZW9mIGFjdHVhbENhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9ICgpID0+IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIHJldHVybiBhIHN0cnVjdHVyZSB3aXRoIHJlc3VsdCBhbmQgZGF0YSBmaWVsZHNcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgIXJlc3BvbnNlLmhhc093blByb3BlcnR5KCdkYXRhJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhY3R1YWxDYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5hcGlVcmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YTogcGFyYW1zLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhdmUgcmVjb3JkIChjcmVhdGUgb3IgdXBkYXRlKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzYXZlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIHNhdmVSZWNvcmQoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgcmVjb3JkXG4gICAgICAgIGNvbnN0IGlzTmV3ID0gdGhpcy5pc05ld1JlY29yZChkYXRhKTtcblxuICAgICAgICAvLyBDbGVhbiB1cCBpbnRlcm5hbCBmbGFnc1xuICAgICAgICBjb25zdCBjbGVhbkRhdGEgPSB7Li4uZGF0YX07XG4gICAgICAgIGlmIChjbGVhbkRhdGEuX2lzTmV3ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBjbGVhbkRhdGEuX2lzTmV3O1xuICAgICAgICB9XG4gICAgICAgIC8vIFJlbW92ZSBfbWV0aG9kIGFzIGl0J3MgaGFuZGxlZCBieSB0aGUgYWN0dWFsIEhUVFAgbWV0aG9kXG4gICAgICAgIGlmIChjbGVhbkRhdGEuX21ldGhvZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWxldGUgY2xlYW5EYXRhLl9tZXRob2Q7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgdGhlIHJlY29yZCBJRCBmb3IgdXBkYXRlc1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IHRoaXMuZ2V0UmVjb3JkSWQoY2xlYW5EYXRhKTtcblxuICAgICAgICAvLyB2MyBBUEk6IFBPU1QgZm9yIG5ldyByZWNvcmRzLCBQVVQgZm9yIHVwZGF0ZXNcbiAgICAgICAgY29uc3QgbWV0aG9kID0gaXNOZXcgPyAnUE9TVCcgOiAnUFVUJztcbiAgICAgICAgY29uc3QgdXJsID0gaXNOZXcgPyB0aGlzLmFwaVVybCA6IGAke3RoaXMuYXBpVXJsfS8ke3JlY29yZElkfWA7XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgICAgIGRhdGE6IGNsZWFuRGF0YSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIGJlZm9yZVNlbmQoc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIHNlbmQgYXMgSlNPTiAoZm9yIGNvbXBsZXggc3RydWN0dXJlcylcbiAgICAgICAgICAgICAgICBpZiAoUGJ4QXBpQ2xpZW50Lmhhc0NvbXBsZXhEYXRhKGNsZWFuRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShjbGVhbkRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciBvY2N1cnJlZCddfVxuICAgICAgICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJlY29yZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFJlY29yZCBJRCB0byBkZWxldGVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkKHJlY29yZElkLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9LyR7cmVjb3JkSWR9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsIGEgY3VzdG9tIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2ROYW1lIC0gTWV0aG9kIG5hbWVcbiAgICAgKiBAcGFyYW0ge29iamVjdHxmdW5jdGlvbn0gZGF0YU9yQ2FsbGJhY2sgLSBEYXRhIG9yIGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIENhbGxiYWNrIGlmIGZpcnN0IHBhcmFtIGlzIGRhdGFcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2h0dHBNZXRob2RdIC0gSFRUUCBtZXRob2QgdG8gdXNlIChHRVQgb3IgUE9TVCksIGRlZmF1bHRzIHRvIEdFVFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbcmVzb3VyY2VJZF0gLSBSZXNvdXJjZSBJRCBmb3IgcmVzb3VyY2UtbGV2ZWwgbWV0aG9kc1xuICAgICAqL1xuICAgIGNhbGxDdXN0b21NZXRob2QobWV0aG9kTmFtZSwgZGF0YU9yQ2FsbGJhY2ssIGNhbGxiYWNrLCBodHRwTWV0aG9kID0gJ0dFVCcsIHJlc291cmNlSWQgPSBudWxsKSB7XG4gICAgICAgIC8vIEhhbmRsZSBvdmVybG9hZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgbGV0IGFjdHVhbENhbGxiYWNrO1xuICAgICAgICBsZXQgZGF0YSA9IHt9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgZGF0YU9yQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gZGF0YU9yQ2FsbGJhY2s7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gZGF0YU9yQ2FsbGJhY2sgfHwge307XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRW5zdXJlIGNhbGxiYWNrIGlzIGEgZnVuY3Rpb24gKHVzZSBub29wIGlmIG5vdCBwcm92aWRlZClcbiAgICAgICAgaWYgKHR5cGVvZiBhY3R1YWxDYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSAoKSA9PiB7fTsgLy8gRW1wdHkgY2FsbGJhY2sgZm9yIGZpcmUtYW5kLWZvcmdldCBjYWxsc1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWV0aG9kUGF0aCA9IHRoaXMuY3VzdG9tTWV0aG9kc1ttZXRob2ROYW1lXTtcbiAgICAgICAgaWYgKCFtZXRob2RQYXRoKSB7XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbYFVua25vd24gY3VzdG9tIG1ldGhvZDogJHttZXRob2ROYW1lfWBdfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHRyYWN0IGFzeW5jIGNoYW5uZWwgSUQgaWYgcHJlc2VudCAodXNlZCBmb3IgbG9uZy1ydW5uaW5nIG9wZXJhdGlvbnMpXG4gICAgICAgIGNvbnN0IGFzeW5jQ2hhbm5lbElkID0gZGF0YS5hc3luY0NoYW5uZWxJZCB8fCBkYXRhLmNoYW5uZWxJZDtcblxuICAgICAgICAvLyBCdWlsZCBVUkwgd2l0aCBJRCBpZiBwcm92aWRlZCAoZm9yIHJlc291cmNlLWxldmVsIGN1c3RvbSBtZXRob2RzKVxuICAgICAgICBsZXQgdXJsID0gdGhpcy5hcGlVcmw7XG4gICAgICAgIGlmIChyZXNvdXJjZUlkKSB7XG4gICAgICAgICAgICAvLyBSZXNvdXJjZS1sZXZlbCBtZXRob2Q6IC9hcGkvdjMvcmVzb3VyY2Uve2lkfTptZXRob2QgKFJFU1RmdWwgc3RhbmRhcmQpXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtyZXNvdXJjZUlkfSR7bWV0aG9kUGF0aH1gO1xuICAgICAgICB9IGVsc2UgaWYgKGRhdGEuaWQpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBSZXNvdXJjZS1sZXZlbCBtZXRob2Q6IC9hcGkvdjMvcmVzb3VyY2Uve2lkfTptZXRob2RcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke2RhdGEuaWR9JHttZXRob2RQYXRofWA7XG4gICAgICAgICAgICAvLyBSZW1vdmUgaWQgZnJvbSBkYXRhIHNpbmNlIGl0J3MgaW4gdGhlIFVSTFxuICAgICAgICAgICAgY29uc3QgcmVxdWVzdERhdGEgPSB7Li4uZGF0YX07XG4gICAgICAgICAgICBkZWxldGUgcmVxdWVzdERhdGEuaWQ7XG4gICAgICAgICAgICBkYXRhID0gcmVxdWVzdERhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDb2xsZWN0aW9uLWxldmVsIG1ldGhvZDogL2FwaS92My9yZXNvdXJjZTptZXRob2RcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfSR7bWV0aG9kUGF0aH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIEpTT04gZm9yIGNvbXBsZXggZGF0YSwgZm9ybSBlbmNvZGluZyBmb3Igc2ltcGxlIGRhdGFcbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogaHR0cE1ldGhvZCxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWRkIGFzeW5jIGNoYW5uZWwgaGVhZGVyIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChhc3luY0NoYW5uZWxJZCkge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmJlZm9yZVhIUiA9ICh4aHIpID0+IHtcbiAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignWC1Bc3luYy1SZXNwb25zZS1DaGFubmVsLUlkJywgYXN5bmNDaGFubmVsSWQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB4aHI7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRm9yIEdFVCByZXF1ZXN0cywgYWx3YXlzIHVzZSBxdWVyeSBwYXJhbWV0ZXJzIChubyBKU09OIGluIGJvZHkpXG4gICAgICAgIC8vIEZvciBQT1NUL1BVVC9ERUxFVEUsIHVzZSBKU09OIGZvciBjb21wbGV4IGRhdGEgKG9iamVjdHMsIGFycmF5cylcbiAgICAgICAgaWYgKGh0dHBNZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICAgICAgICAvLyBHRVQgcmVxdWVzdHM6IHNlbmQgYXMgcXVlcnkgcGFyYW1ldGVyc1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUE9TVC9QVVQvREVMRVRFOiBjaGVjayBpZiB3ZSBuZWVkIEpTT04gZW5jb2RpbmdcbiAgICAgICAgICAgIGNvbnN0IGhhc0NvbXBsZXhEYXRhID0gUGJ4QXBpQ2xpZW50Lmhhc0NvbXBsZXhEYXRhKGRhdGEpO1xuICAgICAgICAgICAgaWYgKGhhc0NvbXBsZXhEYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gU2VuZCBhcyBKU09OIHRvIHByZXNlcnZlIGNvbXBsZXggc3RydWN0dXJlc1xuICAgICAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICAgICAgYWpheFNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTZW5kIGFzIHJlZ3VsYXIgZm9ybSBkYXRhXG4gICAgICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoYWpheFNldHRpbmdzKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogRGV0ZXJtaW5lIGlmIGRhdGEgcmVwcmVzZW50cyBhIG5ldyByZWNvcmRcbiAgICAgKiBDYW4gYmUgb3ZlcnJpZGRlbiBpbiBzcGVjaWZpYyBBUEkgbW9kdWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBjaGVja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIG5ldyByZWNvcmRcbiAgICAgKi9cbiAgICBpc05ld1JlY29yZChkYXRhKSB7XG4gICAgICAgIC8vIFRoZSBvbmx5IHdheSB0byBkZXRlcm1pbmUgLSBfaXNOZXcgZmxhZ1xuICAgICAgICAvLyBJZiBmbGFnIGlzIG5vdCBleHBsaWNpdGx5IHNldCwgY2hlY2sgSURcbiAgICAgICAgaWYgKGRhdGEuX2lzTmV3ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLl9pc05ldyA9PT0gdHJ1ZSB8fCBkYXRhLl9pc05ldyA9PT0gJ3RydWUnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmFsbGJhY2sgdG8gSUQgY2hlY2sgb25seSBpZiBmbGFnIGlzIG5vdCBzZXRcbiAgICAgICAgcmV0dXJuICFkYXRhLmlkIHx8IGRhdGEuaWQgPT09ICcnIHx8IGRhdGEuaWQgPT09ICduZXcnO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gZGF0YVxuICAgICAqIENhbiBiZSBvdmVycmlkZGVuIGluIHNwZWNpZmljIEFQSSBtb2R1bGVzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJlY29yZCBJRFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKGRhdGEpIHtcbiAgICAgICAgLy8gUkVTVCBBUEkgdjMgdXNlcyBvbmx5ICdpZCcgZmllbGRcbiAgICAgICAgcmV0dXJuIGRhdGEuaWQ7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGRhdGEgY29udGFpbnMgY29tcGxleCBzdHJ1Y3R1cmVzIHRoYXQgbmVlZCBKU09OIGVuY29kaW5nXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIGNoZWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgY29udGFpbnMgY29tcGxleCBkYXRhXG4gICAgICovXG4gICAgc3RhdGljIGhhc0NvbXBsZXhEYXRhKGRhdGEpIHtcbiAgICAgICAgZm9yIChjb25zdCB2YWx1ZSBvZiBPYmplY3QudmFsdWVzKGRhdGEpKSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gR0VUIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBRdWVyeSBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaWRdIC0gT3B0aW9uYWwgcmVjb3JkIElEIGZvciByZXNvdXJjZS1zcGVjaWZpYyByZXF1ZXN0c1xuICAgICAqL1xuICAgIGNhbGxHZXQocGFyYW1zLCBjYWxsYmFjaywgaWQpIHtcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuXG4gICAgICAgIC8vIEZvciBub24tc2luZ2xldG9uIHJlc291cmNlcyB3aXRoIElELCBhcHBlbmQgSUQgdG8gVVJMXG4gICAgICAgIGlmICghdGhpcy5pc1NpbmdsZXRvbiAmJiBpZCkge1xuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7aWR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKSxcbiAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YTogcGFyYW1zIHx8IHt9LFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBQT1NUIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzZW5kXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaWRdIC0gT3B0aW9uYWwgcmVzb3VyY2UgSUQgZm9yIHJlc291cmNlLXNwZWNpZmljIHJlcXVlc3RzXG4gICAgICovXG4gICAgY2FsbFBvc3QoZGF0YSwgY2FsbGJhY2ssIGlkKSB7XG4gICAgICAgIGxldCB1cmwgPSB0aGlzLmFwaVVybDtcbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtpZH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFzQ29tcGxleERhdGEgPSBQYnhBcGlDbGllbnQuaGFzQ29tcGxleERhdGEoZGF0YSk7XG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKSxcbiAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgYWpheFNldHRpbmdzID0ge1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGhhc0NvbXBsZXhEYXRhKSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoYWpheFNldHRpbmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIFBVVCByZXF1ZXN0IChiYWNrd2FyZCBjb21wYXRpYmlsaXR5IG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gc2VuZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2lkXSAtIE9wdGlvbmFsIHJlc291cmNlIElEIGZvciByZXNvdXJjZS1zcGVjaWZpYyByZXF1ZXN0c1xuICAgICAqL1xuICAgIGNhbGxQdXQoZGF0YSwgY2FsbGJhY2ssIGlkKSB7XG4gICAgICAgIGxldCB1cmwgPSB0aGlzLmFwaVVybDtcbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtpZH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFzQ29tcGxleERhdGEgPSBQYnhBcGlDbGllbnQuaGFzQ29tcGxleERhdGEoZGF0YSk7XG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKSxcbiAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgYWpheFNldHRpbmdzID0ge1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzQ29tcGxleERhdGEpIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaShhamF4U2V0dGluZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gREVMRVRFIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBSZXNvdXJjZSBJRCB0byBkZWxldGVcbiAgICAgKi9cbiAgICBjYWxsRGVsZXRlKGNhbGxiYWNrLCBpZCkge1xuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9LyR7aWR9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIFBBVENIIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzZW5kXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGNhbGxQYXRjaChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBoYXNDb21wbGV4RGF0YSA9IFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShkYXRhKTtcbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gY2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHRoaXMuYXBpVXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzQ29tcGxleERhdGEpIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaShhamF4U2V0dGluZ3MpO1xuICAgIH1cbn1cblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93LlBieEFwaUNsaWVudCA9IFBieEFwaUNsaWVudDsiXX0=