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
    key: "handleAuthError",
    value: function handleAuthError(status) {
      // Only handle 401 Unauthorized - this indicates session loss
      // 403 Forbidden means access denied to a resource (user lacks permissions)
      if (status === 401) {
        // Prevent multiple redirects
        if (!PbxApiClient.isRedirectingToLogin) {
          PbxApiClient.isRedirectingToLogin = true; // Redirect to login page after a short delay to allow any pending operations to complete

          setTimeout(function () {
            window.location.href = '/admin/session/index';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4LWFwaS1jbGllbnQuanMiXSwibmFtZXMiOlsiUGJ4QXBpQ2xpZW50IiwiY29uZmlnIiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiaXNTaW5nbGV0b24iLCJzaW5nbGV0b24iLCJhcGlVcmwiLCJDb25maWciLCJwYnhVcmwiLCJlbmRwb2ludHMiLCJnZXRMaXN0IiwiT2JqZWN0IiwiZW50cmllcyIsIm1ldGhvZE5hbWUiLCJtZXRob2RQYXRoIiwicmVzcG9uc2UiLCJ4aHIiLCJyZXN1bHQiLCJzdGF0dXMiLCJvbkZhaWx1cmVDYWxsYmFjayIsIm9uRXJyb3JDYWxsYmFjayIsIkpTT04iLCJwYXJzZSIsInJlc3BvbnNlVGV4dCIsImUiLCJzdWNjZXNzQ2FsbGJhY2siLCJmYWlsdXJlQ2FsbGJhY2siLCJzZWxmIiwib24iLCJzdWNjZXNzVGVzdCIsIm9uU3VjY2VzcyIsIm9uRmFpbHVyZSIsImhhbmRsZUF1dGhFcnJvciIsIm9uRXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwibWVzc2FnZXMiLCJlcnJvciIsInJlY29yZElkIiwiY2FsbGJhY2siLCJpc05ldyIsInVybCIsImdldERlZmF1bHQiLCJhcGlTZXR0aW5ncyIsImdldEJhc2VBcGlTZXR0aW5ncyIsImRhdGEiLCJfaXNOZXciLCIkIiwiYXBpIiwibWV0aG9kIiwiZGF0YU9yQ2FsbGJhY2siLCJnZXQiLCJhY3R1YWxDYWxsYmFjayIsInBhcmFtcyIsImhhc093blByb3BlcnR5IiwiaXNOZXdSZWNvcmQiLCJjbGVhbkRhdGEiLCJ1bmRlZmluZWQiLCJfbWV0aG9kIiwiZ2V0UmVjb3JkSWQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJnbG9iYWxDc3JmVG9rZW5LZXkiLCJnbG9iYWxDc3JmVG9rZW4iLCJoYXNDb21wbGV4RGF0YSIsImNvbnRlbnRUeXBlIiwic3RyaW5naWZ5IiwiaHR0cE1ldGhvZCIsInJlc291cmNlSWQiLCJpZCIsInJlcXVlc3REYXRhIiwia2V5IiwidmFsdWUiLCJBcnJheSIsImlzQXJyYXkiLCJhamF4U2V0dGluZ3MiLCJpc1JlZGlyZWN0aW5nVG9Mb2dpbiIsInNldFRpbWVvdXQiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImhyZWYiLCJ2YWx1ZXMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLFk7QUFDRjtBQUNKO0FBQ0E7QUFDQTtBQUNBOztBQUdJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0ksd0JBQVlDLE1BQVosRUFBb0I7QUFBQTs7QUFDaEIsU0FBS0MsUUFBTCxHQUFnQkQsTUFBTSxDQUFDQyxRQUF2QjtBQUNBLFNBQUtDLGFBQUwsR0FBcUJGLE1BQU0sQ0FBQ0UsYUFBUCxJQUF3QixFQUE3QztBQUNBLFNBQUtDLFdBQUwsR0FBbUJILE1BQU0sQ0FBQ0ksU0FBUCxJQUFvQixLQUF2QyxDQUhnQixDQUtoQjs7QUFDQSxTQUFLQyxNQUFMLGFBQWlCQyxNQUFNLENBQUNDLE1BQXhCLFNBQWlDLEtBQUtOLFFBQXRDLEVBTmdCLENBUWhCOztBQUNBLFNBQUtPLFNBQUwsR0FBaUI7QUFDYkMsTUFBQUEsT0FBTyxFQUFFLEtBQUtKO0FBREQsS0FBakIsQ0FUZ0IsQ0FhaEI7O0FBQ0EsdUNBQXVDSyxNQUFNLENBQUNDLE9BQVAsQ0FBZSxLQUFLVCxhQUFwQixDQUF2QyxxQ0FBMkU7QUFBdEU7QUFBQSxVQUFPVSxVQUFQO0FBQUEsVUFBbUJDLFVBQW5COztBQUNELFdBQUtMLFNBQUwsQ0FBZUksVUFBZixjQUFnQyxLQUFLUCxNQUFyQyxTQUE4Q1EsVUFBOUM7QUFDSDtB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b3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIENvbmZpZywgUGJ4QXBpLCAkICovXG5cbi8qKlxuICogUGJ4QXBpQ2xpZW50IC0gVW5pZmllZCBSRVNUIEFQSSB2MyBjbGllbnQgZm9yIGFsbCBlbnRpdGllc1xuICpcbiAqIFRoaXMgY2xhc3MgcHJvdmlkZXMgYSBzdGFuZGFyZCBpbnRlcmZhY2UgZm9yIGFsbCBDUlVEIG9wZXJhdGlvbnNcbiAqIGFuZCBlbGltaW5hdGVzIGNvZGUgZHVwbGljYXRpb24gYWNyb3NzIEFQSSBtb2R1bGVzLlxuICpcbiAqIEZlYXR1cmVzOlxuICogLSBTdGFuZGFyZCBSRVNUZnVsIG9wZXJhdGlvbnMgKEdFVCwgUE9TVCwgUFVULCBERUxFVEUpXG4gKiAtIEN1c3RvbSBtZXRob2RzIHN1cHBvcnQgdmlhIGNvbG9uIG5vdGF0aW9uICg6Z2V0RGVmYXVsdClcbiAqIC0gQXV0b21hdGljIEhUVFAgbWV0aG9kIHNlbGVjdGlvbiBiYXNlZCBvbiBkYXRhXG4gKiAtIENTUkYgdG9rZW4gbWFuYWdlbWVudFxuICogLSBCYWNrd2FyZCBjb21wYXRpYmlsaXR5IHdpdGggUGJ4RGF0YVRhYmxlSW5kZXhcbiAqIC0gR2xvYmFsIGF1dGhvcml6YXRpb24gZXJyb3IgaGFuZGxpbmcgKDQwMS80MDMpXG4gKlxuICogQGNsYXNzIFBieEFwaUNsaWVudFxuICovXG5jbGFzcyBQYnhBcGlDbGllbnQge1xuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBtdWx0aXBsZSByZWRpcmVjdHMgb24gYXV0aCBlcnJvcnNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKiBAc3RhdGljXG4gICAgICovXG4gICAgc3RhdGljIGlzUmVkaXJlY3RpbmdUb0xvZ2luID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgQVBJIGNsaWVudCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcuZW5kcG9pbnQgLSBCYXNlIEFQSSBlbmRwb2ludCAoZS5nLiwgJy9wYnhjb3JlL2FwaS92My9pdnItbWVudScpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtjb25maWcuY3VzdG9tTWV0aG9kc10gLSBNYXAgb2YgY3VzdG9tIG1ldGhvZHMgKGUuZy4sIHtnZXREZWZhdWx0OiAnOmdldERlZmF1bHQnfSlcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcuc2luZ2xldG9uXSAtIFdoZXRoZXIgdGhpcyBpcyBhIHNpbmdsZXRvbiByZXNvdXJjZSAobm8gSURzIGluIFVSTHMpXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29uZmlnKSB7XG4gICAgICAgIHRoaXMuZW5kcG9pbnQgPSBjb25maWcuZW5kcG9pbnQ7XG4gICAgICAgIHRoaXMuY3VzdG9tTWV0aG9kcyA9IGNvbmZpZy5jdXN0b21NZXRob2RzIHx8IHt9O1xuICAgICAgICB0aGlzLmlzU2luZ2xldG9uID0gY29uZmlnLnNpbmdsZXRvbiB8fCBmYWxzZTtcblxuICAgICAgICAvLyBFeHRyYWN0IGJhc2UgVVJMIGZvciBDb25maWcucGJ4VXJsXG4gICAgICAgIHRoaXMuYXBpVXJsID0gYCR7Q29uZmlnLnBieFVybH0ke3RoaXMuZW5kcG9pbnR9YDtcblxuICAgICAgICAvLyBDcmVhdGUgZW5kcG9pbnRzIHByb3BlcnR5IGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5IHdpdGggUGJ4RGF0YVRhYmxlSW5kZXhcbiAgICAgICAgdGhpcy5lbmRwb2ludHMgPSB7XG4gICAgICAgICAgICBnZXRMaXN0OiB0aGlzLmFwaVVybFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFkZCBjdXN0b20gbWV0aG9kIGVuZHBvaW50c1xuICAgICAgICBmb3IgKGNvbnN0IFttZXRob2ROYW1lLCBtZXRob2RQYXRoXSBvZiBPYmplY3QuZW50cmllcyh0aGlzLmN1c3RvbU1ldGhvZHMpKSB7XG4gICAgICAgICAgICB0aGlzLmVuZHBvaW50c1ttZXRob2ROYW1lXSA9IGAke3RoaXMuYXBpVXJsfSR7bWV0aG9kUGF0aH1gO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGF1dGhvcml6YXRpb24gZXJyb3JzICg0MDEpIGJ5IHJlZGlyZWN0aW5nIHRvIGxvZ2luXG4gICAgICogTm90ZTogNDAzIEZvcmJpZGRlbiBpcyBOT1QgaGFuZGxlZCBoZXJlIGFzIGl0IG1heSBpbmRpY2F0ZSBhY2Nlc3MgZGVuaWVkIHRvIGEgc3BlY2lmaWMgcmVzb3VyY2UsXG4gICAgICogbm90IHNlc3Npb24gZXhwaXJhdGlvbi4gU2Vzc2lvbiBsb3NzIGlzIGluZGljYXRlZCBieSA0MDEgVW5hdXRob3JpemVkIG9ubHkuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXR1cyAtIEhUVFAgc3RhdHVzIGNvZGVcbiAgICAgKiBAc3RhdGljXG4gICAgICovXG4gICAgc3RhdGljIGhhbmRsZUF1dGhFcnJvcihzdGF0dXMpIHtcbiAgICAgICAgLy8gT25seSBoYW5kbGUgNDAxIFVuYXV0aG9yaXplZCAtIHRoaXMgaW5kaWNhdGVzIHNlc3Npb24gbG9zc1xuICAgICAgICAvLyA0MDMgRm9yYmlkZGVuIG1lYW5zIGFjY2VzcyBkZW5pZWQgdG8gYSByZXNvdXJjZSAodXNlciBsYWNrcyBwZXJtaXNzaW9ucylcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAvLyBQcmV2ZW50IG11bHRpcGxlIHJlZGlyZWN0c1xuICAgICAgICAgICAgaWYgKCFQYnhBcGlDbGllbnQuaXNSZWRpcmVjdGluZ1RvTG9naW4pIHtcbiAgICAgICAgICAgICAgICBQYnhBcGlDbGllbnQuaXNSZWRpcmVjdGluZ1RvTG9naW4gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVkaXJlY3QgdG8gbG9naW4gcGFnZSBhZnRlciBhIHNob3J0IGRlbGF5IHRvIGFsbG93IGFueSBwZW5kaW5nIG9wZXJhdGlvbnMgdG8gY29tcGxldGVcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnL2FkbWluL3Nlc3Npb24vaW5kZXgnO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIHN1Y2Nlc3MgdGVzdCBmb3IgUkVTVGZ1bCBBUEkgd2l0aCBwcm9wZXIgSFRUUCBjb2Rlc1xuICAgICAqIFRyZWF0cyBidXNpbmVzcyBlcnJvcnMgKDR4eCkgYXMgZmFpbHVyZXMsIG5vdCBuZXR3b3JrIGVycm9yc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtYTUxIdHRwUmVxdWVzdH0geGhyIC0gWE1MSHR0cFJlcXVlc3Qgb2JqZWN0XG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgc3VjY2Vzc1Rlc3QocmVzcG9uc2UsIHhocikge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgdmFsaWQgcmVzcG9uc2Ugb2JqZWN0IHdpdGggcmVzdWx0IGZpZWxkLCB1c2UgaXRcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHR5cGVvZiByZXNwb25zZS5yZXN1bHQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRm9yIHJlc3BvbnNlcyB3aXRob3V0IHJlc3VsdCBmaWVsZCwgY2hlY2sgSFRUUCBzdGF0dXNcbiAgICAgICAgLy8gMnh4ID0gc3VjY2VzcywgNHh4LzV4eCA9IGZhaWx1cmUgKGJ1dCBub3QgbmV0d29yayBlcnJvcilcbiAgICAgICAgY29uc3Qgc3RhdHVzID0geGhyID8geGhyLnN0YXR1cyA6IDIwMDtcbiAgICAgICAgcmV0dXJuIHN0YXR1cyA+PSAyMDAgJiYgc3RhdHVzIDwgMzAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBlcnJvciBoYW5kbGVyIGZvciBSRVNUZnVsIEFQSVxuICAgICAqIERpc3Rpbmd1aXNoZXMgYmV0d2VlbiBidXNpbmVzcyBlcnJvcnMgKDR4eCkgYW5kIHJlYWwgbmV0d29yayBlcnJvcnNcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7WE1MSHR0cFJlcXVlc3R9IHhociAtIFhNTEh0dHBSZXF1ZXN0IG9iamVjdFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uRmFpbHVyZUNhbGxiYWNrIC0gQ2FsbGJhY2sgZm9yIGJ1c2luZXNzIGVycm9ycyAoNHh4KVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uRXJyb3JDYWxsYmFjayAtIENhbGxiYWNrIGZvciBuZXR3b3JrIGVycm9yc1xuICAgICAqL1xuICAgIGhhbmRsZUVycm9yKHhociwgb25GYWlsdXJlQ2FsbGJhY2ssIG9uRXJyb3JDYWxsYmFjaykge1xuICAgICAgICBjb25zdCBzdGF0dXMgPSB4aHIuc3RhdHVzO1xuXG4gICAgICAgIC8vIEJ1c2luZXNzIGVycm9ycyAoNHh4KSAtIHZhbGlkYXRpb24sIGNvbmZsaWN0cywgZXRjLlxuICAgICAgICAvLyBUaGVzZSBoYXZlIHJlc3BvbnNlIGJvZHkgd2l0aCBlcnJvciBkZXRhaWxzXG4gICAgICAgIGlmIChzdGF0dXMgPj0gNDAwICYmIHN0YXR1cyA8IDUwMCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgLy8gQ2FsbCBvbkZhaWx1cmUgd2l0aCBwYXJzZWQgcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBvbkZhaWx1cmVDYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgY2FuJ3QgcGFyc2UgSlNPTiwgdHJlYXQgYXMgbmV0d29yayBlcnJvclxuICAgICAgICAgICAgICAgIG9uRXJyb3JDYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFNlcnZlciBlcnJvcnMgKDV4eCkgb3IgbmV0d29yayBlcnJvcnMgKDApXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb25FcnJvckNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYmFzZSBBUEkgc2V0dGluZ3Mgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmdcbiAgICAgKiBUaGlzIHN0YW5kYXJkaXplcyBlcnJvciBoYW5kbGluZyBhY3Jvc3MgYWxsIEFQSSBjYWxsc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gc3VjY2Vzc0NhbGxiYWNrIC0gQ2FsbGVkIG9uIHN1Y2Nlc3NmdWwgcmVzcG9uc2UgKDJ4eCArIHJlc3VsdD10cnVlKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGZhaWx1cmVDYWxsYmFjayAtIENhbGxlZCBvbiBidXNpbmVzcyBlcnJvcnMgKDR4eCBvciByZXN1bHQ9ZmFsc2UpXG4gICAgICogQHJldHVybnMge29iamVjdH0gLSBBUEkgc2V0dGluZ3Mgb2JqZWN0IGZvciAkLmFwaSgpXG4gICAgICovXG4gICAgZ2V0QmFzZUFwaVNldHRpbmdzKHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3QocmVzcG9uc2UsIHhocikge1xuICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLnN1Y2Nlc3NUZXN0KHJlc3BvbnNlLCB4aHIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3NDYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlLCB4aHIpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgYXV0aG9yaXphdGlvbiBlcnJvcnMgYW5kIHJlZGlyZWN0IHRvIGxvZ2luIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IHhociA/IHhoci5zdGF0dXMgOiAwO1xuICAgICAgICAgICAgICAgIGlmIChQYnhBcGlDbGllbnQuaGFuZGxlQXV0aEVycm9yKHN0YXR1cykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBEb24ndCBjYWxsIGNhbGxiYWNrIGlmIHJlZGlyZWN0aW5nXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgaGFuZGxlIHJlYWwgbmV0d29yayBlcnJvcnMgKDV4eCwgdGltZW91dCwgY29ubmVjdGlvbiByZWZ1c2VkKVxuICAgICAgICAgICAgICAgIC8vIEZvciA0eHggZXJyb3JzLCBTZW1hbnRpYyBVSSBhbHJlYWR5IGNhbGxlZCBvbkZhaWx1cmUsIHNvIHNraXBcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSB4aHIgPyB4aHIuc3RhdHVzIDogMDtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGZvciBhdXRob3JpemF0aW9uIGVycm9ycyBhbmQgcmVkaXJlY3QgdG8gbG9naW4gaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgaWYgKFBieEFwaUNsaWVudC5oYW5kbGVBdXRoRXJyb3Ioc3RhdHVzKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIERvbid0IGNhbGwgY2FsbGJhY2sgaWYgcmVkaXJlY3RpbmdcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTa2lwIGlmIHRoaXMgaXMgYSBidXNpbmVzcyBlcnJvciAoNHh4KSAtIGFscmVhZHkgaGFuZGxlZCBieSBvbkZhaWx1cmVcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID49IDQwMCAmJiBzdGF0dXMgPCA1MDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFJlYWwgbmV0d29yay9zZXJ2ZXIgZXJyb3IgLSBzaG93IGdlbmVyaWMgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciBvY2N1cnJlZCddfVxuICAgICAgICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBieSBJRCBvciBnZXQgZGVmYXVsdCB2YWx1ZXMgZm9yIG5ldyByZWNvcmRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBSZWNvcmQgSUQgb3IgZW1wdHkvbnVsbCBmb3IgbmV3IHJlY29yZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHdlIHNob3VsZCB1c2UgYSBjdXN0b20gbWV0aG9kIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICBjb25zdCBpc05ldyA9ICFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJycgfHwgcmVjb3JkSWQgPT09ICduZXcnO1xuICAgICAgICBsZXQgdXJsO1xuXG4gICAgICAgIGlmIChpc05ldyAmJiB0aGlzLmN1c3RvbU1ldGhvZHMuZ2V0RGVmYXVsdCkge1xuICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSBtZXRob2QgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0ke3RoaXMuY3VzdG9tTWV0aG9kcy5nZXREZWZhdWx0fWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBHZXQgZXhpc3RpbmcgcmVjb3JkIGJ5IElEXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtyZWNvcmRJZH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNldCBfaXNOZXcgZmxhZyBmb3IgbmV3IHJlY29yZHMgdG8gaW5kaWNhdGUgUE9TVCBzaG91bGQgYmUgdXNlZFxuICAgICAgICAgICAgICAgIGlmIChpc05ldyAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBsaXN0IG9mIHJlY29yZHMgKG9yIHNpbmdsZSByZWNvcmQgZm9yIHNpbmdsZXRvbilcbiAgICAgKiBAcGFyYW0ge29iamVjdHxmdW5jdGlvbn0gZGF0YU9yQ2FsbGJhY2sgLSBPcHRpb25hbCBwYXJhbXMgb3IgY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQ2FsbGJhY2sgaWYgZmlyc3QgcGFyYW0gaXMgZGF0YVxuICAgICAqL1xuICAgIGdldExpc3QoZGF0YU9yQ2FsbGJhY2ssIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIEZvciBzaW5nbGV0b24gcmVzb3VyY2VzLCByZWRpcmVjdCB0byBnZXQoKSBtZXRob2RcbiAgICAgICAgaWYgKHRoaXMuaXNTaW5nbGV0b24pIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5nZXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXQoZGF0YU9yQ2FsbGJhY2ssIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSBvdmVybG9hZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgbGV0IGFjdHVhbENhbGxiYWNrO1xuICAgICAgICBsZXQgcGFyYW1zID0ge307XG5cbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhT3JDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBkYXRhT3JDYWxsYmFjaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBhcmFtcyA9IGRhdGFPckNhbGxiYWNrIHx8IHt9O1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IGFjdHVhbENhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKSxcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSByZXR1cm4gYSBzdHJ1Y3R1cmUgd2l0aCByZXN1bHQgYW5kIGRhdGEgZmllbGRzXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmICFyZXNwb25zZS5oYXNPd25Qcm9wZXJ0eSgnZGF0YScpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuYXBpVXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHBhcmFtcyxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlIHJlY29yZCAoY3JlYXRlIG9yIHVwZGF0ZSlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gc2F2ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBzYXZlUmVjb3JkKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIERldGVybWluZSBpZiB0aGlzIGlzIGEgbmV3IHJlY29yZFxuICAgICAgICBjb25zdCBpc05ldyA9IHRoaXMuaXNOZXdSZWNvcmQoZGF0YSk7XG5cbiAgICAgICAgLy8gQ2xlYW4gdXAgaW50ZXJuYWwgZmxhZ3NcbiAgICAgICAgY29uc3QgY2xlYW5EYXRhID0gey4uLmRhdGF9O1xuICAgICAgICBpZiAoY2xlYW5EYXRhLl9pc05ldyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWxldGUgY2xlYW5EYXRhLl9pc05ldztcbiAgICAgICAgfVxuICAgICAgICAvLyBSZW1vdmUgX21ldGhvZCBhcyBpdCdzIGhhbmRsZWQgYnkgdGhlIGFjdHVhbCBIVFRQIG1ldGhvZFxuICAgICAgICBpZiAoY2xlYW5EYXRhLl9tZXRob2QgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVsZXRlIGNsZWFuRGF0YS5fbWV0aG9kO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IHRoZSByZWNvcmQgSUQgZm9yIHVwZGF0ZXNcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSB0aGlzLmdldFJlY29yZElkKGNsZWFuRGF0YSk7XG5cbiAgICAgICAgLy8gdjMgQVBJOiBQT1NUIGZvciBuZXcgcmVjb3JkcywgUFVUIGZvciB1cGRhdGVzXG4gICAgICAgIGNvbnN0IG1ldGhvZCA9IGlzTmV3ID8gJ1BPU1QnIDogJ1BVVCc7XG4gICAgICAgIGNvbnN0IHVybCA9IGlzTmV3ID8gdGhpcy5hcGlVcmwgOiBgJHt0aGlzLmFwaVVybH0vJHtyZWNvcmRJZH1gO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICBkYXRhOiBjbGVhbkRhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIENTUkYgdG9rZW4gaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBnbG9iYWxDc3JmVG9rZW5LZXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBnbG9iYWxDc3JmVG9rZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFuRGF0YVtnbG9iYWxDc3JmVG9rZW5LZXldID0gZ2xvYmFsQ3NyZlRva2VuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIHNlbmQgYXMgSlNPTiAoZm9yIGNvbXBsZXggc3RydWN0dXJlcylcbiAgICAgICAgICAgICAgICBpZiAoUGJ4QXBpQ2xpZW50Lmhhc0NvbXBsZXhEYXRhKGNsZWFuRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShjbGVhbkRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciBvY2N1cnJlZCddfVxuICAgICAgICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJlY29yZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFJlY29yZCBJRCB0byBkZWxldGVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkKHJlY29yZElkLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBkYXRhID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgQ1NSRiB0b2tlbiBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBnbG9iYWxDc3JmVG9rZW5LZXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBnbG9iYWxDc3JmVG9rZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBkYXRhW2dsb2JhbENzcmZUb2tlbktleV0gPSBnbG9iYWxDc3JmVG9rZW47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKSxcbiAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmFwaVVybH0vJHtyZWNvcmRJZH1gLFxuICAgICAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsIGEgY3VzdG9tIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2ROYW1lIC0gTWV0aG9kIG5hbWVcbiAgICAgKiBAcGFyYW0ge29iamVjdHxmdW5jdGlvbn0gZGF0YU9yQ2FsbGJhY2sgLSBEYXRhIG9yIGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIENhbGxiYWNrIGlmIGZpcnN0IHBhcmFtIGlzIGRhdGFcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2h0dHBNZXRob2RdIC0gSFRUUCBtZXRob2QgdG8gdXNlIChHRVQgb3IgUE9TVCksIGRlZmF1bHRzIHRvIEdFVFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbcmVzb3VyY2VJZF0gLSBSZXNvdXJjZSBJRCBmb3IgcmVzb3VyY2UtbGV2ZWwgbWV0aG9kc1xuICAgICAqL1xuICAgIGNhbGxDdXN0b21NZXRob2QobWV0aG9kTmFtZSwgZGF0YU9yQ2FsbGJhY2ssIGNhbGxiYWNrLCBodHRwTWV0aG9kID0gJ0dFVCcsIHJlc291cmNlSWQgPSBudWxsKSB7XG4gICAgICAgIC8vIEhhbmRsZSBvdmVybG9hZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgbGV0IGFjdHVhbENhbGxiYWNrO1xuICAgICAgICBsZXQgZGF0YSA9IHt9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgZGF0YU9yQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gZGF0YU9yQ2FsbGJhY2s7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gZGF0YU9yQ2FsbGJhY2sgfHwge307XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWV0aG9kUGF0aCA9IHRoaXMuY3VzdG9tTWV0aG9kc1ttZXRob2ROYW1lXTtcbiAgICAgICAgaWYgKCFtZXRob2RQYXRoKSB7XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbYFVua25vd24gY3VzdG9tIG1ldGhvZDogJHttZXRob2ROYW1lfWBdfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIFVSTCB3aXRoIElEIGlmIHByb3ZpZGVkIChmb3IgcmVzb3VyY2UtbGV2ZWwgY3VzdG9tIG1ldGhvZHMpXG4gICAgICAgIGxldCB1cmwgPSB0aGlzLmFwaVVybDtcbiAgICAgICAgaWYgKHJlc291cmNlSWQpIHtcbiAgICAgICAgICAgIC8vIFJlc291cmNlLWxldmVsIG1ldGhvZDogL2FwaS92My9yZXNvdXJjZS97aWR9Om1ldGhvZCAoUkVTVGZ1bCBzdGFuZGFyZClcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke3Jlc291cmNlSWR9JHttZXRob2RQYXRofWA7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IFJlc291cmNlLWxldmVsIG1ldGhvZDogL2FwaS92My9yZXNvdXJjZS97aWR9Om1ldGhvZFxuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7ZGF0YS5pZH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBpZCBmcm9tIGRhdGEgc2luY2UgaXQncyBpbiB0aGUgVVJMXG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0RGF0YSA9IHsuLi5kYXRhfTtcbiAgICAgICAgICAgIGRlbGV0ZSByZXF1ZXN0RGF0YS5pZDtcbiAgICAgICAgICAgIGRhdGEgPSByZXF1ZXN0RGF0YTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIENvbGxlY3Rpb24tbGV2ZWwgbWV0aG9kOiAvYXBpL3YzL3Jlc291cmNlOm1ldGhvZFxuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9JHttZXRob2RQYXRofWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBDU1JGIHRva2VuIGZvciBQT1NUIHJlcXVlc3RzXG4gICAgICAgIGlmIChodHRwTWV0aG9kID09PSAnUE9TVCcgJiYgdHlwZW9mIGdsb2JhbENzcmZUb2tlbktleSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGdsb2JhbENzcmZUb2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGRhdGFbZ2xvYmFsQ3NyZlRva2VuS2V5XSA9IGdsb2JhbENzcmZUb2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGRhdGEgY29udGFpbnMgYm9vbGVhbiBvciBjb21wbGV4IHZhbHVlc1xuICAgICAgICBsZXQgaGFzQ29tcGxleERhdGEgPSBmYWxzZTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVtrZXldO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhc0NvbXBsZXhEYXRhID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIEpTT04gZm9yIGNvbXBsZXggZGF0YSwgZm9ybSBlbmNvZGluZyBmb3Igc2ltcGxlIGRhdGFcbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogaHR0cE1ldGhvZCxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGhhc0NvbXBsZXhEYXRhKSB7XG4gICAgICAgICAgICAvLyBTZW5kIGFzIEpTT04gdG8gcHJlc2VydmUgYm9vbGVhbiB2YWx1ZXMgYW5kIGNvbXBsZXggc3RydWN0dXJlc1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5jb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNlbmQgYXMgcmVndWxhciBmb3JtIGRhdGFcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKGFqYXhTZXR0aW5ncyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIERldGVybWluZSBpZiBkYXRhIHJlcHJlc2VudHMgYSBuZXcgcmVjb3JkXG4gICAgICogQ2FuIGJlIG92ZXJyaWRkZW4gaW4gc3BlY2lmaWMgQVBJIG1vZHVsZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gY2hlY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBuZXcgcmVjb3JkXG4gICAgICovXG4gICAgaXNOZXdSZWNvcmQoZGF0YSkge1xuICAgICAgICAvLyBUaGUgb25seSB3YXkgdG8gZGV0ZXJtaW5lIC0gX2lzTmV3IGZsYWdcbiAgICAgICAgLy8gSWYgZmxhZyBpcyBub3QgZXhwbGljaXRseSBzZXQsIGNoZWNrIElEXG4gICAgICAgIGlmIChkYXRhLl9pc05ldyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS5faXNOZXcgPT09IHRydWUgfHwgZGF0YS5faXNOZXcgPT09ICd0cnVlJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIElEIGNoZWNrIG9ubHkgaWYgZmxhZyBpcyBub3Qgc2V0XG4gICAgICAgIHJldHVybiAhZGF0YS5pZCB8fCBkYXRhLmlkID09PSAnJyB8fCBkYXRhLmlkID09PSAnbmV3JztcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIGRhdGFcbiAgICAgKiBDYW4gYmUgb3ZlcnJpZGRlbiBpbiBzcGVjaWZpYyBBUEkgbW9kdWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZWNvcmQgSURcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZChkYXRhKSB7XG4gICAgICAgIC8vIFJFU1QgQVBJIHYzIHVzZXMgb25seSAnaWQnIGZpZWxkXG4gICAgICAgIHJldHVybiBkYXRhLmlkO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBkYXRhIGNvbnRhaW5zIGNvbXBsZXggc3RydWN0dXJlcyB0aGF0IG5lZWQgSlNPTiBlbmNvZGluZ1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBjaGVja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGNvbnRhaW5zIGNvbXBsZXggZGF0YVxuICAgICAqL1xuICAgIHN0YXRpYyBoYXNDb21wbGV4RGF0YShkYXRhKSB7XG4gICAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgT2JqZWN0LnZhbHVlcyhkYXRhKSkge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpIHx8ICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIEdFVCByZXF1ZXN0IChiYWNrd2FyZCBjb21wYXRpYmlsaXR5IG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gUXVlcnkgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2lkXSAtIE9wdGlvbmFsIHJlY29yZCBJRCBmb3IgcmVzb3VyY2Utc3BlY2lmaWMgcmVxdWVzdHNcbiAgICAgKi9cbiAgICBjYWxsR2V0KHBhcmFtcywgY2FsbGJhY2ssIGlkKSB7XG4gICAgICAgIGxldCB1cmwgPSB0aGlzLmFwaVVybDtcblxuICAgICAgICAvLyBGb3Igbm9uLXNpbmdsZXRvbiByZXNvdXJjZXMgd2l0aCBJRCwgYXBwZW5kIElEIHRvIFVSTFxuICAgICAgICBpZiAoIXRoaXMuaXNTaW5nbGV0b24gJiYgaWQpIHtcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke2lkfWA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHBhcmFtcyB8fCB7fSxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gUE9TVCByZXF1ZXN0IChiYWNrd2FyZCBjb21wYXRpYmlsaXR5IG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gc2VuZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2lkXSAtIE9wdGlvbmFsIHJlc291cmNlIElEIGZvciByZXNvdXJjZS1zcGVjaWZpYyByZXF1ZXN0c1xuICAgICAqL1xuICAgIGNhbGxQb3N0KGRhdGEsIGNhbGxiYWNrLCBpZCkge1xuICAgICAgICBsZXQgdXJsID0gdGhpcy5hcGlVcmw7XG4gICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7aWR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc0NvbXBsZXhEYXRhID0gUGJ4QXBpQ2xpZW50Lmhhc0NvbXBsZXhEYXRhKGRhdGEpO1xuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IGFqYXhTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNDb21wbGV4RGF0YSkge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5jb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKGFqYXhTZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBQVVQgcmVxdWVzdCAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNlbmRcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtpZF0gLSBPcHRpb25hbCByZXNvdXJjZSBJRCBmb3IgcmVzb3VyY2Utc3BlY2lmaWMgcmVxdWVzdHNcbiAgICAgKi9cbiAgICBjYWxsUHV0KGRhdGEsIGNhbGxiYWNrLCBpZCkge1xuICAgICAgICBsZXQgdXJsID0gdGhpcy5hcGlVcmw7XG4gICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7aWR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc0NvbXBsZXhEYXRhID0gUGJ4QXBpQ2xpZW50Lmhhc0NvbXBsZXhEYXRhKGRhdGEpO1xuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IGFqYXhTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGhhc0NvbXBsZXhEYXRhKSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoYWpheFNldHRpbmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIERFTEVURSByZXF1ZXN0IChiYWNrd2FyZCBjb21wYXRpYmlsaXR5IG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gUmVzb3VyY2UgSUQgdG8gZGVsZXRlXG4gICAgICovXG4gICAgY2FsbERlbGV0ZShjYWxsYmFjaywgaWQpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHt9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuS2V5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZGF0YVtnbG9iYWxDc3JmVG9rZW5LZXldID0gZ2xvYmFsQ3NyZlRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gY2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuYXBpVXJsfS8ke2lkfWAsXG4gICAgICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gUEFUQ0ggcmVxdWVzdCAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNlbmRcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgY2FsbFBhdGNoKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGhhc0NvbXBsZXhEYXRhID0gUGJ4QXBpQ2xpZW50Lmhhc0NvbXBsZXhEYXRhKGRhdGEpO1xuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IGFqYXhTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIHVybDogdGhpcy5hcGlVcmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdQQVRDSCcsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNDb21wbGV4RGF0YSkge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5jb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKGFqYXhTZXR0aW5ncyk7XG4gICAgfVxufVxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuUGJ4QXBpQ2xpZW50ID0gUGJ4QXBpQ2xpZW50OyJdfQ==