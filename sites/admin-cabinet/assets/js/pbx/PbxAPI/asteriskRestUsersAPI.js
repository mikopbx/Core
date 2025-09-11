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
      method: 'DELETE',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvYXN0ZXJpc2tSZXN0VXNlcnNBUEkuanMiXSwibmFtZXMiOlsiQXN0ZXJpc2tSZXN0VXNlcnNBUEkiLCJlbmRwb2ludCIsImVuZHBvaW50cyIsImdldExpc3QiLCJnZXRSZWNvcmQiLCJzYXZlUmVjb3JkIiwiZGVsZXRlUmVjb3JkIiwiY2FjaGVLZXkiLCJjYWNoZVRpbWVvdXQiLCJjYWxsYmFjayIsInVzZUNhY2hlIiwiQXJyYXkiLCJpc0FycmF5IiwicGFyYW1zIiwiYWN0dWFsQ2FsbGJhY2siLCJhcmd1bWVudHMiLCJhY3R1YWxVc2VDYWNoZSIsInVuZGVmaW5lZCIsImdldExpc3RXaXRoUGFyYW1zIiwiY2FjaGVkIiwiZ2V0RnJvbUNhY2hlIiwiaXRlbXMiLCIkIiwiYXBpIiwidXJsIiwib24iLCJtZXRob2QiLCJzdWNjZXNzVGVzdCIsIlBieEFwaSIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwiZGF0YSIsInNhdmVUb0NhY2hlIiwicmVzdWx0Iiwib25GYWlsdXJlIiwib25FcnJvciIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJxdWVyeVBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImxpbWl0IiwiYXBwZW5kIiwib2Zmc2V0Iiwic2VhcmNoIiwiZW5hYmxlZCIsInF1ZXJ5U3RyaW5nIiwidG9TdHJpbmciLCJ0b3RhbCIsImlkIiwiZ2V0RGVmYXVsdHMiLCJjcmVhdGVSZWNvcmQiLCJjbGVhckNhY2hlIiwiSlNPTiIsInN0cmluZ2lmeSIsImNvbnRlbnRUeXBlIiwic3VjY2VzcyIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJ1cGRhdGVSZWNvcmQiLCJwYXRjaFJlY29yZCIsImtleSIsInNlc3Npb25TdG9yYWdlIiwiZ2V0SXRlbSIsInBhcnNlIiwibm93IiwiRGF0ZSIsImdldFRpbWUiLCJleHBpcnkiLCJ2YWx1ZSIsInJlbW92ZUl0ZW0iLCJlIiwic2V0SXRlbSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtB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O0FBQ0osR0FyV3dCOztBQXVXekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0l2QyxFQUFBQSxXQTdXeUIsdUJBNldiNkIsR0E3V2EsRUE2V1JRLEtBN1dRLEVBNldEO0FBQ3BCLFFBQUk7QUFDQSxVQUFNdEMsSUFBSSxHQUFHO0FBQ1RzQyxRQUFBQSxLQUFLLEVBQUVBLEtBREU7QUFFVEQsUUFBQUEsTUFBTSxFQUFFLElBQUlGLElBQUosR0FBV0MsT0FBWCxLQUF1QixLQUFLM0Q7QUFGM0IsT0FBYjtBQUlBc0QsTUFBQUEsY0FBYyxDQUFDVSxPQUFmLENBQXVCWCxHQUF2QixFQUE0QlIsSUFBSSxDQUFDQyxTQUFMLENBQWV2QixJQUFmLENBQTVCO0FBQ0gsS0FORCxDQU1FLE9BQU93QyxDQUFQLEVBQVUsQ0FDUjtBQUNIO0FBQ0osR0F2WHdCOztBQXlYekI7QUFDSjtBQUNBO0FBQ0luQixFQUFBQSxVQTVYeUIsd0JBNFhaO0FBQ1QsUUFBSTtBQUNBVSxNQUFBQSxjQUFjLENBQUNRLFVBQWYsQ0FBMEIsS0FBSy9ELFFBQS9CO0FBQ0gsS0FGRCxDQUVFLE9BQU9nRSxDQUFQLEVBQVUsQ0FDUjtBQUNIO0FBQ0o7QUFsWXdCLENBQTdCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlLCBQYnhBcGkgKi9cblxuLyoqXG4gKiBBc3RlcmlzayBSRVNUIEludGVyZmFjZSAoQVJJKSBVc2VycyBBUEkgbW9kdWxlLlxuICogQG1vZHVsZSBBc3Rlcmlza1Jlc3RVc2Vyc0FQSVxuICovXG5jb25zdCBBc3Rlcmlza1Jlc3RVc2Vyc0FQSSA9IHtcbiAgICAvKipcbiAgICAgKiBCYXNlIEFQSSBlbmRwb2ludCBmb3IgQVJJIHVzZXJzICh2MyBSRVNUZnVsKS5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL2FzdGVyaXNrLXJlc3QtdXNlcnMnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEVuZHBvaW50IGRlZmluaXRpb25zIGZvciB1bmlmaWNhdGlvbiB3aXRoIFBieERhdGFUYWJsZUluZGV4XG4gICAgICovXG4gICAgZW5kcG9pbnRzOiB7XG4gICAgICAgIGdldExpc3Q6ICcvcGJ4Y29yZS9hcGkvdjMvYXN0ZXJpc2stcmVzdC11c2VycycsXG4gICAgICAgIGdldFJlY29yZDogJy9wYnhjb3JlL2FwaS92My9hc3Rlcmlzay1yZXN0LXVzZXJzJyxcbiAgICAgICAgc2F2ZVJlY29yZDogJy9wYnhjb3JlL2FwaS92My9hc3Rlcmlzay1yZXN0LXVzZXJzJyxcbiAgICAgICAgZGVsZXRlUmVjb3JkOiAnL3BieGNvcmUvYXBpL3YzL2FzdGVyaXNrLXJlc3QtdXNlcnMnXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWNoZSBrZXkgZm9yIEFSSSB1c2VycyBsaXN0LlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgY2FjaGVLZXk6ICdBc3Rlcmlza1Jlc3RVc2Vyc0xpc3QnLFxuXG4gICAgLyoqXG4gICAgICogQ2FjaGUgdGltZW91dCBpbiBtaWxsaXNlY29uZHMgKDUgbWludXRlcykuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICBjYWNoZVRpbWVvdXQ6IDUgKiA2MCAqIDEwMDAsXG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGlzdCBvZiBhbGwgQVJJIHVzZXJzLlxuICAgICAqIE1vZGlmaWVkIHRvIHdvcmsgd2l0aCBQYnhEYXRhVGFibGVJbmRleCBiYXNlIGNsYXNzLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHVzZUNhY2hlIC0gV2hldGhlciB0byB1c2UgY2FjaGVkIGRhdGEgaWYgYXZhaWxhYmxlIChkZWZhdWx0OiB0cnVlKS5cbiAgICAgKi9cbiAgICBnZXRMaXN0KGNhbGxiYWNrLCB1c2VDYWNoZSA9IHRydWUpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgY2FsbGJhY2sgaXMgYWN0dWFsbHkgcGFyYW1zIG9iamVjdCAoZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkpXG4gICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KGNhbGxiYWNrKSkge1xuICAgICAgICAgICAgLy8gT2xkIHNpZ25hdHVyZTogZ2V0TGlzdChwYXJhbXMsIGNhbGxiYWNrLCB1c2VDYWNoZSlcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgY29uc3QgYWN0dWFsQ2FsbGJhY2sgPSBhcmd1bWVudHNbMV07XG4gICAgICAgICAgICBjb25zdCBhY3R1YWxVc2VDYWNoZSA9IGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRMaXN0V2l0aFBhcmFtcyhwYXJhbXMsIGFjdHVhbENhbGxiYWNrLCBhY3R1YWxVc2VDYWNoZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5ldyBzaWduYXR1cmUgZm9yIFBieERhdGFUYWJsZUluZGV4OiBnZXRMaXN0KGNhbGxiYWNrLCB1c2VDYWNoZSlcbiAgICAgICAgaWYgKHVzZUNhY2hlKSB7XG4gICAgICAgICAgICBjb25zdCBjYWNoZWQgPSB0aGlzLmdldEZyb21DYWNoZSh0aGlzLmNhY2hlS2V5KTtcbiAgICAgICAgICAgIGlmIChjYWNoZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IHRvIGFycmF5IGZvcm1hdCBleHBlY3RlZCBieSBQYnhEYXRhVGFibGVJbmRleFxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gY2FjaGVkLml0ZW1zIHx8IGNhY2hlZDtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhpdGVtcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFBieERhdGFUYWJsZUluZGV4IG5vdyBoYW5kbGVzIGJvdGggdjIgYW5kIHYzIEFQSSBmb3JtYXRzXG4gICAgICAgICAgICAgICAgLy8gSnVzdCBwYXNzIHRoZSByZXNwb25zZSBhcy1pc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2F2ZVRvQ2FjaGUodGhpcy5jYWNoZUtleSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soeyByZXN1bHQ6IGZhbHNlLCBkYXRhOiBbXSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBSZXR1cm4gZW1wdHkgcmVzcG9uc2Ugc3RydWN0dXJlXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soeyByZXN1bHQ6IGZhbHNlLCBkYXRhOiBbXSB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gUmV0dXJuIGVtcHR5IHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHsgcmVzdWx0OiBmYWxzZSwgZGF0YTogW10gfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGxpc3Qgd2l0aCBwYXJhbWV0ZXJzIChsZWdhY3kgbWV0aG9kIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5KS5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gUXVlcnkgcGFyYW1ldGVycyAobGltaXQsIG9mZnNldCwgc2VhcmNoLCBlbmFibGVkKS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtib29sZWFufSB1c2VDYWNoZSAtIFdoZXRoZXIgdG8gdXNlIGNhY2hlZCBkYXRhIGlmIGF2YWlsYWJsZSAoZGVmYXVsdDogZmFsc2UgZm9yIGZpbHRlcmVkIHJlcXVlc3RzKS5cbiAgICAgKi9cbiAgICBnZXRMaXN0V2l0aFBhcmFtcyhwYXJhbXMgPSB7fSwgY2FsbGJhY2ssIHVzZUNhY2hlID0gZmFsc2UpIHtcbiAgICAgICAgLy8gT25seSB1c2UgY2FjaGUgZm9yIHVuZmlsdGVyZWQgcmVxdWVzdHNcbiAgICAgICAgaWYgKHVzZUNhY2hlICYmIE9iamVjdC5rZXlzKHBhcmFtcykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBjYWNoZWQgPSB0aGlzLmdldEZyb21DYWNoZSh0aGlzLmNhY2hlS2V5KTtcbiAgICAgICAgICAgIGlmIChjYWNoZWQpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhjYWNoZWQpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIHF1ZXJ5IHN0cmluZ1xuICAgICAgICBjb25zdCBxdWVyeVBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoKTtcbiAgICAgICAgaWYgKHBhcmFtcy5saW1pdCkgcXVlcnlQYXJhbXMuYXBwZW5kKCdsaW1pdCcsIHBhcmFtcy5saW1pdCk7XG4gICAgICAgIGlmIChwYXJhbXMub2Zmc2V0KSBxdWVyeVBhcmFtcy5hcHBlbmQoJ29mZnNldCcsIHBhcmFtcy5vZmZzZXQpO1xuICAgICAgICBpZiAocGFyYW1zLnNlYXJjaCkgcXVlcnlQYXJhbXMuYXBwZW5kKCdzZWFyY2gnLCBwYXJhbXMuc2VhcmNoKTtcbiAgICAgICAgaWYgKHBhcmFtcy5lbmFibGVkICE9PSB1bmRlZmluZWQpIHF1ZXJ5UGFyYW1zLmFwcGVuZCgnZW5hYmxlZCcsIHBhcmFtcy5lbmFibGVkKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHF1ZXJ5U3RyaW5nID0gcXVlcnlQYXJhbXMudG9TdHJpbmcoKTtcbiAgICAgICAgY29uc3QgdXJsID0gcXVlcnlTdHJpbmcgPyBgJHt0aGlzLmVuZHBvaW50fT8ke3F1ZXJ5U3RyaW5nfWAgOiB0aGlzLmVuZHBvaW50O1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENhY2hlIG9ubHkgdW5maWx0ZXJlZCByZXN1bHRzXG4gICAgICAgICAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhwYXJhbXMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zYXZlVG9DYWNoZSh0aGlzLmNhY2hlS2V5LCByZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh7IGl0ZW1zOiBbXSwgdG90YWw6IDAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soeyBpdGVtczogW10sIHRvdGFsOiAwIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7IGl0ZW1zOiBbXSwgdG90YWw6IDAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc2luZ2xlIEFSSSB1c2VyIGJ5IElEIG9yIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFVzZXIgSUQgKGVtcHR5IGZvciBkZWZhdWx0cykuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGdldFJlY29yZChpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gSWYgbm8gSUQsIGdldCBkZWZhdWx0c1xuICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgICB0aGlzLmdldERlZmF1bHRzKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5lbmRwb2ludH0vJHtpZH1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEgfHwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBkZWZhdWx0IHZhbHVlcyBmb3IgbmV3IEFSSSB1c2VyLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZS5cbiAgICAgKi9cbiAgICBnZXREZWZhdWx0cyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuZW5kcG9pbnR9OmdldERlZmF1bHRzYCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhIHx8IGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBuZXcgQVJJIHVzZXIuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBVc2VyIGRhdGEuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGNyZWF0ZVJlY29yZChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICB0aGlzLmNsZWFyQ2FjaGUoKTtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2VzOiB7IGVycm9yOiBbJ05ldHdvcmsgZXJyb3InXSB9IH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIEFSSSB1c2VyIChmdWxsIHVwZGF0ZSAtIFBVVCkuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVXNlciBJRC5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFVzZXIgZGF0YS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2UuXG4gICAgICovXG4gICAgdXBkYXRlUmVjb3JkKGlkLCBkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlczogeyBlcnJvcjogWydJRCBpcyByZXF1aXJlZCddIH0gfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNsZWFyQ2FjaGUoKTtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5lbmRwb2ludH0vJHtpZH1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlczogeyBlcnJvcjogWydOZXR3b3JrIGVycm9yJ10gfSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBhcnRpYWxseSB1cGRhdGUgQVJJIHVzZXIgKFBBVENIKS5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBVc2VyIElELlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUGFydGlhbCB1c2VyIGRhdGEgdG8gdXBkYXRlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZS5cbiAgICAgKi9cbiAgICBwYXRjaFJlY29yZChpZCwgZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCFpZCkge1xuICAgICAgICAgICAgY2FsbGJhY2soeyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZXM6IHsgZXJyb3I6IFsnSUQgaXMgcmVxdWlyZWQnXSB9IH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jbGVhckNhY2hlKCk7XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuZW5kcG9pbnR9LyR7aWR9YCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlczogeyBlcnJvcjogWydOZXR3b3JrIGVycm9yJ10gfSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBBUkkgdXNlci5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBVc2VyIElELlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZS5cbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQoaWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghaWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2VzOiB7IGVycm9yOiBbJ0lEIGlzIHJlcXVpcmVkJ10gfSB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY2xlYXJDYWNoZSgpO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmVuZHBvaW50fS8ke2lkfWAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2VzOiB7IGVycm9yOiBbJ05ldHdvcmsgZXJyb3InXSB9IH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZSBvciB1cGRhdGUgQVJJIHVzZXIgYmFzZWQgb24gSUQgcHJlc2VuY2UuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBVc2VyIGRhdGEgKHdpdGggb3Igd2l0aG91dCBJRCkuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIHNhdmVSZWNvcmQoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKGRhdGEuaWQpIHtcbiAgICAgICAgICAgIC8vIEV4aXN0aW5nIHJlY29yZCAtIHVwZGF0ZVxuICAgICAgICAgICAgY29uc3QgaWQgPSBkYXRhLmlkO1xuICAgICAgICAgICAgZGVsZXRlIGRhdGEuaWQ7IC8vIFJlbW92ZSBJRCBmcm9tIGRhdGEgZm9yIFBVVCByZXF1ZXN0XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVJlY29yZChpZCwgZGF0YSwgY2FsbGJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTmV3IHJlY29yZCAtIGNyZWF0ZVxuICAgICAgICAgICAgdGhpcy5jcmVhdGVSZWNvcmQoZGF0YSwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBkYXRhIGZyb20gc2Vzc2lvblN0b3JhZ2UgY2FjaGUuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSAtIENhY2hlIGtleS5cbiAgICAgKiBAcmV0dXJucyB7Kn0gQ2FjaGVkIGRhdGEgb3IgbnVsbCBpZiBub3QgZm91bmQgb3IgZXhwaXJlZC5cbiAgICAgKi9cbiAgICBnZXRGcm9tQ2FjaGUoa2V5KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBjYWNoZWQgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGtleSk7XG4gICAgICAgICAgICBpZiAoIWNhY2hlZCkgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKGNhY2hlZCk7XG4gICAgICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGRhdGEuZXhwaXJ5ICYmIGRhdGEuZXhwaXJ5ID4gbm93KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENhY2hlIGV4cGlyZWQgLSByZW1vdmUgaXRcbiAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlIGRhdGEgdG8gc2Vzc2lvblN0b3JhZ2UgY2FjaGUuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSAtIENhY2hlIGtleS5cbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIC0gRGF0YSB0byBjYWNoZS5cbiAgICAgKi9cbiAgICBzYXZlVG9DYWNoZShrZXksIHZhbHVlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICBleHBpcnk6IG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgdGhpcy5jYWNoZVRpbWVvdXRcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKGtleSwgSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBJZ25vcmUgY2FjaGUgZXJyb3JzXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgY2FjaGUgZm9yIEFSSSB1c2Vycy5cbiAgICAgKi9cbiAgICBjbGVhckNhY2hlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbSh0aGlzLmNhY2hlS2V5KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gSWdub3JlIGNhY2hlIGVycm9yc1xuICAgICAgICB9XG4gICAgfVxufTsiXX0=