"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global sessionStorage, globalRootUrl, Config, Resumable */

/**
 * The PbxApi object is responsible for conversation with backend core API
 *
 * @module PbxApi 
 */
var PbxApi = {
  /**
   * Tries to parse a JSON string.
   *
   * @param {string} jsonString - The JSON string to be parsed.
   * @returns {boolean|any} - Returns the parsed JSON object if parsing is successful and the result is an object.
   *                          Otherwise, returns `false`.
   */
  tryParseJSON: function tryParseJSON(jsonString) {
    try {
      var o = JSON.parse(jsonString); // Handle non-exception-throwing cases:
      // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
      // but... JSON.parse(null) returns null, and typeof null === "object",
      // so we must check for that, too. Thankfully, null is falsey, so this suffices:

      if (o && _typeof(o) === 'object') {
        return o;
      }

      return false;
    } catch (e) {
      return false;
    }
  },

  /**
   * Checks the success response from the backend.
   *
   * @param {Object} response - The response object to be checked for success.
   * @returns {boolean} - Returns `true` if the response is defined, has non-empty keys, and the 'result' property is `true`.
   */
  successTest: function successTest(response) {
    return response !== undefined && Object.keys(response).length > 0 && response.result !== undefined && response.result === true;
  },

  /**
  * Connects the file upload handler for uploading files in parts.
  *
  * @param {string} buttonId - The ID of the button to assign the file upload functionality.
  * @param {string[]} fileTypes - An array of allowed file types.
  * @param {function} callback - The callback function to be called during different upload events.
  *                             It will receive event information such as progress, success, error, etc.
  * @returns {void}
  * 
  * @depricated Use FilesAPI.attachToBtn() instead
  */
  SystemUploadFileAttachToBtn: function SystemUploadFileAttachToBtn(buttonId, fileTypes, callback) {
    FilesAPI.attachToBtn(buttonId, fileTypes, callback);
  },

  /**
   * Enables uploading a file using chunk resumable worker.
   *
   * @param {File} file - The file to be uploaded.
   * @param {function} callback - The callback function to be called during different upload events.
   *                             It will receive event information such as progress, success, error, etc.
   * @returns {void}
   * 
   * @depricated Use FilesAPI.uploadFile() instead
   */
  FilesUploadFile: function FilesUploadFile(file, callback) {
    FilesAPI.uploadFile(file, callback);
  },

  /**
  * Gets the uploading status of a file.
  *
  * @param {string} fileId - The ID of the file for which the status is requested.
  * @param {function} callback - The callback function to be called with the response data or `false` in case of failure.
  * @returns {void}
  * 
  * @depricated Use FilesAPI.getStatusUploadFile() instead
  */
  FilesGetStatusUploadFile: function FilesGetStatusUploadFile(fileId, callback) {
    FilesAPI.getStatusUploadFile(fileId, callback);
  },

  /**
   * Handles API errors with consistent format and context information
   *
   * @param {string} context - The context where the error occurred (e.g., 'ExtensionsAPI.getRecord')
   * @param {Error|string|Object} error - The error object, string, or response
   * @param {function} [callback] - Optional callback to call with formatted error
   * @returns {Object} Standardized error response object
   */
  handleApiError: function handleApiError(context, error, callback) {
    var errorMessage = 'Unknown error occurred';
    var errorDetails = {}; // Extract error message from different error types

    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && error.message) {
      errorMessage = error.message;
    } else if (error && error.messages && error.messages.error) {
      errorMessage = Array.isArray(error.messages.error) ? error.messages.error.join(', ') : error.messages.error;
      errorDetails = error.messages;
    } else if (error && error.result === false) {
      errorMessage = 'API request failed';
      errorDetails = error;
    }

    var response = {
      result: false,
      messages: {
        error: ["".concat(context, ": ").concat(errorMessage)]
      },
      context: context,
      originalError: errorDetails,
      timestamp: new Date().toISOString()
    }; // Call callback if provided

    if (typeof callback === 'function') {
      callback(response);
    } // Log error for debugging in development


    if (typeof console !== 'undefined' && console.error) {
      console.error("[PbxAPI] ".concat(context, ":"), error);
    }

    return response;
  },

  /**
   * Normalizes callback parameters for overloaded functions
   * Handles common patterns like (callback) and (data, callback)
   *
   * @param {function|Object} arg1 - First argument (callback or data)
   * @param {function} [arg2] - Second argument (callback when first is data)
   * @returns {Object} Object with normalized data and callback
   */
  normalizeCallbackParams: function normalizeCallbackParams(arg1, arg2) {
    var data = {};
    var callback;

    if (typeof arg1 === 'function') {
      // Pattern: (callback)
      callback = arg1;
    } else if (_typeof(arg1) === 'object' && arg1 !== null) {
      // Pattern: (data, callback)
      data = arg1;
      callback = arg2;
    } else {
      // Pattern: (data, callback) where data is not object
      data = arg1 || {};
      callback = arg2;
    }

    return {
      data: data,
      callback: callback
    };
  },

  /**
   * Standard implementation for getRecord methods across API modules
   * Handles the common pattern of GET by ID or getDefault for new records
   *
   * @param {Object} apiInstance - The API client instance
   * @param {string} recordId - Record ID or empty/null for new record
   * @param {function} callback - Callback function
   * @param {boolean} [useDefault=true] - Whether to use :getDefault for new records
   * @param {string} [defaultMethod='getDefault'] - Name of the default method to use
   * @returns {void}
   */
  standardGetRecord: function standardGetRecord(apiInstance, recordId, callback) {
    var useDefault = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
    var defaultMethod = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'getDefault';
    var isNew = !recordId || recordId === '' || recordId === 'new';

    try {
      if (isNew && useDefault && apiInstance.customMethods && apiInstance.customMethods[defaultMethod]) {
        // Use custom method for new records
        apiInstance.callCustomMethod(defaultMethod, {}, function (response) {
          // Set _isNew flag for new records
          if (response && response.result && response.data) {
            response.data._isNew = true;
          }

          callback(response);
        });
      } else if (!isNew) {
        // Get existing record by ID
        apiInstance.callGet({}, callback, recordId);
      } else {
        // Fallback: return empty structure for new record
        callback({
          result: true,
          data: {
            _isNew: true
          }
        });
      }
    } catch (error) {
      this.handleApiError("".concat(apiInstance.constructor.name || 'API', ".getRecord"), error, callback);
    }
  },

  /**
   * Validates API parameters against a simple schema
   *
   * @param {Object} params - Parameters to validate
   * @param {Object} schema - Validation schema
   * @param {string} schema.required - Array of required parameter names
   * @param {string} schema.optional - Array of optional parameter names
   * @param {Object} schema.types - Object mapping parameter names to expected types
   * @returns {Object} Validation result with isValid boolean and errors array
   */
  validateApiParams: function validateApiParams(params, schema) {
    var result = {
      isValid: true,
      errors: []
    }; // Check required parameters

    if (schema.required) {
      var _iterator = _createForOfIteratorHelper(schema.required),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var param = _step.value;

          if (params[param] === undefined || params[param] === null) {
            result.isValid = false;
            result.errors.push("Required parameter '".concat(param, "' is missing"));
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    } // Check parameter types


    if (schema.types) {
      for (var _i = 0, _Object$entries = Object.entries(schema.types); _i < _Object$entries.length; _i++) {
        var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
            _param = _Object$entries$_i[0],
            expectedType = _Object$entries$_i[1];

        if (params[_param] !== undefined) {
          var actualType = _typeof(params[_param]);

          if (actualType !== expectedType) {
            result.isValid = false;
            result.errors.push("Parameter '".concat(_param, "' should be ").concat(expectedType, ", got ").concat(actualType));
          }
        }
      }
    }

    return result;
  },

  /**
   * Extends an API client instance with additional methods using a consistent pattern
   *
   * @param {Object} apiInstance - The PbxApiClient instance to extend
   * @param {Object} methods - Object containing methods to add to the API
   * @param {Object} [options={}] - Extension options
   * @param {boolean} [options.preserveContext=true] - Whether to preserve 'this' context
   * @returns {Object} The extended API instance
   */
  extendApiClient: function extendApiClient(apiInstance, methods) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    var opts = _objectSpread({
      preserveContext: true
    }, options); // Validate input


    if (!apiInstance || _typeof(apiInstance) !== 'object') {
      throw new Error('API instance must be an object');
    }

    if (!methods || _typeof(methods) !== 'object') {
      throw new Error('Methods must be an object');
    } // Add methods to the API instance


    for (var _i2 = 0, _Object$entries2 = Object.entries(methods); _i2 < _Object$entries2.length; _i2++) {
      var _Object$entries2$_i = _slicedToArray(_Object$entries2[_i2], 2),
          methodName = _Object$entries2$_i[0],
          methodFunc = _Object$entries2$_i[1];

      if (typeof methodFunc === 'function') {
        if (opts.preserveContext) {
          // Bind the function to the API instance to preserve 'this' context
          apiInstance[methodName] = methodFunc.bind(apiInstance);
        } else {
          apiInstance[methodName] = methodFunc;
        }
      } else {
        console.warn("[PbxAPI] Skipping non-function property '".concat(methodName, "' during API extension"));
      }
    }

    return apiInstance;
  },

  /**
   * Creates a debounced version of a function
   * Useful for API calls that should be delayed until after a period of inactivity
   *
   * @param {function} func - Function to debounce
   * @param {number} wait - Time to wait in milliseconds
   * @param {boolean} [immediate=false] - Whether to call function immediately on first call
   * @returns {function} Debounced function
   */
  debounce: function debounce(func, wait) {
    var immediate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var timeout;
    return function executedFunction() {
      var _this = this;

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var later = function later() {
        timeout = null;
        if (!immediate) func.apply(_this, args);
      };

      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(this, args);
    };
  },

  /**
   * Formats dropdown results with consistent structure
   * Used by multiple API modules for dropdown data formatting
   *
   * @param {Object} response - API response containing data array
   * @param {Object} [options={}] - Formatting options
   * @param {boolean} [options.addEmpty=false] - Whether to add empty option
   * @param {string} [options.emptyText='-'] - Text for empty option
   * @param {number} [options.emptyValue=-1] - Value for empty option
   * @param {Array} [options.excludeValues=[]] - Values to exclude from results
   * @returns {Object} Formatted dropdown response
   */
  formatDropdownResults: function formatDropdownResults(response) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var opts = _objectSpread({
      addEmpty: false,
      emptyText: '-',
      emptyValue: -1,
      excludeValues: []
    }, options);

    var formattedResponse = {
      success: false,
      results: []
    }; // Add empty option if requested

    if (opts.addEmpty) {
      formattedResponse.results.push({
        name: opts.emptyText,
        value: opts.emptyValue,
        type: '',
        typeLocalized: ''
      });
    }

    if (response && response.result === true && response.data) {
      formattedResponse.success = true; // Process each item in the response data

      response.data.forEach(function (item) {
        // Skip excluded values
        if (opts.excludeValues.includes(item.value)) {
          return;
        }

        formattedResponse.results.push({
          name: item.name || item.text || item.label || '',
          value: item.value || item.id || '',
          type: item.type || '',
          typeLocalized: item.typeLocalized || item.type || ''
        });
      });
    }

    return formattedResponse;
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4YXBpLmpzIl0sIm5hbWVzIjpbIlBieEFwaSIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwiU3lzdGVtVXBsb2FkRmlsZUF0dGFjaFRvQnRuIiwiYnV0dG9uSWQiLCJmaWxlVHlwZXMiLCJjYWxsYmFjayIsIkZpbGVzQVBJIiwiYXR0YWNoVG9CdG4iLCJGaWxlc1VwbG9hZEZpbGUiLCJmaWxlIiwidXBsb2FkRmlsZSIsIkZpbGVzR2V0U3RhdHVzVXBsb2FkRmlsZSIsImZpbGVJZCIsImdldFN0YXR1c1VwbG9hZEZpbGUiLCJoYW5kbGVBcGlFcnJvciIsImNvbnRleHQiLCJlcnJvciIsImVycm9yTWVzc2FnZSIsImVycm9yRGV0YWlscyIsIm1lc3NhZ2UiLCJtZXNzYWdlcyIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJvcmlnaW5hbEVycm9yIiwidGltZXN0YW1wIiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwiY29uc29sZSIsIm5vcm1hbGl6ZUNhbGxiYWNrUGFyYW1zIiwiYXJnMSIsImFyZzIiLCJkYXRhIiwic3RhbmRhcmRHZXRSZWNvcmQiLCJhcGlJbnN0YW5jZSIsInJlY29yZElkIiwidXNlRGVmYXVsdCIsImRlZmF1bHRNZXRob2QiLCJpc05ldyIsImN1c3RvbU1ldGhvZHMiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiX2lzTmV3IiwiY2FsbEdldCIsImNvbnN0cnVjdG9yIiwibmFtZSIsInZhbGlkYXRlQXBpUGFyYW1zIiwicGFyYW1zIiwic2NoZW1hIiwiaXNWYWxpZCIsImVycm9ycyIsInJlcXVpcmVkIiwicGFyYW0iLCJwdXNoIiwidHlwZXMiLCJlbnRyaWVzIiwiZXhwZWN0ZWRUeXBlIiwiYWN0dWFsVHlwZSIsImV4dGVuZEFwaUNsaWVudCIsIm1ldGhvZHMiLCJvcHRpb25zIiwib3B0cyIsInByZXNlcnZlQ29udGV4dCIsIkVycm9yIiwibWV0aG9kTmFtZSIsIm1ldGhvZEZ1bmMiLCJiaW5kIiwid2FybiIsImRlYm91bmNlIiwiZnVuYyIsIndhaXQiLCJpbW1lZGlhdGUiLCJ0aW1lb3V0IiwiZXhlY3V0ZWRGdW5jdGlvbiIsImFyZ3MiLCJsYXRlciIsImFwcGx5IiwiY2FsbE5vdyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJmb3JtYXREcm9wZG93blJlc3VsdHMiLCJhZGRFbXB0eSIsImVtcHR5VGV4dCIsImVtcHR5VmFsdWUiLCJleGNsdWRlVmFsdWVzIiwiZm9ybWF0dGVkUmVzcG9uc2UiLCJzdWNjZXNzIiwicmVzdWx0cyIsInZhbHVlIiwidHlwZSIsInR5cGVMb2NhbGl6ZWQiLCJmb3JFYWNoIiwiaXRlbSIsImluY2x1ZGVzIiwidGV4dCIsImxhYmVsIiwiaWQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE1BQU0sR0FBRztBQUVYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBVFcsd0JBU0VDLFVBVEYsRUFTYztBQUNyQixRQUFJO0FBQ0EsVUFBTUMsQ0FBQyxHQUFHQyxJQUFJLENBQUNDLEtBQUwsQ0FBV0gsVUFBWCxDQUFWLENBREEsQ0FHQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQSxVQUFJQyxDQUFDLElBQUksUUFBT0EsQ0FBUCxNQUFhLFFBQXRCLEVBQWdDO0FBQzVCLGVBQU9BLENBQVA7QUFDSDs7QUFDRCxhQUFPLEtBQVA7QUFDSCxLQVhELENBV0UsT0FBT0csQ0FBUCxFQUFVO0FBQ1IsYUFBTyxLQUFQO0FBQ0g7QUFDSixHQXhCVTs7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QlAsVUFBQUEsSUFBSSxFQUFFRyxJQUFJLENBQUNILElBQUwsSUFBYSxFQUhRO0FBSTNCQyxVQUFBQSxhQUFhLEVBQUVFLElBQUksQ0FBQ0YsYUFBTCxJQUFzQkUsSUFBSSxDQUFDSCxJQUEzQixJQUFtQztBQUp2QixTQUEvQjtBQU1ILE9BWkQ7QUFhSDs7QUFFRCxXQUFPSixpQkFBUDtBQUNIO0FBdldVLENBQWYiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxSb290VXJsLCBDb25maWcsIFJlc3VtYWJsZSAqL1xuXG4vKipcbiAqIFRoZSBQYnhBcGkgb2JqZWN0IGlzIHJlc3BvbnNpYmxlIGZvciBjb252ZXJzYXRpb24gd2l0aCBiYWNrZW5kIGNvcmUgQVBJXG4gKlxuICogQG1vZHVsZSBQYnhBcGkgXG4gKi9cbmNvbnN0IFBieEFwaSA9IHtcblxuICAgIC8qKlxuICAgICAqIFRyaWVzIHRvIHBhcnNlIGEgSlNPTiBzdHJpbmcuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ganNvblN0cmluZyAtIFRoZSBKU09OIHN0cmluZyB0byBiZSBwYXJzZWQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58YW55fSAtIFJldHVybnMgdGhlIHBhcnNlZCBKU09OIG9iamVjdCBpZiBwYXJzaW5nIGlzIHN1Y2Nlc3NmdWwgYW5kIHRoZSByZXN1bHQgaXMgYW4gb2JqZWN0LlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICBPdGhlcndpc2UsIHJldHVybnMgYGZhbHNlYC5cbiAgICAgKi9cbiAgICB0cnlQYXJzZUpTT04oanNvblN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbyA9IEpTT04ucGFyc2UoanNvblN0cmluZyk7XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSBub24tZXhjZXB0aW9uLXRocm93aW5nIGNhc2VzOlxuICAgICAgICAgICAgLy8gTmVpdGhlciBKU09OLnBhcnNlKGZhbHNlKSBvciBKU09OLnBhcnNlKDEyMzQpIHRocm93IGVycm9ycywgaGVuY2UgdGhlIHR5cGUtY2hlY2tpbmcsXG4gICAgICAgICAgICAvLyBidXQuLi4gSlNPTi5wYXJzZShudWxsKSByZXR1cm5zIG51bGwsIGFuZCB0eXBlb2YgbnVsbCA9PT0gXCJvYmplY3RcIixcbiAgICAgICAgICAgIC8vIHNvIHdlIG11c3QgY2hlY2sgZm9yIHRoYXQsIHRvby4gVGhhbmtmdWxseSwgbnVsbCBpcyBmYWxzZXksIHNvIHRoaXMgc3VmZmljZXM6XG4gICAgICAgICAgICBpZiAobyAmJiB0eXBlb2YgbyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB0aGUgc3VjY2VzcyByZXNwb25zZSBmcm9tIHRoZSBiYWNrZW5kLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCB0byBiZSBjaGVja2VkIGZvciBzdWNjZXNzLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFJldHVybnMgYHRydWVgIGlmIHRoZSByZXNwb25zZSBpcyBkZWZpbmVkLCBoYXMgbm9uLWVtcHR5IGtleXMsIGFuZCB0aGUgJ3Jlc3VsdCcgcHJvcGVydHkgaXMgYHRydWVgLlxuICAgICAqL1xuICAgIHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG4gICAgICAgIHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuICAgICAgICAgICAgJiYgcmVzcG9uc2UucmVzdWx0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZTtcbiAgICB9LFxuICAgICAgICAvKipcbiAgICAgKiBDb25uZWN0cyB0aGUgZmlsZSB1cGxvYWQgaGFuZGxlciBmb3IgdXBsb2FkaW5nIGZpbGVzIGluIHBhcnRzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGJ1dHRvbklkIC0gVGhlIElEIG9mIHRoZSBidXR0b24gdG8gYXNzaWduIHRoZSBmaWxlIHVwbG9hZCBmdW5jdGlvbmFsaXR5LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nW119IGZpbGVUeXBlcyAtIEFuIGFycmF5IG9mIGFsbG93ZWQgZmlsZSB0eXBlcy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgZHVyaW5nIGRpZmZlcmVudCB1cGxvYWQgZXZlbnRzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgZXZlbnQgaW5mb3JtYXRpb24gc3VjaCBhcyBwcm9ncmVzcywgc3VjY2VzcywgZXJyb3IsIGV0Yy5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKiBcbiAgICAgKiBAZGVwcmljYXRlZCBVc2UgRmlsZXNBUEkuYXR0YWNoVG9CdG4oKSBpbnN0ZWFkXG4gICAgICovXG4gICAgU3lzdGVtVXBsb2FkRmlsZUF0dGFjaFRvQnRuKGJ1dHRvbklkLCBmaWxlVHlwZXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIEZpbGVzQVBJLmF0dGFjaFRvQnRuKGJ1dHRvbklkLCBmaWxlVHlwZXMsIGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRW5hYmxlcyB1cGxvYWRpbmcgYSBmaWxlIHVzaW5nIGNodW5rIHJlc3VtYWJsZSB3b3JrZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0ZpbGV9IGZpbGUgLSBUaGUgZmlsZSB0byBiZSB1cGxvYWRlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgZHVyaW5nIGRpZmZlcmVudCB1cGxvYWQgZXZlbnRzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgZXZlbnQgaW5mb3JtYXRpb24gc3VjaCBhcyBwcm9ncmVzcywgc3VjY2VzcywgZXJyb3IsIGV0Yy5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKiBcbiAgICAgKiBAZGVwcmljYXRlZCBVc2UgRmlsZXNBUEkudXBsb2FkRmlsZSgpIGluc3RlYWRcbiAgICAgKi9cbiAgICBGaWxlc1VwbG9hZEZpbGUoZmlsZSwgY2FsbGJhY2spIHtcbiAgICAgICAgRmlsZXNBUEkudXBsb2FkRmlsZShmaWxlLCBjYWxsYmFjayk7XG4gICAgfSxcblxuICAgICAgICAvKipcbiAgICAgKiBHZXRzIHRoZSB1cGxvYWRpbmcgc3RhdHVzIG9mIGEgZmlsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlSWQgLSBUaGUgSUQgb2YgdGhlIGZpbGUgZm9yIHdoaWNoIHRoZSBzdGF0dXMgaXMgcmVxdWVzdGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqIFxuICAgICAqIEBkZXByaWNhdGVkIFVzZSBGaWxlc0FQSS5nZXRTdGF0dXNVcGxvYWRGaWxlKCkgaW5zdGVhZFxuICAgICAqL1xuICAgIEZpbGVzR2V0U3RhdHVzVXBsb2FkRmlsZShmaWxlSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIEZpbGVzQVBJLmdldFN0YXR1c1VwbG9hZEZpbGUoZmlsZUlkLCBjYWxsYmFjayk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgQVBJIGVycm9ycyB3aXRoIGNvbnNpc3RlbnQgZm9ybWF0IGFuZCBjb250ZXh0IGluZm9ybWF0aW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGV4dCAtIFRoZSBjb250ZXh0IHdoZXJlIHRoZSBlcnJvciBvY2N1cnJlZCAoZS5nLiwgJ0V4dGVuc2lvbnNBUEkuZ2V0UmVjb3JkJylcbiAgICAgKiBAcGFyYW0ge0Vycm9yfHN0cmluZ3xPYmplY3R9IGVycm9yIC0gVGhlIGVycm9yIG9iamVjdCwgc3RyaW5nLCBvciByZXNwb25zZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gLSBPcHRpb25hbCBjYWxsYmFjayB0byBjYWxsIHdpdGggZm9ybWF0dGVkIGVycm9yXG4gICAgICogQHJldHVybnMge09iamVjdH0gU3RhbmRhcmRpemVkIGVycm9yIHJlc3BvbnNlIG9iamVjdFxuICAgICAqL1xuICAgIGhhbmRsZUFwaUVycm9yKGNvbnRleHQsIGVycm9yLCBjYWxsYmFjaykge1xuICAgICAgICBsZXQgZXJyb3JNZXNzYWdlID0gJ1Vua25vd24gZXJyb3Igb2NjdXJyZWQnO1xuICAgICAgICBsZXQgZXJyb3JEZXRhaWxzID0ge307XG5cbiAgICAgICAgLy8gRXh0cmFjdCBlcnJvciBtZXNzYWdlIGZyb20gZGlmZmVyZW50IGVycm9yIHR5cGVzXG4gICAgICAgIGlmICh0eXBlb2YgZXJyb3IgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSBlcnJvcjtcbiAgICAgICAgfSBlbHNlIGlmIChlcnJvciAmJiBlcnJvci5tZXNzYWdlKSB7XG4gICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlO1xuICAgICAgICB9IGVsc2UgaWYgKGVycm9yICYmIGVycm9yLm1lc3NhZ2VzICYmIGVycm9yLm1lc3NhZ2VzLmVycm9yKSB7XG4gICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSBBcnJheS5pc0FycmF5KGVycm9yLm1lc3NhZ2VzLmVycm9yKVxuICAgICAgICAgICAgICAgID8gZXJyb3IubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKVxuICAgICAgICAgICAgICAgIDogZXJyb3IubWVzc2FnZXMuZXJyb3I7XG4gICAgICAgICAgICBlcnJvckRldGFpbHMgPSBlcnJvci5tZXNzYWdlcztcbiAgICAgICAgfSBlbHNlIGlmIChlcnJvciAmJiBlcnJvci5yZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSAnQVBJIHJlcXVlc3QgZmFpbGVkJztcbiAgICAgICAgICAgIGVycm9yRGV0YWlscyA9IGVycm9yO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSB7XG4gICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgbWVzc2FnZXM6IHtcbiAgICAgICAgICAgICAgICBlcnJvcjogW2Ake2NvbnRleHR9OiAke2Vycm9yTWVzc2FnZX1gXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbnRleHQ6IGNvbnRleHQsXG4gICAgICAgICAgICBvcmlnaW5hbEVycm9yOiBlcnJvckRldGFpbHMsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIENhbGwgY2FsbGJhY2sgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9nIGVycm9yIGZvciBkZWJ1Z2dpbmcgaW4gZGV2ZWxvcG1lbnRcbiAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlLmVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBbUGJ4QVBJXSAke2NvbnRleHR9OmAsIGVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTm9ybWFsaXplcyBjYWxsYmFjayBwYXJhbWV0ZXJzIGZvciBvdmVybG9hZGVkIGZ1bmN0aW9uc1xuICAgICAqIEhhbmRsZXMgY29tbW9uIHBhdHRlcm5zIGxpa2UgKGNhbGxiYWNrKSBhbmQgKGRhdGEsIGNhbGxiYWNrKVxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbnxPYmplY3R9IGFyZzEgLSBGaXJzdCBhcmd1bWVudCAoY2FsbGJhY2sgb3IgZGF0YSlcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbYXJnMl0gLSBTZWNvbmQgYXJndW1lbnQgKGNhbGxiYWNrIHdoZW4gZmlyc3QgaXMgZGF0YSlcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCBub3JtYWxpemVkIGRhdGEgYW5kIGNhbGxiYWNrXG4gICAgICovXG4gICAgbm9ybWFsaXplQ2FsbGJhY2tQYXJhbXMoYXJnMSwgYXJnMikge1xuICAgICAgICBsZXQgZGF0YSA9IHt9O1xuICAgICAgICBsZXQgY2FsbGJhY2s7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBhcmcxID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAvLyBQYXR0ZXJuOiAoY2FsbGJhY2spXG4gICAgICAgICAgICBjYWxsYmFjayA9IGFyZzE7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGFyZzEgPT09ICdvYmplY3QnICYmIGFyZzEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIFBhdHRlcm46IChkYXRhLCBjYWxsYmFjaylcbiAgICAgICAgICAgIGRhdGEgPSBhcmcxO1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBhcmcyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUGF0dGVybjogKGRhdGEsIGNhbGxiYWNrKSB3aGVyZSBkYXRhIGlzIG5vdCBvYmplY3RcbiAgICAgICAgICAgIGRhdGEgPSBhcmcxIHx8IHt9O1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBhcmcyO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHsgZGF0YSwgY2FsbGJhY2sgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhbmRhcmQgaW1wbGVtZW50YXRpb24gZm9yIGdldFJlY29yZCBtZXRob2RzIGFjcm9zcyBBUEkgbW9kdWxlc1xuICAgICAqIEhhbmRsZXMgdGhlIGNvbW1vbiBwYXR0ZXJuIG9mIEdFVCBieSBJRCBvciBnZXREZWZhdWx0IGZvciBuZXcgcmVjb3Jkc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGFwaUluc3RhbmNlIC0gVGhlIEFQSSBjbGllbnQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBSZWNvcmQgSUQgb3IgZW1wdHkvbnVsbCBmb3IgbmV3IHJlY29yZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFt1c2VEZWZhdWx0PXRydWVdIC0gV2hldGhlciB0byB1c2UgOmdldERlZmF1bHQgZm9yIG5ldyByZWNvcmRzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtkZWZhdWx0TWV0aG9kPSdnZXREZWZhdWx0J10gLSBOYW1lIG9mIHRoZSBkZWZhdWx0IG1ldGhvZCB0byB1c2VcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBzdGFuZGFyZEdldFJlY29yZChhcGlJbnN0YW5jZSwgcmVjb3JkSWQsIGNhbGxiYWNrLCB1c2VEZWZhdWx0ID0gdHJ1ZSwgZGVmYXVsdE1ldGhvZCA9ICdnZXREZWZhdWx0Jykge1xuICAgICAgICBjb25zdCBpc05ldyA9ICFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJycgfHwgcmVjb3JkSWQgPT09ICduZXcnO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoaXNOZXcgJiYgdXNlRGVmYXVsdCAmJiBhcGlJbnN0YW5jZS5jdXN0b21NZXRob2RzICYmIGFwaUluc3RhbmNlLmN1c3RvbU1ldGhvZHNbZGVmYXVsdE1ldGhvZF0pIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgY3VzdG9tIG1ldGhvZCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgICAgICBhcGlJbnN0YW5jZS5jYWxsQ3VzdG9tTWV0aG9kKGRlZmF1bHRNZXRob2QsIHt9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IF9pc05ldyBmbGFnIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFpc05ldykge1xuICAgICAgICAgICAgICAgIC8vIEdldCBleGlzdGluZyByZWNvcmQgYnkgSURcbiAgICAgICAgICAgICAgICBhcGlJbnN0YW5jZS5jYWxsR2V0KHt9LCBjYWxsYmFjaywgcmVjb3JkSWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjazogcmV0dXJuIGVtcHR5IHN0cnVjdHVyZSBmb3IgbmV3IHJlY29yZFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IF9pc05ldzogdHJ1ZSB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZUFwaUVycm9yKGAke2FwaUluc3RhbmNlLmNvbnN0cnVjdG9yLm5hbWUgfHwgJ0FQSSd9LmdldFJlY29yZGAsIGVycm9yLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGVzIEFQSSBwYXJhbWV0ZXJzIGFnYWluc3QgYSBzaW1wbGUgc2NoZW1hXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gUGFyYW1ldGVycyB0byB2YWxpZGF0ZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzY2hlbWEgLSBWYWxpZGF0aW9uIHNjaGVtYVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzY2hlbWEucmVxdWlyZWQgLSBBcnJheSBvZiByZXF1aXJlZCBwYXJhbWV0ZXIgbmFtZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2NoZW1hLm9wdGlvbmFsIC0gQXJyYXkgb2Ygb3B0aW9uYWwgcGFyYW1ldGVyIG5hbWVzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNjaGVtYS50eXBlcyAtIE9iamVjdCBtYXBwaW5nIHBhcmFtZXRlciBuYW1lcyB0byBleHBlY3RlZCB0eXBlc1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFZhbGlkYXRpb24gcmVzdWx0IHdpdGggaXNWYWxpZCBib29sZWFuIGFuZCBlcnJvcnMgYXJyYXlcbiAgICAgKi9cbiAgICB2YWxpZGF0ZUFwaVBhcmFtcyhwYXJhbXMsIHNjaGVtYSkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgICAgICBpc1ZhbGlkOiB0cnVlLFxuICAgICAgICAgICAgZXJyb3JzOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIENoZWNrIHJlcXVpcmVkIHBhcmFtZXRlcnNcbiAgICAgICAgaWYgKHNjaGVtYS5yZXF1aXJlZCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBwYXJhbSBvZiBzY2hlbWEucmVxdWlyZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zW3BhcmFtXSA9PT0gdW5kZWZpbmVkIHx8IHBhcmFtc1twYXJhbV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmlzVmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmVycm9ycy5wdXNoKGBSZXF1aXJlZCBwYXJhbWV0ZXIgJyR7cGFyYW19JyBpcyBtaXNzaW5nYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgcGFyYW1ldGVyIHR5cGVzXG4gICAgICAgIGlmIChzY2hlbWEudHlwZXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW3BhcmFtLCBleHBlY3RlZFR5cGVdIG9mIE9iamVjdC5lbnRyaWVzKHNjaGVtYS50eXBlcykpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zW3BhcmFtXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFjdHVhbFR5cGUgPSB0eXBlb2YgcGFyYW1zW3BhcmFtXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjdHVhbFR5cGUgIT09IGV4cGVjdGVkVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmlzVmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5lcnJvcnMucHVzaChgUGFyYW1ldGVyICcke3BhcmFtfScgc2hvdWxkIGJlICR7ZXhwZWN0ZWRUeXBlfSwgZ290ICR7YWN0dWFsVHlwZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4dGVuZHMgYW4gQVBJIGNsaWVudCBpbnN0YW5jZSB3aXRoIGFkZGl0aW9uYWwgbWV0aG9kcyB1c2luZyBhIGNvbnNpc3RlbnQgcGF0dGVyblxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGFwaUluc3RhbmNlIC0gVGhlIFBieEFwaUNsaWVudCBpbnN0YW5jZSB0byBleHRlbmRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gbWV0aG9kcyAtIE9iamVjdCBjb250YWluaW5nIG1ldGhvZHMgdG8gYWRkIHRvIHRoZSBBUElcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIC0gRXh0ZW5zaW9uIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnByZXNlcnZlQ29udGV4dD10cnVlXSAtIFdoZXRoZXIgdG8gcHJlc2VydmUgJ3RoaXMnIGNvbnRleHRcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZXh0ZW5kZWQgQVBJIGluc3RhbmNlXG4gICAgICovXG4gICAgZXh0ZW5kQXBpQ2xpZW50KGFwaUluc3RhbmNlLCBtZXRob2RzLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHtcbiAgICAgICAgICAgIHByZXNlcnZlQ29udGV4dDogdHJ1ZSxcbiAgICAgICAgICAgIC4uLm9wdGlvbnNcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBWYWxpZGF0ZSBpbnB1dFxuICAgICAgICBpZiAoIWFwaUluc3RhbmNlIHx8IHR5cGVvZiBhcGlJbnN0YW5jZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQVBJIGluc3RhbmNlIG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW1ldGhvZHMgfHwgdHlwZW9mIG1ldGhvZHMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZHMgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBtZXRob2RzIHRvIHRoZSBBUEkgaW5zdGFuY2VcbiAgICAgICAgZm9yIChjb25zdCBbbWV0aG9kTmFtZSwgbWV0aG9kRnVuY10gb2YgT2JqZWN0LmVudHJpZXMobWV0aG9kcykpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWV0aG9kRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGlmIChvcHRzLnByZXNlcnZlQ29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBCaW5kIHRoZSBmdW5jdGlvbiB0byB0aGUgQVBJIGluc3RhbmNlIHRvIHByZXNlcnZlICd0aGlzJyBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgIGFwaUluc3RhbmNlW21ldGhvZE5hbWVdID0gbWV0aG9kRnVuYy5iaW5kKGFwaUluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcGlJbnN0YW5jZVttZXRob2ROYW1lXSA9IG1ldGhvZEZ1bmM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFtQYnhBUEldIFNraXBwaW5nIG5vbi1mdW5jdGlvbiBwcm9wZXJ0eSAnJHttZXRob2ROYW1lfScgZHVyaW5nIEFQSSBleHRlbnNpb25gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhcGlJbnN0YW5jZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGRlYm91bmNlZCB2ZXJzaW9uIG9mIGEgZnVuY3Rpb25cbiAgICAgKiBVc2VmdWwgZm9yIEFQSSBjYWxscyB0aGF0IHNob3VsZCBiZSBkZWxheWVkIHVudGlsIGFmdGVyIGEgcGVyaW9kIG9mIGluYWN0aXZpdHlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGZ1bmMgLSBGdW5jdGlvbiB0byBkZWJvdW5jZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB3YWl0IC0gVGltZSB0byB3YWl0IGluIG1pbGxpc2Vjb25kc1xuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2ltbWVkaWF0ZT1mYWxzZV0gLSBXaGV0aGVyIHRvIGNhbGwgZnVuY3Rpb24gaW1tZWRpYXRlbHkgb24gZmlyc3QgY2FsbFxuICAgICAqIEByZXR1cm5zIHtmdW5jdGlvbn0gRGVib3VuY2VkIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZGVib3VuY2UoZnVuYywgd2FpdCwgaW1tZWRpYXRlID0gZmFsc2UpIHtcbiAgICAgICAgbGV0IHRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBleGVjdXRlZEZ1bmN0aW9uKC4uLmFyZ3MpIHtcbiAgICAgICAgICAgIGNvbnN0IGxhdGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmICghaW1tZWRpYXRlKSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnN0IGNhbGxOb3cgPSBpbW1lZGlhdGUgJiYgIXRpbWVvdXQ7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCk7XG4gICAgICAgICAgICBpZiAoY2FsbE5vdykgZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0cyBkcm9wZG93biByZXN1bHRzIHdpdGggY29uc2lzdGVudCBzdHJ1Y3R1cmVcbiAgICAgKiBVc2VkIGJ5IG11bHRpcGxlIEFQSSBtb2R1bGVzIGZvciBkcm9wZG93biBkYXRhIGZvcm1hdHRpbmdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZSBjb250YWluaW5nIGRhdGEgYXJyYXlcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIC0gRm9ybWF0dGluZyBvcHRpb25zXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5hZGRFbXB0eT1mYWxzZV0gLSBXaGV0aGVyIHRvIGFkZCBlbXB0eSBvcHRpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMuZW1wdHlUZXh0PSctJ10gLSBUZXh0IGZvciBlbXB0eSBvcHRpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMuZW1wdHlWYWx1ZT0tMV0gLSBWYWx1ZSBmb3IgZW1wdHkgb3B0aW9uXG4gICAgICogQHBhcmFtIHtBcnJheX0gW29wdGlvbnMuZXhjbHVkZVZhbHVlcz1bXV0gLSBWYWx1ZXMgdG8gZXhjbHVkZSBmcm9tIHJlc3VsdHNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBGb3JtYXR0ZWQgZHJvcGRvd24gcmVzcG9uc2VcbiAgICAgKi9cbiAgICBmb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCBvcHRzID0ge1xuICAgICAgICAgICAgYWRkRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgZW1wdHlUZXh0OiAnLScsXG4gICAgICAgICAgICBlbXB0eVZhbHVlOiAtMSxcbiAgICAgICAgICAgIGV4Y2x1ZGVWYWx1ZXM6IFtdLFxuICAgICAgICAgICAgLi4ub3B0aW9uc1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0ge1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICByZXN1bHRzOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFkZCBlbXB0eSBvcHRpb24gaWYgcmVxdWVzdGVkXG4gICAgICAgIGlmIChvcHRzLmFkZEVtcHR5KSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6IG9wdHMuZW1wdHlUZXh0LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBvcHRzLmVtcHR5VmFsdWUsXG4gICAgICAgICAgICAgICAgdHlwZTogJycsXG4gICAgICAgICAgICAgICAgdHlwZUxvY2FsaXplZDogJydcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5zdWNjZXNzID0gdHJ1ZTtcblxuICAgICAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGl0ZW0gaW4gdGhlIHJlc3BvbnNlIGRhdGFcbiAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNraXAgZXhjbHVkZWQgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKG9wdHMuZXhjbHVkZVZhbHVlcy5pbmNsdWRlcyhpdGVtLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lIHx8IGl0ZW0udGV4dCB8fCBpdGVtLmxhYmVsIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSB8fCBpdGVtLmlkIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBpdGVtLnR5cGUgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6IGl0ZW0udHlwZUxvY2FsaXplZCB8fCBpdGVtLnR5cGUgfHwgJydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFJlc3BvbnNlO1xuICAgIH1cbn0iXX0=