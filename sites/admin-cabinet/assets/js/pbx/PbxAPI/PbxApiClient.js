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
   */
  function PbxApiClient(config) {
    _classCallCheck(this, PbxApiClient);

    this.endpoint = config.endpoint;
    this.customMethods = config.customMethods || {}; // Extract base URL for Config.pbxUrl

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
     * Get list of records
     * @param {object|function} dataOrCallback - Optional params or callback
     * @param {function} [callback] - Callback if first param is data
     */

  }, {
    key: "getList",
    value: function getList(dataOrCallback, callback) {
      // Handle overloaded parameters
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
     */

  }, {
    key: "callCustomMethod",
    value: function callCustomMethod(methodName, dataOrCallback, callback) {
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
      }

      $.api({
        url: "".concat(this.apiUrl).concat(methodPath),
        method: 'GET',
        data: data,
        on: 'now',
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
      });
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
      // Check various flags that indicate a new record
      if (data._isNew === true) return true;
      if (data.isNew === '1' || data.isNew === true || data.isNew === 'true') return true;
      if (!data.id || data.id === '' || data.id === 'new') return true;
      if (!data.uniqid || data.uniqid === '') return true;
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
      // Priority: uniqid > id
      return data.uniqid || data.id;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvUGJ4QXBpQ2xpZW50LmpzIl0sIm5hbWVzIjpbIlBieEFwaUNsaWVudCIsImNvbmZpZyIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImFwaVVybCIsIkNvbmZpZyIsInBieFVybCIsImVuZHBvaW50cyIsImdldExpc3QiLCJPYmplY3QiLCJlbnRyaWVzIiwibWV0aG9kTmFtZSIsIm1ldGhvZFBhdGgiLCJyZWNvcmRJZCIsImNhbGxiYWNrIiwiaXNOZXciLCJ1cmwiLCJnZXREZWZhdWx0IiwiZ2V0RGVmYXVsdHMiLCIkIiwiYXBpIiwibWV0aG9kIiwib24iLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsIm9uRmFpbHVyZSIsIm9uRXJyb3IiLCJyZXN1bHQiLCJtZXNzYWdlcyIsImVycm9yIiwiZGF0YU9yQ2FsbGJhY2siLCJhY3R1YWxDYWxsYmFjayIsInBhcmFtcyIsImRhdGEiLCJzdWNjZXNzVGVzdCIsIlBieEFwaSIsImhhc093blByb3BlcnR5IiwiaXNOZXdSZWNvcmQiLCJjbGVhbkRhdGEiLCJfaXNOZXciLCJ1bmRlZmluZWQiLCJnZXRSZWNvcmRJZCIsImJlZm9yZVNlbmQiLCJzZXR0aW5ncyIsImdsb2JhbENzcmZUb2tlbktleSIsImdsb2JhbENzcmZUb2tlbiIsImhhc0NvbXBsZXhEYXRhIiwiY29udGVudFR5cGUiLCJKU09OIiwic3RyaW5naWZ5IiwiaWQiLCJ1bmlxaWQiLCJ2YWx1ZXMiLCJ2YWx1ZSIsIkFycmF5IiwiaXNBcnJheSIsIndpbmRvdyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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SUFBcEIsRUFBMEIsT0FBTyxJQUFQO0FBQzFCLFVBQUlOLElBQUksQ0FBQ2xCLEtBQUwsS0FBZSxHQUFmLElBQXNCa0IsSUFBSSxDQUFDbEIsS0FBTCxLQUFlLElBQXJDLElBQTZDa0IsSUFBSSxDQUFDbEIsS0FBTCxLQUFlLE1BQWhFLEVBQXdFLE9BQU8sSUFBUDtBQUN4RSxVQUFJLENBQUNrQixJQUFJLENBQUNpQixFQUFOLElBQVlqQixJQUFJLENBQUNpQixFQUFMLEtBQVksRUFBeEIsSUFBOEJqQixJQUFJLENBQUNpQixFQUFMLEtBQVksS0FBOUMsRUFBcUQsT0FBTyxJQUFQO0FBQ3JELFVBQUksQ0FBQ2pCLElBQUksQ0FBQ2tCLE1BQU4sSUFBZ0JsQixJQUFJLENBQUNrQixNQUFMLEtBQWdCLEVBQXBDLEVBQXdDLE9BQU8sSUFBUDtBQUN4QyxhQUFPLEtBQVA7QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLHFCQUFZbEIsSUFBWixFQUFrQjtBQUNkO0FBQ0EsYUFBT0EsSUFBSSxDQUFDa0IsTUFBTCxJQUFlbEIsSUFBSSxDQUFDaUIsRUFBM0I7QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSx3QkFBc0JqQixJQUF0QixFQUE0QjtBQUN4Qix5Q0FBb0J4QixNQUFNLENBQUMyQyxNQUFQLENBQWNuQixJQUFkLENBQXBCLHNDQUF5QztBQUFwQyxZQUFNb0IsS0FBSyxzQkFBWDs7QUFDRCxZQUFJQyxLQUFLLENBQUNDLE9BQU4sQ0FBY0YsS0FBZCxLQUF5QixRQUFPQSxLQUFQLE1BQWlCLFFBQWpCLElBQTZCQSxLQUFLLEtBQUssSUFBcEUsRUFBMkU7QUFDdkUsaUJBQU8sSUFBUDtBQUNIO0FBQ0o7O0FBQ0QsYUFBTyxLQUFQO0FBQ0g7Ozs7S0FHTDs7O0FBQ0FHLE1BQU0sQ0FBQ3hELFlBQVAsR0FBc0JBLFlBQXRCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIENvbmZpZywgUGJ4QXBpLCAkICovXG5cbi8qKlxuICogUGJ4QXBpQ2xpZW50IC0gVW5pZmllZCBSRVNUIEFQSSB2MyBjbGllbnQgZm9yIGFsbCBlbnRpdGllc1xuICogXG4gKiBUaGlzIGNsYXNzIHByb3ZpZGVzIGEgc3RhbmRhcmQgaW50ZXJmYWNlIGZvciBhbGwgQ1JVRCBvcGVyYXRpb25zXG4gKiBhbmQgZWxpbWluYXRlcyBjb2RlIGR1cGxpY2F0aW9uIGFjcm9zcyBBUEkgbW9kdWxlcy5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIFN0YW5kYXJkIFJFU1RmdWwgb3BlcmF0aW9ucyAoR0VULCBQT1NULCBQVVQsIERFTEVURSlcbiAqIC0gQ3VzdG9tIG1ldGhvZHMgc3VwcG9ydCB2aWEgY29sb24gbm90YXRpb24gKDpnZXREZWZhdWx0LCA6Z2V0RGVmYXVsdHMpXG4gKiAtIEF1dG9tYXRpYyBIVFRQIG1ldGhvZCBzZWxlY3Rpb24gYmFzZWQgb24gZGF0YVxuICogLSBDU1JGIHRva2VuIG1hbmFnZW1lbnRcbiAqIC0gQmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aXRoIFBieERhdGFUYWJsZUluZGV4XG4gKiBcbiAqIEBjbGFzcyBQYnhBcGlDbGllbnRcbiAqL1xuY2xhc3MgUGJ4QXBpQ2xpZW50IHtcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgQVBJIGNsaWVudCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcuZW5kcG9pbnQgLSBCYXNlIEFQSSBlbmRwb2ludCAoZS5nLiwgJy9wYnhjb3JlL2FwaS92My9pdnItbWVudScpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtjb25maWcuY3VzdG9tTWV0aG9kc10gLSBNYXAgb2YgY3VzdG9tIG1ldGhvZHMgKGUuZy4sIHtnZXREZWZhdWx0OiAnOmdldERlZmF1bHQnfSlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICAgICAgdGhpcy5lbmRwb2ludCA9IGNvbmZpZy5lbmRwb2ludDtcbiAgICAgICAgdGhpcy5jdXN0b21NZXRob2RzID0gY29uZmlnLmN1c3RvbU1ldGhvZHMgfHwge307XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRyYWN0IGJhc2UgVVJMIGZvciBDb25maWcucGJ4VXJsXG4gICAgICAgIHRoaXMuYXBpVXJsID0gYCR7Q29uZmlnLnBieFVybH0ke3RoaXMuZW5kcG9pbnR9YDtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBlbmRwb2ludHMgcHJvcGVydHkgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBQYnhEYXRhVGFibGVJbmRleFxuICAgICAgICB0aGlzLmVuZHBvaW50cyA9IHtcbiAgICAgICAgICAgIGdldExpc3Q6IHRoaXMuYXBpVXJsXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY3VzdG9tIG1ldGhvZCBlbmRwb2ludHNcbiAgICAgICAgZm9yIChjb25zdCBbbWV0aG9kTmFtZSwgbWV0aG9kUGF0aF0gb2YgT2JqZWN0LmVudHJpZXModGhpcy5jdXN0b21NZXRob2RzKSkge1xuICAgICAgICAgICAgdGhpcy5lbmRwb2ludHNbbWV0aG9kTmFtZV0gPSBgJHt0aGlzLmFwaVVybH0ke21ldGhvZFBhdGh9YDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIGJ5IElEIG9yIGdldCBkZWZhdWx0IHZhbHVlcyBmb3IgbmV3IHJlY29yZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIFJlY29yZCBJRCBvciBlbXB0eS9udWxsIGZvciBuZXcgcmVjb3JkXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFJlY29yZChyZWNvcmRJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2Ugc2hvdWxkIHVzZSBhIGN1c3RvbSBtZXRob2QgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgIGNvbnN0IGlzTmV3ID0gIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJyB8fCByZWNvcmRJZCA9PT0gJ25ldyc7XG4gICAgICAgIGxldCB1cmw7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNOZXcgJiYgdGhpcy5jdXN0b21NZXRob2RzLmdldERlZmF1bHQpIHtcbiAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gbWV0aG9kIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9JHt0aGlzLmN1c3RvbU1ldGhvZHMuZ2V0RGVmYXVsdH1gO1xuICAgICAgICB9IGVsc2UgaWYgKGlzTmV3ICYmIHRoaXMuY3VzdG9tTWV0aG9kcy5nZXREZWZhdWx0cykge1xuICAgICAgICAgICAgLy8gQWx0ZXJuYXRpdmUgbmFtaW5nXG4gICAgICAgICAgICB1cmwgPSBgJHt0aGlzLmFwaVVybH0ke3RoaXMuY3VzdG9tTWV0aG9kcy5nZXREZWZhdWx0c31gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gR2V0IGV4aXN0aW5nIHJlY29yZCBieSBJRFxuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7cmVjb3JkSWR9YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ119XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgbGlzdCBvZiByZWNvcmRzXG4gICAgICogQHBhcmFtIHtvYmplY3R8ZnVuY3Rpb259IGRhdGFPckNhbGxiYWNrIC0gT3B0aW9uYWwgcGFyYW1zIG9yIGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIENhbGxiYWNrIGlmIGZpcnN0IHBhcmFtIGlzIGRhdGFcbiAgICAgKi9cbiAgICBnZXRMaXN0KGRhdGFPckNhbGxiYWNrLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBIYW5kbGUgb3ZlcmxvYWRlZCBwYXJhbWV0ZXJzXG4gICAgICAgIGxldCBhY3R1YWxDYWxsYmFjaztcbiAgICAgICAgbGV0IHBhcmFtcyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhT3JDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBkYXRhT3JDYWxsYmFjaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBhcmFtcyA9IGRhdGFPckNhbGxiYWNrIHx8IHt9O1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmFwaVVybCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSByZXR1cm4gYSBzdHJ1Y3R1cmUgd2l0aCByZXN1bHQgYW5kIGRhdGEgZmllbGRzXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmICFyZXNwb25zZS5oYXNPd25Qcm9wZXJ0eSgnZGF0YScpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IFtdfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlIHJlY29yZCAoY3JlYXRlIG9yIHVwZGF0ZSlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gc2F2ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBzYXZlUmVjb3JkKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIERldGVybWluZSBpZiB0aGlzIGlzIGEgbmV3IHJlY29yZFxuICAgICAgICBjb25zdCBpc05ldyA9IHRoaXMuaXNOZXdSZWNvcmQoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhbiB1cCBpbnRlcm5hbCBmbGFnc1xuICAgICAgICBjb25zdCBjbGVhbkRhdGEgPSB7Li4uZGF0YX07XG4gICAgICAgIGlmIChjbGVhbkRhdGEuX2lzTmV3ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBjbGVhbkRhdGEuX2lzTmV3O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgdGhlIHJlY29yZCBJRCBmb3IgdXBkYXRlc1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IHRoaXMuZ2V0UmVjb3JkSWQoY2xlYW5EYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHYzIEFQSTogUE9TVCBmb3IgbmV3IHJlY29yZHMsIFBVVCBmb3IgdXBkYXRlc1xuICAgICAgICBjb25zdCBtZXRob2QgPSBpc05ldyA/ICdQT1NUJyA6ICdQVVQnO1xuICAgICAgICBjb25zdCB1cmwgPSBpc05ldyA/IHRoaXMuYXBpVXJsIDogYCR7dGhpcy5hcGlVcmx9LyR7cmVjb3JkSWR9YDtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICBkYXRhOiBjbGVhbkRhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIENTUkYgdG9rZW4gaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBnbG9iYWxDc3JmVG9rZW5LZXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBnbG9iYWxDc3JmVG9rZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFuRGF0YVtnbG9iYWxDc3JmVG9rZW5LZXldID0gZ2xvYmFsQ3NyZlRva2VuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIHNlbmQgYXMgSlNPTiAoZm9yIGNvbXBsZXggc3RydWN0dXJlcylcbiAgICAgICAgICAgICAgICBpZiAoUGJ4QXBpQ2xpZW50Lmhhc0NvbXBsZXhEYXRhKGNsZWFuRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeShjbGVhbkRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ119XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWxldGUgcmVjb3JkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gUmVjb3JkIElEIHRvIGRlbGV0ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBDU1JGIHRva2VuIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIGdsb2JhbENzcmZUb2tlbktleSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGdsb2JhbENzcmZUb2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGRhdGFbZ2xvYmFsQ3NyZlRva2VuS2V5XSA9IGdsb2JhbENzcmZUb2tlbjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmFwaVVybH0vJHtyZWNvcmRJZH1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGwgYSBjdXN0b20gbWV0aG9kXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZE5hbWUgLSBNZXRob2QgbmFtZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fGZ1bmN0aW9ufSBkYXRhT3JDYWxsYmFjayAtIERhdGEgb3IgY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQ2FsbGJhY2sgaWYgZmlyc3QgcGFyYW0gaXMgZGF0YVxuICAgICAqL1xuICAgIGNhbGxDdXN0b21NZXRob2QobWV0aG9kTmFtZSwgZGF0YU9yQ2FsbGJhY2ssIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIEhhbmRsZSBvdmVybG9hZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgbGV0IGFjdHVhbENhbGxiYWNrO1xuICAgICAgICBsZXQgZGF0YSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhT3JDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2sgPSBkYXRhT3JDYWxsYmFjaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhT3JDYWxsYmFjayB8fCB7fTtcbiAgICAgICAgICAgIGFjdHVhbENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG1ldGhvZFBhdGggPSB0aGlzLmN1c3RvbU1ldGhvZHNbbWV0aG9kTmFtZV07XG4gICAgICAgIGlmICghbWV0aG9kUGF0aCkge1xuICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZXM6IHtlcnJvcjogW2BVbmtub3duIGN1c3RvbSBtZXRob2Q6ICR7bWV0aG9kTmFtZX1gXX1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuYXBpVXJsfSR7bWV0aG9kUGF0aH1gLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhY3R1YWxDYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXX1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIERldGVybWluZSBpZiBkYXRhIHJlcHJlc2VudHMgYSBuZXcgcmVjb3JkXG4gICAgICogQ2FuIGJlIG92ZXJyaWRkZW4gaW4gc3BlY2lmaWMgQVBJIG1vZHVsZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gY2hlY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBuZXcgcmVjb3JkXG4gICAgICovXG4gICAgaXNOZXdSZWNvcmQoZGF0YSkge1xuICAgICAgICAvLyBDaGVjayB2YXJpb3VzIGZsYWdzIHRoYXQgaW5kaWNhdGUgYSBuZXcgcmVjb3JkXG4gICAgICAgIGlmIChkYXRhLl9pc05ldyA9PT0gdHJ1ZSkgcmV0dXJuIHRydWU7XG4gICAgICAgIGlmIChkYXRhLmlzTmV3ID09PSAnMScgfHwgZGF0YS5pc05ldyA9PT0gdHJ1ZSB8fCBkYXRhLmlzTmV3ID09PSAndHJ1ZScpIHJldHVybiB0cnVlO1xuICAgICAgICBpZiAoIWRhdGEuaWQgfHwgZGF0YS5pZCA9PT0gJycgfHwgZGF0YS5pZCA9PT0gJ25ldycpIHJldHVybiB0cnVlO1xuICAgICAgICBpZiAoIWRhdGEudW5pcWlkIHx8IGRhdGEudW5pcWlkID09PSAnJykgcmV0dXJuIHRydWU7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIGRhdGFcbiAgICAgKiBDYW4gYmUgb3ZlcnJpZGRlbiBpbiBzcGVjaWZpYyBBUEkgbW9kdWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZWNvcmQgSURcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZChkYXRhKSB7XG4gICAgICAgIC8vIFByaW9yaXR5OiB1bmlxaWQgPiBpZFxuICAgICAgICByZXR1cm4gZGF0YS51bmlxaWQgfHwgZGF0YS5pZDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgZGF0YSBjb250YWlucyBjb21wbGV4IHN0cnVjdHVyZXMgdGhhdCBuZWVkIEpTT04gZW5jb2RpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gY2hlY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBjb250YWlucyBjb21wbGV4IGRhdGFcbiAgICAgKi9cbiAgICBzdGF0aWMgaGFzQ29tcGxleERhdGEoZGF0YSkge1xuICAgICAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIE9iamVjdC52YWx1ZXMoZGF0YSkpIHtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSB8fCAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuUGJ4QXBpQ2xpZW50ID0gUGJ4QXBpQ2xpZW50OyJdfQ==