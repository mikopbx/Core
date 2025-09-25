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
 * - Custom methods support via colon notation (:getDefault, :getDefaults)
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
      } else if (isNew && this.customMethods.getDefaults) {
        // Alternative naming
        url = "".concat(this.apiUrl).concat(this.customMethods.getDefaults);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4LWFwaS1jbGllbnQuanMiXSwibmFtZXMiOlsiUGJ4QXBpQ2xpZW50IiwiY29uZmlnIiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiaXNTaW5nbGV0b24iLCJzaW5nbGV0b24iLCJhcGlVcmwiLCJDb25maWciLCJwYnhVcmwiLCJlbmRwb2ludHMiLCJnZXRMaXN0IiwiT2JqZWN0IiwiZW50cmllcyIsIm1ldGhvZE5hbWUiLCJtZXRob2RQYXRoIiwicmVjb3JkSWQiLCJjYWxsYmFjayIsImlzTmV3IiwidXJsIiwiZ2V0RGVmYXVsdCIsImdldERlZmF1bHRzIiwiJCIsImFwaSIsIm1ldGhvZCIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJkYXRhIiwiX2lzTmV3Iiwib25GYWlsdXJlIiwib25FcnJvciIsInJlc3VsdCIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJkYXRhT3JDYWxsYmFjayIsImdldCIsImFjdHVhbENhbGxiYWNrIiwicGFyYW1zIiwic3VjY2Vzc1Rlc3QiLCJQYnhBcGkiLCJoYXNPd25Qcm9wZXJ0eSIsImlzTmV3UmVjb3JkIiwiY2xlYW5EYXRhIiwidW5kZWZpbmVkIiwiX21ldGhvZCIsImdldFJlY29yZElkIiwiYmVmb3JlU2VuZCIsInNldHRpbmdzIiwiZ2xvYmFsQ3NyZlRva2VuS2V5IiwiZ2xvYmFsQ3NyZlRva2VuIiwiaGFzQ29tcGxleERhdGEiLCJjb250ZW50VHlwZSIsIkpTT04iLCJzdHJpbmdpZnkiLCJodHRwTWV0aG9kIiwicmVzb3VyY2VJZCIsImlkIiwicmVxdWVzdERhdGEiLCJrZXkiLCJ2YWx1ZSIsIkFycmF5IiwiaXNBcnJheSIsImFqYXhTZXR0aW5ncyIsInZhbHVlcyIsIndpbmRvdyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUFDQW1DLFFBQUFBLFlBQVksQ0FBQ1gsV0FBYixHQUEyQixrQkFBM0I7QUFDSCxPQUhELE1BR087QUFDSFcsUUFBQUEsWUFBWSxDQUFDbkMsSUFBYixHQUFvQkEsSUFBcEI7QUFDSDs7QUFFRE4sTUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU13QyxZQUFOO0FBQ0g7OztXQXZMRCx3QkFBc0JuQyxJQUF0QixFQUE0QjtBQUN4Qix5Q0FBb0JoQixNQUFNLENBQUNvRCxNQUFQLENBQWNwQyxJQUFkLENBQXBCLHNDQUF5QztBQUFwQyxZQUFNZ0MsS0FBSyxzQkFBWDs7QUFDRCxZQUFJQyxLQUFLLENBQUNDLE9BQU4sQ0FBY0YsS0FBZCxLQUF5QixRQUFPQSxLQUFQLE1BQWlCLFFBQWpCLElBQTZCQSxLQUFLLEtBQUssSUFBcEUsRUFBMkU7QUFDdkUsaUJBQU8sSUFBUDtBQUNIO0FBQ0o7O0FBQ0QsYUFBTyxLQUFQO0FBQ0g7Ozs7S0FtTEw7OztBQUNBSyxNQUFNLENBQUNoRSxZQUFQLEdBQXNCQSxZQUF0QiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBDb25maWcsIFBieEFwaSwgJCAqL1xuXG4vKipcbiAqIFBieEFwaUNsaWVudCAtIFVuaWZpZWQgUkVTVCBBUEkgdjMgY2xpZW50IGZvciBhbGwgZW50aXRpZXNcbiAqIFxuICogVGhpcyBjbGFzcyBwcm92aWRlcyBhIHN0YW5kYXJkIGludGVyZmFjZSBmb3IgYWxsIENSVUQgb3BlcmF0aW9uc1xuICogYW5kIGVsaW1pbmF0ZXMgY29kZSBkdXBsaWNhdGlvbiBhY3Jvc3MgQVBJIG1vZHVsZXMuXG4gKiBcbiAqIEZlYXR1cmVzOlxuICogLSBTdGFuZGFyZCBSRVNUZnVsIG9wZXJhdGlvbnMgKEdFVCwgUE9TVCwgUFVULCBERUxFVEUpXG4gKiAtIEN1c3RvbSBtZXRob2RzIHN1cHBvcnQgdmlhIGNvbG9uIG5vdGF0aW9uICg6Z2V0RGVmYXVsdCwgOmdldERlZmF1bHRzKVxuICogLSBBdXRvbWF0aWMgSFRUUCBtZXRob2Qgc2VsZWN0aW9uIGJhc2VkIG9uIGRhdGFcbiAqIC0gQ1NSRiB0b2tlbiBtYW5hZ2VtZW50XG4gKiAtIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBQYnhEYXRhVGFibGVJbmRleFxuICogXG4gKiBAY2xhc3MgUGJ4QXBpQ2xpZW50IFxuICovXG5jbGFzcyBQYnhBcGlDbGllbnQge1xuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyBBUEkgY2xpZW50IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbmZpZy5lbmRwb2ludCAtIEJhc2UgQVBJIGVuZHBvaW50IChlLmcuLCAnL3BieGNvcmUvYXBpL3YzL2l2ci1tZW51JylcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbmZpZy5jdXN0b21NZXRob2RzXSAtIE1hcCBvZiBjdXN0b20gbWV0aG9kcyAoZS5nLiwge2dldERlZmF1bHQ6ICc6Z2V0RGVmYXVsdCd9KVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5zaW5nbGV0b25dIC0gV2hldGhlciB0aGlzIGlzIGEgc2luZ2xldG9uIHJlc291cmNlIChubyBJRHMgaW4gVVJMcylcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICAgICAgdGhpcy5lbmRwb2ludCA9IGNvbmZpZy5lbmRwb2ludDtcbiAgICAgICAgdGhpcy5jdXN0b21NZXRob2RzID0gY29uZmlnLmN1c3RvbU1ldGhvZHMgfHwge307XG4gICAgICAgIHRoaXMuaXNTaW5nbGV0b24gPSBjb25maWcuc2luZ2xldG9uIHx8IGZhbHNlO1xuXG4gICAgICAgIC8vIEV4dHJhY3QgYmFzZSBVUkwgZm9yIENvbmZpZy5wYnhVcmxcbiAgICAgICAgdGhpcy5hcGlVcmwgPSBgJHtDb25maWcucGJ4VXJsfSR7dGhpcy5lbmRwb2ludH1gO1xuXG4gICAgICAgIC8vIENyZWF0ZSBlbmRwb2ludHMgcHJvcGVydHkgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBQYnhEYXRhVGFibGVJbmRleFxuICAgICAgICB0aGlzLmVuZHBvaW50cyA9IHtcbiAgICAgICAgICAgIGdldExpc3Q6IHRoaXMuYXBpVXJsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWRkIGN1c3RvbSBtZXRob2QgZW5kcG9pbnRzXG4gICAgICAgIGZvciAoY29uc3QgW21ldGhvZE5hbWUsIG1ldGhvZFBhdGhdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMuY3VzdG9tTWV0aG9kcykpIHtcbiAgICAgICAgICAgIHRoaXMuZW5kcG9pbnRzW21ldGhvZE5hbWVdID0gYCR7dGhpcy5hcGlVcmx9JHttZXRob2RQYXRofWA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBieSBJRCBvciBnZXQgZGVmYXVsdCB2YWx1ZXMgZm9yIG5ldyByZWNvcmRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBSZWNvcmQgSUQgb3IgZW1wdHkvbnVsbCBmb3IgbmV3IHJlY29yZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHdlIHNob3VsZCB1c2UgYSBjdXN0b20gbWV0aG9kIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICBjb25zdCBpc05ldyA9ICFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJycgfHwgcmVjb3JkSWQgPT09ICduZXcnO1xuICAgICAgICBsZXQgdXJsO1xuXG4gICAgICAgIGlmIChpc05ldyAmJiB0aGlzLmN1c3RvbU1ldGhvZHMuZ2V0RGVmYXVsdCkge1xuICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSBtZXRob2QgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0ke3RoaXMuY3VzdG9tTWV0aG9kcy5nZXREZWZhdWx0fWA7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNOZXcgJiYgdGhpcy5jdXN0b21NZXRob2RzLmdldERlZmF1bHRzKSB7XG4gICAgICAgICAgICAvLyBBbHRlcm5hdGl2ZSBuYW1pbmdcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfSR7dGhpcy5jdXN0b21NZXRob2RzLmdldERlZmF1bHRzfWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBHZXQgZXhpc3RpbmcgcmVjb3JkIGJ5IElEXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtyZWNvcmRJZH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IF9pc05ldyBmbGFnIGZvciBuZXcgcmVjb3JkcyB0byBpbmRpY2F0ZSBQT1NUIHNob3VsZCBiZSB1c2VkXG4gICAgICAgICAgICAgICAgaWYgKGlzTmV3ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXX1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBsaXN0IG9mIHJlY29yZHMgKG9yIHNpbmdsZSByZWNvcmQgZm9yIHNpbmdsZXRvbilcbiAgICAgKiBAcGFyYW0ge29iamVjdHxmdW5jdGlvbn0gZGF0YU9yQ2FsbGJhY2sgLSBPcHRpb25hbCBwYXJhbXMgb3IgY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQ2FsbGJhY2sgaWYgZmlyc3QgcGFyYW0gaXMgZGF0YVxuICAgICAqL1xuICAgIGdldExpc3QoZGF0YU9yQ2FsbGJhY2ssIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIEZvciBzaW5nbGV0b24gcmVzb3VyY2VzLCByZWRpcmVjdCB0byBnZXQoKSBtZXRob2RcbiAgICAgICAgaWYgKHRoaXMuaXNTaW5nbGV0b24pIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5nZXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXQoZGF0YU9yQ2FsbGJhY2ssIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSBvdmVybG9hZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgbGV0IGFjdHVhbENhbGxiYWNrO1xuICAgICAgICBsZXQgcGFyYW1zID0ge307XG5cbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhT3JDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBkYXRhT3JDYWxsYmFjaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBhcmFtcyA9IGRhdGFPckNhbGxiYWNrIHx8IHt9O1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5hcGlVcmwsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YTogcGFyYW1zLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2UgcmV0dXJuIGEgc3RydWN0dXJlIHdpdGggcmVzdWx0IGFuZCBkYXRhIGZpZWxkc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiAhcmVzcG9uc2UuaGFzT3duUHJvcGVydHkoJ2RhdGEnKSkge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiBbXX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2F2ZSByZWNvcmQgKGNyZWF0ZSBvciB1cGRhdGUpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNhdmVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgc2F2ZVJlY29yZChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmRcbiAgICAgICAgY29uc3QgaXNOZXcgPSB0aGlzLmlzTmV3UmVjb3JkKGRhdGEpO1xuXG4gICAgICAgIC8vIENsZWFuIHVwIGludGVybmFsIGZsYWdzXG4gICAgICAgIGNvbnN0IGNsZWFuRGF0YSA9IHsuLi5kYXRhfTtcbiAgICAgICAgaWYgKGNsZWFuRGF0YS5faXNOZXcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVsZXRlIGNsZWFuRGF0YS5faXNOZXc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVtb3ZlIF9tZXRob2QgYXMgaXQncyBoYW5kbGVkIGJ5IHRoZSBhY3R1YWwgSFRUUCBtZXRob2RcbiAgICAgICAgaWYgKGNsZWFuRGF0YS5fbWV0aG9kICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBjbGVhbkRhdGEuX21ldGhvZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCB0aGUgcmVjb3JkIElEIGZvciB1cGRhdGVzXG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gdGhpcy5nZXRSZWNvcmRJZChjbGVhbkRhdGEpO1xuXG4gICAgICAgIC8vIHYzIEFQSTogUE9TVCBmb3IgbmV3IHJlY29yZHMsIFBVVCBmb3IgdXBkYXRlc1xuICAgICAgICBjb25zdCBtZXRob2QgPSBpc05ldyA/ICdQT1NUJyA6ICdQVVQnO1xuICAgICAgICBjb25zdCB1cmwgPSBpc05ldyA/IHRoaXMuYXBpVXJsIDogYCR7dGhpcy5hcGlVcmx9LyR7cmVjb3JkSWR9YDtcblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICAgICAgZGF0YTogY2xlYW5EYXRhLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgYmVmb3JlU2VuZChzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBDU1JGIHRva2VuIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuS2V5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBjbGVhbkRhdGFbZ2xvYmFsQ3NyZlRva2VuS2V5XSA9IGdsb2JhbENzcmZUb2tlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UgbmVlZCB0byBzZW5kIGFzIEpTT04gKGZvciBjb21wbGV4IHN0cnVjdHVyZXMpXG4gICAgICAgICAgICAgICAgaWYgKFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShjbGVhbkRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoY2xlYW5EYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciBvY2N1cnJlZCddfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJlY29yZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFJlY29yZCBJRCB0byBkZWxldGVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkKHJlY29yZElkLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBkYXRhID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgQ1NSRiB0b2tlbiBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBnbG9iYWxDc3JmVG9rZW5LZXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBnbG9iYWxDc3JmVG9rZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBkYXRhW2dsb2JhbENzcmZUb2tlbktleV0gPSBnbG9iYWxDc3JmVG9rZW47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9LyR7cmVjb3JkSWR9YCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsIGEgY3VzdG9tIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2ROYW1lIC0gTWV0aG9kIG5hbWVcbiAgICAgKiBAcGFyYW0ge29iamVjdHxmdW5jdGlvbn0gZGF0YU9yQ2FsbGJhY2sgLSBEYXRhIG9yIGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIENhbGxiYWNrIGlmIGZpcnN0IHBhcmFtIGlzIGRhdGFcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2h0dHBNZXRob2RdIC0gSFRUUCBtZXRob2QgdG8gdXNlIChHRVQgb3IgUE9TVCksIGRlZmF1bHRzIHRvIEdFVFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbcmVzb3VyY2VJZF0gLSBSZXNvdXJjZSBJRCBmb3IgcmVzb3VyY2UtbGV2ZWwgbWV0aG9kc1xuICAgICAqL1xuICAgIGNhbGxDdXN0b21NZXRob2QobWV0aG9kTmFtZSwgZGF0YU9yQ2FsbGJhY2ssIGNhbGxiYWNrLCBodHRwTWV0aG9kID0gJ0dFVCcsIHJlc291cmNlSWQgPSBudWxsKSB7XG4gICAgICAgIC8vIEhhbmRsZSBvdmVybG9hZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgbGV0IGFjdHVhbENhbGxiYWNrO1xuICAgICAgICBsZXQgZGF0YSA9IHt9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgZGF0YU9yQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gZGF0YU9yQ2FsbGJhY2s7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gZGF0YU9yQ2FsbGJhY2sgfHwge307XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWV0aG9kUGF0aCA9IHRoaXMuY3VzdG9tTWV0aG9kc1ttZXRob2ROYW1lXTtcbiAgICAgICAgaWYgKCFtZXRob2RQYXRoKSB7XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbYFVua25vd24gY3VzdG9tIG1ldGhvZDogJHttZXRob2ROYW1lfWBdfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIFVSTCB3aXRoIElEIGlmIHByb3ZpZGVkIChmb3IgcmVzb3VyY2UtbGV2ZWwgY3VzdG9tIG1ldGhvZHMpXG4gICAgICAgIGxldCB1cmwgPSB0aGlzLmFwaVVybDtcbiAgICAgICAgaWYgKHJlc291cmNlSWQpIHtcbiAgICAgICAgICAgIC8vIFJlc291cmNlLWxldmVsIG1ldGhvZDogL2FwaS92My9yZXNvdXJjZS97aWR9Om1ldGhvZCAoUkVTVGZ1bCBzdGFuZGFyZClcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke3Jlc291cmNlSWR9JHttZXRob2RQYXRofWA7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IFJlc291cmNlLWxldmVsIG1ldGhvZDogL2FwaS92My9yZXNvdXJjZS97aWR9Om1ldGhvZFxuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7ZGF0YS5pZH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBpZCBmcm9tIGRhdGEgc2luY2UgaXQncyBpbiB0aGUgVVJMXG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0RGF0YSA9IHsuLi5kYXRhfTtcbiAgICAgICAgICAgIGRlbGV0ZSByZXF1ZXN0RGF0YS5pZDtcbiAgICAgICAgICAgIGRhdGEgPSByZXF1ZXN0RGF0YTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIENvbGxlY3Rpb24tbGV2ZWwgbWV0aG9kOiAvYXBpL3YzL3Jlc291cmNlOm1ldGhvZFxuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9JHttZXRob2RQYXRofWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBDU1JGIHRva2VuIGZvciBQT1NUIHJlcXVlc3RzXG4gICAgICAgIGlmIChodHRwTWV0aG9kID09PSAnUE9TVCcgJiYgdHlwZW9mIGdsb2JhbENzcmZUb2tlbktleSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGdsb2JhbENzcmZUb2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGRhdGFbZ2xvYmFsQ3NyZlRva2VuS2V5XSA9IGdsb2JhbENzcmZUb2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGRhdGEgY29udGFpbnMgYm9vbGVhbiBvciBjb21wbGV4IHZhbHVlc1xuICAgICAgICBsZXQgaGFzQ29tcGxleERhdGEgPSBmYWxzZTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVtrZXldO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhc0NvbXBsZXhEYXRhID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIEpTT04gZm9yIGNvbXBsZXggZGF0YSwgZm9ybSBlbmNvZGluZyBmb3Igc2ltcGxlIGRhdGFcbiAgICAgICAgY29uc3QgYWpheFNldHRpbmdzID0ge1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IGh0dHBNZXRob2QsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ119XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGhhc0NvbXBsZXhEYXRhKSB7XG4gICAgICAgICAgICAvLyBTZW5kIGFzIEpTT04gdG8gcHJlc2VydmUgYm9vbGVhbiB2YWx1ZXMgYW5kIGNvbXBsZXggc3RydWN0dXJlc1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5jb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNlbmQgYXMgcmVndWxhciBmb3JtIGRhdGFcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKGFqYXhTZXR0aW5ncyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIERldGVybWluZSBpZiBkYXRhIHJlcHJlc2VudHMgYSBuZXcgcmVjb3JkXG4gICAgICogQ2FuIGJlIG92ZXJyaWRkZW4gaW4gc3BlY2lmaWMgQVBJIG1vZHVsZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gY2hlY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBuZXcgcmVjb3JkXG4gICAgICovXG4gICAgaXNOZXdSZWNvcmQoZGF0YSkge1xuICAgICAgICAvLyBUaGUgb25seSB3YXkgdG8gZGV0ZXJtaW5lIC0gX2lzTmV3IGZsYWdcbiAgICAgICAgLy8gSWYgZmxhZyBpcyBub3QgZXhwbGljaXRseSBzZXQsIGNoZWNrIElEXG4gICAgICAgIGlmIChkYXRhLl9pc05ldyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS5faXNOZXcgPT09IHRydWUgfHwgZGF0YS5faXNOZXcgPT09ICd0cnVlJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIElEIGNoZWNrIG9ubHkgaWYgZmxhZyBpcyBub3Qgc2V0XG4gICAgICAgIHJldHVybiAhZGF0YS5pZCB8fCBkYXRhLmlkID09PSAnJyB8fCBkYXRhLmlkID09PSAnbmV3JztcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIGRhdGFcbiAgICAgKiBDYW4gYmUgb3ZlcnJpZGRlbiBpbiBzcGVjaWZpYyBBUEkgbW9kdWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZWNvcmQgSURcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZChkYXRhKSB7XG4gICAgICAgIC8vIFJFU1QgQVBJIHYzIHVzZXMgb25seSAnaWQnIGZpZWxkXG4gICAgICAgIHJldHVybiBkYXRhLmlkO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBkYXRhIGNvbnRhaW5zIGNvbXBsZXggc3RydWN0dXJlcyB0aGF0IG5lZWQgSlNPTiBlbmNvZGluZ1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBjaGVja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGNvbnRhaW5zIGNvbXBsZXggZGF0YVxuICAgICAqL1xuICAgIHN0YXRpYyBoYXNDb21wbGV4RGF0YShkYXRhKSB7XG4gICAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgT2JqZWN0LnZhbHVlcyhkYXRhKSkge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpIHx8ICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIEdFVCByZXF1ZXN0IChiYWNrd2FyZCBjb21wYXRpYmlsaXR5IG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gUXVlcnkgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2lkXSAtIE9wdGlvbmFsIHJlY29yZCBJRCBmb3IgcmVzb3VyY2Utc3BlY2lmaWMgcmVxdWVzdHNcbiAgICAgKi9cbiAgICBjYWxsR2V0KHBhcmFtcywgY2FsbGJhY2ssIGlkKSB7XG4gICAgICAgIGxldCB1cmwgPSB0aGlzLmFwaVVybDtcblxuICAgICAgICAvLyBGb3Igbm9uLXNpbmdsZXRvbiByZXNvdXJjZXMgd2l0aCBJRCwgYXBwZW5kIElEIHRvIFVSTFxuICAgICAgICBpZiAoIXRoaXMuaXNTaW5nbGV0b24gJiYgaWQpIHtcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke2lkfWA7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMgfHwge30sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiBbXX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIFBPU1QgcmVxdWVzdCAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNlbmRcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtpZF0gLSBPcHRpb25hbCByZXNvdXJjZSBJRCBmb3IgcmVzb3VyY2Utc3BlY2lmaWMgcmVxdWVzdHNcbiAgICAgKi9cbiAgICBjYWxsUG9zdChkYXRhLCBjYWxsYmFjaywgaWQpIHtcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke2lkfWA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYXNDb21wbGV4RGF0YSA9IFBieEFwaUNsaWVudC5oYXNDb21wbGV4RGF0YShkYXRhKTtcblxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ119fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGhhc0NvbXBsZXhEYXRhKSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoYWpheFNldHRpbmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIFBVVCByZXF1ZXN0IChiYWNrd2FyZCBjb21wYXRpYmlsaXR5IG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gc2VuZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2lkXSAtIE9wdGlvbmFsIHJlc291cmNlIElEIGZvciByZXNvdXJjZS1zcGVjaWZpYyByZXF1ZXN0c1xuICAgICAqL1xuICAgIGNhbGxQdXQoZGF0YSwgY2FsbGJhY2ssIGlkKSB7XG4gICAgICAgIGxldCB1cmwgPSB0aGlzLmFwaVVybDtcbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtpZH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFzQ29tcGxleERhdGEgPSBQYnhBcGlDbGllbnQuaGFzQ29tcGxleERhdGEoZGF0YSk7XG5cbiAgICAgICAgY29uc3QgYWpheFNldHRpbmdzID0ge1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ119fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGhhc0NvbXBsZXhEYXRhKSB7XG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoYWpheFNldHRpbmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIERFTEVURSByZXF1ZXN0IChiYWNrd2FyZCBjb21wYXRpYmlsaXR5IG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gUmVzb3VyY2UgSUQgdG8gZGVsZXRlXG4gICAgICovXG4gICAgY2FsbERlbGV0ZShjYWxsYmFjaywgaWQpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHt9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuS2V5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZGF0YVtnbG9iYWxDc3JmVG9rZW5LZXldID0gZ2xvYmFsQ3NyZlRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmFwaVVybH0vJHtpZH1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXX19KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBQQVRDSCByZXF1ZXN0IChiYWNrd2FyZCBjb21wYXRpYmlsaXR5IG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gc2VuZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBjYWxsUGF0Y2goZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgaGFzQ29tcGxleERhdGEgPSBQYnhBcGlDbGllbnQuaGFzQ29tcGxleERhdGEoZGF0YSk7XG5cbiAgICAgICAgY29uc3QgYWpheFNldHRpbmdzID0ge1xuICAgICAgICAgICAgdXJsOiB0aGlzLmFwaVVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciBvY2N1cnJlZCddfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNDb21wbGV4RGF0YSkge1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5jb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKGFqYXhTZXR0aW5ncyk7XG4gICAgfVxufVxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuUGJ4QXBpQ2xpZW50ID0gUGJ4QXBpQ2xpZW50OyJdfQ==