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
   * Get record by ID or get default values for new record
   * @param {string} recordId - Record ID or empty/null for new record
   * @param {function} callback - Callback function
   */


  _createClass(PbxApiClient, [{
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

      $.api({
        url: url,
        method: 'GET',
        on: 'now',
        onSuccess: function onSuccess(response) {
          // Set _isNew flag for new records to indicate POST should be used
          if (isNew && response.data) {
            response.data._isNew = true;
          }

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

      $.api({
        url: this.apiUrl,
        on: 'now',
        method: 'GET',
        data: params,
        successTest: PbxApi.successTest,
        onSuccess: function onSuccess(response) {
          actualCallback(response, true);
        },
        onFailure: function onFailure(response) {
          // Ensure we return a structure with result and data fields
          if (response && !response.hasOwnProperty('data')) {
            response.data = [];
          }

          actualCallback(response, false);
        },
        onError: function onError() {
          actualCallback({
            result: false,
            data: []
          }, false);
        }
      });
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

      $.api({
        url: "".concat(this.apiUrl, "/").concat(recordId),
        on: 'now',
        method: 'DELETE',
        data: data,
        successTest: PbxApi.successTest,
        onSuccess: function onSuccess(response) {
          callback(response, true);
        },
        onFailure: function onFailure(response) {
          callback(response, false);
        },
        onError: function onError() {
          callback(false, false);
        }
      });
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


      var ajaxSettings = {
        url: url,
        method: httpMethod,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function onSuccess(response) {
          actualCallback(response, true);
        },
        onFailure: function onFailure(response) {
          actualCallback(response, false);
        },
        onError: function onError() {
          actualCallback({
            result: false,
            messages: {
              error: ['Network error occurred']
            }
          }, false);
        }
      };

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

      $.api({
        url: url,
        on: 'now',
        method: 'GET',
        data: params || {},
        successTest: PbxApi.successTest,
        onSuccess: function onSuccess(response) {
          callback(response, true);
        },
        onFailure: function onFailure(response) {
          callback(response, false);
        },
        onError: function onError() {
          callback({
            result: false,
            data: []
          }, false);
        }
      });
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
      var ajaxSettings = {
        url: url,
        method: 'POST',
        on: 'now',
        successTest: PbxApi.successTest,
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
      };

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
      var ajaxSettings = {
        url: url,
        method: 'PUT',
        on: 'now',
        successTest: PbxApi.successTest,
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
      };

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

      $.api({
        url: "".concat(this.apiUrl, "/").concat(id),
        on: 'now',
        method: 'DELETE',
        data: data,
        successTest: PbxApi.successTest,
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
     * Perform PATCH request (backward compatibility method)
     * @param {object} data - Data to send
     * @param {function} callback - Callback function
     */

  }, {
    key: "callPatch",
    value: function callPatch(data, callback) {
      var hasComplexData = PbxApiClient.hasComplexData(data);
      var ajaxSettings = {
        url: this.apiUrl,
        method: 'PATCH',
        on: 'now',
        successTest: PbxApi.successTest,
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
      };

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4LWFwaS1jbGllbnQuanMiXSwibmFtZXMiOlsiUGJ4QXBpQ2xpZW50IiwiY29uZmlnIiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiaXNTaW5nbGV0b24iLCJzaW5nbGV0b24iLCJhcGlVcmwiLCJDb25maWciLCJwYnhVcmwiLCJlbmRwb2ludHMiLCJnZXRMaXN0IiwiT2JqZWN0IiwiZW50cmllcyIsIm1ldGhvZE5hbWUiLCJtZXRob2RQYXRoIiwicmVjb3JkSWQiLCJjYWxsYmFjayIsImlzTmV3IiwidXJsIiwiZ2V0RGVmYXVsdCIsIiQiLCJhcGkiLCJtZXRob2QiLCJvbiIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwiZGF0YSIsIl9pc05ldyIsIm9uRmFpbHVyZSIsIm9uRXJyb3IiLCJyZXN1bHQiLCJtZXNzYWdlcyIsImVycm9yIiwiZGF0YU9yQ2FsbGJhY2siLCJnZXQiLCJhY3R1YWxDYWxsYmFjayIsInBhcmFtcyIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIiwiaGFzT3duUHJvcGVydHkiLCJpc05ld1JlY29yZCIsImNsZWFuRGF0YSIsInVuZGVmaW5lZCIsIl9tZXRob2QiLCJnZXRSZWNvcmRJZCIsImJlZm9yZVNlbmQiLCJzZXR0aW5ncyIsImdsb2JhbENzcmZUb2tlbktleSIsImdsb2JhbENzcmZUb2tlbiIsImhhc0NvbXBsZXhEYXRhIiwiY29udGVudFR5cGUiLCJKU09OIiwic3RyaW5naWZ5IiwiaHR0cE1ldGhvZCIsInJlc291cmNlSWQiLCJpZCIsInJlcXVlc3REYXRhIiwia2V5IiwidmFsdWUiLCJBcnJheSIsImlzQXJyYXkiLCJhamF4U2V0dGluZ3MiLCJ2YWx1ZXMiLCJ3aW5kb3ciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QUUsQ0FBQyx3QkFBRDtBQUFSO0FBQTFCLFdBQUQsRUFBaUUsS0FBakUsQ0FBUjtBQUNIO0FBYmdCLE9BQXJCOztBQWdCQSxVQUFJaUIsY0FBSixFQUFvQjtBQUNoQlksUUFBQUEsWUFBWSxDQUFDbkMsSUFBYixHQUFvQnlCLElBQUksQ0FBQ0MsU0FBTCxDQUFlMUIsSUFBZixDQUFwQjtBQUNBbUMsUUFBQUEsWUFBWSxDQUFDWCxXQUFiLEdBQTJCLGtCQUEzQjtBQUNILE9BSEQsTUFHTztBQUNIVyxRQUFBQSxZQUFZLENBQUNuQyxJQUFiLEdBQW9CQSxJQUFwQjtBQUNIOztBQUVETixNQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTXdDLFlBQU47QUFDSDs7O1dBdkxELHdCQUFzQm5DLElBQXRCLEVBQTRCO0FBQ3hCLHlDQUFvQmYsTUFBTSxDQUFDbUQsTUFBUCxDQUFjcEMsSUFBZCxDQUFwQixzQ0FBeUM7QUFBcEMsWUFBTWdDLEtBQUssc0JBQVg7O0FBQ0QsWUFBSUMsS0FBSyxDQUFDQyxPQUFOLENBQWNGLEtBQWQsS0FBeUIsUUFBT0EsS0FBUCxNQUFpQixRQUFqQixJQUE2QkEsS0FBSyxLQUFLLElBQXBFLEVBQTJFO0FBQ3ZFLGlCQUFPLElBQVA7QUFDSDtBQUNKOztBQUNELGFBQU8sS0FBUDtBQUNIOzs7O0tBbUxMOzs7QUFDQUssTUFBTSxDQUFDL0QsWUFBUCxHQUFzQkEsWUFBdEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBQYnhBcGksICQgKi9cblxuLyoqXG4gKiBQYnhBcGlDbGllbnQgLSBVbmlmaWVkIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgYWxsIGVudGl0aWVzXG4gKiBcbiAqIFRoaXMgY2xhc3MgcHJvdmlkZXMgYSBzdGFuZGFyZCBpbnRlcmZhY2UgZm9yIGFsbCBDUlVEIG9wZXJhdGlvbnNcbiAqIGFuZCBlbGltaW5hdGVzIGNvZGUgZHVwbGljYXRpb24gYWNyb3NzIEFQSSBtb2R1bGVzLlxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gU3RhbmRhcmQgUkVTVGZ1bCBvcGVyYXRpb25zIChHRVQsIFBPU1QsIFBVVCwgREVMRVRFKVxuICogLSBDdXN0b20gbWV0aG9kcyBzdXBwb3J0IHZpYSBjb2xvbiBub3RhdGlvbiAoOmdldERlZmF1bHQpXG4gKiAtIEF1dG9tYXRpYyBIVFRQIG1ldGhvZCBzZWxlY3Rpb24gYmFzZWQgb24gZGF0YVxuICogLSBDU1JGIHRva2VuIG1hbmFnZW1lbnRcbiAqIC0gQmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aXRoIFBieERhdGFUYWJsZUluZGV4XG4gKiBcbiAqIEBjbGFzcyBQYnhBcGlDbGllbnQgXG4gKi9cbmNsYXNzIFBieEFwaUNsaWVudCB7XG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgbmV3IEFQSSBjbGllbnQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLmVuZHBvaW50IC0gQmFzZSBBUEkgZW5kcG9pbnQgKGUuZy4sICcvcGJ4Y29yZS9hcGkvdjMvaXZyLW1lbnUnKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbY29uZmlnLmN1c3RvbU1ldGhvZHNdIC0gTWFwIG9mIGN1c3RvbSBtZXRob2RzIChlLmcuLCB7Z2V0RGVmYXVsdDogJzpnZXREZWZhdWx0J30pXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNpbmdsZXRvbl0gLSBXaGV0aGVyIHRoaXMgaXMgYSBzaW5nbGV0b24gcmVzb3VyY2UgKG5vIElEcyBpbiBVUkxzKVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbmZpZykge1xuICAgICAgICB0aGlzLmVuZHBvaW50ID0gY29uZmlnLmVuZHBvaW50O1xuICAgICAgICB0aGlzLmN1c3RvbU1ldGhvZHMgPSBjb25maWcuY3VzdG9tTWV0aG9kcyB8fCB7fTtcbiAgICAgICAgdGhpcy5pc1NpbmdsZXRvbiA9IGNvbmZpZy5zaW5nbGV0b24gfHwgZmFsc2U7XG5cbiAgICAgICAgLy8gRXh0cmFjdCBiYXNlIFVSTCBmb3IgQ29uZmlnLnBieFVybFxuICAgICAgICB0aGlzLmFwaVVybCA9IGAke0NvbmZpZy5wYnhVcmx9JHt0aGlzLmVuZHBvaW50fWA7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGVuZHBvaW50cyBwcm9wZXJ0eSBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aXRoIFBieERhdGFUYWJsZUluZGV4XG4gICAgICAgIHRoaXMuZW5kcG9pbnRzID0ge1xuICAgICAgICAgICAgZ2V0TGlzdDogdGhpcy5hcGlVcmxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgY3VzdG9tIG1ldGhvZCBlbmRwb2ludHNcbiAgICAgICAgZm9yIChjb25zdCBbbWV0aG9kTmFtZSwgbWV0aG9kUGF0aF0gb2YgT2JqZWN0LmVudHJpZXModGhpcy5jdXN0b21NZXRob2RzKSkge1xuICAgICAgICAgICAgdGhpcy5lbmRwb2ludHNbbWV0aG9kTmFtZV0gPSBgJHt0aGlzLmFwaVVybH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIGJ5IElEIG9yIGdldCBkZWZhdWx0IHZhbHVlcyBmb3IgbmV3IHJlY29yZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFJlY29yZCBJRCBvciBlbXB0eS9udWxsIGZvciBuZXcgcmVjb3JkXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFJlY29yZChyZWNvcmRJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2Ugc2hvdWxkIHVzZSBhIGN1c3RvbSBtZXRob2QgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgIGNvbnN0IGlzTmV3ID0gIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJyB8fCByZWNvcmRJZCA9PT0gJ25ldyc7XG4gICAgICAgIGxldCB1cmw7XG5cbiAgICAgICAgaWYgKGlzTmV3ICYmIHRoaXMuY3VzdG9tTWV0aG9kcy5nZXREZWZhdWx0KSB7XG4gICAgICAgICAgICAvLyBVc2UgY3VzdG9tIG1ldGhvZCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfSR7dGhpcy5jdXN0b21NZXRob2RzLmdldERlZmF1bHR9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEdldCBleGlzdGluZyByZWNvcmQgYnkgSURcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke3JlY29yZElkfWA7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgX2lzTmV3IGZsYWcgZm9yIG5ldyByZWNvcmRzIHRvIGluZGljYXRlIFBPU1Qgc2hvdWxkIGJlIHVzZWRcbiAgICAgICAgICAgICAgICBpZiAoaXNOZXcgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXX1cbiAgICAgICAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgbGlzdCBvZiByZWNvcmRzIChvciBzaW5nbGUgcmVjb3JkIGZvciBzaW5nbGV0b24pXG4gICAgICogQHBhcmFtIHtvYmplY3R8ZnVuY3Rpb259IGRhdGFPckNhbGxiYWNrIC0gT3B0aW9uYWwgcGFyYW1zIG9yIGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIENhbGxiYWNrIGlmIGZpcnN0IHBhcmFtIGlzIGRhdGFcbiAgICAgKi9cbiAgICBnZXRMaXN0KGRhdGFPckNhbGxiYWNrLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBGb3Igc2luZ2xldG9uIHJlc291cmNlcywgcmVkaXJlY3QgdG8gZ2V0KCkgbWV0aG9kXG4gICAgICAgIGlmICh0aGlzLmlzU2luZ2xldG9uKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuZ2V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KGRhdGFPckNhbGxiYWNrLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgb3ZlcmxvYWRlZCBwYXJhbWV0ZXJzXG4gICAgICAgIGxldCBhY3R1YWxDYWxsYmFjaztcbiAgICAgICAgbGV0IHBhcmFtcyA9IHt9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgZGF0YU9yQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gZGF0YU9yQ2FsbGJhY2s7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYXJhbXMgPSBkYXRhT3JDYWxsYmFjayB8fCB7fTtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuYXBpVXJsLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHBhcmFtcyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhY3R1YWxDYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIHJldHVybiBhIHN0cnVjdHVyZSB3aXRoIHJlc3VsdCBhbmQgZGF0YSBmaWVsZHNcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgIXJlc3BvbnNlLmhhc093blByb3BlcnR5KCdkYXRhJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhY3R1YWxDYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IFtdfSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2F2ZSByZWNvcmQgKGNyZWF0ZSBvciB1cGRhdGUpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNhdmVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgc2F2ZVJlY29yZChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmRcbiAgICAgICAgY29uc3QgaXNOZXcgPSB0aGlzLmlzTmV3UmVjb3JkKGRhdGEpO1xuXG4gICAgICAgIC8vIENsZWFuIHVwIGludGVybmFsIGZsYWdzXG4gICAgICAgIGNvbnN0IGNsZWFuRGF0YSA9IHsuLi5kYXRhfTtcbiAgICAgICAgaWYgKGNsZWFuRGF0YS5faXNOZXcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVsZXRlIGNsZWFuRGF0YS5faXNOZXc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVtb3ZlIF9tZXRob2QgYXMgaXQncyBoYW5kbGVkIGJ5IHRoZSBhY3R1YWwgSFRUUCBtZXRob2RcbiAgICAgICAgaWYgKGNsZWFuRGF0YS5fbWV0aG9kICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBjbGVhbkRhdGEuX21ldGhvZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCB0aGUgcmVjb3JkIElEIGZvciB1cGRhdGVzXG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gdGhpcy5nZXRSZWNvcmRJZChjbGVhbkRhdGEpO1xuXG4gICAgICAgIC8vIHYzIEFQSTogUE9TVCBmb3IgbmV3IHJlY29yZHMsIFBVVCBmb3IgdXBkYXRlc1xuICAgICAgICBjb25zdCBtZXRob2QgPSBpc05ldyA/ICdQT1NUJyA6ICdQVVQnO1xuICAgICAgICBjb25zdCB1cmwgPSBpc05ldyA/IHRoaXMuYXBpVXJsIDogYCR7dGhpcy5hcGlVcmx9LyR7cmVjb3JkSWR9YDtcblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICAgICAgZGF0YTogY2xlYW5EYXRhLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgYmVmb3JlU2VuZChzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBDU1JGIHRva2VuIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuS2V5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBjbGVhbkRhdGFbZ2xvYmFsQ3NyZlRva2VuS2V5XSA9IGdsb2JhbENzcmZUb2tlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UgbmVlZCB0byBzZW5kIGFzIEpTT04gKGZvciBjb21wbGV4IHN0cnVjdHVyZXMpXG4gICAgICAgICAgICAgICAgaWYgKFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShjbGVhbkRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoY2xlYW5EYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXX1cbiAgICAgICAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSByZWNvcmRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBSZWNvcmQgSUQgdG8gZGVsZXRlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGRlbGV0ZVJlY29yZChyZWNvcmRJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIENTUkYgdG9rZW4gaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuS2V5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZGF0YVtnbG9iYWxDc3JmVG9rZW5LZXldID0gZ2xvYmFsQ3NyZlRva2VuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuYXBpVXJsfS8ke3JlY29yZElkfWAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGwgYSBjdXN0b20gbWV0aG9kXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZE5hbWUgLSBNZXRob2QgbmFtZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fGZ1bmN0aW9ufSBkYXRhT3JDYWxsYmFjayAtIERhdGEgb3IgY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQ2FsbGJhY2sgaWYgZmlyc3QgcGFyYW0gaXMgZGF0YVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaHR0cE1ldGhvZF0gLSBIVFRQIG1ldGhvZCB0byB1c2UgKEdFVCBvciBQT1NUKSwgZGVmYXVsdHMgdG8gR0VUXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtyZXNvdXJjZUlkXSAtIFJlc291cmNlIElEIGZvciByZXNvdXJjZS1sZXZlbCBtZXRob2RzXG4gICAgICovXG4gICAgY2FsbEN1c3RvbU1ldGhvZChtZXRob2ROYW1lLCBkYXRhT3JDYWxsYmFjaywgY2FsbGJhY2ssIGh0dHBNZXRob2QgPSAnR0VUJywgcmVzb3VyY2VJZCA9IG51bGwpIHtcbiAgICAgICAgLy8gSGFuZGxlIG92ZXJsb2FkZWQgcGFyYW1ldGVyc1xuICAgICAgICBsZXQgYWN0dWFsQ2FsbGJhY2s7XG4gICAgICAgIGxldCBkYXRhID0ge307XG5cbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhT3JDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBkYXRhT3JDYWxsYmFjaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhT3JDYWxsYmFjayB8fCB7fTtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtZXRob2RQYXRoID0gdGhpcy5jdXN0b21NZXRob2RzW21ldGhvZE5hbWVdO1xuICAgICAgICBpZiAoIW1ldGhvZFBhdGgpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFtgVW5rbm93biBjdXN0b20gbWV0aG9kOiAke21ldGhvZE5hbWV9YF19XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgVVJMIHdpdGggSUQgaWYgcHJvdmlkZWQgKGZvciByZXNvdXJjZS1sZXZlbCBjdXN0b20gbWV0aG9kcylcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuICAgICAgICBpZiAocmVzb3VyY2VJZCkge1xuICAgICAgICAgICAgLy8gUmVzb3VyY2UtbGV2ZWwgbWV0aG9kOiAvYXBpL3YzL3Jlc291cmNlL3tpZH06bWV0aG9kIChSRVNUZnVsIHN0YW5kYXJkKVxuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7cmVzb3VyY2VJZH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhLmlkKSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjazogUmVzb3VyY2UtbGV2ZWwgbWV0aG9kOiAvYXBpL3YzL3Jlc291cmNlL3tpZH06bWV0aG9kXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtkYXRhLmlkfSR7bWV0aG9kUGF0aH1gO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGlkIGZyb20gZGF0YSBzaW5jZSBpdCdzIGluIHRoZSBVUkxcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3REYXRhID0gey4uLmRhdGF9O1xuICAgICAgICAgICAgZGVsZXRlIHJlcXVlc3REYXRhLmlkO1xuICAgICAgICAgICAgZGF0YSA9IHJlcXVlc3REYXRhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ29sbGVjdGlvbi1sZXZlbCBtZXRob2Q6IC9hcGkvdjMvcmVzb3VyY2U6bWV0aG9kXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIENTUkYgdG9rZW4gZm9yIFBPU1QgcmVxdWVzdHNcbiAgICAgICAgaWYgKGh0dHBNZXRob2QgPT09ICdQT1NUJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuS2V5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZGF0YVtnbG9iYWxDc3JmVG9rZW5LZXldID0gZ2xvYmFsQ3NyZlRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZGF0YSBjb250YWlucyBib29sZWFuIG9yIGNvbXBsZXggdmFsdWVzXG4gICAgICAgIGxldCBoYXNDb21wbGV4RGF0YSA9IGZhbHNlO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW2tleV07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFzQ29tcGxleERhdGEgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgSlNPTiBmb3IgY29tcGxleCBkYXRhLCBmb3JtIGVuY29kaW5nIGZvciBzaW1wbGUgZGF0YVxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogaHR0cE1ldGhvZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhY3R1YWxDYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ119XG4gICAgICAgICAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNDb21wbGV4RGF0YSkge1xuICAgICAgICAgICAgLy8gU2VuZCBhcyBKU09OIHRvIHByZXNlcnZlIGJvb2xlYW4gdmFsdWVzIGFuZCBjb21wbGV4IHN0cnVjdHVyZXNcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTZW5kIGFzIHJlZ3VsYXIgZm9ybSBkYXRhXG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaShhamF4U2V0dGluZ3MpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXRlcm1pbmUgaWYgZGF0YSByZXByZXNlbnRzIGEgbmV3IHJlY29yZFxuICAgICAqIENhbiBiZSBvdmVycmlkZGVuIGluIHNwZWNpZmljIEFQSSBtb2R1bGVzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIGNoZWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgbmV3IHJlY29yZFxuICAgICAqL1xuICAgIGlzTmV3UmVjb3JkKGRhdGEpIHtcbiAgICAgICAgLy8gVGhlIG9ubHkgd2F5IHRvIGRldGVybWluZSAtIF9pc05ldyBmbGFnXG4gICAgICAgIC8vIElmIGZsYWcgaXMgbm90IGV4cGxpY2l0bHkgc2V0LCBjaGVjayBJRFxuICAgICAgICBpZiAoZGF0YS5faXNOZXcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEuX2lzTmV3ID09PSB0cnVlIHx8IGRhdGEuX2lzTmV3ID09PSAndHJ1ZSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGYWxsYmFjayB0byBJRCBjaGVjayBvbmx5IGlmIGZsYWcgaXMgbm90IHNldFxuICAgICAgICByZXR1cm4gIWRhdGEuaWQgfHwgZGF0YS5pZCA9PT0gJycgfHwgZGF0YS5pZCA9PT0gJ25ldyc7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBkYXRhXG4gICAgICogQ2FuIGJlIG92ZXJyaWRkZW4gaW4gc3BlY2lmaWMgQVBJIG1vZHVsZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmVjb3JkIElEXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoZGF0YSkge1xuICAgICAgICAvLyBSRVNUIEFQSSB2MyB1c2VzIG9ubHkgJ2lkJyBmaWVsZFxuICAgICAgICByZXR1cm4gZGF0YS5pZDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgZGF0YSBjb250YWlucyBjb21wbGV4IHN0cnVjdHVyZXMgdGhhdCBuZWVkIEpTT04gZW5jb2RpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gY2hlY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBjb250YWlucyBjb21wbGV4IGRhdGFcbiAgICAgKi9cbiAgICBzdGF0aWMgaGFzQ29tcGxleERhdGEoZGF0YSkge1xuICAgICAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIE9iamVjdC52YWx1ZXMoZGF0YSkpIHtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSB8fCAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBHRVQgcmVxdWVzdCAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFF1ZXJ5IHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtpZF0gLSBPcHRpb25hbCByZWNvcmQgSUQgZm9yIHJlc291cmNlLXNwZWNpZmljIHJlcXVlc3RzXG4gICAgICovXG4gICAgY2FsbEdldChwYXJhbXMsIGNhbGxiYWNrLCBpZCkge1xuICAgICAgICBsZXQgdXJsID0gdGhpcy5hcGlVcmw7XG5cbiAgICAgICAgLy8gRm9yIG5vbi1zaW5nbGV0b24gcmVzb3VyY2VzIHdpdGggSUQsIGFwcGVuZCBJRCB0byBVUkxcbiAgICAgICAgaWYgKCF0aGlzLmlzU2luZ2xldG9uICYmIGlkKSB7XG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtpZH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YTogcGFyYW1zIHx8IHt9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IFtdfSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIFBPU1QgcmVxdWVzdCAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNlbmRcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtpZF0gLSBPcHRpb25hbCByZXNvdXJjZSBJRCBmb3IgcmVzb3VyY2Utc3BlY2lmaWMgcmVxdWVzdHNcbiAgICAgKi9cbiAgICBjYWxsUG9zdChkYXRhLCBjYWxsYmFjaywgaWQpIHtcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke2lkfWA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYXNDb21wbGV4RGF0YSA9IFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShkYXRhKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciBvY2N1cnJlZCddfX0sIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzQ29tcGxleERhdGEpIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaShhamF4U2V0dGluZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gUFVUIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzZW5kXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaWRdIC0gT3B0aW9uYWwgcmVzb3VyY2UgSUQgZm9yIHJlc291cmNlLXNwZWNpZmljIHJlcXVlc3RzXG4gICAgICovXG4gICAgY2FsbFB1dChkYXRhLCBjYWxsYmFjaywgaWQpIHtcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke2lkfWA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYXNDb21wbGV4RGF0YSA9IFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShkYXRhKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ119fSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNDb21wbGV4RGF0YSkge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5jb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKGFqYXhTZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBERUxFVEUgcmVxdWVzdCAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlc291cmNlIElEIHRvIGRlbGV0ZVxuICAgICAqL1xuICAgIGNhbGxEZWxldGUoY2FsbGJhY2ssIGlkKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB7fTtcblxuICAgICAgICBpZiAodHlwZW9mIGdsb2JhbENzcmZUb2tlbktleSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGdsb2JhbENzcmZUb2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGRhdGFbZ2xvYmFsQ3NyZlRva2VuS2V5XSA9IGdsb2JhbENzcmZUb2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9LyR7aWR9YCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciBvY2N1cnJlZCddfX0sIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBQQVRDSCByZXF1ZXN0IChiYWNrd2FyZCBjb21wYXRpYmlsaXR5IG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gc2VuZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBjYWxsUGF0Y2goZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgaGFzQ29tcGxleERhdGEgPSBQYnhBcGlDbGllbnQuaGFzQ29tcGxleERhdGEoZGF0YSk7XG5cbiAgICAgICAgY29uc3QgYWpheFNldHRpbmdzID0ge1xuICAgICAgICAgICAgdXJsOiB0aGlzLmFwaVVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXX19LCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGhhc0NvbXBsZXhEYXRhKSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoYWpheFNldHRpbmdzKTtcbiAgICB9XG59XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbndpbmRvdy5QYnhBcGlDbGllbnQgPSBQYnhBcGlDbGllbnQ7Il19