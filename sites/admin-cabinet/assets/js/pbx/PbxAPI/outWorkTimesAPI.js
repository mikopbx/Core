"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global Config, SecurityUtils, PbxApi */

/**
 * OutWorkTimesAPI - REST API for out-of-work-times management with enhanced security
 * 
 * Provides centralized API methods with built-in security features:
 * - Input sanitization for display
 * - XSS protection
 * - Consistent error handling
 * - CSRF protection through session cookies
 */
var OutWorkTimesAPI = {
  /**
   * API endpoints configuration
   */
  endpoints: {
    getList: '/pbxcore/api/v2/out-work-times/getList',
    getRecord: '/pbxcore/api/v2/out-work-times/getRecord',
    saveRecord: '/pbxcore/api/v2/out-work-times/saveRecord',
    deleteRecord: '/pbxcore/api/v2/out-work-times/deleteRecord',
    changePriority: '/pbxcore/api/v2/out-work-times/changePriority'
  },

  /**
   * Get record by ID with security processing
   * 
   * @param {string} id - Record ID or empty string for new
   * @param {function} callback - Callback function
   */
  getRecord: function getRecord(id, callback) {
    var _this = this;

    var recordId = !id || id === '' ? 'new' : id;
    $.api({
      url: this.endpoints.getRecord + '/' + recordId,
      method: 'GET',
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.result && response.data) {
          // Sanitize data for display
          response.data = _this.sanitizeTimeConditionData(response.data);
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
            error: ['Network error']
          }
        });
      }
    });
  },

  /**
   * Get list of all records with security processing
   * 
   * @param {function} callback - Callback function
   */
  getList: function getList(callback) {
    var _this2 = this;

    $.api({
      url: this.endpoints.getList,
      method: 'GET',
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.result && response.data) {
          // Sanitize array of time conditions
          response.data = response.data.map(function (item) {
            return this.sanitizeTimeConditionData(item);
          }.bind(_this2));
        }

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
  },

  /**
   * Save record with validation and security
   * 
   * @param {object} data - Data to save
   * @param {function} callback - Callback function
   */
  saveRecord: function saveRecord(data, callback) {
    var _this3 = this;

    // Client-side validation
    if (!this.validateTimeConditionData(data)) {
      callback({
        result: false,
        messages: {
          error: ['Client-side validation failed']
        }
      });
      return;
    }

    var method = data.id ? 'PUT' : 'POST';
    var url = data.id ? this.endpoints.saveRecord + '/' + data.id : this.endpoints.saveRecord;
    $.api({
      url: url,
      method: method,
      data: data,
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.result && response.data) {
          response.data = _this3.sanitizeTimeConditionData(response.data);
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
            error: ['Network error']
          }
        });
      }
    });
  },

  /**
   * Delete record
   * 
   * @param {string} id - Record ID
   * @param {function} callback - Callback function
   */
  deleteRecord: function deleteRecord(id, callback) {
    $.api({
      url: this.endpoints.deleteRecord + '/' + id,
      on: 'now',
      method: 'DELETE',
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
  },

  /**
   * Change priority for multiple records
   * 
   * @param {object} priorityData - Object with record IDs as keys and priorities as values
   * @param {function} callback - Callback function
   */
  changePriority: function changePriority(priorityData, callback) {
    $.api({
      url: this.endpoints.changePriority,
      method: 'POST',
      data: {
        priorities: priorityData
      },
      on: 'now',
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false
        });
      }
    });
  },

  /**
   * Sanitize time condition data for safe display
   * 
   * @param {object} data - Raw time condition data
   * @returns {object} Sanitized data
   */
  sanitizeTimeConditionData: function sanitizeTimeConditionData(data) {
    if (!data) return data; // Create a copy to avoid modifying original

    var sanitized = _objectSpread({}, data); // Sanitize text fields for XSS protection


    var textFields = ['description', 'calTypeDisplay'];
    textFields.forEach(function (field) {
      if (sanitized[field] && typeof sanitized[field] === 'string') {
        sanitized[field] = SecurityUtils.escapeHtml(sanitized[field]);
      }
    }); // Sanitize nested objects

    if (sanitized.routing && _typeof(sanitized.routing) === 'object') {
      ['failover', 'audioMessage'].forEach(function (field) {
        if (sanitized.routing[field] && typeof sanitized.routing[field] === 'string') {
          sanitized.routing[field] = SecurityUtils.escapeHtml(sanitized.routing[field]);
        }
      });
    } // Sanitize incoming routes array


    if (Array.isArray(sanitized.incomingRoutes)) {
      sanitized.incomingRoutes = sanitized.incomingRoutes.map(function (route) {
        var sanitizedRoute = _objectSpread({}, route);

        ['rulename', 'number', 'provider'].forEach(function (field) {
          if (sanitizedRoute[field] && typeof sanitizedRoute[field] === 'string') {
            sanitizedRoute[field] = SecurityUtils.escapeHtml(sanitizedRoute[field]);
          }
        });
        return sanitizedRoute;
      });
    }

    return sanitized;
  },

  /**
   * Validate time condition data before sending
   * 
   * @param {object} data - Data to validate
   * @returns {boolean} True if valid
   */
  validateTimeConditionData: function validateTimeConditionData(data) {
    // No required fields - description is optional
    // calType can be empty string (which means 'timeframe') or have a value
    // Empty string is valid for 'timeframe' type
    if (data.calType === undefined || data.calType === null) {
      console.warn('Calendar type is required');
      return false;
    } // Validate calendar-specific fields only if calType is not empty (not 'timeframe')


    if (data.calType && data.calType !== '') {
      switch (data.calType) {
        case 'date':
          if (!data.date_from || !data.date_to) {
            console.warn('Date range is required for date type');
            return false;
          }

          break;

        case 'weekday':
          if (!data.weekday_from || !data.weekday_to) {
            console.warn('Weekday range is required for weekday type');
            return false;
          }

          break;

        case 'time':
          if (!data.time_from || !data.time_to) {
            console.warn('Time range is required for time type');
            return false;
          }

          break;
      }
    }

    return true;
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvb3V0V29ya1RpbWVzQVBJLmpzIl0sIm5hbWVzIjpbIk91dFdvcmtUaW1lc0FQSSIsImVuZHBvaW50cyIsImdldExpc3QiLCJnZXRSZWNvcmQiLCJzYXZlUmVjb3JkIiwiZGVsZXRlUmVjb3JkIiwiY2hhbmdlUHJpb3JpdHkiLCJpZCIsImNhbGxiYWNrIiwicmVjb3JkSWQiLCIkIiwiYXBpIiwidXJsIiwibWV0aG9kIiwib24iLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJzYW5pdGl6ZVRpbWVDb25kaXRpb25EYXRhIiwib25GYWlsdXJlIiwib25FcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJtYXAiLCJpdGVtIiwiYmluZCIsInZhbGlkYXRlVGltZUNvbmRpdGlvbkRhdGEiLCJzdWNjZXNzVGVzdCIsIlBieEFwaSIsInByaW9yaXR5RGF0YSIsInByaW9yaXRpZXMiLCJzYW5pdGl6ZWQiLCJ0ZXh0RmllbGRzIiwiZm9yRWFjaCIsImZpZWxkIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJyb3V0aW5nIiwiQXJyYXkiLCJpc0FycmF5IiwiaW5jb21pbmdSb3V0ZXMiLCJyb3V0ZSIsInNhbml0aXplZFJvdXRlIiwiY2FsVHlwZSIsInVuZGVmaW5lZCIsImNvbnNvbGUiLCJ3YXJuIiwiZGF0ZV9mcm9tIiwiZGF0ZV90byIsIndlZWtkYXlfZnJvbSIsIndlZWtkYXlfdG8iLCJ0aW1lX2Zyb20iLCJ0aW1lX3RvIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsZUFBZSxHQUFHO0FBQ3BCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUU7QUFDUEMsSUFBQUEsT0FBTyxFQUFFLHdDQURGO0FBRVBDLElBQUFBLFNBQVMsRUFBRSwwQ0FGSjtBQUdQ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QUksQ0FBQzBCLE9BQUwsS0FBaUIsSUFBbkQsRUFBeUQ7QUFDckRFLE1BQUFBLE9BQU8sQ0FBQ0MsSUFBUixDQUFhLDJCQUFiO0FBQ0EsYUFBTyxLQUFQO0FBQ0gsS0FScUMsQ0FVdEM7OztBQUNBLFFBQUk3QixJQUFJLENBQUMwQixPQUFMLElBQWdCMUIsSUFBSSxDQUFDMEIsT0FBTCxLQUFpQixFQUFyQyxFQUF5QztBQUNyQyxjQUFPMUIsSUFBSSxDQUFDMEIsT0FBWjtBQUNJLGFBQUssTUFBTDtBQUNJLGNBQUksQ0FBQzFCLElBQUksQ0FBQzhCLFNBQU4sSUFBbUIsQ0FBQzlCLElBQUksQ0FBQytCLE9BQTdCLEVBQXNDO0FBQ2xDSCxZQUFBQSxPQUFPLENBQUNDLElBQVIsQ0FBYSxzQ0FBYjtBQUNBLG1CQUFPLEtBQVA7QUFDSDs7QUFDRDs7QUFDSixhQUFLLFNBQUw7QUFDSSxjQUFJLENBQUM3QixJQUFJLENBQUNnQyxZQUFOLElBQXNCLENBQUNoQyxJQUFJLENBQUNpQyxVQUFoQyxFQUE0QztBQUN4Q0wsWUFBQUEsT0FBTyxDQUFDQyxJQUFSLENBQWEsNENBQWI7QUFDQSxtQkFBTyxLQUFQO0FBQ0g7O0FBQ0Q7O0FBQ0osYUFBSyxNQUFMO0FBQ0ksY0FBSSxDQUFDN0IsSUFBSSxDQUFDa0MsU0FBTixJQUFtQixDQUFDbEMsSUFBSSxDQUFDbUMsT0FBN0IsRUFBc0M7QUFDbENQLFlBQUFBLE9BQU8sQ0FBQ0MsSUFBUixDQUFhLHNDQUFiO0FBQ0EsbUJBQU8sS0FBUDtBQUNIOztBQUNEO0FBbEJSO0FBb0JIOztBQUVELFdBQU8sSUFBUDtBQUNIO0FBcFBtQixDQUF4QiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBTZWN1cml0eVV0aWxzLCBQYnhBcGkgKi9cblxuLyoqXG4gKiBPdXRXb3JrVGltZXNBUEkgLSBSRVNUIEFQSSBmb3Igb3V0LW9mLXdvcmstdGltZXMgbWFuYWdlbWVudCB3aXRoIGVuaGFuY2VkIHNlY3VyaXR5XG4gKiBcbiAqIFByb3ZpZGVzIGNlbnRyYWxpemVkIEFQSSBtZXRob2RzIHdpdGggYnVpbHQtaW4gc2VjdXJpdHkgZmVhdHVyZXM6XG4gKiAtIElucHV0IHNhbml0aXphdGlvbiBmb3IgZGlzcGxheVxuICogLSBYU1MgcHJvdGVjdGlvblxuICogLSBDb25zaXN0ZW50IGVycm9yIGhhbmRsaW5nXG4gKiAtIENTUkYgcHJvdGVjdGlvbiB0aHJvdWdoIHNlc3Npb24gY29va2llc1xuICovXG5jb25zdCBPdXRXb3JrVGltZXNBUEkgPSB7XG4gICAgLyoqXG4gICAgICogQVBJIGVuZHBvaW50cyBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgZW5kcG9pbnRzOiB7XG4gICAgICAgIGdldExpc3Q6ICcvcGJ4Y29yZS9hcGkvdjIvb3V0LXdvcmstdGltZXMvZ2V0TGlzdCcsXG4gICAgICAgIGdldFJlY29yZDogJy9wYnhjb3JlL2FwaS92Mi9vdXQtd29yay10aW1lcy9nZXRSZWNvcmQnLFxuICAgICAgICBzYXZlUmVjb3JkOiAnL3BieGNvcmUvYXBpL3YyL291dC13b3JrLXRpbWVzL3NhdmVSZWNvcmQnLFxuICAgICAgICBkZWxldGVSZWNvcmQ6ICcvcGJ4Y29yZS9hcGkvdjIvb3V0LXdvcmstdGltZXMvZGVsZXRlUmVjb3JkJyxcbiAgICAgICAgY2hhbmdlUHJpb3JpdHk6ICcvcGJ4Y29yZS9hcGkvdjIvb3V0LXdvcmstdGltZXMvY2hhbmdlUHJpb3JpdHknXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIGJ5IElEIHdpdGggc2VjdXJpdHkgcHJvY2Vzc2luZ1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ld1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRSZWNvcmQ6IGZ1bmN0aW9uKGlkLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9ICghaWQgfHwgaWQgPT09ICcnKSA/ICduZXcnIDogaWQ7XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLmdldFJlY29yZCArICcvJyArIHJlY29yZElkLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNhbml0aXplIGRhdGEgZm9yIGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9IHRoaXMuc2FuaXRpemVUaW1lQ29uZGl0aW9uRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yJ119fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGxpc3Qgb2YgYWxsIHJlY29yZHMgd2l0aCBzZWN1cml0eSBwcm9jZXNzaW5nXG4gICAgICogXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldExpc3Q6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMuZ2V0TGlzdCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTYW5pdGl6ZSBhcnJheSBvZiB0aW1lIGNvbmRpdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9IHJlc3BvbnNlLmRhdGEubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNhbml0aXplVGltZUNvbmRpdGlvbkRhdGEoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IFtdfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2F2ZSByZWNvcmQgd2l0aCB2YWxpZGF0aW9uIGFuZCBzZWN1cml0eVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzYXZlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIHNhdmVSZWNvcmQ6IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIENsaWVudC1zaWRlIHZhbGlkYXRpb25cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkYXRlVGltZUNvbmRpdGlvbkRhdGEoZGF0YSkpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ0NsaWVudC1zaWRlIHZhbGlkYXRpb24gZmFpbGVkJ119XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgbWV0aG9kID0gZGF0YS5pZCA/ICdQVVQnIDogJ1BPU1QnO1xuICAgICAgICBjb25zdCB1cmwgPSBkYXRhLmlkID8gXG4gICAgICAgICAgICB0aGlzLmVuZHBvaW50cy5zYXZlUmVjb3JkICsgJy8nICsgZGF0YS5pZCA6IFxuICAgICAgICAgICAgdGhpcy5lbmRwb2ludHMuc2F2ZVJlY29yZDtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9IHRoaXMuc2FuaXRpemVUaW1lQ29uZGl0aW9uRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yJ119fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJlY29yZFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlY29yZCBJRFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQ6IGZ1bmN0aW9uKGlkLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLmRlbGV0ZVJlY29yZCArICcvJyArIGlkLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoYW5nZSBwcmlvcml0eSBmb3IgbXVsdGlwbGUgcmVjb3Jkc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwcmlvcml0eURhdGEgLSBPYmplY3Qgd2l0aCByZWNvcmQgSURzIGFzIGtleXMgYW5kIHByaW9yaXRpZXMgYXMgdmFsdWVzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGNoYW5nZVByaW9yaXR5OiBmdW5jdGlvbihwcmlvcml0eURhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMuY2hhbmdlUHJpb3JpdHksXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtwcmlvcml0aWVzOiBwcmlvcml0eURhdGF9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2FuaXRpemUgdGltZSBjb25kaXRpb24gZGF0YSBmb3Igc2FmZSBkaXNwbGF5XG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBSYXcgdGltZSBjb25kaXRpb24gZGF0YVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFNhbml0aXplZCBkYXRhXG4gICAgICovXG4gICAgc2FuaXRpemVUaW1lQ29uZGl0aW9uRGF0YTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEpIHJldHVybiBkYXRhO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGEgY29weSB0byBhdm9pZCBtb2RpZnlpbmcgb3JpZ2luYWxcbiAgICAgICAgY29uc3Qgc2FuaXRpemVkID0gey4uLmRhdGF9O1xuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgdGV4dCBmaWVsZHMgZm9yIFhTUyBwcm90ZWN0aW9uXG4gICAgICAgIGNvbnN0IHRleHRGaWVsZHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2NhbFR5cGVEaXNwbGF5J107XG4gICAgICAgIHRleHRGaWVsZHMuZm9yRWFjaChmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICAgICAgaWYgKHNhbml0aXplZFtmaWVsZF0gJiYgdHlwZW9mIHNhbml0aXplZFtmaWVsZF0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgc2FuaXRpemVkW2ZpZWxkXSA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChzYW5pdGl6ZWRbZmllbGRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTYW5pdGl6ZSBuZXN0ZWQgb2JqZWN0c1xuICAgICAgICBpZiAoc2FuaXRpemVkLnJvdXRpbmcgJiYgdHlwZW9mIHNhbml0aXplZC5yb3V0aW5nID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgWydmYWlsb3ZlcicsICdhdWRpb01lc3NhZ2UnXS5mb3JFYWNoKGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNhbml0aXplZC5yb3V0aW5nW2ZpZWxkXSAmJiB0eXBlb2Ygc2FuaXRpemVkLnJvdXRpbmdbZmllbGRdID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBzYW5pdGl6ZWQucm91dGluZ1tmaWVsZF0gPSBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoc2FuaXRpemVkLnJvdXRpbmdbZmllbGRdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgaW5jb21pbmcgcm91dGVzIGFycmF5XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHNhbml0aXplZC5pbmNvbWluZ1JvdXRlcykpIHtcbiAgICAgICAgICAgIHNhbml0aXplZC5pbmNvbWluZ1JvdXRlcyA9IHNhbml0aXplZC5pbmNvbWluZ1JvdXRlcy5tYXAoZnVuY3Rpb24ocm91dGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzYW5pdGl6ZWRSb3V0ZSA9IHsuLi5yb3V0ZX07XG4gICAgICAgICAgICAgICAgWydydWxlbmFtZScsICdudW1iZXInLCAncHJvdmlkZXInXS5mb3JFYWNoKGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzYW5pdGl6ZWRSb3V0ZVtmaWVsZF0gJiYgdHlwZW9mIHNhbml0aXplZFJvdXRlW2ZpZWxkXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhbml0aXplZFJvdXRlW2ZpZWxkXSA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChzYW5pdGl6ZWRSb3V0ZVtmaWVsZF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNhbml0aXplZFJvdXRlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBzYW5pdGl6ZWQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZSB0aW1lIGNvbmRpdGlvbiBkYXRhIGJlZm9yZSBzZW5kaW5nXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHZhbGlkYXRlXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsaWRcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVRpbWVDb25kaXRpb25EYXRhOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIC8vIE5vIHJlcXVpcmVkIGZpZWxkcyAtIGRlc2NyaXB0aW9uIGlzIG9wdGlvbmFsXG4gICAgICAgIFxuICAgICAgICAvLyBjYWxUeXBlIGNhbiBiZSBlbXB0eSBzdHJpbmcgKHdoaWNoIG1lYW5zICd0aW1lZnJhbWUnKSBvciBoYXZlIGEgdmFsdWVcbiAgICAgICAgLy8gRW1wdHkgc3RyaW5nIGlzIHZhbGlkIGZvciAndGltZWZyYW1lJyB0eXBlXG4gICAgICAgIGlmIChkYXRhLmNhbFR5cGUgPT09IHVuZGVmaW5lZCB8fCBkYXRhLmNhbFR5cGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignQ2FsZW5kYXIgdHlwZSBpcyByZXF1aXJlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGF0ZSBjYWxlbmRhci1zcGVjaWZpYyBmaWVsZHMgb25seSBpZiBjYWxUeXBlIGlzIG5vdCBlbXB0eSAobm90ICd0aW1lZnJhbWUnKVxuICAgICAgICBpZiAoZGF0YS5jYWxUeXBlICYmIGRhdGEuY2FsVHlwZSAhPT0gJycpIHtcbiAgICAgICAgICAgIHN3aXRjaChkYXRhLmNhbFR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdkYXRlJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLmRhdGVfZnJvbSB8fCAhZGF0YS5kYXRlX3RvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0RhdGUgcmFuZ2UgaXMgcmVxdWlyZWQgZm9yIGRhdGUgdHlwZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3dlZWtkYXknOlxuICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEud2Vla2RheV9mcm9tIHx8ICFkYXRhLndlZWtkYXlfdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignV2Vla2RheSByYW5nZSBpcyByZXF1aXJlZCBmb3Igd2Vla2RheSB0eXBlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndGltZSc6XG4gICAgICAgICAgICAgICAgICAgIGlmICghZGF0YS50aW1lX2Zyb20gfHwgIWRhdGEudGltZV90bykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdUaW1lIHJhbmdlIGlzIHJlcXVpcmVkIGZvciB0aW1lIHR5cGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufTsiXX0=