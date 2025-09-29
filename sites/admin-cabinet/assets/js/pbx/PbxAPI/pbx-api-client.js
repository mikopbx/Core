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

          callback(response);
        },
        onFailure: function onFailure(response) {
          callback(response);
        },
        onError: function onError() {
          callback({
            result: false,
            messages: {
              error: ['Network error occurred']
            }
          });
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
          actualCallback(response);
        },
        onFailure: function onFailure(response) {
          // Ensure we return a structure with result and data fields
          if (response && !response.hasOwnProperty('data')) {
            response.data = [];
          }

          actualCallback(response);
        },
        onError: function onError() {
          actualCallback({
            result: false,
            data: []
          });
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
          callback(response);
        },
        onFailure: function onFailure(response) {
          callback(response);
        },
        onError: function onError() {
          callback({
            result: false,
            messages: {
              error: ['Network error occurred']
            }
          });
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
          callback(response);
        },
        onFailure: function onFailure(response) {
          callback(response);
        },
        onError: function onError() {
          callback(false);
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
          actualCallback(response);
        },
        onFailure: function onFailure(response) {
          actualCallback(response);
        },
        onError: function onError() {
          actualCallback({
            result: false,
            messages: {
              error: ['Network error occurred']
            }
          });
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
          callback(response);
        },
        onFailure: function onFailure(response) {
          callback(response);
        },
        onError: function onError() {
          callback({
            result: false,
            data: []
          });
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
          callback(response);
        },
        onFailure: function onFailure(response) {
          callback(response);
        },
        onError: function onError() {
          callback({
            result: false,
            messages: {
              error: ['Network error occurred']
            }
          });
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
          callback(response);
        },
        onFailure: function onFailure(response) {
          callback(response);
        },
        onError: function onError() {
          callback({
            result: false,
            messages: {
              error: ['Network error occurred']
            }
          });
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
          callback(response);
        },
        onFailure: function onFailure(response) {
          callback(response);
        },
        onError: function onError() {
          callback({
            result: false,
            messages: {
              error: ['Network error occurred']
            }
          });
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
          callback(response);
        },
        onFailure: function onFailure(response) {
          callback(response);
        },
        onError: function onError() {
          callback({
            result: false,
            messages: {
              error: ['Network error occurred']
            }
          });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4LWFwaS1jbGllbnQuanMiXSwibmFtZXMiOlsiUGJ4QXBpQ2xpZW50IiwiY29uZmlnIiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiaXNTaW5nbGV0b24iLCJzaW5nbGV0b24iLCJhcGlVcmwiLCJDb25maWciLCJwYnhVcmwiLCJlbmRwb2ludHMiLCJnZXRMaXN0IiwiT2JqZWN0IiwiZW50cmllcyIsIm1ldGhvZE5hbWUiLCJtZXRob2RQYXRoIiwicmVjb3JkSWQiLCJjYWxsYmFjayIsImlzTmV3IiwidXJsIiwiZ2V0RGVmYXVsdCIsIiQiLCJhcGkiLCJtZXRob2QiLCJvbiIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwiZGF0YSIsIl9pc05ldyIsIm9uRmFpbHVyZSIsIm9uRXJyb3IiLCJyZXN1bHQiLCJtZXNzYWdlcyIsImVycm9yIiwiZGF0YU9yQ2FsbGJhY2siLCJnZXQiLCJhY3R1YWxDYWxsYmFjayIsInBhcmFtcyIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIiwiaGFzT3duUHJvcGVydHkiLCJpc05ld1JlY29yZCIsImNsZWFuRGF0YSIsInVuZGVmaW5lZCIsIl9tZXRob2QiLCJnZXRSZWNvcmRJZCIsImJlZm9yZVNlbmQiLCJzZXR0aW5ncyIsImdsb2JhbENzcmZUb2tlbktleSIsImdsb2JhbENzcmZUb2tlbiIsImhhc0NvbXBsZXhEYXRhIiwiY29udGVudFR5cGUiLCJKU09OIiwic3RyaW5naWZ5IiwiaHR0cE1ldGhvZCIsInJlc291cmNlSWQiLCJpZCIsInJlcXVlc3REYXRhIiwia2V5IiwidmFsdWUiLCJBcnJheSIsImlzQXJyYXkiLCJhamF4U2V0dGluZ3MiLCJ2YWx1ZXMiLCJ3aW5kb3ciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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O1dBdkxELHdCQUFzQm5DLElBQXRCLEVBQTRCO0FBQ3hCLHlDQUFvQmYsTUFBTSxDQUFDbUQsTUFBUCxDQUFjcEMsSUFBZCxDQUFwQixzQ0FBeUM7QUFBcEMsWUFBTWdDLEtBQUssc0JBQVg7O0FBQ0QsWUFBSUMsS0FBSyxDQUFDQyxPQUFOLENBQWNGLEtBQWQsS0FBeUIsUUFBT0EsS0FBUCxNQUFpQixRQUFqQixJQUE2QkEsS0FBSyxLQUFLLElBQXBFLEVBQTJFO0FBQ3ZFLGlCQUFPLElBQVA7QUFDSDtBQUNKOztBQUNELGFBQU8sS0FBUDtBQUNIOzs7O0tBbUxMOzs7QUFDQUssTUFBTSxDQUFDL0QsWUFBUCxHQUFzQkEsWUFBdEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBQYnhBcGksICQgKi9cblxuLyoqXG4gKiBQYnhBcGlDbGllbnQgLSBVbmlmaWVkIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgYWxsIGVudGl0aWVzXG4gKiBcbiAqIFRoaXMgY2xhc3MgcHJvdmlkZXMgYSBzdGFuZGFyZCBpbnRlcmZhY2UgZm9yIGFsbCBDUlVEIG9wZXJhdGlvbnNcbiAqIGFuZCBlbGltaW5hdGVzIGNvZGUgZHVwbGljYXRpb24gYWNyb3NzIEFQSSBtb2R1bGVzLlxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gU3RhbmRhcmQgUkVTVGZ1bCBvcGVyYXRpb25zIChHRVQsIFBPU1QsIFBVVCwgREVMRVRFKVxuICogLSBDdXN0b20gbWV0aG9kcyBzdXBwb3J0IHZpYSBjb2xvbiBub3RhdGlvbiAoOmdldERlZmF1bHQpXG4gKiAtIEF1dG9tYXRpYyBIVFRQIG1ldGhvZCBzZWxlY3Rpb24gYmFzZWQgb24gZGF0YVxuICogLSBDU1JGIHRva2VuIG1hbmFnZW1lbnRcbiAqIC0gQmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aXRoIFBieERhdGFUYWJsZUluZGV4XG4gKiBcbiAqIEBjbGFzcyBQYnhBcGlDbGllbnQgXG4gKi9cbmNsYXNzIFBieEFwaUNsaWVudCB7XG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgbmV3IEFQSSBjbGllbnQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLmVuZHBvaW50IC0gQmFzZSBBUEkgZW5kcG9pbnQgKGUuZy4sICcvcGJ4Y29yZS9hcGkvdjMvaXZyLW1lbnUnKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbY29uZmlnLmN1c3RvbU1ldGhvZHNdIC0gTWFwIG9mIGN1c3RvbSBtZXRob2RzIChlLmcuLCB7Z2V0RGVmYXVsdDogJzpnZXREZWZhdWx0J30pXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNpbmdsZXRvbl0gLSBXaGV0aGVyIHRoaXMgaXMgYSBzaW5nbGV0b24gcmVzb3VyY2UgKG5vIElEcyBpbiBVUkxzKVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbmZpZykge1xuICAgICAgICB0aGlzLmVuZHBvaW50ID0gY29uZmlnLmVuZHBvaW50O1xuICAgICAgICB0aGlzLmN1c3RvbU1ldGhvZHMgPSBjb25maWcuY3VzdG9tTWV0aG9kcyB8fCB7fTtcbiAgICAgICAgdGhpcy5pc1NpbmdsZXRvbiA9IGNvbmZpZy5zaW5nbGV0b24gfHwgZmFsc2U7XG5cbiAgICAgICAgLy8gRXh0cmFjdCBiYXNlIFVSTCBmb3IgQ29uZmlnLnBieFVybFxuICAgICAgICB0aGlzLmFwaVVybCA9IGAke0NvbmZpZy5wYnhVcmx9JHt0aGlzLmVuZHBvaW50fWA7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGVuZHBvaW50cyBwcm9wZXJ0eSBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aXRoIFBieERhdGFUYWJsZUluZGV4XG4gICAgICAgIHRoaXMuZW5kcG9pbnRzID0ge1xuICAgICAgICAgICAgZ2V0TGlzdDogdGhpcy5hcGlVcmxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgY3VzdG9tIG1ldGhvZCBlbmRwb2ludHNcbiAgICAgICAgZm9yIChjb25zdCBbbWV0aG9kTmFtZSwgbWV0aG9kUGF0aF0gb2YgT2JqZWN0LmVudHJpZXModGhpcy5jdXN0b21NZXRob2RzKSkge1xuICAgICAgICAgICAgdGhpcy5lbmRwb2ludHNbbWV0aG9kTmFtZV0gPSBgJHt0aGlzLmFwaVVybH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIGJ5IElEIG9yIGdldCBkZWZhdWx0IHZhbHVlcyBmb3IgbmV3IHJlY29yZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFJlY29yZCBJRCBvciBlbXB0eS9udWxsIGZvciBuZXcgcmVjb3JkXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFJlY29yZChyZWNvcmRJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2Ugc2hvdWxkIHVzZSBhIGN1c3RvbSBtZXRob2QgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgIGNvbnN0IGlzTmV3ID0gIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJyB8fCByZWNvcmRJZCA9PT0gJ25ldyc7XG4gICAgICAgIGxldCB1cmw7XG5cbiAgICAgICAgaWYgKGlzTmV3ICYmIHRoaXMuY3VzdG9tTWV0aG9kcy5nZXREZWZhdWx0KSB7XG4gICAgICAgICAgICAvLyBVc2UgY3VzdG9tIG1ldGhvZCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfSR7dGhpcy5jdXN0b21NZXRob2RzLmdldERlZmF1bHR9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEdldCBleGlzdGluZyByZWNvcmQgYnkgSURcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke3JlY29yZElkfWA7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgX2lzTmV3IGZsYWcgZm9yIG5ldyByZWNvcmRzIHRvIGluZGljYXRlIFBPU1Qgc2hvdWxkIGJlIHVzZWRcbiAgICAgICAgICAgICAgICBpZiAoaXNOZXcgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciBvY2N1cnJlZCddfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGxpc3Qgb2YgcmVjb3JkcyAob3Igc2luZ2xlIHJlY29yZCBmb3Igc2luZ2xldG9uKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fGZ1bmN0aW9ufSBkYXRhT3JDYWxsYmFjayAtIE9wdGlvbmFsIHBhcmFtcyBvciBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gLSBDYWxsYmFjayBpZiBmaXJzdCBwYXJhbSBpcyBkYXRhXG4gICAgICovXG4gICAgZ2V0TGlzdChkYXRhT3JDYWxsYmFjaywgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gRm9yIHNpbmdsZXRvbiByZXNvdXJjZXMsIHJlZGlyZWN0IHRvIGdldCgpIG1ldGhvZFxuICAgICAgICBpZiAodGhpcy5pc1NpbmdsZXRvbikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLmdldCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldChkYXRhT3JDYWxsYmFjaywgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIG92ZXJsb2FkZWQgcGFyYW1ldGVyc1xuICAgICAgICBsZXQgYWN0dWFsQ2FsbGJhY2s7XG4gICAgICAgIGxldCBwYXJhbXMgPSB7fTtcblxuICAgICAgICBpZiAodHlwZW9mIGRhdGFPckNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9IGRhdGFPckNhbGxiYWNrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFyYW1zID0gZGF0YU9yQ2FsbGJhY2sgfHwge307XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmFwaVVybCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSByZXR1cm4gYSBzdHJ1Y3R1cmUgd2l0aCByZXN1bHQgYW5kIGRhdGEgZmllbGRzXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmICFyZXNwb25zZS5oYXNPd25Qcm9wZXJ0eSgnZGF0YScpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IFtdfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlIHJlY29yZCAoY3JlYXRlIG9yIHVwZGF0ZSlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gc2F2ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBzYXZlUmVjb3JkKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIERldGVybWluZSBpZiB0aGlzIGlzIGEgbmV3IHJlY29yZFxuICAgICAgICBjb25zdCBpc05ldyA9IHRoaXMuaXNOZXdSZWNvcmQoZGF0YSk7XG5cbiAgICAgICAgLy8gQ2xlYW4gdXAgaW50ZXJuYWwgZmxhZ3NcbiAgICAgICAgY29uc3QgY2xlYW5EYXRhID0gey4uLmRhdGF9O1xuICAgICAgICBpZiAoY2xlYW5EYXRhLl9pc05ldyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWxldGUgY2xlYW5EYXRhLl9pc05ldztcbiAgICAgICAgfVxuICAgICAgICAvLyBSZW1vdmUgX21ldGhvZCBhcyBpdCdzIGhhbmRsZWQgYnkgdGhlIGFjdHVhbCBIVFRQIG1ldGhvZFxuICAgICAgICBpZiAoY2xlYW5EYXRhLl9tZXRob2QgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVsZXRlIGNsZWFuRGF0YS5fbWV0aG9kO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IHRoZSByZWNvcmQgSUQgZm9yIHVwZGF0ZXNcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSB0aGlzLmdldFJlY29yZElkKGNsZWFuRGF0YSk7XG5cbiAgICAgICAgLy8gdjMgQVBJOiBQT1NUIGZvciBuZXcgcmVjb3JkcywgUFVUIGZvciB1cGRhdGVzXG4gICAgICAgIGNvbnN0IG1ldGhvZCA9IGlzTmV3ID8gJ1BPU1QnIDogJ1BVVCc7XG4gICAgICAgIGNvbnN0IHVybCA9IGlzTmV3ID8gdGhpcy5hcGlVcmwgOiBgJHt0aGlzLmFwaVVybH0vJHtyZWNvcmRJZH1gO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICBkYXRhOiBjbGVhbkRhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIENTUkYgdG9rZW4gaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBnbG9iYWxDc3JmVG9rZW5LZXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBnbG9iYWxDc3JmVG9rZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFuRGF0YVtnbG9iYWxDc3JmVG9rZW5LZXldID0gZ2xvYmFsQ3NyZlRva2VuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIHNlbmQgYXMgSlNPTiAoZm9yIGNvbXBsZXggc3RydWN0dXJlcylcbiAgICAgICAgICAgICAgICBpZiAoUGJ4QXBpQ2xpZW50Lmhhc0NvbXBsZXhEYXRhKGNsZWFuRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShjbGVhbkRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ119XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWxldGUgcmVjb3JkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gUmVjb3JkIElEIHRvIGRlbGV0ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBDU1JGIHRva2VuIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIGdsb2JhbENzcmZUb2tlbktleSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGdsb2JhbENzcmZUb2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGRhdGFbZ2xvYmFsQ3NyZlRva2VuS2V5XSA9IGdsb2JhbENzcmZUb2tlbjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmFwaVVybH0vJHtyZWNvcmRJZH1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGwgYSBjdXN0b20gbWV0aG9kXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZE5hbWUgLSBNZXRob2QgbmFtZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fGZ1bmN0aW9ufSBkYXRhT3JDYWxsYmFjayAtIERhdGEgb3IgY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQ2FsbGJhY2sgaWYgZmlyc3QgcGFyYW0gaXMgZGF0YVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaHR0cE1ldGhvZF0gLSBIVFRQIG1ldGhvZCB0byB1c2UgKEdFVCBvciBQT1NUKSwgZGVmYXVsdHMgdG8gR0VUXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtyZXNvdXJjZUlkXSAtIFJlc291cmNlIElEIGZvciByZXNvdXJjZS1sZXZlbCBtZXRob2RzXG4gICAgICovXG4gICAgY2FsbEN1c3RvbU1ldGhvZChtZXRob2ROYW1lLCBkYXRhT3JDYWxsYmFjaywgY2FsbGJhY2ssIGh0dHBNZXRob2QgPSAnR0VUJywgcmVzb3VyY2VJZCA9IG51bGwpIHtcbiAgICAgICAgLy8gSGFuZGxlIG92ZXJsb2FkZWQgcGFyYW1ldGVyc1xuICAgICAgICBsZXQgYWN0dWFsQ2FsbGJhY2s7XG4gICAgICAgIGxldCBkYXRhID0ge307XG5cbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhT3JDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBkYXRhT3JDYWxsYmFjaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhT3JDYWxsYmFjayB8fCB7fTtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtZXRob2RQYXRoID0gdGhpcy5jdXN0b21NZXRob2RzW21ldGhvZE5hbWVdO1xuICAgICAgICBpZiAoIW1ldGhvZFBhdGgpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFtgVW5rbm93biBjdXN0b20gbWV0aG9kOiAke21ldGhvZE5hbWV9YF19XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgVVJMIHdpdGggSUQgaWYgcHJvdmlkZWQgKGZvciByZXNvdXJjZS1sZXZlbCBjdXN0b20gbWV0aG9kcylcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuICAgICAgICBpZiAocmVzb3VyY2VJZCkge1xuICAgICAgICAgICAgLy8gUmVzb3VyY2UtbGV2ZWwgbWV0aG9kOiAvYXBpL3YzL3Jlc291cmNlL3tpZH06bWV0aG9kIChSRVNUZnVsIHN0YW5kYXJkKVxuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7cmVzb3VyY2VJZH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhLmlkKSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjazogUmVzb3VyY2UtbGV2ZWwgbWV0aG9kOiAvYXBpL3YzL3Jlc291cmNlL3tpZH06bWV0aG9kXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtkYXRhLmlkfSR7bWV0aG9kUGF0aH1gO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGlkIGZyb20gZGF0YSBzaW5jZSBpdCdzIGluIHRoZSBVUkxcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3REYXRhID0gey4uLmRhdGF9O1xuICAgICAgICAgICAgZGVsZXRlIHJlcXVlc3REYXRhLmlkO1xuICAgICAgICAgICAgZGF0YSA9IHJlcXVlc3REYXRhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ29sbGVjdGlvbi1sZXZlbCBtZXRob2Q6IC9hcGkvdjMvcmVzb3VyY2U6bWV0aG9kXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIENTUkYgdG9rZW4gZm9yIFBPU1QgcmVxdWVzdHNcbiAgICAgICAgaWYgKGh0dHBNZXRob2QgPT09ICdQT1NUJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuS2V5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZGF0YVtnbG9iYWxDc3JmVG9rZW5LZXldID0gZ2xvYmFsQ3NyZlRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZGF0YSBjb250YWlucyBib29sZWFuIG9yIGNvbXBsZXggdmFsdWVzXG4gICAgICAgIGxldCBoYXNDb21wbGV4RGF0YSA9IGZhbHNlO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW2tleV07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFzQ29tcGxleERhdGEgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgSlNPTiBmb3IgY29tcGxleCBkYXRhLCBmb3JtIGVuY29kaW5nIGZvciBzaW1wbGUgZGF0YVxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogaHR0cE1ldGhvZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhY3R1YWxDYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXX1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzQ29tcGxleERhdGEpIHtcbiAgICAgICAgICAgIC8vIFNlbmQgYXMgSlNPTiB0byBwcmVzZXJ2ZSBib29sZWFuIHZhbHVlcyBhbmQgY29tcGxleCBzdHJ1Y3R1cmVzXG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2VuZCBhcyByZWd1bGFyIGZvcm0gZGF0YVxuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoYWpheFNldHRpbmdzKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogRGV0ZXJtaW5lIGlmIGRhdGEgcmVwcmVzZW50cyBhIG5ldyByZWNvcmRcbiAgICAgKiBDYW4gYmUgb3ZlcnJpZGRlbiBpbiBzcGVjaWZpYyBBUEkgbW9kdWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBjaGVja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIG5ldyByZWNvcmRcbiAgICAgKi9cbiAgICBpc05ld1JlY29yZChkYXRhKSB7XG4gICAgICAgIC8vIFRoZSBvbmx5IHdheSB0byBkZXRlcm1pbmUgLSBfaXNOZXcgZmxhZ1xuICAgICAgICAvLyBJZiBmbGFnIGlzIG5vdCBleHBsaWNpdGx5IHNldCwgY2hlY2sgSURcbiAgICAgICAgaWYgKGRhdGEuX2lzTmV3ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLl9pc05ldyA9PT0gdHJ1ZSB8fCBkYXRhLl9pc05ldyA9PT0gJ3RydWUnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmFsbGJhY2sgdG8gSUQgY2hlY2sgb25seSBpZiBmbGFnIGlzIG5vdCBzZXRcbiAgICAgICAgcmV0dXJuICFkYXRhLmlkIHx8IGRhdGEuaWQgPT09ICcnIHx8IGRhdGEuaWQgPT09ICduZXcnO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gZGF0YVxuICAgICAqIENhbiBiZSBvdmVycmlkZGVuIGluIHNwZWNpZmljIEFQSSBtb2R1bGVzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJlY29yZCBJRFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKGRhdGEpIHtcbiAgICAgICAgLy8gUkVTVCBBUEkgdjMgdXNlcyBvbmx5ICdpZCcgZmllbGRcbiAgICAgICAgcmV0dXJuIGRhdGEuaWQ7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGRhdGEgY29udGFpbnMgY29tcGxleCBzdHJ1Y3R1cmVzIHRoYXQgbmVlZCBKU09OIGVuY29kaW5nXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIGNoZWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgY29udGFpbnMgY29tcGxleCBkYXRhXG4gICAgICovXG4gICAgc3RhdGljIGhhc0NvbXBsZXhEYXRhKGRhdGEpIHtcbiAgICAgICAgZm9yIChjb25zdCB2YWx1ZSBvZiBPYmplY3QudmFsdWVzKGRhdGEpKSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gR0VUIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBRdWVyeSBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaWRdIC0gT3B0aW9uYWwgcmVjb3JkIElEIGZvciByZXNvdXJjZS1zcGVjaWZpYyByZXF1ZXN0c1xuICAgICAqL1xuICAgIGNhbGxHZXQocGFyYW1zLCBjYWxsYmFjaywgaWQpIHtcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuXG4gICAgICAgIC8vIEZvciBub24tc2luZ2xldG9uIHJlc291cmNlcyB3aXRoIElELCBhcHBlbmQgSUQgdG8gVVJMXG4gICAgICAgIGlmICghdGhpcy5pc1NpbmdsZXRvbiAmJiBpZCkge1xuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7aWR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHBhcmFtcyB8fCB7fSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IFtdfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gUE9TVCByZXF1ZXN0IChiYWNrd2FyZCBjb21wYXRpYmlsaXR5IG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gc2VuZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2lkXSAtIE9wdGlvbmFsIHJlc291cmNlIElEIGZvciByZXNvdXJjZS1zcGVjaWZpYyByZXF1ZXN0c1xuICAgICAqL1xuICAgIGNhbGxQb3N0KGRhdGEsIGNhbGxiYWNrLCBpZCkge1xuICAgICAgICBsZXQgdXJsID0gdGhpcy5hcGlVcmw7XG4gICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7aWR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc0NvbXBsZXhEYXRhID0gUGJ4QXBpQ2xpZW50Lmhhc0NvbXBsZXhEYXRhKGRhdGEpO1xuXG4gICAgICAgIGNvbnN0IGFqYXhTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXX19KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzQ29tcGxleERhdGEpIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaShhamF4U2V0dGluZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gUFVUIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzZW5kXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaWRdIC0gT3B0aW9uYWwgcmVzb3VyY2UgSUQgZm9yIHJlc291cmNlLXNwZWNpZmljIHJlcXVlc3RzXG4gICAgICovXG4gICAgY2FsbFB1dChkYXRhLCBjYWxsYmFjaywgaWQpIHtcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke2lkfWA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYXNDb21wbGV4RGF0YSA9IFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShkYXRhKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXX19KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzQ29tcGxleERhdGEpIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaShhamF4U2V0dGluZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gREVMRVRFIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBSZXNvdXJjZSBJRCB0byBkZWxldGVcbiAgICAgKi9cbiAgICBjYWxsRGVsZXRlKGNhbGxiYWNrLCBpZCkge1xuICAgICAgICBjb25zdCBkYXRhID0ge307XG5cbiAgICAgICAgaWYgKHR5cGVvZiBnbG9iYWxDc3JmVG9rZW5LZXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBnbG9iYWxDc3JmVG9rZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBkYXRhW2dsb2JhbENzcmZUb2tlbktleV0gPSBnbG9iYWxDc3JmVG9rZW47XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuYXBpVXJsfS8ke2lkfWAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciBvY2N1cnJlZCddfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIFBBVENIIHJlcXVlc3QgKGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzZW5kXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGNhbGxQYXRjaChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBoYXNDb21wbGV4RGF0YSA9IFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShkYXRhKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHRoaXMuYXBpVXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ119fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGhhc0NvbXBsZXhEYXRhKSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoYWpheFNldHRpbmdzKTtcbiAgICB9XG59XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbndpbmRvdy5QYnhBcGlDbGllbnQgPSBQYnhBcGlDbGllbnQ7Il19