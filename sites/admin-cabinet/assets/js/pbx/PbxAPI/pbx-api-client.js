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
     * @param {function} failureCallback - Called on any failure with the API envelope (result=false, messages)
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
        // Semantic UI calls onFailure for every failed request except an aborted one:
        // business errors, HTTP 4xx/5xx, network errors, timeouts and bodies that are not JSON
        // (for HTTP errors it calls onError first, so onError is not used here)
        onFailure: function onFailure(response, element, xhr) {
          // Check for authorization errors and redirect to login if needed
          var status = xhr ? xhr.status : 0;

          if (PbxApiClient.handleAuthError(status)) {
            return; // Don't call callback if redirecting
          }

          failureCallback(PbxApiClient.normalizeFailureResponse(response, xhr), false);
        }
      };
    }
    /**
     * Bring a failed response to the API envelope.
     * Semantic UI passes the raw body when it is not JSON: a plain-text nginx
     * limiter reply (429 "Too many requests"), an HTML error page or false.
     * A JSON body without messages (not built by PBXApiResult) gets a status message.
     *
     * @param {*} response - Response passed by Semantic UI to onFailure
     * @param {XMLHttpRequest} [xhr] - XMLHttpRequest object
     * @returns {object} - Response object with result and messages fields
     */

  }, {
    key: "getRecord",
    value:
    /**
     * Get record by ID or get default values for new record
     * @param {string} recordId - Record ID or empty/null for new record
     * @param {function} callback - Callback function
     */
    function getRecord(recordId, callback) {
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
      PbxApiClient.callApi(_objectSpread({
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
        if (!Object.prototype.hasOwnProperty.call(response, 'data')) {
          response.data = [];
        }

        actualCallback(response, false);
      });
      PbxApiClient.callApi(_objectSpread({
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
      var apiSettings = this.getBaseApiSettings(function (response) {
        return callback(response, true);
      }, callback);
      PbxApiClient.callApi(_objectSpread(_objectSpread({
        url: url,
        method: method,
        data: cleanData
      }, apiSettings), {}, {
        beforeSend: function beforeSend(settings) {
          // Check if we need to send as JSON (for complex structures)
          if (PbxApiClient.hasComplexData(cleanData)) {
            settings.contentType = 'application/json';
            settings.data = JSON.stringify(cleanData);
          }

          return settings;
        }
      }));
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
      PbxApiClient.callApi(_objectSpread({
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

      PbxApiClient.callApi(ajaxSettings);
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
      PbxApiClient.callApi(_objectSpread({
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

      PbxApiClient.callApi(ajaxSettings);
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

      PbxApiClient.callApi(ajaxSettings);
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
      PbxApiClient.callApi(_objectSpread({
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

      PbxApiClient.callApi(ajaxSettings);
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
    /**
     * Maximum number of retries for 503 Service Unavailable responses
     * @type {number}
     * @static
     */

  }, {
    key: "callApi",
    value:
    /**
     * Call $.api() with automatic retry on 503 Service Unavailable.
     * Retries up to MAX_503_RETRIES times with exponential backoff (1s, 2s, 4s).
     *
     * @param {object} settings - Settings object for $.api()
     * @param {number} [attempt=0] - Current retry attempt (internal)
     * @static
     */
    function callApi(settings) {
      var attempt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var originalOnError = settings.onError;
      var originalOnFailure = settings.onFailure;

      var willRetry = function willRetry(xhr) {
        return xhr && xhr.status === 503 && attempt < PbxApiClient.MAX_503_RETRIES;
      }; // Semantic UI calls onError (HTTP errors only) and then onFailure for the same failed request;
      // while a 503 is retried neither reaches the caller, it gets the result of the retry


      var wrappedSettings = _objectSpread(_objectSpread({}, settings), {}, {
        onError: function onError(errorMessage, element, xhr) {
          if (!willRetry(xhr) && originalOnError) {
            originalOnError(errorMessage, element, xhr);
          }
        },
        onFailure: function onFailure(response, element, xhr) {
          if (!willRetry(xhr)) {
            if (originalOnFailure) {
              originalOnFailure(response, element, xhr);
            }

            return;
          } // Retry on 503 with exponential backoff


          var delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s

          console.warn("API 503: retry ".concat(attempt + 1, "/").concat(PbxApiClient.MAX_503_RETRIES, " in ").concat(delay, "ms"));
          setTimeout(function () {
            PbxApiClient.callApi(settings, attempt + 1);
          }, delay);
        }
      });

      $.api(wrappedSettings);
    }
  }, {
    key: "normalizeFailureResponse",
    value: function normalizeFailureResponse(response, xhr) {
      var _ref = $.isPlainObject(response) ? response : {},
          messages = _ref.messages;

      if (messages && _typeof(messages) === 'object' && Object.keys(messages).length > 0) {
        return response;
      }

      var text = typeof response === 'string' ? response.trim() : '';
      var status = xhr ? xhr.status : 0;
      var message;

      if (text !== '' && text.length <= 200 && !text.startsWith('<')) {
        // The message is rendered as HTML, the body comes from outside PBXApiResult
        message = SecurityUtils.escapeHtml(text);
      } else if (status >= 200 && status < 300) {
        message = "Invalid server response (HTTP ".concat(status, ")");
      } else if (status > 0) {
        var statusText = xhr.statusText ? " ".concat(SecurityUtils.escapeHtml(xhr.statusText)) : '';
        message = "HTTP ".concat(status).concat(statusText);
      } else {
        message = 'Network error occurred';
      }

      return _objectSpread(_objectSpread({}, $.isPlainObject(response) ? response : {}), {}, {
        result: false,
        messages: {
          error: [message]
        }
      });
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

_defineProperty(PbxApiClient, "MAX_503_RETRIES", 3);

window.PbxApiClient = PbxApiClient;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4LWFwaS1jbGllbnQuanMiXSwibmFtZXMiOlsiUGJ4QXBpQ2xpZW50IiwiY29uZmlnIiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiaXNTaW5nbGV0b24iLCJzaW5nbGV0b24iLCJhcGlVcmwiLCJDb25maWciLCJwYnhVcmwiLCJlbmRwb2ludHMiLCJnZXRMaXN0IiwiT2JqZWN0IiwiZW50cmllcyIsIm1ldGhvZE5hbWUiLCJtZXRob2RQYXRoIiwicmVzcG9uc2UiLCJ4aHIiLCJyZXN1bHQiLCJzdGF0dXMiLCJvbkZhaWx1cmVDYWxsYmFjayIsIm9uRXJyb3JDYWxsYmFjayIsIkpTT04iLCJwYXJzZSIsInJlc3BvbnNlVGV4dCIsImUiLCJzdWNjZXNzQ2FsbGJhY2siLCJmYWlsdXJlQ2FsbGJhY2siLCJzZWxmIiwib24iLCJzdWNjZXNzVGVzdCIsIm9uU3VjY2VzcyIsIm9uRmFpbHVyZSIsImVsZW1lbnQiLCJoYW5kbGVBdXRoRXJyb3IiLCJub3JtYWxpemVGYWlsdXJlUmVzcG9uc2UiLCJyZWNvcmRJZCIsImNhbGxiYWNrIiwiaXNOZXciLCJ1cmwiLCJnZXREZWZhdWx0IiwiYXBpU2V0dGluZ3MiLCJnZXRCYXNlQXBpU2V0dGluZ3MiLCJkYXRhIiwiX2lzTmV3IiwiY2FsbEFwaSIsIm1ldGhvZCIsImRhdGFPckNhbGxiYWNrIiwiZ2V0IiwiYWN0dWFsQ2FsbGJhY2siLCJwYXJhbXMiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJpc05ld1JlY29yZCIsImNsZWFuRGF0YSIsInVuZGVmaW5lZCIsIl9tZXRob2QiLCJnZXRSZWNvcmRJZCIsImJlZm9yZVNlbmQiLCJzZXR0aW5ncyIsImhhc0NvbXBsZXhEYXRhIiwiY29udGVudFR5cGUiLCJzdHJpbmdpZnkiLCJodHRwTWV0aG9kIiwicmVzb3VyY2VJZCIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJhc3luY0NoYW5uZWxJZCIsImNoYW5uZWxJZCIsImlkIiwicmVxdWVzdERhdGEiLCJhamF4U2V0dGluZ3MiLCJiZWZvcmVYSFIiLCJzZXRSZXF1ZXN0SGVhZGVyIiwiaXNSZWRpcmVjdGluZ1RvTG9naW4iLCJzZXRUaW1lb3V0Iiwid2luZG93IiwibG9jYXRpb24iLCJocmVmIiwiZ2xvYmFsUm9vdFVybCIsImF0dGVtcHQiLCJvcmlnaW5hbE9uRXJyb3IiLCJvbkVycm9yIiwib3JpZ2luYWxPbkZhaWx1cmUiLCJ3aWxsUmV0cnkiLCJNQVhfNTAzX1JFVFJJRVMiLCJ3cmFwcGVkU2V0dGluZ3MiLCJlcnJvck1lc3NhZ2UiLCJkZWxheSIsIk1hdGgiLCJwb3ciLCJjb25zb2xlIiwid2FybiIsIiQiLCJhcGkiLCJpc1BsYWluT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsInRleHQiLCJ0cmltIiwibWVzc2FnZSIsInN0YXJ0c1dpdGgiLCJTZWN1cml0eVV0aWxzIiwiZXNjYXBlSHRtbCIsInN0YXR1c1RleHQiLCJ2YWx1ZXMiLCJ2YWx1ZSIsIkFycmF5IiwiaXNBcnJheSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsWTtBQUNGO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7O0FBR0k7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSSx3QkFBWUMsTUFBWixFQUFvQjtBQUFBOztBQUNoQixTQUFLQyxRQUFMLEdBQWdCRCxNQUFNLENBQUNDLFFBQXZCO0FBQ0EsU0FBS0MsYUFBTCxHQUFxQkYsTUFBTSxDQUFDRSxhQUFQLElBQXdCLEVBQTdDO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQkgsTUFBTSxDQUFDSSxTQUFQLElB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bUM7QUFDdENrRixRQUFBQSxPQUFPLDJDQUFvQ2xGLE1BQXBDLE1BQVA7QUFDSCxPQUZNLE1BRUEsSUFBSUEsTUFBTSxHQUFHLENBQWIsRUFBZ0I7QUFDbkIsWUFBTXNGLFVBQVUsR0FBR3hGLEdBQUcsQ0FBQ3dGLFVBQUosY0FBcUJGLGFBQWEsQ0FBQ0MsVUFBZCxDQUF5QnZGLEdBQUcsQ0FBQ3dGLFVBQTdCLENBQXJCLElBQWtFLEVBQXJGO0FBQ0FKLFFBQUFBLE9BQU8sa0JBQVdsRixNQUFYLFNBQW9Cc0YsVUFBcEIsQ0FBUDtBQUNILE9BSE0sTUFHQTtBQUNISixRQUFBQSxPQUFPLEdBQUcsd0JBQVY7QUFDSDs7QUFFRCw2Q0FDUVAsQ0FBQyxDQUFDRSxhQUFGLENBQWdCaEYsUUFBaEIsSUFBNEJBLFFBQTVCLEdBQXVDLEVBRC9DO0FBRUlFLFFBQUFBLE1BQU0sRUFBRSxLQUZaO0FBR0lnRCxRQUFBQSxRQUFRLEVBQUU7QUFBQ0MsVUFBQUEsS0FBSyxFQUFFLENBQUNrQyxPQUFEO0FBQVI7QUFIZDtBQUtIOzs7V0F1UkQsd0JBQXNCMUQsSUFBdEIsRUFBNEI7QUFDeEIseUNBQW9CL0IsTUFBTSxDQUFDOEYsTUFBUCxDQUFjL0QsSUFBZCxDQUFwQixzQ0FBeUM7QUFBcEMsWUFBTWdFLEtBQUssc0JBQVg7O0FBQ0QsWUFBSUMsS0FBSyxDQUFDQyxPQUFOLENBQWNGLEtBQWQsS0FBeUIsUUFBT0EsS0FBUCxNQUFpQixRQUFqQixJQUE2QkEsS0FBSyxLQUFLLElBQXBFLEVBQTJFO0FBQ3ZFLGlCQUFPLElBQVA7QUFDSDtBQUNKOztBQUNELGFBQU8sS0FBUDtBQUNIOzs7O0tBZ0pMOzs7Z0JBaHBCTTFHLFksMEJBTTRCLEs7O2dCQU41QkEsWSxxQkFnRXVCLEM7O0FBaWxCN0I0RSxNQUFNLENBQUM1RSxZQUFQLEdBQXNCQSxZQUF0QiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBDb25maWcsIFBieEFwaSwgJCAqL1xuXG4vKipcbiAqIFBieEFwaUNsaWVudCAtIFVuaWZpZWQgUkVTVCBBUEkgdjMgY2xpZW50IGZvciBhbGwgZW50aXRpZXNcbiAqXG4gKiBUaGlzIGNsYXNzIHByb3ZpZGVzIGEgc3RhbmRhcmQgaW50ZXJmYWNlIGZvciBhbGwgQ1JVRCBvcGVyYXRpb25zXG4gKiBhbmQgZWxpbWluYXRlcyBjb2RlIGR1cGxpY2F0aW9uIGFjcm9zcyBBUEkgbW9kdWxlcy5cbiAqXG4gKiBGZWF0dXJlczpcbiAqIC0gU3RhbmRhcmQgUkVTVGZ1bCBvcGVyYXRpb25zIChHRVQsIFBPU1QsIFBVVCwgREVMRVRFKVxuICogLSBDdXN0b20gbWV0aG9kcyBzdXBwb3J0IHZpYSBjb2xvbiBub3RhdGlvbiAoOmdldERlZmF1bHQpXG4gKiAtIEF1dG9tYXRpYyBIVFRQIG1ldGhvZCBzZWxlY3Rpb24gYmFzZWQgb24gZGF0YVxuICogLSBDU1JGIHRva2VuIG1hbmFnZW1lbnRcbiAqIC0gQmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aXRoIFBieERhdGFUYWJsZUluZGV4XG4gKiAtIEdsb2JhbCBhdXRob3JpemF0aW9uIGVycm9yIGhhbmRsaW5nICg0MDEvNDAzKVxuICpcbiAqIEBjbGFzcyBQYnhBcGlDbGllbnRcbiAqL1xuY2xhc3MgUGJ4QXBpQ2xpZW50IHtcbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHByZXZlbnQgbXVsdGlwbGUgcmVkaXJlY3RzIG9uIGF1dGggZXJyb3JzXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuICAgIHN0YXRpYyBpc1JlZGlyZWN0aW5nVG9Mb2dpbiA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgbmV3IEFQSSBjbGllbnQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLmVuZHBvaW50IC0gQmFzZSBBUEkgZW5kcG9pbnQgKGUuZy4sICcvcGJ4Y29yZS9hcGkvdjMvaXZyLW1lbnUnKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbY29uZmlnLmN1c3RvbU1ldGhvZHNdIC0gTWFwIG9mIGN1c3RvbSBtZXRob2RzIChlLmcuLCB7Z2V0RGVmYXVsdDogJzpnZXREZWZhdWx0J30pXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNpbmdsZXRvbl0gLSBXaGV0aGVyIHRoaXMgaXMgYSBzaW5nbGV0b24gcmVzb3VyY2UgKG5vIElEcyBpbiBVUkxzKVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbmZpZykge1xuICAgICAgICB0aGlzLmVuZHBvaW50ID0gY29uZmlnLmVuZHBvaW50O1xuICAgICAgICB0aGlzLmN1c3RvbU1ldGhvZHMgPSBjb25maWcuY3VzdG9tTWV0aG9kcyB8fCB7fTtcbiAgICAgICAgdGhpcy5pc1NpbmdsZXRvbiA9IGNvbmZpZy5zaW5nbGV0b24gfHwgZmFsc2U7XG5cbiAgICAgICAgLy8gRXh0cmFjdCBiYXNlIFVSTCBmb3IgQ29uZmlnLnBieFVybFxuICAgICAgICB0aGlzLmFwaVVybCA9IGAke0NvbmZpZy5wYnhVcmx9JHt0aGlzLmVuZHBvaW50fWA7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGVuZHBvaW50cyBwcm9wZXJ0eSBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aXRoIFBieERhdGFUYWJsZUluZGV4XG4gICAgICAgIHRoaXMuZW5kcG9pbnRzID0ge1xuICAgICAgICAgICAgZ2V0TGlzdDogdGhpcy5hcGlVcmxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgY3VzdG9tIG1ldGhvZCBlbmRwb2ludHNcbiAgICAgICAgZm9yIChjb25zdCBbbWV0aG9kTmFtZSwgbWV0aG9kUGF0aF0gb2YgT2JqZWN0LmVudHJpZXModGhpcy5jdXN0b21NZXRob2RzKSkge1xuICAgICAgICAgICAgdGhpcy5lbmRwb2ludHNbbWV0aG9kTmFtZV0gPSBgJHt0aGlzLmFwaVVybH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBhdXRob3JpemF0aW9uIGVycm9ycyAoNDAxKSBieSByZWRpcmVjdGluZyB0byBsb2dpblxuICAgICAqIE5vdGU6IDQwMyBGb3JiaWRkZW4gaXMgTk9UIGhhbmRsZWQgaGVyZSBhcyBpdCBtYXkgaW5kaWNhdGUgYWNjZXNzIGRlbmllZCB0byBhIHNwZWNpZmljIHJlc291cmNlLFxuICAgICAqIG5vdCBzZXNzaW9uIGV4cGlyYXRpb24uIFNlc3Npb24gbG9zcyBpcyBpbmRpY2F0ZWQgYnkgNDAxIFVuYXV0aG9yaXplZCBvbmx5LlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGF0dXMgLSBIVFRQIHN0YXR1cyBjb2RlXG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuICAgIHN0YXRpYyBoYW5kbGVBdXRoRXJyb3Ioc3RhdHVzKSB7XG4gICAgICAgIC8vIE9ubHkgaGFuZGxlIDQwMSBVbmF1dGhvcml6ZWQgLSB0aGlzIGluZGljYXRlcyBzZXNzaW9uIGxvc3NcbiAgICAgICAgLy8gNDAzIEZvcmJpZGRlbiBtZWFucyBhY2Nlc3MgZGVuaWVkIHRvIGEgcmVzb3VyY2UgKHVzZXIgbGFja3MgcGVybWlzc2lvbnMpXG4gICAgICAgIGlmIChzdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgLy8gUHJldmVudCBtdWx0aXBsZSByZWRpcmVjdHNcbiAgICAgICAgICAgIGlmICghUGJ4QXBpQ2xpZW50LmlzUmVkaXJlY3RpbmdUb0xvZ2luKSB7XG4gICAgICAgICAgICAgICAgUGJ4QXBpQ2xpZW50LmlzUmVkaXJlY3RpbmdUb0xvZ2luID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIC8vIFJlZGlyZWN0IHRvIGxvZ2luIHBhZ2UgYWZ0ZXIgYSBzaG9ydCBkZWxheSB0byBhbGxvdyBhbnkgcGVuZGluZyBvcGVyYXRpb25zIHRvIGNvbXBsZXRlXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1heGltdW0gbnVtYmVyIG9mIHJldHJpZXMgZm9yIDUwMyBTZXJ2aWNlIFVuYXZhaWxhYmxlIHJlc3BvbnNlc1xuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuICAgIHN0YXRpYyBNQVhfNTAzX1JFVFJJRVMgPSAzO1xuXG4gICAgLyoqXG4gICAgICogQ2FsbCAkLmFwaSgpIHdpdGggYXV0b21hdGljIHJldHJ5IG9uIDUwMyBTZXJ2aWNlIFVuYXZhaWxhYmxlLlxuICAgICAqIFJldHJpZXMgdXAgdG8gTUFYXzUwM19SRVRSSUVTIHRpbWVzIHdpdGggZXhwb25lbnRpYWwgYmFja29mZiAoMXMsIDJzLCA0cykuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBvYmplY3QgZm9yICQuYXBpKClcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW2F0dGVtcHQ9MF0gLSBDdXJyZW50IHJldHJ5IGF0dGVtcHQgKGludGVybmFsKVxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgY2FsbEFwaShzZXR0aW5ncywgYXR0ZW1wdCA9IDApIHtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxPbkVycm9yID0gc2V0dGluZ3Mub25FcnJvcjtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxPbkZhaWx1cmUgPSBzZXR0aW5ncy5vbkZhaWx1cmU7XG4gICAgICAgIGNvbnN0IHdpbGxSZXRyeSA9ICh4aHIpID0+IHhociAmJiB4aHIuc3RhdHVzID09PSA1MDMgJiYgYXR0ZW1wdCA8IFBieEFwaUNsaWVudC5NQVhfNTAzX1JFVFJJRVM7XG5cbiAgICAgICAgLy8gU2VtYW50aWMgVUkgY2FsbHMgb25FcnJvciAoSFRUUCBlcnJvcnMgb25seSkgYW5kIHRoZW4gb25GYWlsdXJlIGZvciB0aGUgc2FtZSBmYWlsZWQgcmVxdWVzdDtcbiAgICAgICAgLy8gd2hpbGUgYSA1MDMgaXMgcmV0cmllZCBuZWl0aGVyIHJlYWNoZXMgdGhlIGNhbGxlciwgaXQgZ2V0cyB0aGUgcmVzdWx0IG9mIHRoZSByZXRyeVxuICAgICAgICBjb25zdCB3cmFwcGVkU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICAuLi5zZXR0aW5ncyxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXdpbGxSZXRyeSh4aHIpICYmIG9yaWdpbmFsT25FcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbE9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICghd2lsbFJldHJ5KHhocikpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsT25GYWlsdXJlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbE9uRmFpbHVyZShyZXNwb25zZSwgZWxlbWVudCwgeGhyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gUmV0cnkgb24gNTAzIHdpdGggZXhwb25lbnRpYWwgYmFja29mZlxuICAgICAgICAgICAgICAgIGNvbnN0IGRlbGF5ID0gTWF0aC5wb3coMiwgYXR0ZW1wdCkgKiAxMDAwOyAvLyAxcywgMnMsIDRzXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBBUEkgNTAzOiByZXRyeSAke2F0dGVtcHQgKyAxfS8ke1BieEFwaUNsaWVudC5NQVhfNTAzX1JFVFJJRVN9IGluICR7ZGVsYXl9bXNgKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgUGJ4QXBpQ2xpZW50LmNhbGxBcGkoc2V0dGluZ3MsIGF0dGVtcHQgKyAxKTtcbiAgICAgICAgICAgICAgICB9LCBkZWxheSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgJC5hcGkod3JhcHBlZFNldHRpbmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gc3VjY2VzcyB0ZXN0IGZvciBSRVNUZnVsIEFQSSB3aXRoIHByb3BlciBIVFRQIGNvZGVzXG4gICAgICogVHJlYXRzIGJ1c2luZXNzIGVycm9ycyAoNHh4KSBhcyBmYWlsdXJlcywgbm90IG5ldHdvcmsgZXJyb3JzXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBTZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge1hNTEh0dHBSZXF1ZXN0fSB4aHIgLSBYTUxIdHRwUmVxdWVzdCBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBzdWNjZXNzVGVzdChyZXNwb25zZSwgeGhyKSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgYSB2YWxpZCByZXNwb25zZSBvYmplY3Qgd2l0aCByZXN1bHQgZmllbGQsIHVzZSBpdFxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgdHlwZW9mIHJlc3BvbnNlLnJlc3VsdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5yZXN1bHQgPT09IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGb3IgcmVzcG9uc2VzIHdpdGhvdXQgcmVzdWx0IGZpZWxkLCBjaGVjayBIVFRQIHN0YXR1c1xuICAgICAgICAvLyAyeHggPSBzdWNjZXNzLCA0eHgvNXh4ID0gZmFpbHVyZSAoYnV0IG5vdCBuZXR3b3JrIGVycm9yKVxuICAgICAgICBjb25zdCBzdGF0dXMgPSB4aHIgPyB4aHIuc3RhdHVzIDogMjAwO1xuICAgICAgICByZXR1cm4gc3RhdHVzID49IDIwMCAmJiBzdGF0dXMgPCAzMDA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGVycm9yIGhhbmRsZXIgZm9yIFJFU1RmdWwgQVBJXG4gICAgICogRGlzdGluZ3Vpc2hlcyBiZXR3ZWVuIGJ1c2luZXNzIGVycm9ycyAoNHh4KSBhbmQgcmVhbCBuZXR3b3JrIGVycm9yc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtYTUxIdHRwUmVxdWVzdH0geGhyIC0gWE1MSHR0cFJlcXVlc3Qgb2JqZWN0XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb25GYWlsdXJlQ2FsbGJhY2sgLSBDYWxsYmFjayBmb3IgYnVzaW5lc3MgZXJyb3JzICg0eHgpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb25FcnJvckNhbGxiYWNrIC0gQ2FsbGJhY2sgZm9yIG5ldHdvcmsgZXJyb3JzXG4gICAgICovXG4gICAgaGFuZGxlRXJyb3IoeGhyLCBvbkZhaWx1cmVDYWxsYmFjaywgb25FcnJvckNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IHhoci5zdGF0dXM7XG5cbiAgICAgICAgLy8gQnVzaW5lc3MgZXJyb3JzICg0eHgpIC0gdmFsaWRhdGlvbiwgY29uZmxpY3RzLCBldGMuXG4gICAgICAgIC8vIFRoZXNlIGhhdmUgcmVzcG9uc2UgYm9keSB3aXRoIGVycm9yIGRldGFpbHNcbiAgICAgICAgaWYgKHN0YXR1cyA+PSA0MDAgJiYgc3RhdHVzIDwgNTAwKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICAvLyBDYWxsIG9uRmFpbHVyZSB3aXRoIHBhcnNlZCByZXNwb25zZVxuICAgICAgICAgICAgICAgIG9uRmFpbHVyZUNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBjYW4ndCBwYXJzZSBKU09OLCB0cmVhdCBhcyBuZXR3b3JrIGVycm9yXG4gICAgICAgICAgICAgICAgb25FcnJvckNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2VydmVyIGVycm9ycyAoNXh4KSBvciBuZXR3b3JrIGVycm9ycyAoMClcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvbkVycm9yQ2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBiYXNlIEFQSSBzZXR0aW5ncyB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZ1xuICAgICAqIFRoaXMgc3RhbmRhcmRpemVzIGVycm9yIGhhbmRsaW5nIGFjcm9zcyBhbGwgQVBJIGNhbGxzXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdWNjZXNzQ2FsbGJhY2sgLSBDYWxsZWQgb24gc3VjY2Vzc2Z1bCByZXNwb25zZSAoMnh4ICsgcmVzdWx0PXRydWUpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gZmFpbHVyZUNhbGxiYWNrIC0gQ2FsbGVkIG9uIGFueSBmYWlsdXJlIHdpdGggdGhlIEFQSSBlbnZlbG9wZSAocmVzdWx0PWZhbHNlLCBtZXNzYWdlcylcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIEFQSSBzZXR0aW5ncyBvYmplY3QgZm9yICQuYXBpKClcbiAgICAgKi9cbiAgICBnZXRCYXNlQXBpU2V0dGluZ3Moc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdChyZXNwb25zZSwgeGhyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuc3VjY2Vzc1Rlc3QocmVzcG9uc2UsIHhocik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgc3VjY2Vzc0NhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBTZW1hbnRpYyBVSSBjYWxscyBvbkZhaWx1cmUgZm9yIGV2ZXJ5IGZhaWxlZCByZXF1ZXN0IGV4Y2VwdCBhbiBhYm9ydGVkIG9uZTpcbiAgICAgICAgICAgIC8vIGJ1c2luZXNzIGVycm9ycywgSFRUUCA0eHgvNXh4LCBuZXR3b3JrIGVycm9ycywgdGltZW91dHMgYW5kIGJvZGllcyB0aGF0IGFyZSBub3QgSlNPTlxuICAgICAgICAgICAgLy8gKGZvciBIVFRQIGVycm9ycyBpdCBjYWxscyBvbkVycm9yIGZpcnN0LCBzbyBvbkVycm9yIGlzIG5vdCB1c2VkIGhlcmUpXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGZvciBhdXRob3JpemF0aW9uIGVycm9ycyBhbmQgcmVkaXJlY3QgdG8gbG9naW4gaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0geGhyID8geGhyLnN0YXR1cyA6IDA7XG4gICAgICAgICAgICAgICAgaWYgKFBieEFwaUNsaWVudC5oYW5kbGVBdXRoRXJyb3Ioc3RhdHVzKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIERvbid0IGNhbGwgY2FsbGJhY2sgaWYgcmVkaXJlY3RpbmdcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soUGJ4QXBpQ2xpZW50Lm5vcm1hbGl6ZUZhaWx1cmVSZXNwb25zZShyZXNwb25zZSwgeGhyKSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJyaW5nIGEgZmFpbGVkIHJlc3BvbnNlIHRvIHRoZSBBUEkgZW52ZWxvcGUuXG4gICAgICogU2VtYW50aWMgVUkgcGFzc2VzIHRoZSByYXcgYm9keSB3aGVuIGl0IGlzIG5vdCBKU09OOiBhIHBsYWluLXRleHQgbmdpbnhcbiAgICAgKiBsaW1pdGVyIHJlcGx5ICg0MjkgXCJUb28gbWFueSByZXF1ZXN0c1wiKSwgYW4gSFRNTCBlcnJvciBwYWdlIG9yIGZhbHNlLlxuICAgICAqIEEgSlNPTiBib2R5IHdpdGhvdXQgbWVzc2FnZXMgKG5vdCBidWlsdCBieSBQQlhBcGlSZXN1bHQpIGdldHMgYSBzdGF0dXMgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Kn0gcmVzcG9uc2UgLSBSZXNwb25zZSBwYXNzZWQgYnkgU2VtYW50aWMgVUkgdG8gb25GYWlsdXJlXG4gICAgICogQHBhcmFtIHtYTUxIdHRwUmVxdWVzdH0gW3hocl0gLSBYTUxIdHRwUmVxdWVzdCBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIFJlc3BvbnNlIG9iamVjdCB3aXRoIHJlc3VsdCBhbmQgbWVzc2FnZXMgZmllbGRzXG4gICAgICovXG4gICAgc3RhdGljIG5vcm1hbGl6ZUZhaWx1cmVSZXNwb25zZShyZXNwb25zZSwgeGhyKSB7XG4gICAgICAgIGNvbnN0IHttZXNzYWdlc30gPSAkLmlzUGxhaW5PYmplY3QocmVzcG9uc2UpID8gcmVzcG9uc2UgOiB7fTtcbiAgICAgICAgaWYgKG1lc3NhZ2VzICYmIHR5cGVvZiBtZXNzYWdlcyA9PT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMobWVzc2FnZXMpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRleHQgPSB0eXBlb2YgcmVzcG9uc2UgPT09ICdzdHJpbmcnID8gcmVzcG9uc2UudHJpbSgpIDogJyc7XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IHhociA/IHhoci5zdGF0dXMgOiAwO1xuICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgaWYgKHRleHQgIT09ICcnICYmIHRleHQubGVuZ3RoIDw9IDIwMCAmJiAhdGV4dC5zdGFydHNXaXRoKCc8JykpIHtcbiAgICAgICAgICAgIC8vIFRoZSBtZXNzYWdlIGlzIHJlbmRlcmVkIGFzIEhUTUwsIHRoZSBib2R5IGNvbWVzIGZyb20gb3V0c2lkZSBQQlhBcGlSZXN1bHRcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwodGV4dCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdHVzID49IDIwMCAmJiBzdGF0dXMgPCAzMDApIHtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgSW52YWxpZCBzZXJ2ZXIgcmVzcG9uc2UgKEhUVFAgJHtzdGF0dXN9KWA7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdHVzID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhdHVzVGV4dCA9IHhoci5zdGF0dXNUZXh0ID8gYCAke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbCh4aHIuc3RhdHVzVGV4dCl9YCA6ICcnO1xuICAgICAgICAgICAgbWVzc2FnZSA9IGBIVFRQICR7c3RhdHVzfSR7c3RhdHVzVGV4dH1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWVzc2FnZSA9ICdOZXR3b3JrIGVycm9yIG9jY3VycmVkJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAuLi4oJC5pc1BsYWluT2JqZWN0KHJlc3BvbnNlKSA/IHJlc3BvbnNlIDoge30pLFxuICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFttZXNzYWdlXX1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBieSBJRCBvciBnZXQgZGVmYXVsdCB2YWx1ZXMgZm9yIG5ldyByZWNvcmRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBSZWNvcmQgSUQgb3IgZW1wdHkvbnVsbCBmb3IgbmV3IHJlY29yZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHdlIHNob3VsZCB1c2UgYSBjdXN0b20gbWV0aG9kIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICBjb25zdCBpc05ldyA9ICFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJycgfHwgcmVjb3JkSWQgPT09ICduZXcnO1xuICAgICAgICBsZXQgdXJsO1xuXG4gICAgICAgIGlmIChpc05ldyAmJiB0aGlzLmN1c3RvbU1ldGhvZHMuZ2V0RGVmYXVsdCkge1xuICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSBtZXRob2QgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0ke3RoaXMuY3VzdG9tTWV0aG9kcy5nZXREZWZhdWx0fWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBHZXQgZXhpc3RpbmcgcmVjb3JkIGJ5IElEXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtyZWNvcmRJZH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNldCBfaXNOZXcgZmxhZyBmb3IgbmV3IHJlY29yZHMgdG8gaW5kaWNhdGUgUE9TVCBzaG91bGQgYmUgdXNlZFxuICAgICAgICAgICAgICAgIGlmIChpc05ldyAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgUGJ4QXBpQ2xpZW50LmNhbGxBcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBsaXN0IG9mIHJlY29yZHMgKG9yIHNpbmdsZSByZWNvcmQgZm9yIHNpbmdsZXRvbilcbiAgICAgKiBAcGFyYW0ge29iamVjdHxmdW5jdGlvbn0gZGF0YU9yQ2FsbGJhY2sgLSBPcHRpb25hbCBwYXJhbXMgb3IgY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQ2FsbGJhY2sgaWYgZmlyc3QgcGFyYW0gaXMgZGF0YVxuICAgICAqL1xuICAgIGdldExpc3QoZGF0YU9yQ2FsbGJhY2ssIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIEZvciBzaW5nbGV0b24gcmVzb3VyY2VzLCByZWRpcmVjdCB0byBnZXQoKSBtZXRob2RcbiAgICAgICAgaWYgKHRoaXMuaXNTaW5nbGV0b24pIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5nZXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXQoZGF0YU9yQ2FsbGJhY2ssIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSBvdmVybG9hZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgbGV0IGFjdHVhbENhbGxiYWNrO1xuICAgICAgICBsZXQgcGFyYW1zID0ge307XG5cbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhT3JDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBkYXRhT3JDYWxsYmFjaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBhcmFtcyA9IGRhdGFPckNhbGxiYWNrIHx8IHt9O1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEVuc3VyZSBjYWxsYmFjayBpcyBhIGZ1bmN0aW9uXG4gICAgICAgIGlmICh0eXBlb2YgYWN0dWFsQ2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gKCkgPT4ge307XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBhY3R1YWxDYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2UgcmV0dXJuIGEgc3RydWN0dXJlIHdpdGggcmVzdWx0IGFuZCBkYXRhIGZpZWxkc1xuICAgICAgICAgICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHJlc3BvbnNlLCAnZGF0YScpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICBQYnhBcGlDbGllbnQuY2FsbEFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuYXBpVXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHBhcmFtcyxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlIHJlY29yZCAoY3JlYXRlIG9yIHVwZGF0ZSlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gc2F2ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBzYXZlUmVjb3JkKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIERldGVybWluZSBpZiB0aGlzIGlzIGEgbmV3IHJlY29yZFxuICAgICAgICBjb25zdCBpc05ldyA9IHRoaXMuaXNOZXdSZWNvcmQoZGF0YSk7XG5cbiAgICAgICAgLy8gQ2xlYW4gdXAgaW50ZXJuYWwgZmxhZ3NcbiAgICAgICAgY29uc3QgY2xlYW5EYXRhID0gey4uLmRhdGF9O1xuICAgICAgICBpZiAoY2xlYW5EYXRhLl9pc05ldyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWxldGUgY2xlYW5EYXRhLl9pc05ldztcbiAgICAgICAgfVxuICAgICAgICAvLyBSZW1vdmUgX21ldGhvZCBhcyBpdCdzIGhhbmRsZWQgYnkgdGhlIGFjdHVhbCBIVFRQIG1ldGhvZFxuICAgICAgICBpZiAoY2xlYW5EYXRhLl9tZXRob2QgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVsZXRlIGNsZWFuRGF0YS5fbWV0aG9kO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IHRoZSByZWNvcmQgSUQgZm9yIHVwZGF0ZXNcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSB0aGlzLmdldFJlY29yZElkKGNsZWFuRGF0YSk7XG5cbiAgICAgICAgLy8gdjMgQVBJOiBQT1NUIGZvciBuZXcgcmVjb3JkcywgUFVUIGZvciB1cGRhdGVzXG4gICAgICAgIGNvbnN0IG1ldGhvZCA9IGlzTmV3ID8gJ1BPU1QnIDogJ1BVVCc7XG4gICAgICAgIGNvbnN0IHVybCA9IGlzTmV3ID8gdGhpcy5hcGlVcmwgOiBgJHt0aGlzLmFwaVVybH0vJHtyZWNvcmRJZH1gO1xuXG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKSxcbiAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgUGJ4QXBpQ2xpZW50LmNhbGxBcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgICAgIGRhdGE6IGNsZWFuRGF0YSxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzLFxuICAgICAgICAgICAgYmVmb3JlU2VuZChzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlIG5lZWQgdG8gc2VuZCBhcyBKU09OIChmb3IgY29tcGxleCBzdHJ1Y3R1cmVzKVxuICAgICAgICAgICAgICAgIGlmIChQYnhBcGlDbGllbnQuaGFzQ29tcGxleERhdGEoY2xlYW5EYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5jb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KGNsZWFuRGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJlY29yZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFJlY29yZCBJRCB0byBkZWxldGVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkKHJlY29yZElkLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgIFBieEFwaUNsaWVudC5jYWxsQXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9LyR7cmVjb3JkSWR9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsIGEgY3VzdG9tIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2ROYW1lIC0gTWV0aG9kIG5hbWVcbiAgICAgKiBAcGFyYW0ge29iamVjdHxmdW5jdGlvbn0gZGF0YU9yQ2FsbGJhY2sgLSBEYXRhIG9yIGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIENhbGxiYWNrIGlmIGZpcnN0IHBhcmFtIGlzIGRhdGFcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2h0dHBNZXRob2RdIC0gSFRUUCBtZXRob2QgdG8gdXNlIChHRVQgb3IgUE9TVCksIGRlZmF1bHRzIHRvIEdFVFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbcmVzb3VyY2VJZF0gLSBSZXNvdXJjZSBJRCBmb3IgcmVzb3VyY2UtbGV2ZWwgbWV0aG9kc1xuICAgICAqL1xuICAgIGNhbGxDdXN0b21NZXRob2QobWV0aG9kTmFtZSwgZGF0YU9yQ2FsbGJhY2ssIGNhbGxiYWNrLCBodHRwTWV0aG9kID0gJ0dFVCcsIHJlc291cmNlSWQgPSBudWxsKSB7XG4gICAgICAgIC8vIEhhbmRsZSBvdmVybG9hZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgbGV0IGFjdHVhbENhbGxiYWNrO1xuICAgICAgICBsZXQgZGF0YSA9IHt9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgZGF0YU9yQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gZGF0YU9yQ2FsbGJhY2s7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gZGF0YU9yQ2FsbGJhY2sgfHwge307XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRW5zdXJlIGNhbGxiYWNrIGlzIGEgZnVuY3Rpb24gKHVzZSBub29wIGlmIG5vdCBwcm92aWRlZClcbiAgICAgICAgaWYgKHR5cGVvZiBhY3R1YWxDYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSAoKSA9PiB7fTsgLy8gRW1wdHkgY2FsbGJhY2sgZm9yIGZpcmUtYW5kLWZvcmdldCBjYWxsc1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWV0aG9kUGF0aCA9IHRoaXMuY3VzdG9tTWV0aG9kc1ttZXRob2ROYW1lXTtcbiAgICAgICAgaWYgKCFtZXRob2RQYXRoKSB7XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbYFVua25vd24gY3VzdG9tIG1ldGhvZDogJHttZXRob2ROYW1lfWBdfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHRyYWN0IGFzeW5jIGNoYW5uZWwgSUQgaWYgcHJlc2VudCAodXNlZCBmb3IgbG9uZy1ydW5uaW5nIG9wZXJhdGlvbnMpXG4gICAgICAgIGNvbnN0IGFzeW5jQ2hhbm5lbElkID0gZGF0YS5hc3luY0NoYW5uZWxJZCB8fCBkYXRhLmNoYW5uZWxJZDtcblxuICAgICAgICAvLyBCdWlsZCBVUkwgd2l0aCBJRCBpZiBwcm92aWRlZCAoZm9yIHJlc291cmNlLWxldmVsIGN1c3RvbSBtZXRob2RzKVxuICAgICAgICBsZXQgdXJsID0gdGhpcy5hcGlVcmw7XG4gICAgICAgIGlmIChyZXNvdXJjZUlkKSB7XG4gICAgICAgICAgICAvLyBSZXNvdXJjZS1sZXZlbCBtZXRob2Q6IC9hcGkvdjMvcmVzb3VyY2Uve2lkfTptZXRob2QgKFJFU1RmdWwgc3RhbmRhcmQpXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtyZXNvdXJjZUlkfSR7bWV0aG9kUGF0aH1gO1xuICAgICAgICB9IGVsc2UgaWYgKGRhdGEuaWQpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBSZXNvdXJjZS1sZXZlbCBtZXRob2Q6IC9hcGkvdjMvcmVzb3VyY2Uve2lkfTptZXRob2RcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke2RhdGEuaWR9JHttZXRob2RQYXRofWA7XG4gICAgICAgICAgICAvLyBSZW1vdmUgaWQgZnJvbSBkYXRhIHNpbmNlIGl0J3MgaW4gdGhlIFVSTFxuICAgICAgICAgICAgY29uc3QgcmVxdWVzdERhdGEgPSB7Li4uZGF0YX07XG4gICAgICAgICAgICBkZWxldGUgcmVxdWVzdERhdGEuaWQ7XG4gICAgICAgICAgICBkYXRhID0gcmVxdWVzdERhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDb2xsZWN0aW9uLWxldmVsIG1ldGhvZDogL2FwaS92My9yZXNvdXJjZTptZXRob2RcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfSR7bWV0aG9kUGF0aH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIEpTT04gZm9yIGNvbXBsZXggZGF0YSwgZm9ybSBlbmNvZGluZyBmb3Igc2ltcGxlIGRhdGFcbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogaHR0cE1ldGhvZCxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWRkIGFzeW5jIGNoYW5uZWwgaGVhZGVyIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChhc3luY0NoYW5uZWxJZCkge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmJlZm9yZVhIUiA9ICh4aHIpID0+IHtcbiAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignWC1Bc3luYy1SZXNwb25zZS1DaGFubmVsLUlkJywgYXN5bmNDaGFubmVsSWQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB4aHI7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRm9yIEdFVCByZXF1ZXN0cywgYWx3YXlzIHVzZSBxdWVyeSBwYXJhbWV0ZXJzIChubyBKU09OIGluIGJvZHkpXG4gICAgICAgIC8vIEZvciBQT1NUL1BVVC9ERUxFVEUsIHVzZSBKU09OIGZvciBjb21wbGV4IGRhdGEgKG9iamVjdHMsIGFycmF5cylcbiAgICAgICAgaWYgKGh0dHBNZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICAgICAgICAvLyBHRVQgcmVxdWVzdHM6IHNlbmQgYXMgcXVlcnkgcGFyYW1ldGVyc1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUE9TVC9QVVQvREVMRVRFOiBjaGVjayBpZiB3ZSBuZWVkIEpTT04gZW5jb2RpbmdcbiAgICAgICAgICAgIGNvbnN0IGhhc0NvbXBsZXhEYXRhID0gUGJ4QXBpQ2xpZW50Lmhhc0NvbXBsZXhEYXRhKGRhdGEpO1xuICAgICAgICAgICAgaWYgKGhhc0NvbXBsZXhEYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gU2VuZCBhcyBKU09OIHRvIHByZXNlcnZlIGNvbXBsZXggc3RydWN0dXJlc1xuICAgICAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICAgICAgYWpheFNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTZW5kIGFzIHJlZ3VsYXIgZm9ybSBkYXRhXG4gICAgICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgUGJ4QXBpQ2xpZW50LmNhbGxBcGkoYWpheFNldHRpbmdzKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogRGV0ZXJtaW5lIGlmIGRhdGEgcmVwcmVzZW50cyBhIG5ldyByZWNvcmRcbiAgICAgKiBDYW4gYmUgb3ZlcnJpZGRlbiBpbiBzcGVjaWZpYyBBUEkgbW9kdWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBjaGVja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIG5ldyByZWNvcmRcbiAgICAgKi9cbiAgICBpc05ld1JlY29yZChkYXRhKSB7XG4gICAgICAgIC8vIFRoZSBvbmx5IHdheSB0byBkZXRlcm1pbmUgLSBfaXNOZXcgZmxhZ1xuICAgICAgICAvLyBJZiBmbGFnIGlzIG5vdCBleHBsaWNpdGx5IHNldCwgY2hlY2sgSURcbiAgICAgICAgaWYgKGRhdGEuX2lzTmV3ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLl9pc05ldyA9PT0gdHJ1ZSB8fCBkYXRhLl9pc05ldyA9PT0gJ3RydWUnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmFsbGJhY2sgdG8gSUQgY2hlY2sgb25seSBpZiBmbGFnIGlzIG5vdCBzZXRcbiAgICAgICAgcmV0dXJuICFkYXRhLmlkIHx8IGRhdGEuaWQgPT09ICcnIHx8IGRhdGEuaWQgPT09ICduZXcnO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gZGF0YVxuICAgICAqIENhbiBiZSBvdmVycmlkZGVuIGluIHNwZWNpZmljIEFQSSBtb2R1bGVzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJlY29yZCBJRFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKGRhdGEpIHtcbiAgICAgICAgLy8gUkVTVCBBUEkgdjMgdXNlcyBvbmx5ICdpZCcgZmllbGRcbiAgICAgICAgcmV0dXJuIGRhdGEuaWQ7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGRhdGEgY29udGFpbnMgY29tcGxleCBzdHJ1Y3R1cmVzIHRoYXQgbmVlZCBKU09OIGVuY29kaW5nXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIGNoZWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgY29udGFpbnMgY29tcGxleCBkYXRhXG4gICAgICovXG4gICAgc3RhdGljIGhhc0NvbXBsZXhEYXRhKGRhdGEpIHtcbiAgICAgICAgZm9yIChjb25zdCB2YWx1ZSBvZiBPYmplY3QudmFsdWVzKGRhdGEpKSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gR0VUIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBRdWVyeSBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaWRdIC0gT3B0aW9uYWwgcmVjb3JkIElEIGZvciByZXNvdXJjZS1zcGVjaWZpYyByZXF1ZXN0c1xuICAgICAqL1xuICAgIGNhbGxHZXQocGFyYW1zLCBjYWxsYmFjaywgaWQpIHtcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuXG4gICAgICAgIC8vIEZvciBub24tc2luZ2xldG9uIHJlc291cmNlcyB3aXRoIElELCBhcHBlbmQgSUQgdG8gVVJMXG4gICAgICAgIGlmICghdGhpcy5pc1NpbmdsZXRvbiAmJiBpZCkge1xuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7aWR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKSxcbiAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgUGJ4QXBpQ2xpZW50LmNhbGxBcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YTogcGFyYW1zIHx8IHt9LFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBQT1NUIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzZW5kXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaWRdIC0gT3B0aW9uYWwgcmVzb3VyY2UgSUQgZm9yIHJlc291cmNlLXNwZWNpZmljIHJlcXVlc3RzXG4gICAgICovXG4gICAgY2FsbFBvc3QoZGF0YSwgY2FsbGJhY2ssIGlkKSB7XG4gICAgICAgIGxldCB1cmwgPSB0aGlzLmFwaVVybDtcbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtpZH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFzQ29tcGxleERhdGEgPSBQYnhBcGlDbGllbnQuaGFzQ29tcGxleERhdGEoZGF0YSk7XG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKSxcbiAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgYWpheFNldHRpbmdzID0ge1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGhhc0NvbXBsZXhEYXRhKSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgUGJ4QXBpQ2xpZW50LmNhbGxBcGkoYWpheFNldHRpbmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIFBVVCByZXF1ZXN0IChiYWNrd2FyZCBjb21wYXRpYmlsaXR5IG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gc2VuZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2lkXSAtIE9wdGlvbmFsIHJlc291cmNlIElEIGZvciByZXNvdXJjZS1zcGVjaWZpYyByZXF1ZXN0c1xuICAgICAqL1xuICAgIGNhbGxQdXQoZGF0YSwgY2FsbGJhY2ssIGlkKSB7XG4gICAgICAgIGxldCB1cmwgPSB0aGlzLmFwaVVybDtcbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtpZH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFzQ29tcGxleERhdGEgPSBQYnhBcGlDbGllbnQuaGFzQ29tcGxleERhdGEoZGF0YSk7XG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXRCYXNlQXBpU2V0dGluZ3MoXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKSxcbiAgICAgICAgICAgIGNhbGxiYWNrXG4gICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgYWpheFNldHRpbmdzID0ge1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzQ29tcGxleERhdGEpIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICBQYnhBcGlDbGllbnQuY2FsbEFwaShhamF4U2V0dGluZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gREVMRVRFIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBSZXNvdXJjZSBJRCB0byBkZWxldGVcbiAgICAgKi9cbiAgICBjYWxsRGVsZXRlKGNhbGxiYWNrLCBpZCkge1xuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgIFBieEFwaUNsaWVudC5jYWxsQXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9LyR7aWR9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIFBBVENIIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzZW5kXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGNhbGxQYXRjaChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBoYXNDb21wbGV4RGF0YSA9IFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShkYXRhKTtcbiAgICAgICAgY29uc3QgYXBpU2V0dGluZ3MgPSB0aGlzLmdldEJhc2VBcGlTZXR0aW5ncyhcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4gY2FsbGJhY2socmVzcG9uc2UsIHRydWUpLFxuICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHRoaXMuYXBpVXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3NcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzQ29tcGxleERhdGEpIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICBQYnhBcGlDbGllbnQuY2FsbEFwaShhamF4U2V0dGluZ3MpO1xuICAgIH1cbn1cblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93LlBieEFwaUNsaWVudCA9IFBieEFwaUNsaWVudDsiXX0=