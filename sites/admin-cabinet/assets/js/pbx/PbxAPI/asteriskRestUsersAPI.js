"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

/* global globalRootUrl, sessionStorage, PbxApi */

/**
 * Asterisk REST Interface (ARI) Users API module.
 * @module AsteriskRestUsersAPI
 */
var AsteriskRestUsersAPI = {
  /**
   * Base API endpoint for ARI users (v3 RESTful).
   * @type {string}
   */
  endpoint: '/pbxcore/api/v3/asterisk-rest-users',

  /**
   * Endpoint definitions for unification with PbxDataTableIndex
   */
  endpoints: {
    getList: '/pbxcore/api/v3/asterisk-rest-users',
    getRecord: '/pbxcore/api/v3/asterisk-rest-users',
    saveRecord: '/pbxcore/api/v3/asterisk-rest-users',
    deleteRecord: '/pbxcore/api/v3/asterisk-rest-users'
  },

  /**
   * Cache key for ARI users list.
   * @type {string}
   */
  cacheKey: 'AsteriskRestUsersList',

  /**
   * Cache timeout in milliseconds (5 minutes).
   * @type {number}
   */
  cacheTimeout: 5 * 60 * 1000,

  /**
   * Get list of all ARI users.
   * Modified to work with PbxDataTableIndex base class.
   * 
   * @param {function} callback - Callback function to handle the response.
   * @param {boolean} useCache - Whether to use cached data if available (default: true).
   */
  getList: function getList(callback) {
    var _this = this;

    var useCache = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

    // Check if callback is actually params object (for backward compatibility)
    if (_typeof(callback) === 'object' && !Array.isArray(callback)) {
      // Old signature: getList(params, callback, useCache)
      var params = callback;
      var actualCallback = arguments[1];
      var actualUseCache = arguments[2] !== undefined ? arguments[2] : false;
      return this.getListWithParams(params, actualCallback, actualUseCache);
    } // New signature for PbxDataTableIndex: getList(callback, useCache)


    if (useCache) {
      var cached = this.getFromCache(this.cacheKey);

      if (cached) {
        // Convert to array format expected by PbxDataTableIndex
        var items = cached.items || cached;
        callback(items);
        return;
      }
    }

    $.api({
      url: this.endpoint,
      on: 'now',
      method: 'GET',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        // PbxDataTableIndex now handles both v2 and v3 API formats
        // Just pass the response as-is
        if (response && response.data) {
          _this.saveToCache(_this.cacheKey, response);

          callback(response);
        } else {
          callback({
            result: false,
            data: []
          });
        }
      },
      onFailure: function onFailure(response) {
        // Return empty response structure
        callback({
          result: false,
          data: []
        });
      },
      onError: function onError() {
        // Return empty response structure
        callback({
          result: false,
          data: []
        });
      }
    });
  },

  /**
   * Get list with parameters (legacy method for backward compatibility).
   * 
   * @param {object} params - Query parameters (limit, offset, search, enabled).
   * @param {function} callback - Callback function to handle the response.
   * @param {boolean} useCache - Whether to use cached data if available (default: false for filtered requests).
   */
  getListWithParams: function getListWithParams() {
    var _this2 = this;

    var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var callback = arguments.length > 1 ? arguments[1] : undefined;
    var useCache = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    // Only use cache for unfiltered requests
    if (useCache && Object.keys(params).length === 0) {
      var cached = this.getFromCache(this.cacheKey);

      if (cached) {
        callback(cached);
        return;
      }
    } // Build query string


    var queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    if (params.search) queryParams.append('search', params.search);
    if (params.enabled !== undefined) queryParams.append('enabled', params.enabled);
    var queryString = queryParams.toString();
    var url = queryString ? "".concat(this.endpoint, "?").concat(queryString) : this.endpoint;
    $.api({
      url: url,
      on: 'now',
      method: 'GET',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        if (response.data) {
          // Cache only unfiltered results
          if (Object.keys(params).length === 0) {
            _this2.saveToCache(_this2.cacheKey, response.data);
          }

          callback(response.data);
        } else {
          callback({
            items: [],
            total: 0
          });
        }
      },
      onFailure: function onFailure(response) {
        callback({
          items: [],
          total: 0
        });
      },
      onError: function onError() {
        callback({
          items: [],
          total: 0
        });
      }
    });
  },

  /**
   * Get single ARI user by ID or defaults for new record.
   * 
   * @param {string} id - User ID (empty for defaults).
   * @param {function} callback - Callback function to handle the response.
   */
  getRecord: function getRecord(id, callback) {
    // If no ID, get defaults
    if (!id) {
      this.getDefaults(callback);
      return;
    }

    $.api({
      url: "".concat(this.endpoint, "/").concat(id),
      on: 'now',
      method: 'GET',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data || false);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Get default values for new ARI user.
   * 
   * @param {function} callback - Callback function to handle the response.
   */
  getDefaults: function getDefaults(callback) {
    $.api({
      url: "".concat(this.endpoint, ":getDefaults"),
      on: 'now',
      method: 'GET',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data || false);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Create new ARI user.
   * 
   * @param {object} data - User data.
   * @param {function} callback - Callback function to handle the response.
   */
  createRecord: function createRecord(data, callback) {
    this.clearCache();
    $.api({
      url: this.endpoint,
      on: 'now',
      method: 'POST',
      data: JSON.stringify(data),
      contentType: 'application/json',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError(response) {
        callback({
          success: false,
          messages: {
            error: ['Network error']
          }
        });
      }
    });
  },

  /**
   * Update ARI user (full update - PUT).
   * 
   * @param {string} id - User ID.
   * @param {object} data - User data.
   * @param {function} callback - Callback function to handle the response.
   */
  updateRecord: function updateRecord(id, data, callback) {
    if (!id) {
      callback({
        success: false,
        messages: {
          error: ['ID is required']
        }
      });
      return;
    }

    this.clearCache();
    $.api({
      url: "".concat(this.endpoint, "/").concat(id),
      on: 'now',
      method: 'PUT',
      data: JSON.stringify(data),
      contentType: 'application/json',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError(response) {
        callback({
          success: false,
          messages: {
            error: ['Network error']
          }
        });
      }
    });
  },

  /**
   * Partially update ARI user (PATCH).
   * 
   * @param {string} id - User ID.
   * @param {object} data - Partial user data to update.
   * @param {function} callback - Callback function to handle the response.
   */
  patchRecord: function patchRecord(id, data, callback) {
    if (!id) {
      callback({
        success: false,
        messages: {
          error: ['ID is required']
        }
      });
      return;
    }

    this.clearCache();
    $.api({
      url: "".concat(this.endpoint, "/").concat(id),
      on: 'now',
      method: 'PATCH',
      data: JSON.stringify(data),
      contentType: 'application/json',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError(response) {
        callback({
          success: false,
          messages: {
            error: ['Network error']
          }
        });
      }
    });
  },

  /**
   * Delete ARI user.
   * 
   * @param {string} id - User ID.
   * @param {function} callback - Callback function to handle the response.
   */
  deleteRecord: function deleteRecord(id, callback) {
    if (!id) {
      if (callback) {
        callback({
          success: false,
          messages: {
            error: ['ID is required']
          }
        });
      }

      return;
    }

    this.clearCache();
    $.api({
      url: "".concat(this.endpoint, "/").concat(id),
      on: 'now',
      method: 'DELETE',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        if (callback) {
          callback(response);
        }
      },
      onFailure: function onFailure(response) {
        if (callback) {
          callback(response);
        }
      },
      onError: function onError(response) {
        if (callback) {
          callback({
            success: false,
            messages: {
              error: ['Network error']
            }
          });
        }
      }
    });
  },

  /**
   * Save or update ARI user based on ID presence.
   * 
   * @param {object} data - User data (with or without ID).
   * @param {function} callback - Callback function to handle the response.
   */
  saveRecord: function saveRecord(data, callback) {
    if (data.id) {
      // Existing record - update
      var id = data.id;
      delete data.id; // Remove ID from data for PUT request

      this.updateRecord(id, data, callback);
    } else {
      // New record - create
      this.createRecord(data, callback);
    }
  },

  /**
   * Get data from sessionStorage cache.
   * 
   * @param {string} key - Cache key.
   * @returns {*} Cached data or null if not found or expired.
   */
  getFromCache: function getFromCache(key) {
    try {
      var cached = sessionStorage.getItem(key);
      if (!cached) return null;
      var data = JSON.parse(cached);
      var now = new Date().getTime();

      if (data.expiry && data.expiry > now) {
        return data.value;
      } // Cache expired - remove it


      sessionStorage.removeItem(key);
      return null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Save data to sessionStorage cache.
   * 
   * @param {string} key - Cache key.
   * @param {*} value - Data to cache.
   */
  saveToCache: function saveToCache(key, value) {
    try {
      var data = {
        value: value,
        expiry: new Date().getTime() + this.cacheTimeout
      };
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (e) {// Ignore cache errors
    }
  },

  /**
   * Clear cache for ARI users.
   */
  clearCache: function clearCache() {
    try {
      sessionStorage.removeItem(this.cacheKey);
    } catch (e) {// Ignore cache errors
    }
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvYXN0ZXJpc2tSZXN0VXNlcnNBUEkuanMiXSwibmFtZXMiOlsiQXN0ZXJpc2tSZXN0VXNlcnNBUEkiLCJlbmRwb2ludCIsImVuZHBvaW50cyIsImdldExpc3QiLCJnZXRSZWNvcmQiLCJzYXZlUmVjb3JkIiwiZGVsZXRlUmVjb3JkIiwiY2FjaGVLZXkiLCJjYWNoZVRpbWVvdXQiLCJjYWxsYmFjayIsInVzZUNhY2hlIiwiQXJyYXkiLCJpc0FycmF5IiwicGFyYW1zIiwiYWN0dWFsQ2FsbGJhY2siLCJhcmd1bWVudHMiLCJhY3R1YWxVc2VDYWNoZSIsInVuZGVmaW5lZCIsImdldExpc3RXaXRoUGFyYW1zIiwiY2FjaGVkIiwiZ2V0RnJvbUNhY2hlIiwiaXRlbXMiLCIkIiwiYXBpIiwidXJsIiwib24iLCJtZXRob2QiLCJzdWNjZXNzVGVzdCIsIlBieEFwaSIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwiZGF0YSIsInNhdmVUb0NhY2hlIiwicmVzdWx0Iiwib25GYWlsdXJlIiwib25FcnJvciIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJxdWVyeVBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImxpbWl0IiwiYXBwZW5kIiwib2Zmc2V0Iiwic2VhcmNoIiwiZW5hYmxlZCIsInF1ZXJ5U3RyaW5nIiwidG9TdHJpbmciLCJ0b3RhbCIsImlkIiwiZ2V0RGVmYXVsdHMiLCJjcmVhdGVSZWNvcmQiLCJjbGVhckNhY2hlIiwiSlNPTiIsInN0cmluZ2lmeSIsImNvbnRlbnRUeXBlIiwic3VjY2VzcyIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJ1cGRhdGVSZWNvcmQiLCJwYXRjaFJlY29yZCIsImtleSIsInNlc3Npb25TdG9yYWdlIiwiZ2V0SXRlbSIsInBhcnNlIiwibm93IiwiRGF0ZSIsImdldFRpbWUiLCJleHBpcnkiLCJ2YWx1ZSIsInJlbW92ZUl0ZW0iLCJlIiwic2V0SXRlbSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtB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O0FBQ0FQLE1BQUFBLGNBQWMsQ0FBQ1EsVUFBZixDQUEwQlQsR0FBMUI7QUFDQSxhQUFPLElBQVA7QUFDSCxLQWRELENBY0UsT0FBT1UsQ0FBUCxFQUFVO0FBQ1IsYUFBTyxJQUFQO0FBQ0g7QUFDSixHQTdXd0I7O0FBK1d6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXZDLEVBQUFBLFdBclh5Qix1QkFxWGI2QixHQXJYYSxFQXFYUlEsS0FyWFEsRUFxWEQ7QUFDcEIsUUFBSTtBQUNBLFVBQU10QyxJQUFJLEdBQUc7QUFDVHNDLFFBQUFBLEtBQUssRUFBRUEsS0FERTtBQUVURCxRQUFBQSxNQUFNLEVBQUUsSUFBSUYsSUFBSixHQUFXQyxPQUFYLEtBQXVCLEtBQUszRDtBQUYzQixPQUFiO0FBSUFzRCxNQUFBQSxjQUFjLENBQUNVLE9BQWYsQ0FBdUJYLEdBQXZCLEVBQTRCUixJQUFJLENBQUNDLFNBQUwsQ0FBZXZCLElBQWYsQ0FBNUI7QUFDSCxLQU5ELENBTUUsT0FBT3dDLENBQVAsRUFBVSxDQUNSO0FBQ0g7QUFDSixHQS9Yd0I7O0FBaVl6QjtBQUNKO0FBQ0E7QUFDSW5CLEVBQUFBLFVBcFl5Qix3QkFvWVo7QUFDVCxRQUFJO0FBQ0FVLE1BQUFBLGNBQWMsQ0FBQ1EsVUFBZixDQUEwQixLQUFLL0QsUUFBL0I7QUFDSCxLQUZELENBRUUsT0FBT2dFLENBQVAsRUFBVSxDQUNSO0FBQ0g7QUFDSjtBQTFZd0IsQ0FBN0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgc2Vzc2lvblN0b3JhZ2UsIFBieEFwaSAqL1xuXG4vKipcbiAqIEFzdGVyaXNrIFJFU1QgSW50ZXJmYWNlIChBUkkpIFVzZXJzIEFQSSBtb2R1bGUuXG4gKiBAbW9kdWxlIEFzdGVyaXNrUmVzdFVzZXJzQVBJXG4gKi9cbmNvbnN0IEFzdGVyaXNrUmVzdFVzZXJzQVBJID0ge1xuICAgIC8qKlxuICAgICAqIEJhc2UgQVBJIGVuZHBvaW50IGZvciBBUkkgdXNlcnMgKHYzIFJFU1RmdWwpLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvYXN0ZXJpc2stcmVzdC11c2VycycsXG4gICAgXG4gICAgLyoqXG4gICAgICogRW5kcG9pbnQgZGVmaW5pdGlvbnMgZm9yIHVuaWZpY2F0aW9uIHdpdGggUGJ4RGF0YVRhYmxlSW5kZXhcbiAgICAgKi9cbiAgICBlbmRwb2ludHM6IHtcbiAgICAgICAgZ2V0TGlzdDogJy9wYnhjb3JlL2FwaS92My9hc3Rlcmlzay1yZXN0LXVzZXJzJyxcbiAgICAgICAgZ2V0UmVjb3JkOiAnL3BieGNvcmUvYXBpL3YzL2FzdGVyaXNrLXJlc3QtdXNlcnMnLFxuICAgICAgICBzYXZlUmVjb3JkOiAnL3BieGNvcmUvYXBpL3YzL2FzdGVyaXNrLXJlc3QtdXNlcnMnLFxuICAgICAgICBkZWxldGVSZWNvcmQ6ICcvcGJ4Y29yZS9hcGkvdjMvYXN0ZXJpc2stcmVzdC11c2VycydcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhY2hlIGtleSBmb3IgQVJJIHVzZXJzIGxpc3QuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBjYWNoZUtleTogJ0FzdGVyaXNrUmVzdFVzZXJzTGlzdCcsXG5cbiAgICAvKipcbiAgICAgKiBDYWNoZSB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyAoNSBtaW51dGVzKS5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhY2hlVGltZW91dDogNSAqIDYwICogMTAwMCxcblxuICAgIC8qKlxuICAgICAqIEdldCBsaXN0IG9mIGFsbCBBUkkgdXNlcnMuXG4gICAgICogTW9kaWZpZWQgdG8gd29yayB3aXRoIFBieERhdGFUYWJsZUluZGV4IGJhc2UgY2xhc3MuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gdXNlQ2FjaGUgLSBXaGV0aGVyIHRvIHVzZSBjYWNoZWQgZGF0YSBpZiBhdmFpbGFibGUgKGRlZmF1bHQ6IHRydWUpLlxuICAgICAqL1xuICAgIGdldExpc3QoY2FsbGJhY2ssIHVzZUNhY2hlID0gdHJ1ZSkge1xuICAgICAgICAvLyBDaGVjayBpZiBjYWxsYmFjayBpcyBhY3R1YWxseSBwYXJhbXMgb2JqZWN0IChmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoY2FsbGJhY2spKSB7XG4gICAgICAgICAgICAvLyBPbGQgc2lnbmF0dXJlOiBnZXRMaXN0KHBhcmFtcywgY2FsbGJhY2ssIHVzZUNhY2hlKVxuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gY2FsbGJhY2s7XG4gICAgICAgICAgICBjb25zdCBhY3R1YWxDYWxsYmFjayA9IGFyZ3VtZW50c1sxXTtcbiAgICAgICAgICAgIGNvbnN0IGFjdHVhbFVzZUNhY2hlID0gYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldExpc3RXaXRoUGFyYW1zKHBhcmFtcywgYWN0dWFsQ2FsbGJhY2ssIGFjdHVhbFVzZUNhY2hlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTmV3IHNpZ25hdHVyZSBmb3IgUGJ4RGF0YVRhYmxlSW5kZXg6IGdldExpc3QoY2FsbGJhY2ssIHVzZUNhY2hlKVxuICAgICAgICBpZiAodXNlQ2FjaGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMuZ2V0RnJvbUNhY2hlKHRoaXMuY2FjaGVLZXkpO1xuICAgICAgICAgICAgaWYgKGNhY2hlZCkge1xuICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgdG8gYXJyYXkgZm9ybWF0IGV4cGVjdGVkIGJ5IFBieERhdGFUYWJsZUluZGV4XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbXMgPSBjYWNoZWQuaXRlbXMgfHwgY2FjaGVkO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGl0ZW1zKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnQsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gUGJ4RGF0YVRhYmxlSW5kZXggbm93IGhhbmRsZXMgYm90aCB2MiBhbmQgdjMgQVBJIGZvcm1hdHNcbiAgICAgICAgICAgICAgICAvLyBKdXN0IHBhc3MgdGhlIHJlc3BvbnNlIGFzLWlzXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zYXZlVG9DYWNoZSh0aGlzLmNhY2hlS2V5LCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh7IHJlc3VsdDogZmFsc2UsIGRhdGE6IFtdIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFJldHVybiBlbXB0eSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7IHJlc3VsdDogZmFsc2UsIGRhdGE6IFtdIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBSZXR1cm4gZW1wdHkgcmVzcG9uc2Ugc3RydWN0dXJlXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soeyByZXN1bHQ6IGZhbHNlLCBkYXRhOiBbXSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgbGlzdCB3aXRoIHBhcmFtZXRlcnMgKGxlZ2FjeSBtZXRob2QgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkpLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBRdWVyeSBwYXJhbWV0ZXJzIChsaW1pdCwgb2Zmc2V0LCBzZWFyY2gsIGVuYWJsZWQpLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHVzZUNhY2hlIC0gV2hldGhlciB0byB1c2UgY2FjaGVkIGRhdGEgaWYgYXZhaWxhYmxlIChkZWZhdWx0OiBmYWxzZSBmb3IgZmlsdGVyZWQgcmVxdWVzdHMpLlxuICAgICAqL1xuICAgIGdldExpc3RXaXRoUGFyYW1zKHBhcmFtcyA9IHt9LCBjYWxsYmFjaywgdXNlQ2FjaGUgPSBmYWxzZSkge1xuICAgICAgICAvLyBPbmx5IHVzZSBjYWNoZSBmb3IgdW5maWx0ZXJlZCByZXF1ZXN0c1xuICAgICAgICBpZiAodXNlQ2FjaGUgJiYgT2JqZWN0LmtleXMocGFyYW1zKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMuZ2V0RnJvbUNhY2hlKHRoaXMuY2FjaGVLZXkpO1xuICAgICAgICAgICAgaWYgKGNhY2hlZCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGNhY2hlZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgcXVlcnkgc3RyaW5nXG4gICAgICAgIGNvbnN0IHF1ZXJ5UGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcygpO1xuICAgICAgICBpZiAocGFyYW1zLmxpbWl0KSBxdWVyeVBhcmFtcy5hcHBlbmQoJ2xpbWl0JywgcGFyYW1zLmxpbWl0KTtcbiAgICAgICAgaWYgKHBhcmFtcy5vZmZzZXQpIHF1ZXJ5UGFyYW1zLmFwcGVuZCgnb2Zmc2V0JywgcGFyYW1zLm9mZnNldCk7XG4gICAgICAgIGlmIChwYXJhbXMuc2VhcmNoKSBxdWVyeVBhcmFtcy5hcHBlbmQoJ3NlYXJjaCcsIHBhcmFtcy5zZWFyY2gpO1xuICAgICAgICBpZiAocGFyYW1zLmVuYWJsZWQgIT09IHVuZGVmaW5lZCkgcXVlcnlQYXJhbXMuYXBwZW5kKCdlbmFibGVkJywgcGFyYW1zLmVuYWJsZWQpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcXVlcnlTdHJpbmcgPSBxdWVyeVBhcmFtcy50b1N0cmluZygpO1xuICAgICAgICBjb25zdCB1cmwgPSBxdWVyeVN0cmluZyA/IGAke3RoaXMuZW5kcG9pbnR9PyR7cXVlcnlTdHJpbmd9YCA6IHRoaXMuZW5kcG9pbnQ7XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2FjaGUgb25seSB1bmZpbHRlcmVkIHJlc3VsdHNcbiAgICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHBhcmFtcykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNhdmVUb0NhY2hlKHRoaXMuY2FjaGVLZXksIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHsgaXRlbXM6IFtdLCB0b3RhbDogMCB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7IGl0ZW1zOiBbXSwgdG90YWw6IDAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHsgaXRlbXM6IFtdLCB0b3RhbDogMCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBzaW5nbGUgQVJJIHVzZXIgYnkgSUQgb3IgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmQuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVXNlciBJRCAoZW1wdHkgZm9yIGRlZmF1bHRzKS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2UuXG4gICAgICovXG4gICAgZ2V0UmVjb3JkKGlkLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBJZiBubyBJRCwgZ2V0IGRlZmF1bHRzXG4gICAgICAgIGlmICghaWQpIHtcbiAgICAgICAgICAgIHRoaXMuZ2V0RGVmYXVsdHMoY2FsbGJhY2spO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmVuZHBvaW50fS8ke2lkfWAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSB8fCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGRlZmF1bHQgdmFsdWVzIGZvciBuZXcgQVJJIHVzZXIuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGdldERlZmF1bHRzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5lbmRwb2ludH06Z2V0RGVmYXVsdHNgLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEgfHwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIG5ldyBBUkkgdXNlci5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFVzZXIgZGF0YS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2UuXG4gICAgICovXG4gICAgY3JlYXRlUmVjb3JkKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuY2xlYXJDYWNoZSgpO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soeyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZXM6IHsgZXJyb3I6IFsnTmV0d29yayBlcnJvciddIH0gfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgQVJJIHVzZXIgKGZ1bGwgdXBkYXRlIC0gUFVUKS5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBVc2VyIElELlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gVXNlciBkYXRhLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZS5cbiAgICAgKi9cbiAgICB1cGRhdGVSZWNvcmQoaWQsIGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghaWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2VzOiB7IGVycm9yOiBbJ0lEIGlzIHJlcXVpcmVkJ10gfSB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY2xlYXJDYWNoZSgpO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmVuZHBvaW50fS8ke2lkfWAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2VzOiB7IGVycm9yOiBbJ05ldHdvcmsgZXJyb3InXSB9IH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUGFydGlhbGx5IHVwZGF0ZSBBUkkgdXNlciAoUEFUQ0gpLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFVzZXIgSUQuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQYXJ0aWFsIHVzZXIgZGF0YSB0byB1cGRhdGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIHBhdGNoUmVjb3JkKGlkLCBkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlczogeyBlcnJvcjogWydJRCBpcyByZXF1aXJlZCddIH0gfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNsZWFyQ2FjaGUoKTtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5lbmRwb2ludH0vJHtpZH1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2VzOiB7IGVycm9yOiBbJ05ldHdvcmsgZXJyb3InXSB9IH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIEFSSSB1c2VyLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFVzZXIgSUQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGRlbGV0ZVJlY29yZChpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCFpZCkge1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soeyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZXM6IHsgZXJyb3I6IFsnSUQgaXMgcmVxdWlyZWQnXSB9IH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jbGVhckNhY2hlKCk7XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuZW5kcG9pbnR9LyR7aWR9YCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlczogeyBlcnJvcjogWydOZXR3b3JrIGVycm9yJ10gfSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlIG9yIHVwZGF0ZSBBUkkgdXNlciBiYXNlZCBvbiBJRCBwcmVzZW5jZS5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFVzZXIgZGF0YSAod2l0aCBvciB3aXRob3V0IElEKS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2UuXG4gICAgICovXG4gICAgc2F2ZVJlY29yZChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgLy8gRXhpc3RpbmcgcmVjb3JkIC0gdXBkYXRlXG4gICAgICAgICAgICBjb25zdCBpZCA9IGRhdGEuaWQ7XG4gICAgICAgICAgICBkZWxldGUgZGF0YS5pZDsgLy8gUmVtb3ZlIElEIGZyb20gZGF0YSBmb3IgUFVUIHJlcXVlc3RcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUmVjb3JkKGlkLCBkYXRhLCBjYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOZXcgcmVjb3JkIC0gY3JlYXRlXG4gICAgICAgICAgICB0aGlzLmNyZWF0ZVJlY29yZChkYXRhLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGRhdGEgZnJvbSBzZXNzaW9uU3RvcmFnZSBjYWNoZS5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IC0gQ2FjaGUga2V5LlxuICAgICAqIEByZXR1cm5zIHsqfSBDYWNoZWQgZGF0YSBvciBudWxsIGlmIG5vdCBmb3VuZCBvciBleHBpcmVkLlxuICAgICAqL1xuICAgIGdldEZyb21DYWNoZShrZXkpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNhY2hlZCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oa2V5KTtcbiAgICAgICAgICAgIGlmICghY2FjaGVkKSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UoY2FjaGVkKTtcbiAgICAgICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZGF0YS5leHBpcnkgJiYgZGF0YS5leHBpcnkgPiBub3cpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FjaGUgZXhwaXJlZCAtIHJlbW92ZSBpdFxuICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhdmUgZGF0YSB0byBzZXNzaW9uU3RvcmFnZSBjYWNoZS5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IC0gQ2FjaGUga2V5LlxuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgLSBEYXRhIHRvIGNhY2hlLlxuICAgICAqL1xuICAgIHNhdmVUb0NhY2hlKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgICAgIGV4cGlyeTogbmV3IERhdGUoKS5nZXRUaW1lKCkgKyB0aGlzLmNhY2hlVGltZW91dFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oa2V5LCBKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIElnbm9yZSBjYWNoZSBlcnJvcnNcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhciBjYWNoZSBmb3IgQVJJIHVzZXJzLlxuICAgICAqL1xuICAgIGNsZWFyQ2FjaGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKHRoaXMuY2FjaGVLZXkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBJZ25vcmUgY2FjaGUgZXJyb3JzXG4gICAgICAgIH1cbiAgICB9XG59OyJdfQ==