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
     */

  }, {
    key: "callCustomMethod",
    value: function callCustomMethod(methodName, dataOrCallback, callback) {
      var httpMethod = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'GET';
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

      if (data.id) {
        // Resource-level method: /api/v3/resource/{id}:method
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
        console.log('Sending as JSON:', data);
      } else {
        // Send as regular form data
        ajaxSettings.data = data;
        console.log('Sending as form data:', data);
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
      // Check explicit flag first - if set, use it
      if (data._isNew !== undefined) {
        return data._isNew === true;
      } // Check if it's marked as new


      if (data.isNew === '1' || data.isNew === true || data.isNew === 'true') return true; // Simple check: if no id or empty id, it's a new record
      // REST API v3 doesn't use uniqid anymore

      if (!data.id || data.id === '' || data.id === 'new') return true;
      return false;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvUGJ4QXBpQ2xpZW50LmpzIl0sIm5hbWVzIjpbIlBieEFwaUNsaWVudCIsImNvbmZpZyIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImlzU2luZ2xldG9uIiwic2luZ2xldG9uIiwiYXBpVXJsIiwiQ29uZmlnIiwicGJ4VXJsIiwiZW5kcG9pbnRzIiwiZ2V0TGlzdCIsIk9iamVjdCIsImVudHJpZXMiLCJtZXRob2ROYW1lIiwibWV0aG9kUGF0aCIsInJlY29yZElkIiwiY2FsbGJhY2siLCJpc05ldyIsInVybCIsImdldERlZmF1bHQiLCJnZXREZWZhdWx0cyIsIiQiLCJhcGkiLCJtZXRob2QiLCJvbiIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwib25GYWlsdXJlIiwib25FcnJvciIsInJlc3VsdCIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJkYXRhT3JDYWxsYmFjayIsImdldCIsImFjdHVhbENhbGxiYWNrIiwicGFyYW1zIiwiZGF0YSIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIiwiaGFzT3duUHJvcGVydHkiLCJpc05ld1JlY29yZCIsImNsZWFuRGF0YSIsIl9pc05ldyIsInVuZGVmaW5lZCIsIl9tZXRob2QiLCJnZXRSZWNvcmRJZCIsImJlZm9yZVNlbmQiLCJzZXR0aW5ncyIsImdsb2JhbENzcmZUb2tlbktleSIsImdsb2JhbENzcmZUb2tlbiIsImhhc0NvbXBsZXhEYXRhIiwiY29udGVudFR5cGUiLCJKU09OIiwic3RyaW5naWZ5IiwiaHR0cE1ldGhvZCIsImlkIiwicmVxdWVzdERhdGEiLCJrZXkiLCJ2YWx1ZSIsIkFycmF5IiwiaXNBcnJheSIsImFqYXhTZXR0aW5ncyIsImNvbnNvbGUiLCJsb2ciLCJ2YWx1ZXMiLCJ3aW5kb3ciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QXJDLElBQTZDbUIsSUFBSSxDQUFDbkIsS0FBTCxLQUFlLE1BQWhFLEVBQXdFLE9BQU8sSUFBUCxDQVAxRCxDQVNkO0FBQ0E7O0FBQ0EsVUFBSSxDQUFDbUIsSUFBSSxDQUFDbUIsRUFBTixJQUFZbkIsSUFBSSxDQUFDbUIsRUFBTCxLQUFZLEVBQXhCLElBQThCbkIsSUFBSSxDQUFDbUIsRUFBTCxLQUFZLEtBQTlDLEVBQXFELE9BQU8sSUFBUDtBQUVyRCxhQUFPLEtBQVA7QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLHFCQUFZbkIsSUFBWixFQUFrQjtBQUNkO0FBQ0EsYUFBT0EsSUFBSSxDQUFDbUIsRUFBWjtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLHdCQUFzQm5CLElBQXRCLEVBQTRCO0FBQ3hCLHlDQUFvQnpCLE1BQU0sQ0FBQ3FELE1BQVAsQ0FBYzVCLElBQWQsQ0FBcEIsc0NBQXlDO0FBQXBDLFlBQU1zQixLQUFLLHNCQUFYOztBQUNELFlBQUlDLEtBQUssQ0FBQ0MsT0FBTixDQUFjRixLQUFkLEtBQXlCLFFBQU9BLEtBQVAsTUFBaUIsUUFBakIsSUFBNkJBLEtBQUssS0FBSyxJQUFwRSxFQUEyRTtBQUN2RSxpQkFBTyxJQUFQO0FBQ0g7QUFDSjs7QUFDRCxhQUFPLEtBQVA7QUFDSDs7OztLQUdMOzs7QUFDQU8sTUFBTSxDQUFDakUsWUFBUCxHQUFzQkEsWUFBdEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBQYnhBcGksICQgKi9cblxuLyoqXG4gKiBQYnhBcGlDbGllbnQgLSBVbmlmaWVkIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgYWxsIGVudGl0aWVzXG4gKiBcbiAqIFRoaXMgY2xhc3MgcHJvdmlkZXMgYSBzdGFuZGFyZCBpbnRlcmZhY2UgZm9yIGFsbCBDUlVEIG9wZXJhdGlvbnNcbiAqIGFuZCBlbGltaW5hdGVzIGNvZGUgZHVwbGljYXRpb24gYWNyb3NzIEFQSSBtb2R1bGVzLlxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gU3RhbmRhcmQgUkVTVGZ1bCBvcGVyYXRpb25zIChHRVQsIFBPU1QsIFBVVCwgREVMRVRFKVxuICogLSBDdXN0b20gbWV0aG9kcyBzdXBwb3J0IHZpYSBjb2xvbiBub3RhdGlvbiAoOmdldERlZmF1bHQsIDpnZXREZWZhdWx0cylcbiAqIC0gQXV0b21hdGljIEhUVFAgbWV0aG9kIHNlbGVjdGlvbiBiYXNlZCBvbiBkYXRhXG4gKiAtIENTUkYgdG9rZW4gbWFuYWdlbWVudFxuICogLSBCYWNrd2FyZCBjb21wYXRpYmlsaXR5IHdpdGggUGJ4RGF0YVRhYmxlSW5kZXhcbiAqIFxuICogQGNsYXNzIFBieEFwaUNsaWVudFxuICovXG5jbGFzcyBQYnhBcGlDbGllbnQge1xuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyBBUEkgY2xpZW50IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbmZpZy5lbmRwb2ludCAtIEJhc2UgQVBJIGVuZHBvaW50IChlLmcuLCAnL3BieGNvcmUvYXBpL3YzL2l2ci1tZW51JylcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbmZpZy5jdXN0b21NZXRob2RzXSAtIE1hcCBvZiBjdXN0b20gbWV0aG9kcyAoZS5nLiwge2dldERlZmF1bHQ6ICc6Z2V0RGVmYXVsdCd9KVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5zaW5nbGV0b25dIC0gV2hldGhlciB0aGlzIGlzIGEgc2luZ2xldG9uIHJlc291cmNlIChubyBJRHMgaW4gVVJMcylcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICAgICAgdGhpcy5lbmRwb2ludCA9IGNvbmZpZy5lbmRwb2ludDtcbiAgICAgICAgdGhpcy5jdXN0b21NZXRob2RzID0gY29uZmlnLmN1c3RvbU1ldGhvZHMgfHwge307XG4gICAgICAgIHRoaXMuaXNTaW5nbGV0b24gPSBjb25maWcuc2luZ2xldG9uIHx8IGZhbHNlO1xuXG4gICAgICAgIC8vIEV4dHJhY3QgYmFzZSBVUkwgZm9yIENvbmZpZy5wYnhVcmxcbiAgICAgICAgdGhpcy5hcGlVcmwgPSBgJHtDb25maWcucGJ4VXJsfSR7dGhpcy5lbmRwb2ludH1gO1xuXG4gICAgICAgIC8vIENyZWF0ZSBlbmRwb2ludHMgcHJvcGVydHkgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBQYnhEYXRhVGFibGVJbmRleFxuICAgICAgICB0aGlzLmVuZHBvaW50cyA9IHtcbiAgICAgICAgICAgIGdldExpc3Q6IHRoaXMuYXBpVXJsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWRkIGN1c3RvbSBtZXRob2QgZW5kcG9pbnRzXG4gICAgICAgIGZvciAoY29uc3QgW21ldGhvZE5hbWUsIG1ldGhvZFBhdGhdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMuY3VzdG9tTWV0aG9kcykpIHtcbiAgICAgICAgICAgIHRoaXMuZW5kcG9pbnRzW21ldGhvZE5hbWVdID0gYCR7dGhpcy5hcGlVcmx9JHttZXRob2RQYXRofWA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBieSBJRCBvciBnZXQgZGVmYXVsdCB2YWx1ZXMgZm9yIG5ldyByZWNvcmRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBSZWNvcmQgSUQgb3IgZW1wdHkvbnVsbCBmb3IgbmV3IHJlY29yZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHdlIHNob3VsZCB1c2UgYSBjdXN0b20gbWV0aG9kIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICBjb25zdCBpc05ldyA9ICFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJycgfHwgcmVjb3JkSWQgPT09ICduZXcnO1xuICAgICAgICBsZXQgdXJsO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzTmV3ICYmIHRoaXMuY3VzdG9tTWV0aG9kcy5nZXREZWZhdWx0KSB7XG4gICAgICAgICAgICAvLyBVc2UgY3VzdG9tIG1ldGhvZCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfSR7dGhpcy5jdXN0b21NZXRob2RzLmdldERlZmF1bHR9YDtcbiAgICAgICAgfSBlbHNlIGlmIChpc05ldyAmJiB0aGlzLmN1c3RvbU1ldGhvZHMuZ2V0RGVmYXVsdHMpIHtcbiAgICAgICAgICAgIC8vIEFsdGVybmF0aXZlIG5hbWluZ1xuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9JHt0aGlzLmN1c3RvbU1ldGhvZHMuZ2V0RGVmYXVsdHN9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEdldCBleGlzdGluZyByZWNvcmQgYnkgSURcbiAgICAgICAgICAgIHVybCA9IGAke3RoaXMuYXBpVXJsfS8ke3JlY29yZElkfWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciBvY2N1cnJlZCddfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGxpc3Qgb2YgcmVjb3JkcyAob3Igc2luZ2xlIHJlY29yZCBmb3Igc2luZ2xldG9uKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fGZ1bmN0aW9ufSBkYXRhT3JDYWxsYmFjayAtIE9wdGlvbmFsIHBhcmFtcyBvciBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gLSBDYWxsYmFjayBpZiBmaXJzdCBwYXJhbSBpcyBkYXRhXG4gICAgICovXG4gICAgZ2V0TGlzdChkYXRhT3JDYWxsYmFjaywgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gRm9yIHNpbmdsZXRvbiByZXNvdXJjZXMsIHJlZGlyZWN0IHRvIGdldCgpIG1ldGhvZFxuICAgICAgICBpZiAodGhpcy5pc1NpbmdsZXRvbikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLmdldCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldChkYXRhT3JDYWxsYmFjaywgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIG92ZXJsb2FkZWQgcGFyYW1ldGVyc1xuICAgICAgICBsZXQgYWN0dWFsQ2FsbGJhY2s7XG4gICAgICAgIGxldCBwYXJhbXMgPSB7fTtcblxuICAgICAgICBpZiAodHlwZW9mIGRhdGFPckNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9IGRhdGFPckNhbGxiYWNrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFyYW1zID0gZGF0YU9yQ2FsbGJhY2sgfHwge307XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmFwaVVybCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSByZXR1cm4gYSBzdHJ1Y3R1cmUgd2l0aCByZXN1bHQgYW5kIGRhdGEgZmllbGRzXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmICFyZXNwb25zZS5oYXNPd25Qcm9wZXJ0eSgnZGF0YScpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IFtdfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlIHJlY29yZCAoY3JlYXRlIG9yIHVwZGF0ZSlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gc2F2ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBzYXZlUmVjb3JkKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIERldGVybWluZSBpZiB0aGlzIGlzIGEgbmV3IHJlY29yZFxuICAgICAgICBjb25zdCBpc05ldyA9IHRoaXMuaXNOZXdSZWNvcmQoZGF0YSk7XG5cbiAgICAgICAgLy8gQ2xlYW4gdXAgaW50ZXJuYWwgZmxhZ3NcbiAgICAgICAgY29uc3QgY2xlYW5EYXRhID0gey4uLmRhdGF9O1xuICAgICAgICBpZiAoY2xlYW5EYXRhLl9pc05ldyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWxldGUgY2xlYW5EYXRhLl9pc05ldztcbiAgICAgICAgfVxuICAgICAgICAvLyBSZW1vdmUgX21ldGhvZCBhcyBpdCdzIGhhbmRsZWQgYnkgdGhlIGFjdHVhbCBIVFRQIG1ldGhvZFxuICAgICAgICBpZiAoY2xlYW5EYXRhLl9tZXRob2QgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVsZXRlIGNsZWFuRGF0YS5fbWV0aG9kO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IHRoZSByZWNvcmQgSUQgZm9yIHVwZGF0ZXNcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSB0aGlzLmdldFJlY29yZElkKGNsZWFuRGF0YSk7XG5cbiAgICAgICAgLy8gdjMgQVBJOiBQT1NUIGZvciBuZXcgcmVjb3JkcywgUFVUIGZvciB1cGRhdGVzXG4gICAgICAgIGNvbnN0IG1ldGhvZCA9IGlzTmV3ID8gJ1BPU1QnIDogJ1BVVCc7XG4gICAgICAgIGNvbnN0IHVybCA9IGlzTmV3ID8gdGhpcy5hcGlVcmwgOiBgJHt0aGlzLmFwaVVybH0vJHtyZWNvcmRJZH1gO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICBkYXRhOiBjbGVhbkRhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIENTUkYgdG9rZW4gaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBnbG9iYWxDc3JmVG9rZW5LZXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBnbG9iYWxDc3JmVG9rZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFuRGF0YVtnbG9iYWxDc3JmVG9rZW5LZXldID0gZ2xvYmFsQ3NyZlRva2VuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIHNlbmQgYXMgSlNPTiAoZm9yIGNvbXBsZXggc3RydWN0dXJlcylcbiAgICAgICAgICAgICAgICBpZiAoUGJ4QXBpQ2xpZW50Lmhhc0NvbXBsZXhEYXRhKGNsZWFuRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShjbGVhbkRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ119XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWxldGUgcmVjb3JkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gUmVjb3JkIElEIHRvIGRlbGV0ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBDU1JGIHRva2VuIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIGdsb2JhbENzcmZUb2tlbktleSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGdsb2JhbENzcmZUb2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGRhdGFbZ2xvYmFsQ3NyZlRva2VuS2V5XSA9IGdsb2JhbENzcmZUb2tlbjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmFwaVVybH0vJHtyZWNvcmRJZH1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGwgYSBjdXN0b20gbWV0aG9kXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZE5hbWUgLSBNZXRob2QgbmFtZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fGZ1bmN0aW9ufSBkYXRhT3JDYWxsYmFjayAtIERhdGEgb3IgY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQ2FsbGJhY2sgaWYgZmlyc3QgcGFyYW0gaXMgZGF0YVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaHR0cE1ldGhvZF0gLSBIVFRQIG1ldGhvZCB0byB1c2UgKEdFVCBvciBQT1NUKSwgZGVmYXVsdHMgdG8gR0VUXG4gICAgICovXG4gICAgY2FsbEN1c3RvbU1ldGhvZChtZXRob2ROYW1lLCBkYXRhT3JDYWxsYmFjaywgY2FsbGJhY2ssIGh0dHBNZXRob2QgPSAnR0VUJykge1xuICAgICAgICAvLyBIYW5kbGUgb3ZlcmxvYWRlZCBwYXJhbWV0ZXJzXG4gICAgICAgIGxldCBhY3R1YWxDYWxsYmFjaztcbiAgICAgICAgbGV0IGRhdGEgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2YgZGF0YU9yQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gZGF0YU9yQ2FsbGJhY2s7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gZGF0YU9yQ2FsbGJhY2sgfHwge307XG4gICAgICAgICAgICBhY3R1YWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBtZXRob2RQYXRoID0gdGhpcy5jdXN0b21NZXRob2RzW21ldGhvZE5hbWVdO1xuICAgICAgICBpZiAoIW1ldGhvZFBhdGgpIHtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFtgVW5rbm93biBjdXN0b20gbWV0aG9kOiAke21ldGhvZE5hbWV9YF19XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgVVJMIHdpdGggSUQgaWYgcHJvdmlkZWQgKGZvciByZXNvdXJjZS1sZXZlbCBjdXN0b20gbWV0aG9kcylcbiAgICAgICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsO1xuICAgICAgICBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgLy8gUmVzb3VyY2UtbGV2ZWwgbWV0aG9kOiAvYXBpL3YzL3Jlc291cmNlL3tpZH06bWV0aG9kXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0vJHtkYXRhLmlkfSR7bWV0aG9kUGF0aH1gO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGlkIGZyb20gZGF0YSBzaW5jZSBpdCdzIGluIHRoZSBVUkxcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3REYXRhID0gey4uLmRhdGF9O1xuICAgICAgICAgICAgZGVsZXRlIHJlcXVlc3REYXRhLmlkO1xuICAgICAgICAgICAgZGF0YSA9IHJlcXVlc3REYXRhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ29sbGVjdGlvbi1sZXZlbCBtZXRob2Q6IC9hcGkvdjMvcmVzb3VyY2U6bWV0aG9kXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIENTUkYgdG9rZW4gZm9yIFBPU1QgcmVxdWVzdHNcbiAgICAgICAgaWYgKGh0dHBNZXRob2QgPT09ICdQT1NUJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuS2V5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZ2xvYmFsQ3NyZlRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZGF0YVtnbG9iYWxDc3JmVG9rZW5LZXldID0gZ2xvYmFsQ3NyZlRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZGF0YSBjb250YWlucyBib29sZWFuIG9yIGNvbXBsZXggdmFsdWVzXG4gICAgICAgIGxldCBoYXNDb21wbGV4RGF0YSA9IGZhbHNlO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW2tleV07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFzQ29tcGxleERhdGEgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgSlNPTiBmb3IgY29tcGxleCBkYXRhLCBmb3JtIGVuY29kaW5nIGZvciBzaW1wbGUgZGF0YVxuICAgICAgICBjb25zdCBhamF4U2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogaHR0cE1ldGhvZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhY3R1YWxDYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXX1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzQ29tcGxleERhdGEpIHtcbiAgICAgICAgICAgIC8vIFNlbmQgYXMgSlNPTiB0byBwcmVzZXJ2ZSBib29sZWFuIHZhbHVlcyBhbmQgY29tcGxleCBzdHJ1Y3R1cmVzXG4gICAgICAgICAgICBhamF4U2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgYWpheFNldHRpbmdzLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1NlbmRpbmcgYXMgSlNPTjonLCBkYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNlbmQgYXMgcmVndWxhciBmb3JtIGRhdGFcbiAgICAgICAgICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIGFzIGZvcm0gZGF0YTonLCBkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKGFqYXhTZXR0aW5ncyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIERldGVybWluZSBpZiBkYXRhIHJlcHJlc2VudHMgYSBuZXcgcmVjb3JkXG4gICAgICogQ2FuIGJlIG92ZXJyaWRkZW4gaW4gc3BlY2lmaWMgQVBJIG1vZHVsZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gY2hlY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBuZXcgcmVjb3JkXG4gICAgICovXG4gICAgaXNOZXdSZWNvcmQoZGF0YSkge1xuICAgICAgICAvLyBDaGVjayBleHBsaWNpdCBmbGFnIGZpcnN0IC0gaWYgc2V0LCB1c2UgaXRcbiAgICAgICAgaWYgKGRhdGEuX2lzTmV3ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLl9pc05ldyA9PT0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgbWFya2VkIGFzIG5ld1xuICAgICAgICBpZiAoZGF0YS5pc05ldyA9PT0gJzEnIHx8IGRhdGEuaXNOZXcgPT09IHRydWUgfHwgZGF0YS5pc05ldyA9PT0gJ3RydWUnKSByZXR1cm4gdHJ1ZTtcblxuICAgICAgICAvLyBTaW1wbGUgY2hlY2s6IGlmIG5vIGlkIG9yIGVtcHR5IGlkLCBpdCdzIGEgbmV3IHJlY29yZFxuICAgICAgICAvLyBSRVNUIEFQSSB2MyBkb2Vzbid0IHVzZSB1bmlxaWQgYW55bW9yZVxuICAgICAgICBpZiAoIWRhdGEuaWQgfHwgZGF0YS5pZCA9PT0gJycgfHwgZGF0YS5pZCA9PT0gJ25ldycpIHJldHVybiB0cnVlO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIGRhdGFcbiAgICAgKiBDYW4gYmUgb3ZlcnJpZGRlbiBpbiBzcGVjaWZpYyBBUEkgbW9kdWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZWNvcmQgSURcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZChkYXRhKSB7XG4gICAgICAgIC8vIFJFU1QgQVBJIHYzIHVzZXMgb25seSAnaWQnIGZpZWxkXG4gICAgICAgIHJldHVybiBkYXRhLmlkO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBkYXRhIGNvbnRhaW5zIGNvbXBsZXggc3RydWN0dXJlcyB0aGF0IG5lZWQgSlNPTiBlbmNvZGluZ1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBjaGVja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGNvbnRhaW5zIGNvbXBsZXggZGF0YVxuICAgICAqL1xuICAgIHN0YXRpYyBoYXNDb21wbGV4RGF0YShkYXRhKSB7XG4gICAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgT2JqZWN0LnZhbHVlcyhkYXRhKSkge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpIHx8ICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbndpbmRvdy5QYnhBcGlDbGllbnQgPSBQYnhBcGlDbGllbnQ7Il19