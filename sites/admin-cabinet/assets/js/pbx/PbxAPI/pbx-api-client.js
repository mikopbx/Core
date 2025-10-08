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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4LWFwaS1jbGllbnQuanMiXSwibmFtZXMiOlsiUGJ4QXBpQ2xpZW50IiwiY29uZmlnIiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiaXNTaW5nbGV0b24iLCJzaW5nbGV0b24iLCJhcGlVcmwiLCJDb25maWciLCJwYnhVcmwiLCJlbmRwb2ludHMiLCJnZXRMaXN0IiwiT2JqZWN0IiwiZW50cmllcyIsIm1ldGhvZE5hbWUiLCJtZXRob2RQYXRoIiwicmVzcG9uc2UiLCJ4aHIiLCJyZXN1bHQiLCJzdGF0dXMiLCJvbkZhaWx1cmVDYWxsYmFjayIsIm9uRXJyb3JDYWxsYmFjayIsIkpTT04iLCJwYXJzZSIsInJlc3BvbnNlVGV4dCIsImUiLCJzdWNjZXNzQ2FsbGJhY2siLCJmYWlsdXJlQ2FsbGJhY2siLCJzZWxmIiwib24iLCJzdWNjZXNzVGVzdCIsIm9uU3VjY2VzcyIsIm9uRmFpbHVyZSIsImhhbmRsZUF1dGhFcnJvciIsIm9uRXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwibWVzc2FnZXMiLCJlcnJvciIsInJlY29yZElkIiwiY2FsbGJhY2siLCJpc05ldyIsInVybCIsImdldERlZmF1bHQiLCJhcGlTZXR0aW5ncyIsImdldEJhc2VBcGlTZXR0aW5ncyIsImRhdGEiLCJfaXNOZXciLCIkIiwiYXBpIiwibWV0aG9kIiwiZGF0YU9yQ2FsbGJhY2siLCJnZXQiLCJhY3R1YWxDYWxsYmFjayIsInBhcmFtcyIsImhhc093blByb3BlcnR5IiwiaXNOZXdSZWNvcmQiLCJjbGVhbkRhdGEiLCJ1bmRlZmluZWQiLCJfbWV0aG9kIiwiZ2V0UmVjb3JkSWQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJnbG9iYWxDc3JmVG9rZW5LZXkiLCJnbG9iYWxDc3JmVG9rZW4iLCJoYXNDb21wbGV4RGF0YSIsImNvbnRlbnRUeXBlIiwic3RyaW5naWZ5IiwiaHR0cE1ldGhvZCIsInJlc291cmNlSWQiLCJhc3luY0NoYW5uZWxJZCIsImNoYW5uZWxJZCIsImlkIiwicmVxdWVzdERhdGEiLCJhamF4U2V0dGluZ3MiLCJiZWZvcmVYSFIiLCJzZXRSZXF1ZXN0SGVhZGVyIiwiaXNSZWRpcmVjdGluZ1RvTG9naW4iLCJzZXRUaW1lb3V0Iiwid2luZG93IiwibG9jYXRpb24iLCJocmVmIiwiZ2xvYmFsUm9vdFVybCIsInZhbHVlcyIsInZhbHVlIiwiQXJyYXkiLCJpc0FycmF5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxZO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7QUFHSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJLHdCQUFZQyxNQUFaLEVBQW9CO0FBQUE7O0FBQ2hCLFNBQUtDLFFBQUwsR0FBZ0JELE1BQU0sQ0FBQ0MsUUFBdkI7QUFDQSxTQUFLQyxhQUFMLEdBQXFCRixNQUFNLENBQUNFLGFBQVAsSUFBd0IsRUFBN0M7QUFDQSxTQUFLQyxXQUFMLEdBQW1CSCxNQUFNLENBQUNJLFNBQVAsSUFBb0IsS0FBdkMsQ0FIZ0IsQ0FLaEI7O0FBQ0EsU0FBS0MsTUFBTCxhQUFpQkMsTUFBTSxDQUFDQyxNQUF4QixTQUFpQyxLQUFLTixRQUF0QyxFQU5nQixDQVFoQjs7QUFDQSxTQUFLTyxTQUFMLEdBQWlCO0FBQ2JDLE1BQUFBLE9BQU8sRUFBRSxLQUFLSjtBQURELEtBQWpCLENBVGdCLENBYWhCOztBQUNBLHVDQUF1Q0ssTUFBTSxDQUFDQyxPQUFQLENBQWUsS0FBS1QsYUFBcEIsQ0FBdkMscUNBQTJFO0FBQXRFO0FBQUEsVUFBT1UsVUFBUDtBQUFBLFVBQW1CQyxV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RTtBQUN2RSxpQkFBTyxJQUFQO0FBQ0g7QUFDSjs7QUFDRCxhQUFPLEtBQVA7QUFDSDs7OztLQXVKTDs7O2dCQWptQk1uRixZLDBCQU00QixLOztBQTRsQmxDOEUsTUFBTSxDQUFDOUUsWUFBUCxHQUFzQkEsWUFBdEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBQYnhBcGksICQgKi9cblxuLyoqXG4gKiBQYnhBcGlDbGllbnQgLSBVbmlmaWVkIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgYWxsIGVudGl0aWVzXG4gKlxuICogVGhpcyBjbGFzcyBwcm92aWRlcyBhIHN0YW5kYXJkIGludGVyZmFjZSBmb3IgYWxsIENSVUQgb3BlcmF0aW9uc1xuICogYW5kIGVsaW1pbmF0ZXMgY29kZSBkdXBsaWNhdGlvbiBhY3Jvc3MgQVBJIG1vZHVsZXMuXG4gKlxuICogRmVhdHVyZXM6XG4gKiAtIFN0YW5kYXJkIFJFU1RmdWwgb3BlcmF0aW9ucyAoR0VULCBQT1NULCBQVVQsIERFTEVURSlcbiAqIC0gQ3VzdG9tIG1ldGhvZHMgc3VwcG9ydCB2aWEgY29sb24gbm90YXRpb24gKDpnZXREZWZhdWx0KVxuICogLSBBdXRvbWF0aWMgSFRUUCBtZXRob2Qgc2VsZWN0aW9uIGJhc2VkIG9uIGRhdGFcbiAqIC0gQ1NSRiB0b2tlbiBtYW5hZ2VtZW50XG4gKiAtIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBQYnhEYXRhVGFibGVJbmRleFxuICogLSBHbG9iYWwgYXV0aG9yaXphdGlvbiBlcnJvciBoYW5kbGluZyAoNDAxLzQwMylcbiAqXG4gKiBAY2xhc3MgUGJ4QXBpQ2xpZW50XG4gKi9cbmNsYXNzIFBieEFwaUNsaWVudCB7XG4gICAgLyoqXG4gICAgICogRmxhZyB0byBwcmV2ZW50IG11bHRpcGxlIHJlZGlyZWN0cyBvbiBhdXRoIGVycm9yc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgaXNSZWRpcmVjdGluZ1RvTG9naW4gPSBmYWxzZTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyBBUEkgY2xpZW50IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbmZpZy5lbmRwb2ludCAtIEJhc2UgQVBJIGVuZHBvaW50IChlLmcuLCAnL3BieGNvcmUvYXBpL3YzL2l2ci1tZW51JylcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbmZpZy5jdXN0b21NZXRob2RzXSAtIE1hcCBvZiBjdXN0b20gbWV0aG9kcyAoZS5nLiwge2dldERlZmF1bHQ6ICc6Z2V0RGVmYXVsdCd9KVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5zaW5nbGV0b25dIC0gV2hldGhlciB0aGlzIGlzIGEgc2luZ2xldG9uIHJlc291cmNlIChubyBJRHMgaW4gVVJMcylcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICAgICAgdGhpcy5lbmRwb2ludCA9IGNvbmZpZy5lbmRwb2ludDtcbiAgICAgICAgdGhpcy5jdXN0b21NZXRob2RzID0gY29uZmlnLmN1c3RvbU1ldGhvZHMgfHwge307XG4gICAgICAgIHRoaXMuaXNTaW5nbGV0b24gPSBjb25maWcuc2luZ2xldG9uIHx8IGZhbHNlO1xuXG4gICAgICAgIC8vIEV4dHJhY3QgYmFzZSBVUkwgZm9yIENvbmZpZy5wYnhVcmxcbiAgICAgICAgdGhpcy5hcGlVcmwgPSBgJHtDb25maWcucGJ4VXJsfSR7dGhpcy5lbmRwb2ludH1gO1xuXG4gICAgICAgIC8vIENyZWF0ZSBlbmRwb2ludHMgcHJvcGVydHkgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBQYnhEYXRhVGFibGVJbmRleFxuICAgICAgICB0aGlzLmVuZHBvaW50cyA9IHtcbiAgICAgICAgICAgIGdldExpc3Q6IHRoaXMuYXBpVXJsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWRkIGN1c3RvbSBtZXRob2QgZW5kcG9pbnRzXG4gICAgICAgIGZvciAoY29uc3QgW21ldGhvZE5hbWUsIG1ldGhvZFBhdGhdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMuY3VzdG9tTWV0aG9kcykpIHtcbiAgICAgICAgICAgIHRoaXMuZW5kcG9pbnRzW21ldGhvZE5hbWVdID0gYCR7dGhpcy5hcGlVcmx9JHttZXRob2RQYXRofWA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgYXV0aG9yaXphdGlvbiBlcnJvcnMgKDQwMSkgYnkgcmVkaXJlY3RpbmcgdG8gbG9naW5cbiAgICAgKiBOb3RlOiA0MDMgRm9yYmlkZGVuIGlzIE5PVCBoYW5kbGVkIGhlcmUgYXMgaXQgbWF5IGluZGljYXRlIGFjY2VzcyBkZW5pZWQgdG8gYSBzcGVjaWZpYyByZXNvdXJjZSxcbiAgICAgKiBub3Qgc2Vzc2lvbiBleHBpcmF0aW9uLiBTZXNzaW9uIGxvc3MgaXMgaW5kaWNhdGVkIGJ5IDQwMSBVbmF1dGhvcml6ZWQgb25seS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhdHVzIC0gSFRUUCBzdGF0dXMgY29kZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgaGFuZGxlQXV0aEVycm9yKHN0YXR1cykge1xuICAgICAgICAvLyBPbmx5IGhhbmRsZSA0MDEgVW5hdXRob3JpemVkIC0gdGhpcyBpbmRpY2F0ZXMgc2Vzc2lvbiBsb3NzXG4gICAgICAgIC8vIDQwMyBGb3JiaWRkZW4gbWVhbnMgYWNjZXNzIGRlbmllZCB0byBhIHJlc291cmNlICh1c2VyIGxhY2tzIHBlcm1pc3Npb25zKVxuICAgICAgICBpZiAoc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgIC8vIFByZXZlbnQgbXVsdGlwbGUgcmVkaXJlY3RzXG4gICAgICAgICAgICBpZiAoIVBieEFwaUNsaWVudC5pc1JlZGlyZWN0aW5nVG9Mb2dpbikge1xuICAgICAgICAgICAgICAgIFBieEFwaUNsaWVudC5pc1JlZGlyZWN0aW5nVG9Mb2dpbiA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAvLyBSZWRpcmVjdCB0byBsb2dpbiBwYWdlIGFmdGVyIGEgc2hvcnQgZGVsYXkgdG8gYWxsb3cgYW55IHBlbmRpbmcgb3BlcmF0aW9ucyB0byBjb21wbGV0ZVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gc3VjY2VzcyB0ZXN0IGZvciBSRVNUZnVsIEFQSSB3aXRoIHByb3BlciBIVFRQIGNvZGVzXG4gICAgICogVHJlYXRzIGJ1c2luZXNzIGVycm9ycyAoNHh4KSBhcyBmYWlsdXJlcywgbm90IG5ldHdvcmsgZXJyb3JzXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBTZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge1hNTEh0dHBSZXF1ZXN0fSB4aHIgLSBYTUxIdHRwUmVxdWVzdCBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBzdWNjZXNzVGVzdChyZXNwb25zZSwgeGhyKSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgYSB2YWxpZCByZXNwb25zZSBvYmplY3Qgd2l0aCByZXN1bHQgZmllbGQsIHVzZSBpdFxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgdHlwZW9mIHJlc3BvbnNlLnJlc3VsdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5yZXN1bHQgPT09IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGb3IgcmVzcG9uc2VzIHdpdGhvdXQgcmVzdWx0IGZpZWxkLCBjaGVjayBIVFRQIHN0YXR1c1xuICAgICAgICAvLyAyeHggPSBzdWNjZXNzLCA0eHgvNXh4ID0gZmFpbHVyZSAoYnV0IG5vdCBuZXR3b3JrIGVycm9yKVxuICAgICAgICBjb25zdCBzdGF0dXMgPSB4aHIgPyB4aHIuc3RhdHVzIDogMjAwO1xuICAgICAgICByZXR1cm4gc3RhdHVzID49IDIwMCAmJiBzdGF0dXMgPCAzMDA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGVycm9yIGhhbmRsZXIgZm9yIFJFU1RmdWwgQVBJXG4gICAgICogRGlzdGluZ3Vpc2hlcyBiZXR3ZWVuIGJ1c2luZXNzIGVycm9ycyAoNHh4KSBhbmQgcmVhbCBuZXR3b3JrIGVycm9yc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtYTUxIdHRwUmVxdWVzdH0geGhyIC0gWE1MSHR0cFJlcXVlc3Qgb2JqZWN0XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb25GYWlsdXJlQ2FsbGJhY2sgLSBDYWxsYmFjayBmb3IgYnVzaW5lc3MgZXJyb3JzICg0eHgpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb25FcnJvckNhbGxiYWNrIC0gQ2FsbGJhY2sgZm9yIG5ldHdvcmsgZXJyb3JzXG4gICAgICovXG4gICAgaGFuZGxlRXJyb3IoeGhyLCBvbkZhaWx1cmVDYWxsYmFjaywgb25FcnJvckNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IHhoci5zdGF0dXM7XG5cbiAgICAgICAgLy8gQnVzaW5lc3MgZXJyb3JzICg0eHgpIC0gdmFsaWRhdGlvbiwgY29uZmxpY3RzLCBldGMuXG4gICAgICAgIC8vIFRoZXNlIGhhdmUgcmVzcG9uc2UgYm9keSB3aXRoIGVycm9yIGRldGFpbHNcbiAgICAgICAgaWYgKHN0YXR1cyA+PSA0MDAgJiYgc3RhdHVzIDwgNTAwKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICAvLyBDYWxsIG9uRmFpbHVyZSB3aXRoIHBhcnNlZCByZXNwb25zZVxuICAgICAgICAgICAgICAgIG9uRmFpbHVyZUNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBjYW4ndCBwYXJzZSBKU09OLCB0cmVhdCBhcyBuZXR3b3JrIGVycm9yXG4gICAgICAgICAgICAgICAgb25FcnJvckNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2VydmVyIGVycm9ycyAoNXh4KSBvciBuZXR3b3JrIGVycm9ycyAoMClcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvbkVycm9yQ2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBiYXNlIEFQSSBzZXR0aW5ncyB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZ1xuICAgICAqIFRoaXMgc3RhbmRhcmRpemVzIGVycm9yIGhhbmRsaW5nIGFjcm9zcyBhbGwgQVBJIGNhbGxzXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdWNjZXNzQ2FsbGJhY2sgLSBDYWxsZWQgb24gc3VjY2Vzc2Z1bCByZXNwb25zZSAoMnh4ICsgcmVzdWx0PXRydWUpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gZmFpbHVyZUNhbGxiYWNrIC0gQ2FsbGVkIG9uIGJ1c2luZXNzIGVycm9ycyAoNHh4IG9yIHJlc3VsdD1mYWxzZSlcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIEFQSSBzZXR0aW5ncyBvYmplY3QgZm9yICQuYXBpKClcbiAgICAgKi9cbiAgICBnZXRCYXNlQXBpU2V0dGluZ3Moc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdChyZXNwb25zZSwgeGhyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuc3VjY2Vzc1Rlc3QocmVzcG9uc2UsIHhocik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgc3VjY2Vzc0NhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UsIHhocikge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGZvciBhdXRob3JpemF0aW9uIGVycm9ycyBhbmQgcmVkaXJlY3QgdG8gbG9naW4gaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0geGhyID8geGhyLnN0YXR1cyA6IDA7XG4gICAgICAgICAgICAgICAgaWYgKFBieEFwaUNsaWVudC5oYW5kbGVBdXRoRXJyb3Ioc3RhdHVzKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIERvbid0IGNhbGwgY2FsbGJhY2sgaWYgcmVkaXJlY3RpbmdcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgLy8gT25seSBoYW5kbGUgcmVhbCBuZXR3b3JrIGVycm9ycyAoNXh4LCB0aW1lb3V0LCBjb25uZWN0aW9uIHJlZnVzZWQpXG4gICAgICAgICAgICAgICAgLy8gRm9yIDR4eCBlcnJvcnMsIFNlbWFudGljIFVJIGFscmVhZHkgY2FsbGVkIG9uRmFpbHVyZSwgc28gc2tpcFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IHhociA/IHhoci5zdGF0dXMgOiAwO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGF1dGhvcml6YXRpb24gZXJyb3JzIGFuZCByZWRpcmVjdCB0byBsb2dpbiBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICBpZiAoUGJ4QXBpQ2xpZW50LmhhbmRsZUF1dGhFcnJvcihzdGF0dXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjsgLy8gRG9uJ3QgY2FsbCBjYWxsYmFjayBpZiByZWRpcmVjdGluZ1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNraXAgaWYgdGhpcyBpcyBhIGJ1c2luZXNzIGVycm9yICg0eHgpIC0gYWxyZWFkeSBoYW5kbGVkIGJ5IG9uRmFpbHVyZVxuICAgICAgICAgICAgICAgIGlmIChzdGF0dXMgPj0gNDAwICYmIHN0YXR1cyA8IDUwMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gUmVhbCBuZXR3b3JrL3NlcnZlciBlcnJvciAtIHNob3cgZ2VuZXJpYyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ119XG4gICAgICAgICAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIGJ5IElEIG9yIGdldCBkZWZhdWx0IHZhbHVlcyBmb3IgbmV3IHJlY29yZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFJlY29yZCBJRCBvciBlbXB0eS9udWxsIGZvciBuZXcgcmVjb3JkXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFJlY29yZChyZWNvcmRJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2Ugc2hvdWxkIHVzZSBhIGN1c3RvbSBtZXRob2QgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgIGNvbnN0IGlzTmV3ID0gIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJyB8fCByZWNvcmRJZCA9PT0gJ25ldyc7XG4gICAgICAgIGxldCB1cmw7XG5cbiAgICAgICAgaWYgKGlzTmV3ICYmIHRoaXMuY3VzdG9tTWV0aG9kcy5nZXREZWZhdWx0KSB7XG4gICAgICAgICAgICAvLyBVc2UgY3VzdG9tIG1ldGhvZCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfSR7dGhpcy5jdXN0b21NZXRob2RzLmdldERlZmF1bHR9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEdldCBleGlzdGluZyByZWNvcmQgYnkgSURcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke3JlY29yZElkfWA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IF9pc05ldyBmbGFnIGZvciBuZXcgcmVjb3JkcyB0byBpbmRpY2F0ZSBQT1NUIHNob3VsZCBiZSB1c2VkXG4gICAgICAgICAgICAgICAgaWYgKGlzTmV3ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGxpc3Qgb2YgcmVjb3JkcyAob3Igc2luZ2xlIHJlY29yZCBmb3Igc2luZ2xldG9uKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fGZ1bmN0aW9ufSBkYXRhT3JDYWxsYmFjayAtIE9wdGlvbmFsIHBhcmFtcyBvciBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gLSBDYWxsYmFjayBpZiBmaXJzdCBwYXJhbSBpcyBkYXRhXG4gICAgICovXG4gICAgZ2V0TGlzdChkYXRhT3JDYWxsYmFjaywgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gRm9yIHNpbmdsZXRvbiByZXNvdXJjZXMsIHJlZGlyZWN0IHRvIGdldCgpIG1ldGhvZFxuICAgICAgICBpZiAodGhpcy5pc1NpbmdsZXRvbikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLmdldCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldChkYXRhT3JDYWxsYmFjaywgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIG92ZXJsb2FkZWQgcGFyYW1ldGVyc1xuICAgICAgICBsZXQgYWN0dWFsQ2FsbGJhY2s7XG4gICAgICAgIGxldCBwYXJhbXMgPSB7fTtcblxuICAgICAgICBpZiAodHlwZW9mIGRhdGFPckNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9IGRhdGFPckNhbGxiYWNrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFyYW1zID0gZGF0YU9yQ2FsbGJhY2sgfHwge307XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIHJldHVybiBhIHN0cnVjdHVyZSB3aXRoIHJlc3VsdCBhbmQgZGF0YSBmaWVsZHNcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgIXJlc3BvbnNlLmhhc093blByb3BlcnR5KCdkYXRhJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhY3R1YWxDYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5hcGlVcmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YTogcGFyYW1zLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhdmUgcmVjb3JkIChjcmVhdGUgb3IgdXBkYXRlKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzYXZlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIHNhdmVSZWNvcmQoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgcmVjb3JkXG4gICAgICAgIGNvbnN0IGlzTmV3ID0gdGhpcy5pc05ld1JlY29yZChkYXRhKTtcblxuICAgICAgICAvLyBDbGVhbiB1cCBpbnRlcm5hbCBmbGFnc1xuICAgICAgICBjb25zdCBjbGVhbkRhdGEgPSB7Li4uZGF0YX07XG4gICAgICAgIGlmIChjbGVhbkRhdGEuX2lzTmV3ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBjbGVhbkRhdGEuX2lzTmV3O1xuICAgICAgICB9XG4gICAgICAgIC8vIFJlbW92ZSBfbWV0aG9kIGFzIGl0J3MgaGFuZGxlZCBieSB0aGUgYWN0dWFsIEhUVFAgbWV0aG9kXG4gICAgICAgIGlmIChjbGVhbkRhdGEuX21ldGhvZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWxldGUgY2xlYW5EYXRhLl9tZXRob2Q7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgdGhlIHJlY29yZCBJRCBmb3IgdXBkYXRlc1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IHRoaXMuZ2V0UmVjb3JkSWQoY2xlYW5EYXRhKTtcblxuICAgICAgICAvLyB2MyBBUEk6IFBPU1QgZm9yIG5ldyByZWNvcmRzLCBQVVQgZm9yIHVwZGF0ZXNcbiAgICAgICAgY29uc3QgbWV0aG9kID0gaXNOZXcgPyAnUE9TVCcgOiAnUFVUJztcbiAgICAgICAgY29uc3QgdXJsID0gaXNOZXcgPyB0aGlzLmFwaVVybCA6IGAke3RoaXMuYXBpVXJsfS8ke3JlY29yZElkfWA7XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgICAgIGRhdGE6IGNsZWFuRGF0YSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIGJlZm9yZVNlbmQoc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgQ1NSRiB0b2tlbiBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGdsb2JhbENzcmZUb2tlbktleSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGdsb2JhbENzcmZUb2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYW5EYXRhW2dsb2JhbENzcmZUb2tlbktleV0gPSBnbG9iYWxDc3JmVG9rZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlIG5lZWQgdG8gc2VuZCBhcyBKU09OIChmb3IgY29tcGxleCBzdHJ1Y3R1cmVzKVxuICAgICAgICAgICAgICAgIGlmIChQYnhBcGlDbGllbnQuaGFzQ29tcGxleERhdGEoY2xlYW5EYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5jb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KGNsZWFuRGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ119XG4gICAgICAgICAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgcmVjb3JkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gUmVjb3JkIElEIHRvIGRlbGV0ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBDU1JGIHRva2VuIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIGdsb2JhbENzcmZUb2tlbktleSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGdsb2JhbENzcmZUb2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGRhdGFbZ2xvYmFsQ3NyZlRva2VuS2V5XSA9IGdsb2JhbENzcmZUb2tlbjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gY2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuYXBpVXJsfS8ke3JlY29yZElkfWAsXG4gICAgICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGwgYSBjdXN0b20gbWV0aG9kXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZE5hbWUgLSBNZXRob2QgbmFtZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fGZ1bmN0aW9ufSBkYXRhT3JDYWxsYmFjayAtIERhdGEgb3IgY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQ2FsbGJhY2sgaWYgZmlyc3QgcGFyYW0gaXMgZGF0YVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaHR0cE1ldGhvZF0gLSBIVFRQIG1ldGhvZCB0byB1c2UgKEdFVCBvciBQT1NUKSwgZGVmYXVsdHMgdG8gR0VUXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtyZXNvdXJjZUlkXSAtIFJlc291cmNlIElEIGZvciByZXNvdXJjZS1sZXZlbCBtZXRob2RzXG4gICAgICovXG4gICAgY2FsbEN1c3RvbU1ldGhvZChtZXRob2ROYW1lLCBkYXRhT3JDYWxsYmFjaywgY2FsbGJhY2ssIGh0dHBNZXRob2QgPSAnR0VUJywgcmVzb3VyY2VJZCA9IG51bGwpIHtcbiAgICAgICAgLy8gSGFuZGxlIG92ZXJsb2FkZWQgcGFyYW1ldGVyc1xuICAgICAgICBsZXQgYWN0dWFsQ2FsbGJhY2s7XG4gICAgICAgIGxldCBkYXRhID0ge307XG5cbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhT3JDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBkYXRhT3JDYWxsYmFjaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhT3JDYWxsYmFjayB8fCB7fTtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtZXRob2RQYXRoID0gdGhpcy5jdXN0b21NZXRob2RzW21ldGhvZE5hbWVdO1xuICAgICAgICBpZiAoIW1ldGhvZFBhdGgpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFtgVW5rbm93biBjdXN0b20gbWV0aG9kOiAke21ldGhvZE5hbWV9YF19XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4dHJhY3QgYXN5bmMgY2hhbm5lbCBJRCBpZiBwcmVzZW50ICh1c2VkIGZvciBsb25nLXJ1bm5pbmcgb3BlcmF0aW9ucylcbiAgICAgICAgY29uc3QgYXN5bmNDaGFubmVsSWQgPSBkYXRhLmFzeW5jQ2hhbm5lbElkIHx8IGRhdGEuY2hhbm5lbElkO1xuXG4gICAgICAgIC8vIEJ1aWxkIFVSTCB3aXRoIElEIGlmIHByb3ZpZGVkIChmb3IgcmVzb3VyY2UtbGV2ZWwgY3VzdG9tIG1ldGhvZHMpXG4gICAgICAgIGxldCB1cmwgPSB0aGlzLmFwaVVybDtcbiAgICAgICAgaWYgKHJlc291cmNlSWQpIHtcbiAgICAgICAgICAgIC8vIFJlc291cmNlLWxldmVsIG1ldGhvZDogL2FwaS92My9yZXNvdXJjZS97aWR9Om1ldGhvZCAoUkVTVGZ1bCBzdGFuZGFyZClcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke3Jlc291cmNlSWR9JHttZXRob2RQYXRofWA7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IFJlc291cmNlLWxldmVsIG1ldGhvZDogL2FwaS92My9yZXNvdXJjZS97aWR9Om1ldGhvZFxuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7ZGF0YS5pZH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBpZCBmcm9tIGRhdGEgc2luY2UgaXQncyBpbiB0aGUgVVJMXG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0RGF0YSA9IHsuLi5kYXRhfTtcbiAgICAgICAgICAgIGRlbGV0ZSByZXF1ZXN0RGF0YS5pZDtcbiAgICAgICAgICAgIGRhdGEgPSByZXF1ZXN0RGF0YTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIENvbGxlY3Rpb24tbGV2ZWwgbWV0aG9kOiAvYXBpL3YzL3Jlc291cmNlOm1ldGhvZFxuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9JHttZXRob2RQYXRofWA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgQ1NSRiB0b2tlbiBmb3IgUE9TVCByZXF1ZXN0c1xuICAgICAgICBpZiAoaHR0cE1ldGhvZCA9PT0gJ1BPU1QnICYmIHR5cGVvZiBnbG9iYWxDc3JmVG9rZW5LZXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBnbG9iYWxDc3JmVG9rZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBkYXRhW2dsb2JhbENzcmZUb2tlbktleV0gPSBnbG9iYWxDc3JmVG9rZW47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgSlNPTiBmb3IgY29tcGxleCBkYXRhLCBmb3JtIGVuY29kaW5nIGZvciBzaW1wbGUgZGF0YVxuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBhY3R1YWxDYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IGFqYXhTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBodHRwTWV0aG9kLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgYXN5bmMgY2hhbm5lbCBoZWFkZXIgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKGFzeW5jQ2hhbm5lbElkKSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuYmVmb3JlWEhSID0gKHhocikgPT4ge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdYLUFzeW5jLVJlc3BvbnNlLUNoYW5uZWwtSWQnLCBhc3luY0NoYW5uZWxJZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGb3IgR0VUIHJlcXVlc3RzLCBhbHdheXMgdXNlIHF1ZXJ5IHBhcmFtZXRlcnMgKG5vIEpTT04gaW4gYm9keSlcbiAgICAgICAgLy8gRm9yIFBPU1QvUFVUL0RFTEVURSwgdXNlIEpTT04gZm9yIGNvbXBsZXggZGF0YSAob2JqZWN0cywgYXJyYXlzKVxuICAgICAgICBpZiAoaHR0cE1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgICAgICAgIC8vIEdFVCByZXF1ZXN0czogc2VuZCBhcyBxdWVyeSBwYXJhbWV0ZXJzXG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBQT1NUL1BVVC9ERUxFVEU6IGNoZWNrIGlmIHdlIG5lZWQgSlNPTiBlbmNvZGluZ1xuICAgICAgICAgICAgY29uc3QgaGFzQ29tcGxleERhdGEgPSBQYnhBcGlDbGllbnQuaGFzQ29tcGxleERhdGEoZGF0YSk7XG4gICAgICAgICAgICBpZiAoaGFzQ29tcGxleERhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBTZW5kIGFzIEpTT04gdG8gcHJlc2VydmUgY29tcGxleCBzdHJ1Y3R1cmVzXG4gICAgICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgICAgICAgICBhamF4U2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNlbmQgYXMgcmVndWxhciBmb3JtIGRhdGFcbiAgICAgICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaShhamF4U2V0dGluZ3MpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXRlcm1pbmUgaWYgZGF0YSByZXByZXNlbnRzIGEgbmV3IHJlY29yZFxuICAgICAqIENhbiBiZSBvdmVycmlkZGVuIGluIHNwZWNpZmljIEFQSSBtb2R1bGVzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIGNoZWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgbmV3IHJlY29yZFxuICAgICAqL1xuICAgIGlzTmV3UmVjb3JkKGRhdGEpIHtcbiAgICAgICAgLy8gVGhlIG9ubHkgd2F5IHRvIGRldGVybWluZSAtIF9pc05ldyBmbGFnXG4gICAgICAgIC8vIElmIGZsYWcgaXMgbm90IGV4cGxpY2l0bHkgc2V0LCBjaGVjayBJRFxuICAgICAgICBpZiAoZGF0YS5faXNOZXcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEuX2lzTmV3ID09PSB0cnVlIHx8IGRhdGEuX2lzTmV3ID09PSAndHJ1ZSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGYWxsYmFjayB0byBJRCBjaGVjayBvbmx5IGlmIGZsYWcgaXMgbm90IHNldFxuICAgICAgICByZXR1cm4gIWRhdGEuaWQgfHwgZGF0YS5pZCA9PT0gJycgfHwgZGF0YS5pZCA9PT0gJ25ldyc7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBkYXRhXG4gICAgICogQ2FuIGJlIG92ZXJyaWRkZW4gaW4gc3BlY2lmaWMgQVBJIG1vZHVsZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmVjb3JkIElEXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoZGF0YSkge1xuICAgICAgICAvLyBSRVNUIEFQSSB2MyB1c2VzIG9ubHkgJ2lkJyBmaWVsZFxuICAgICAgICByZXR1cm4gZGF0YS5pZDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgZGF0YSBjb250YWlucyBjb21wbGV4IHN0cnVjdHVyZXMgdGhhdCBuZWVkIEpTT04gZW5jb2RpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gY2hlY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBjb250YWlucyBjb21wbGV4IGRhdGFcbiAgICAgKi9cbiAgICBzdGF0aWMgaGFzQ29tcGxleERhdGEoZGF0YSkge1xuICAgICAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIE9iamVjdC52YWx1ZXMoZGF0YSkpIHtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSB8fCAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBHRVQgcmVxdWVzdCAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFF1ZXJ5IHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtpZF0gLSBPcHRpb25hbCByZWNvcmQgSUQgZm9yIHJlc291cmNlLXNwZWNpZmljIHJlcXVlc3RzXG4gICAgICovXG4gICAgY2FsbEdldChwYXJhbXMsIGNhbGxiYWNrLCBpZCkge1xuICAgICAgICBsZXQgdXJsID0gdGhpcy5hcGlVcmw7XG5cbiAgICAgICAgLy8gRm9yIG5vbi1zaW5nbGV0b24gcmVzb3VyY2VzIHdpdGggSUQsIGFwcGVuZCBJRCB0byBVUkxcbiAgICAgICAgaWYgKCF0aGlzLmlzU2luZ2xldG9uICYmIGlkKSB7XG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtpZH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gY2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMgfHwge30sXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIFBPU1QgcmVxdWVzdCAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNlbmRcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtpZF0gLSBPcHRpb25hbCByZXNvdXJjZSBJRCBmb3IgcmVzb3VyY2Utc3BlY2lmaWMgcmVxdWVzdHNcbiAgICAgKi9cbiAgICBjYWxsUG9zdChkYXRhLCBjYWxsYmFjaywgaWQpIHtcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke2lkfWA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYXNDb21wbGV4RGF0YSA9IFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShkYXRhKTtcbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gY2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzQ29tcGxleERhdGEpIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaShhamF4U2V0dGluZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gUFVUIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzZW5kXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaWRdIC0gT3B0aW9uYWwgcmVzb3VyY2UgSUQgZm9yIHJlc291cmNlLXNwZWNpZmljIHJlcXVlc3RzXG4gICAgICovXG4gICAgY2FsbFB1dChkYXRhLCBjYWxsYmFjaywgaWQpIHtcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke2lkfWA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYXNDb21wbGV4RGF0YSA9IFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShkYXRhKTtcbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gY2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNDb21wbGV4RGF0YSkge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5jb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKGFqYXhTZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBERUxFVEUgcmVxdWVzdCAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlc291cmNlIElEIHRvIGRlbGV0ZVxuICAgICAqL1xuICAgIGNhbGxEZWxldGUoY2FsbGJhY2ssIGlkKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB7fTtcblxuICAgICAgICBpZiAodHlwZW9mIGdsb2JhbENzcmZUb2tlbktleSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGdsb2JhbENzcmZUb2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGRhdGFbZ2xvYmFsQ3NyZlRva2VuS2V5XSA9IGdsb2JhbENzcmZUb2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKSxcbiAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmFwaVVybH0vJHtpZH1gLFxuICAgICAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIFBBVENIIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzZW5kXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGNhbGxQYXRjaChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBoYXNDb21wbGV4RGF0YSA9IFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShkYXRhKTtcbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gY2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHRoaXMuYXBpVXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzQ29tcGxleERhdGEpIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaShhamF4U2V0dGluZ3MpO1xuICAgIH1cbn1cblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93LlBieEFwaUNsaWVudCA9IFBieEFwaUNsaWVudDsiXX0=