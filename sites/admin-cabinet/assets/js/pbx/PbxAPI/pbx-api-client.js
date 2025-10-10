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
      } // Add CSRF token for POST requests


      if (httpMethod === 'POST' && typeof globalCsrfTokenKey !== 'undefined' && typeof globalCsrfToken !== 'undefined') {
        data[globalCsrfTokenKey] = globalCsrfToken;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4LWFwaS1jbGllbnQuanMiXSwibmFtZXMiOlsiUGJ4QXBpQ2xpZW50IiwiY29uZmlnIiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiaXNTaW5nbGV0b24iLCJzaW5nbGV0b24iLCJhcGlVcmwiLCJDb25maWciLCJwYnhVcmwiLCJlbmRwb2ludHMiLCJnZXRMaXN0IiwiT2JqZWN0IiwiZW50cmllcyIsIm1ldGhvZE5hbWUiLCJtZXRob2RQYXRoIiwicmVzcG9uc2UiLCJ4aHIiLCJyZXN1bHQiLCJzdGF0dXMiLCJvbkZhaWx1cmVDYWxsYmFjayIsIm9uRXJyb3JDYWxsYmFjayIsIkpTT04iLCJwYXJzZSIsInJlc3BvbnNlVGV4dCIsImUiLCJzdWNjZXNzQ2FsbGJhY2siLCJmYWlsdXJlQ2FsbGJhY2siLCJzZWxmIiwib24iLCJzdWNjZXNzVGVzdCIsIm9uU3VjY2VzcyIsIm9uRmFpbHVyZSIsImhhbmRsZUF1dGhFcnJvciIsIm9uRXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwibWVzc2FnZXMiLCJlcnJvciIsInJlY29yZElkIiwiY2FsbGJhY2siLCJpc05ldyIsInVybCIsImdldERlZmF1bHQiLCJhcGlTZXR0aW5ncyIsImdldEJhc2VBcGlTZXR0aW5ncyIsImRhdGEiLCJfaXNOZXciLCIkIiwiYXBpIiwibWV0aG9kIiwiZGF0YU9yQ2FsbGJhY2siLCJnZXQiLCJhY3R1YWxDYWxsYmFjayIsInBhcmFtcyIsImhhc093blByb3BlcnR5IiwiaXNOZXdSZWNvcmQiLCJjbGVhbkRhdGEiLCJ1bmRlZmluZWQiLCJfbWV0aG9kIiwiZ2V0UmVjb3JkSWQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJnbG9iYWxDc3JmVG9rZW5LZXkiLCJnbG9iYWxDc3JmVG9rZW4iLCJoYXNDb21wbGV4RGF0YSIsImNvbnRlbnRUeXBlIiwic3RyaW5naWZ5IiwiaHR0cE1ldGhvZCIsInJlc291cmNlSWQiLCJhc3luY0NoYW5uZWxJZCIsImNoYW5uZWxJZCIsImlkIiwicmVxdWVzdERhdGEiLCJhamF4U2V0dGluZ3MiLCJiZWZvcmVYSFIiLCJzZXRSZXF1ZXN0SGVhZGVyIiwiaXNSZWRpcmVjdGluZ1RvTG9naW4iLCJzZXRUaW1lb3V0Iiwid2luZG93IiwibG9jYXRpb24iLCJocmVmIiwiZ2xvYmFsUm9vdFVybCIsInZhbHVlcyIsInZhbHVlIiwiQXJyYXkiLCJpc0FycmF5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxZO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7QUFHSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJLHdCQUFZQyxNQUFaLEVBQW9CO0FBQUE7O0FBQ2hCLFNBQUtDLFFBQUwsR0FBZ0JELE1BQU0sQ0FBQ0MsUUFBdkI7QUFDQSxTQUFLQyxhQUFMLEdBQXFCRixNQUFNLENBQUNFLGFBQVAsSUFBd0IsRUFBN0M7QUFDQSxTQUFLQyxXQUFMLEdBQW1CSCxNQUFNLENBQUNJLFNBQVAsSUFBb0IsS0FBdkMsQ0FIZ0IsQ0FLaEI7O0FBQ0EsU0FBS0MsTUFBTCxhQUFpQkMsTUFBTSxDQUFDQyxNQUF4QixTQUFpQyxLQUFLTixRQUF0QyxFQU5nQixDQVFoQjs7QUFDQSxTQUFLTyxTQUFMLEdBQWlCO0FBQ2JDLE1BQUFBLE9BQU8sRUFBRSxLQUFLSjtBQURELEtBQWpCLENBVGdCLENBYWhCOztBQUNBLHVDQUF1Q0ssTUFBTSxDQUFDQyxPQUFQLENBQWUsS0FBS1QsYUFBcEIsQ0FBdkMscUNBQTJFO0FBQXRFO0FBQUEsVUFBT1UsVUFBUDtBQUFBLFVBQW1CQyxV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O0FBQ0g7OztXQW9aRCx3QkFBc0JwQyxJQUF0QixFQUE0QjtBQUN4Qix5Q0FBb0JsQyxNQUFNLENBQUN1RSxNQUFQLENBQWNyQyxJQUFkLENBQXBCLHNDQUF5QztBQUFwQyxZQUFNc0MsS0FBSyxzQkFBWDs7QUFDRCxZQUFJQyxLQUFLLENBQUNDLE9BQU4sQ0FBY0YsS0FBZCxLQUF5QixRQUFPQSxLQUFQLE1BQWlCLFFBQWpCLElBQTZCQSxLQUFLLEtBQUssSUFBcEUsRUFBMkU7QUFDdkUsaUJBQU8sSUFBUDtBQUNIO0FBQ0o7O0FBQ0QsYUFBTyxLQUFQO0FBQ0g7Ozs7S0F1Skw7OztnQkEzbUJNbkYsWSwwQkFNNEIsSzs7QUFzbUJsQzhFLE1BQU0sQ0FBQzlFLFlBQVAsR0FBc0JBLFlBQXRCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIENvbmZpZywgUGJ4QXBpLCAkICovXG5cbi8qKlxuICogUGJ4QXBpQ2xpZW50IC0gVW5pZmllZCBSRVNUIEFQSSB2MyBjbGllbnQgZm9yIGFsbCBlbnRpdGllc1xuICpcbiAqIFRoaXMgY2xhc3MgcHJvdmlkZXMgYSBzdGFuZGFyZCBpbnRlcmZhY2UgZm9yIGFsbCBDUlVEIG9wZXJhdGlvbnNcbiAqIGFuZCBlbGltaW5hdGVzIGNvZGUgZHVwbGljYXRpb24gYWNyb3NzIEFQSSBtb2R1bGVzLlxuICpcbiAqIEZlYXR1cmVzOlxuICogLSBTdGFuZGFyZCBSRVNUZnVsIG9wZXJhdGlvbnMgKEdFVCwgUE9TVCwgUFVULCBERUxFVEUpXG4gKiAtIEN1c3RvbSBtZXRob2RzIHN1cHBvcnQgdmlhIGNvbG9uIG5vdGF0aW9uICg6Z2V0RGVmYXVsdClcbiAqIC0gQXV0b21hdGljIEhUVFAgbWV0aG9kIHNlbGVjdGlvbiBiYXNlZCBvbiBkYXRhXG4gKiAtIENTUkYgdG9rZW4gbWFuYWdlbWVudFxuICogLSBCYWNrd2FyZCBjb21wYXRpYmlsaXR5IHdpdGggUGJ4RGF0YVRhYmxlSW5kZXhcbiAqIC0gR2xvYmFsIGF1dGhvcml6YXRpb24gZXJyb3IgaGFuZGxpbmcgKDQwMS80MDMpXG4gKlxuICogQGNsYXNzIFBieEFwaUNsaWVudFxuICovXG5jbGFzcyBQYnhBcGlDbGllbnQge1xuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBtdWx0aXBsZSByZWRpcmVjdHMgb24gYXV0aCBlcnJvcnNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKiBAc3RhdGljXG4gICAgICovXG4gICAgc3RhdGljIGlzUmVkaXJlY3RpbmdUb0xvZ2luID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgQVBJIGNsaWVudCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcuZW5kcG9pbnQgLSBCYXNlIEFQSSBlbmRwb2ludCAoZS5nLiwgJy9wYnhjb3JlL2FwaS92My9pdnItbWVudScpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtjb25maWcuY3VzdG9tTWV0aG9kc10gLSBNYXAgb2YgY3VzdG9tIG1ldGhvZHMgKGUuZy4sIHtnZXREZWZhdWx0OiAnOmdldERlZmF1bHQnfSlcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcuc2luZ2xldG9uXSAtIFdoZXRoZXIgdGhpcyBpcyBhIHNpbmdsZXRvbiByZXNvdXJjZSAobm8gSURzIGluIFVSTHMpXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29uZmlnKSB7XG4gICAgICAgIHRoaXMuZW5kcG9pbnQgPSBjb25maWcuZW5kcG9pbnQ7XG4gICAgICAgIHRoaXMuY3VzdG9tTWV0aG9kcyA9IGNvbmZpZy5jdXN0b21NZXRob2RzIHx8IHt9O1xuICAgICAgICB0aGlzLmlzU2luZ2xldG9uID0gY29uZmlnLnNpbmdsZXRvbiB8fCBmYWxzZTtcblxuICAgICAgICAvLyBFeHRyYWN0IGJhc2UgVVJMIGZvciBDb25maWcucGJ4VXJsXG4gICAgICAgIHRoaXMuYXBpVXJsID0gYCR7Q29uZmlnLnBieFVybH0ke3RoaXMuZW5kcG9pbnR9YDtcblxuICAgICAgICAvLyBDcmVhdGUgZW5kcG9pbnRzIHByb3BlcnR5IGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5IHdpdGggUGJ4RGF0YVRhYmxlSW5kZXhcbiAgICAgICAgdGhpcy5lbmRwb2ludHMgPSB7XG4gICAgICAgICAgICBnZXRMaXN0OiB0aGlzLmFwaVVybFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFkZCBjdXN0b20gbWV0aG9kIGVuZHBvaW50c1xuICAgICAgICBmb3IgKGNvbnN0IFttZXRob2ROYW1lLCBtZXRob2RQYXRoXSBvZiBPYmplY3QuZW50cmllcyh0aGlzLmN1c3RvbU1ldGhvZHMpKSB7XG4gICAgICAgICAgICB0aGlzLmVuZHBvaW50c1ttZXRob2ROYW1lXSA9IGAke3RoaXMuYXBpVXJsfSR7bWV0aG9kUGF0aH1gO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGF1dGhvcml6YXRpb24gZXJyb3JzICg0MDEpIGJ5IHJlZGlyZWN0aW5nIHRvIGxvZ2luXG4gICAgICogTm90ZTogNDAzIEZvcmJpZGRlbiBpcyBOT1QgaGFuZGxlZCBoZXJlIGFzIGl0IG1heSBpbmRpY2F0ZSBhY2Nlc3MgZGVuaWVkIHRvIGEgc3BlY2lmaWMgcmVzb3VyY2UsXG4gICAgICogbm90IHNlc3Npb24gZXhwaXJhdGlvbi4gU2Vzc2lvbiBsb3NzIGlzIGluZGljYXRlZCBieSA0MDEgVW5hdXRob3JpemVkIG9ubHkuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXR1cyAtIEhUVFAgc3RhdHVzIGNvZGVcbiAgICAgKiBAc3RhdGljXG4gICAgICovXG4gICAgc3RhdGljIGhhbmRsZUF1dGhFcnJvcihzdGF0dXMpIHtcbiAgICAgICAgLy8gT25seSBoYW5kbGUgNDAxIFVuYXV0aG9yaXplZCAtIHRoaXMgaW5kaWNhdGVzIHNlc3Npb24gbG9zc1xuICAgICAgICAvLyA0MDMgRm9yYmlkZGVuIG1lYW5zIGFjY2VzcyBkZW5pZWQgdG8gYSByZXNvdXJjZSAodXNlciBsYWNrcyBwZXJtaXNzaW9ucylcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAvLyBQcmV2ZW50IG11bHRpcGxlIHJlZGlyZWN0c1xuICAgICAgICAgICAgaWYgKCFQYnhBcGlDbGllbnQuaXNSZWRpcmVjdGluZ1RvTG9naW4pIHtcbiAgICAgICAgICAgICAgICBQYnhBcGlDbGllbnQuaXNSZWRpcmVjdGluZ1RvTG9naW4gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVkaXJlY3QgdG8gbG9naW4gcGFnZSBhZnRlciBhIHNob3J0IGRlbGF5IHRvIGFsbG93IGFueSBwZW5kaW5nIG9wZXJhdGlvbnMgdG8gY29tcGxldGVcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIHN1Y2Nlc3MgdGVzdCBmb3IgUkVTVGZ1bCBBUEkgd2l0aCBwcm9wZXIgSFRUUCBjb2Rlc1xuICAgICAqIFRyZWF0cyBidXNpbmVzcyBlcnJvcnMgKDR4eCkgYXMgZmFpbHVyZXMsIG5vdCBuZXR3b3JrIGVycm9yc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtYTUxIdHRwUmVxdWVzdH0geGhyIC0gWE1MSHR0cFJlcXVlc3Qgb2JqZWN0XG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgc3VjY2Vzc1Rlc3QocmVzcG9uc2UsIHhocikge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgdmFsaWQgcmVzcG9uc2Ugb2JqZWN0IHdpdGggcmVzdWx0IGZpZWxkLCB1c2UgaXRcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHR5cGVvZiByZXNwb25zZS5yZXN1bHQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRm9yIHJlc3BvbnNlcyB3aXRob3V0IHJlc3VsdCBmaWVsZCwgY2hlY2sgSFRUUCBzdGF0dXNcbiAgICAgICAgLy8gMnh4ID0gc3VjY2VzcywgNHh4LzV4eCA9IGZhaWx1cmUgKGJ1dCBub3QgbmV0d29yayBlcnJvcilcbiAgICAgICAgY29uc3Qgc3RhdHVzID0geGhyID8geGhyLnN0YXR1cyA6IDIwMDtcbiAgICAgICAgcmV0dXJuIHN0YXR1cyA+PSAyMDAgJiYgc3RhdHVzIDwgMzAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBlcnJvciBoYW5kbGVyIGZvciBSRVNUZnVsIEFQSVxuICAgICAqIERpc3Rpbmd1aXNoZXMgYmV0d2VlbiBidXNpbmVzcyBlcnJvcnMgKDR4eCkgYW5kIHJlYWwgbmV0d29yayBlcnJvcnNcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7WE1MSHR0cFJlcXVlc3R9IHhociAtIFhNTEh0dHBSZXF1ZXN0IG9iamVjdFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uRmFpbHVyZUNhbGxiYWNrIC0gQ2FsbGJhY2sgZm9yIGJ1c2luZXNzIGVycm9ycyAoNHh4KVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uRXJyb3JDYWxsYmFjayAtIENhbGxiYWNrIGZvciBuZXR3b3JrIGVycm9yc1xuICAgICAqL1xuICAgIGhhbmRsZUVycm9yKHhociwgb25GYWlsdXJlQ2FsbGJhY2ssIG9uRXJyb3JDYWxsYmFjaykge1xuICAgICAgICBjb25zdCBzdGF0dXMgPSB4aHIuc3RhdHVzO1xuXG4gICAgICAgIC8vIEJ1c2luZXNzIGVycm9ycyAoNHh4KSAtIHZhbGlkYXRpb24sIGNvbmZsaWN0cywgZXRjLlxuICAgICAgICAvLyBUaGVzZSBoYXZlIHJlc3BvbnNlIGJvZHkgd2l0aCBlcnJvciBkZXRhaWxzXG4gICAgICAgIGlmIChzdGF0dXMgPj0gNDAwICYmIHN0YXR1cyA8IDUwMCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgLy8gQ2FsbCBvbkZhaWx1cmUgd2l0aCBwYXJzZWQgcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBvbkZhaWx1cmVDYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgY2FuJ3QgcGFyc2UgSlNPTiwgdHJlYXQgYXMgbmV0d29yayBlcnJvclxuICAgICAgICAgICAgICAgIG9uRXJyb3JDYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFNlcnZlciBlcnJvcnMgKDV4eCkgb3IgbmV0d29yayBlcnJvcnMgKDApXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb25FcnJvckNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYmFzZSBBUEkgc2V0dGluZ3Mgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmdcbiAgICAgKiBUaGlzIHN0YW5kYXJkaXplcyBlcnJvciBoYW5kbGluZyBhY3Jvc3MgYWxsIEFQSSBjYWxsc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gc3VjY2Vzc0NhbGxiYWNrIC0gQ2FsbGVkIG9uIHN1Y2Nlc3NmdWwgcmVzcG9uc2UgKDJ4eCArIHJlc3VsdD10cnVlKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGZhaWx1cmVDYWxsYmFjayAtIENhbGxlZCBvbiBidXNpbmVzcyBlcnJvcnMgKDR4eCBvciByZXN1bHQ9ZmFsc2UpXG4gICAgICogQHJldHVybnMge29iamVjdH0gLSBBUEkgc2V0dGluZ3Mgb2JqZWN0IGZvciAkLmFwaSgpXG4gICAgICovXG4gICAgZ2V0QmFzZUFwaVNldHRpbmdzKHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3QocmVzcG9uc2UsIHhocikge1xuICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLnN1Y2Nlc3NUZXN0KHJlc3BvbnNlLCB4aHIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3NDYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlLCB4aHIpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgYXV0aG9yaXphdGlvbiBlcnJvcnMgYW5kIHJlZGlyZWN0IHRvIGxvZ2luIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IHhociA/IHhoci5zdGF0dXMgOiAwO1xuICAgICAgICAgICAgICAgIGlmIChQYnhBcGlDbGllbnQuaGFuZGxlQXV0aEVycm9yKHN0YXR1cykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBEb24ndCBjYWxsIGNhbGxiYWNrIGlmIHJlZGlyZWN0aW5nXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgaGFuZGxlIHJlYWwgbmV0d29yayBlcnJvcnMgKDV4eCwgdGltZW91dCwgY29ubmVjdGlvbiByZWZ1c2VkKVxuICAgICAgICAgICAgICAgIC8vIEZvciA0eHggZXJyb3JzLCBTZW1hbnRpYyBVSSBhbHJlYWR5IGNhbGxlZCBvbkZhaWx1cmUsIHNvIHNraXBcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSB4aHIgPyB4aHIuc3RhdHVzIDogMDtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGZvciBhdXRob3JpemF0aW9uIGVycm9ycyBhbmQgcmVkaXJlY3QgdG8gbG9naW4gaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgaWYgKFBieEFwaUNsaWVudC5oYW5kbGVBdXRoRXJyb3Ioc3RhdHVzKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIERvbid0IGNhbGwgY2FsbGJhY2sgaWYgcmVkaXJlY3RpbmdcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTa2lwIGlmIHRoaXMgaXMgYSBidXNpbmVzcyBlcnJvciAoNHh4KSAtIGFscmVhZHkgaGFuZGxlZCBieSBvbkZhaWx1cmVcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID49IDQwMCAmJiBzdGF0dXMgPCA1MDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFJlYWwgbmV0d29yay9zZXJ2ZXIgZXJyb3IgLSBzaG93IGdlbmVyaWMgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciBvY2N1cnJlZCddfVxuICAgICAgICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBieSBJRCBvciBnZXQgZGVmYXVsdCB2YWx1ZXMgZm9yIG5ldyByZWNvcmRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBSZWNvcmQgSUQgb3IgZW1wdHkvbnVsbCBmb3IgbmV3IHJlY29yZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHdlIHNob3VsZCB1c2UgYSBjdXN0b20gbWV0aG9kIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICBjb25zdCBpc05ldyA9ICFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJycgfHwgcmVjb3JkSWQgPT09ICduZXcnO1xuICAgICAgICBsZXQgdXJsO1xuXG4gICAgICAgIGlmIChpc05ldyAmJiB0aGlzLmN1c3RvbU1ldGhvZHMuZ2V0RGVmYXVsdCkge1xuICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSBtZXRob2QgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0ke3RoaXMuY3VzdG9tTWV0aG9kcy5nZXREZWZhdWx0fWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBHZXQgZXhpc3RpbmcgcmVjb3JkIGJ5IElEXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtyZWNvcmRJZH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNldCBfaXNOZXcgZmxhZyBmb3IgbmV3IHJlY29yZHMgdG8gaW5kaWNhdGUgUE9TVCBzaG91bGQgYmUgdXNlZFxuICAgICAgICAgICAgICAgIGlmIChpc05ldyAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBsaXN0IG9mIHJlY29yZHMgKG9yIHNpbmdsZSByZWNvcmQgZm9yIHNpbmdsZXRvbilcbiAgICAgKiBAcGFyYW0ge29iamVjdHxmdW5jdGlvbn0gZGF0YU9yQ2FsbGJhY2sgLSBPcHRpb25hbCBwYXJhbXMgb3IgY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQ2FsbGJhY2sgaWYgZmlyc3QgcGFyYW0gaXMgZGF0YVxuICAgICAqL1xuICAgIGdldExpc3QoZGF0YU9yQ2FsbGJhY2ssIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIEZvciBzaW5nbGV0b24gcmVzb3VyY2VzLCByZWRpcmVjdCB0byBnZXQoKSBtZXRob2RcbiAgICAgICAgaWYgKHRoaXMuaXNTaW5nbGV0b24pIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5nZXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXQoZGF0YU9yQ2FsbGJhY2ssIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSBvdmVybG9hZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgbGV0IGFjdHVhbENhbGxiYWNrO1xuICAgICAgICBsZXQgcGFyYW1zID0ge307XG5cbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhT3JDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBkYXRhT3JDYWxsYmFjaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBhcmFtcyA9IGRhdGFPckNhbGxiYWNrIHx8IHt9O1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEVuc3VyZSBjYWxsYmFjayBpcyBhIGZ1bmN0aW9uXG4gICAgICAgIGlmICh0eXBlb2YgYWN0dWFsQ2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gKCkgPT4ge307XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBhY3R1YWxDYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2UgcmV0dXJuIGEgc3RydWN0dXJlIHdpdGggcmVzdWx0IGFuZCBkYXRhIGZpZWxkc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiAhcmVzcG9uc2UuaGFzT3duUHJvcGVydHkoJ2RhdGEnKSkge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmFwaVVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2F2ZSByZWNvcmQgKGNyZWF0ZSBvciB1cGRhdGUpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNhdmVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgc2F2ZVJlY29yZChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmRcbiAgICAgICAgY29uc3QgaXNOZXcgPSB0aGlzLmlzTmV3UmVjb3JkKGRhdGEpO1xuXG4gICAgICAgIC8vIENsZWFuIHVwIGludGVybmFsIGZsYWdzXG4gICAgICAgIGNvbnN0IGNsZWFuRGF0YSA9IHsuLi5kYXRhfTtcbiAgICAgICAgaWYgKGNsZWFuRGF0YS5faXNOZXcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVsZXRlIGNsZWFuRGF0YS5faXNOZXc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVtb3ZlIF9tZXRob2QgYXMgaXQncyBoYW5kbGVkIGJ5IHRoZSBhY3R1YWwgSFRUUCBtZXRob2RcbiAgICAgICAgaWYgKGNsZWFuRGF0YS5fbWV0aG9kICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBjbGVhbkRhdGEuX21ldGhvZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCB0aGUgcmVjb3JkIElEIGZvciB1cGRhdGVzXG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gdGhpcy5nZXRSZWNvcmRJZChjbGVhbkRhdGEpO1xuXG4gICAgICAgIC8vIHYzIEFQSTogUE9TVCBmb3IgbmV3IHJlY29yZHMsIFBVVCBmb3IgdXBkYXRlc1xuICAgICAgICBjb25zdCBtZXRob2QgPSBpc05ldyA/ICdQT1NUJyA6ICdQVVQnO1xuICAgICAgICBjb25zdCB1cmwgPSBpc05ldyA/IHRoaXMuYXBpVXJsIDogYCR7dGhpcy5hcGlVcmx9LyR7cmVjb3JkSWR9YDtcblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICAgICAgZGF0YTogY2xlYW5EYXRhLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgYmVmb3JlU2VuZChzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBDU1JGIHRva2VuIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuS2V5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBjbGVhbkRhdGFbZ2xvYmFsQ3NyZlRva2VuS2V5XSA9IGdsb2JhbENzcmZUb2tlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UgbmVlZCB0byBzZW5kIGFzIEpTT04gKGZvciBjb21wbGV4IHN0cnVjdHVyZXMpXG4gICAgICAgICAgICAgICAgaWYgKFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShjbGVhbkRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoY2xlYW5EYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXX1cbiAgICAgICAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSByZWNvcmRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBSZWNvcmQgSUQgdG8gZGVsZXRlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGRlbGV0ZVJlY29yZChyZWNvcmRJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIENTUkYgdG9rZW4gaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuS2V5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZGF0YVtnbG9iYWxDc3JmVG9rZW5LZXldID0gZ2xvYmFsQ3NyZlRva2VuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9LyR7cmVjb3JkSWR9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbCBhIGN1c3RvbSBtZXRob2RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kTmFtZSAtIE1ldGhvZCBuYW1lXG4gICAgICogQHBhcmFtIHtvYmplY3R8ZnVuY3Rpb259IGRhdGFPckNhbGxiYWNrIC0gRGF0YSBvciBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gLSBDYWxsYmFjayBpZiBmaXJzdCBwYXJhbSBpcyBkYXRhXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtodHRwTWV0aG9kXSAtIEhUVFAgbWV0aG9kIHRvIHVzZSAoR0VUIG9yIFBPU1QpLCBkZWZhdWx0cyB0byBHRVRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3Jlc291cmNlSWRdIC0gUmVzb3VyY2UgSUQgZm9yIHJlc291cmNlLWxldmVsIG1ldGhvZHNcbiAgICAgKi9cbiAgICBjYWxsQ3VzdG9tTWV0aG9kKG1ldGhvZE5hbWUsIGRhdGFPckNhbGxiYWNrLCBjYWxsYmFjaywgaHR0cE1ldGhvZCA9ICdHRVQnLCByZXNvdXJjZUlkID0gbnVsbCkge1xuICAgICAgICAvLyBIYW5kbGUgb3ZlcmxvYWRlZCBwYXJhbWV0ZXJzXG4gICAgICAgIGxldCBhY3R1YWxDYWxsYmFjaztcbiAgICAgICAgbGV0IGRhdGEgPSB7fTtcblxuICAgICAgICBpZiAodHlwZW9mIGRhdGFPckNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9IGRhdGFPckNhbGxiYWNrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGF0YSA9IGRhdGFPckNhbGxiYWNrIHx8IHt9O1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEVuc3VyZSBjYWxsYmFjayBpcyBhIGZ1bmN0aW9uICh1c2Ugbm9vcCBpZiBub3QgcHJvdmlkZWQpXG4gICAgICAgIGlmICh0eXBlb2YgYWN0dWFsQ2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gKCkgPT4ge307IC8vIEVtcHR5IGNhbGxiYWNrIGZvciBmaXJlLWFuZC1mb3JnZXQgY2FsbHNcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1ldGhvZFBhdGggPSB0aGlzLmN1c3RvbU1ldGhvZHNbbWV0aG9kTmFtZV07XG4gICAgICAgIGlmICghbWV0aG9kUGF0aCkge1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZXM6IHtlcnJvcjogW2BVbmtub3duIGN1c3RvbSBtZXRob2Q6ICR7bWV0aG9kTmFtZX1gXX1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXh0cmFjdCBhc3luYyBjaGFubmVsIElEIGlmIHByZXNlbnQgKHVzZWQgZm9yIGxvbmctcnVubmluZyBvcGVyYXRpb25zKVxuICAgICAgICBjb25zdCBhc3luY0NoYW5uZWxJZCA9IGRhdGEuYXN5bmNDaGFubmVsSWQgfHwgZGF0YS5jaGFubmVsSWQ7XG5cbiAgICAgICAgLy8gQnVpbGQgVVJMIHdpdGggSUQgaWYgcHJvdmlkZWQgKGZvciByZXNvdXJjZS1sZXZlbCBjdXN0b20gbWV0aG9kcylcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuICAgICAgICBpZiAocmVzb3VyY2VJZCkge1xuICAgICAgICAgICAgLy8gUmVzb3VyY2UtbGV2ZWwgbWV0aG9kOiAvYXBpL3YzL3Jlc291cmNlL3tpZH06bWV0aG9kIChSRVNUZnVsIHN0YW5kYXJkKVxuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7cmVzb3VyY2VJZH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhLmlkKSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjazogUmVzb3VyY2UtbGV2ZWwgbWV0aG9kOiAvYXBpL3YzL3Jlc291cmNlL3tpZH06bWV0aG9kXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtkYXRhLmlkfSR7bWV0aG9kUGF0aH1gO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGlkIGZyb20gZGF0YSBzaW5jZSBpdCdzIGluIHRoZSBVUkxcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3REYXRhID0gey4uLmRhdGF9O1xuICAgICAgICAgICAgZGVsZXRlIHJlcXVlc3REYXRhLmlkO1xuICAgICAgICAgICAgZGF0YSA9IHJlcXVlc3REYXRhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ29sbGVjdGlvbi1sZXZlbCBtZXRob2Q6IC9hcGkvdjMvcmVzb3VyY2U6bWV0aG9kXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBDU1JGIHRva2VuIGZvciBQT1NUIHJlcXVlc3RzXG4gICAgICAgIGlmIChodHRwTWV0aG9kID09PSAnUE9TVCcgJiYgdHlwZW9mIGdsb2JhbENzcmZUb2tlbktleSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGdsb2JhbENzcmZUb2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGRhdGFbZ2xvYmFsQ3NyZlRva2VuS2V5XSA9IGdsb2JhbENzcmZUb2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSBKU09OIGZvciBjb21wbGV4IGRhdGEsIGZvcm0gZW5jb2RpbmcgZm9yIHNpbXBsZSBkYXRhXG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IGFjdHVhbENhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKSxcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgYWpheFNldHRpbmdzID0ge1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IGh0dHBNZXRob2QsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFkZCBhc3luYyBjaGFubmVsIGhlYWRlciBpZiBwcm92aWRlZFxuICAgICAgICBpZiAoYXN5bmNDaGFubmVsSWQpIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5iZWZvcmVYSFIgPSAoeGhyKSA9PiB7XG4gICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ1gtQXN5bmMtUmVzcG9uc2UtQ2hhbm5lbC1JZCcsIGFzeW5jQ2hhbm5lbElkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geGhyO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZvciBHRVQgcmVxdWVzdHMsIGFsd2F5cyB1c2UgcXVlcnkgcGFyYW1ldGVycyAobm8gSlNPTiBpbiBib2R5KVxuICAgICAgICAvLyBGb3IgUE9TVC9QVVQvREVMRVRFLCB1c2UgSlNPTiBmb3IgY29tcGxleCBkYXRhIChvYmplY3RzLCBhcnJheXMpXG4gICAgICAgIGlmIChodHRwTWV0aG9kID09PSAnR0VUJykge1xuICAgICAgICAgICAgLy8gR0VUIHJlcXVlc3RzOiBzZW5kIGFzIHF1ZXJ5IHBhcmFtZXRlcnNcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFBPU1QvUFVUL0RFTEVURTogY2hlY2sgaWYgd2UgbmVlZCBKU09OIGVuY29kaW5nXG4gICAgICAgICAgICBjb25zdCBoYXNDb21wbGV4RGF0YSA9IFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShkYXRhKTtcbiAgICAgICAgICAgIGlmIChoYXNDb21wbGV4RGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFNlbmQgYXMgSlNPTiB0byBwcmVzZXJ2ZSBjb21wbGV4IHN0cnVjdHVyZXNcbiAgICAgICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5jb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2VuZCBhcyByZWd1bGFyIGZvcm0gZGF0YVxuICAgICAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKGFqYXhTZXR0aW5ncyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIERldGVybWluZSBpZiBkYXRhIHJlcHJlc2VudHMgYSBuZXcgcmVjb3JkXG4gICAgICogQ2FuIGJlIG92ZXJyaWRkZW4gaW4gc3BlY2lmaWMgQVBJIG1vZHVsZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gY2hlY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBuZXcgcmVjb3JkXG4gICAgICovXG4gICAgaXNOZXdSZWNvcmQoZGF0YSkge1xuICAgICAgICAvLyBUaGUgb25seSB3YXkgdG8gZGV0ZXJtaW5lIC0gX2lzTmV3IGZsYWdcbiAgICAgICAgLy8gSWYgZmxhZyBpcyBub3QgZXhwbGljaXRseSBzZXQsIGNoZWNrIElEXG4gICAgICAgIGlmIChkYXRhLl9pc05ldyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS5faXNOZXcgPT09IHRydWUgfHwgZGF0YS5faXNOZXcgPT09ICd0cnVlJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIElEIGNoZWNrIG9ubHkgaWYgZmxhZyBpcyBub3Qgc2V0XG4gICAgICAgIHJldHVybiAhZGF0YS5pZCB8fCBkYXRhLmlkID09PSAnJyB8fCBkYXRhLmlkID09PSAnbmV3JztcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIGRhdGFcbiAgICAgKiBDYW4gYmUgb3ZlcnJpZGRlbiBpbiBzcGVjaWZpYyBBUEkgbW9kdWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZWNvcmQgSURcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZChkYXRhKSB7XG4gICAgICAgIC8vIFJFU1QgQVBJIHYzIHVzZXMgb25seSAnaWQnIGZpZWxkXG4gICAgICAgIHJldHVybiBkYXRhLmlkO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBkYXRhIGNvbnRhaW5zIGNvbXBsZXggc3RydWN0dXJlcyB0aGF0IG5lZWQgSlNPTiBlbmNvZGluZ1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBjaGVja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGNvbnRhaW5zIGNvbXBsZXggZGF0YVxuICAgICAqL1xuICAgIHN0YXRpYyBoYXNDb21wbGV4RGF0YShkYXRhKSB7XG4gICAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgT2JqZWN0LnZhbHVlcyhkYXRhKSkge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpIHx8ICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIEdFVCByZXF1ZXN0IChiYWNrd2FyZCBjb21wYXRpYmlsaXR5IG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gUXVlcnkgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2lkXSAtIE9wdGlvbmFsIHJlY29yZCBJRCBmb3IgcmVzb3VyY2Utc3BlY2lmaWMgcmVxdWVzdHNcbiAgICAgKi9cbiAgICBjYWxsR2V0KHBhcmFtcywgY2FsbGJhY2ssIGlkKSB7XG4gICAgICAgIGxldCB1cmwgPSB0aGlzLmFwaVVybDtcblxuICAgICAgICAvLyBGb3Igbm9uLXNpbmdsZXRvbiByZXNvdXJjZXMgd2l0aCBJRCwgYXBwZW5kIElEIHRvIFVSTFxuICAgICAgICBpZiAoIXRoaXMuaXNTaW5nbGV0b24gJiYgaWQpIHtcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke2lkfWA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHBhcmFtcyB8fCB7fSxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gUE9TVCByZXF1ZXN0IChiYWNrd2FyZCBjb21wYXRpYmlsaXR5IG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gc2VuZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2lkXSAtIE9wdGlvbmFsIHJlc291cmNlIElEIGZvciByZXNvdXJjZS1zcGVjaWZpYyByZXF1ZXN0c1xuICAgICAqL1xuICAgIGNhbGxQb3N0KGRhdGEsIGNhbGxiYWNrLCBpZCkge1xuICAgICAgICBsZXQgdXJsID0gdGhpcy5hcGlVcmw7XG4gICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7aWR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc0NvbXBsZXhEYXRhID0gUGJ4QXBpQ2xpZW50Lmhhc0NvbXBsZXhEYXRhKGRhdGEpO1xuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IGFqYXhTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNDb21wbGV4RGF0YSkge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5jb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKGFqYXhTZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBQVVQgcmVxdWVzdCAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNlbmRcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtpZF0gLSBPcHRpb25hbCByZXNvdXJjZSBJRCBmb3IgcmVzb3VyY2Utc3BlY2lmaWMgcmVxdWVzdHNcbiAgICAgKi9cbiAgICBjYWxsUHV0KGRhdGEsIGNhbGxiYWNrLCBpZCkge1xuICAgICAgICBsZXQgdXJsID0gdGhpcy5hcGlVcmw7XG4gICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7aWR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc0NvbXBsZXhEYXRhID0gUGJ4QXBpQ2xpZW50Lmhhc0NvbXBsZXhEYXRhKGRhdGEpO1xuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IGFqYXhTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGhhc0NvbXBsZXhEYXRhKSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoYWpheFNldHRpbmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIERFTEVURSByZXF1ZXN0IChiYWNrd2FyZCBjb21wYXRpYmlsaXR5IG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gUmVzb3VyY2UgSUQgdG8gZGVsZXRlXG4gICAgICovXG4gICAgY2FsbERlbGV0ZShjYWxsYmFjaywgaWQpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHt9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuS2V5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZGF0YVtnbG9iYWxDc3JmVG9rZW5LZXldID0gZ2xvYmFsQ3NyZlRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gY2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuYXBpVXJsfS8ke2lkfWAsXG4gICAgICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gUEFUQ0ggcmVxdWVzdCAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNlbmRcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgY2FsbFBhdGNoKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGhhc0NvbXBsZXhEYXRhID0gUGJ4QXBpQ2xpZW50Lmhhc0NvbXBsZXhEYXRhKGRhdGEpO1xuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IGFqYXhTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIHVybDogdGhpcy5hcGlVcmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdQQVRDSCcsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNDb21wbGV4RGF0YSkge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5jb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKGFqYXhTZXR0aW5ncyk7XG4gICAgfVxufVxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuUGJ4QXBpQ2xpZW50ID0gUGJ4QXBpQ2xpZW50OyJdfQ==