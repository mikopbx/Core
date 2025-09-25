"use strict";

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

/* global PbxApi, Config, PbxApiClient, $ */

/**
 * ApiKeysAPI - REST API v3 client for API keys management
 *
 * Provides a clean interface for API keys operations using the new RESTful API.
 *
 * @class ApiKeysAPI 
 */
var ApiKeysAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/api-keys',
  customMethods: {
    getDefault: ':getDefault',
    generateKey: ':generateKey',
    getAvailableControllers: ':getAvailableControllers'
  }
}); // Add method aliases for compatibility and easier use

Object.assign(ApiKeysAPI, {
  /**
   * Get new records for DataTable (alias for getList)
   * @param {Function} callback - Function to call with response data
   */
  getNewRecords: function getNewRecords(callback) {
    this.getList({}, callback);
  },

  /**
   * Get list of all API keys
   * Uses v3 RESTful API: GET /api-keys
   * @param {object} params - Query parameters (limit, offset, search, etc.)
   * @param {function} callback - Callback function
   */
  getList: function getList(params, callback) {
    // Support old signature where callback is the first parameter
    if (typeof params === 'function') {
      callback = params;
      params = {};
    }

    return this.callGet(params || {}, callback);
  },

  /**
   * Get record by ID
   * Uses v3 RESTful API: GET /api-keys/{id} or GET /api-keys:getDefault for new
   * @param {string} id - Record ID or empty string for new
   * @param {function} callback - Callback function
   */
  getRecord: function getRecord(id, callback) {
    // Use :getDefault for new records, otherwise GET by ID
    var isNew = !id || id === '' || id === 'new';

    if (isNew) {
      return this.callCustomMethod('getDefault', {}, callback);
    } else {
      return this.callGet({}, callback, id);
    }
  },

  /**
   * Generate a new API key
   * Uses v3 RESTful API: POST /api-keys:generateKey
   * @param {function} callback - Callback function
   */
  generateKey: function generateKey(callback) {
    return this.callCustomMethod('generateKey', {}, callback, 'POST');
  },

  /**
   * Delete record
   * Uses v3 RESTful API: DELETE /api-keys/{id}
   * @param {string} id - Record ID
   * @param {function} callback - Callback function
   */
  deleteRecord: function deleteRecord(id, callback) {
    return this.callDelete(callback, id);
  },

  /**
   * Get list of available controllers/endpoints for permissions
   * Uses v3 RESTful API: GET /api-keys:getAvailableControllers
   * @param {function} callback - Callback function
   */
  getAvailableControllers: function getAvailableControllers(callback) {
    return this.callCustomMethod('getAvailableControllers', {}, function (response) {
      if (response.result) {
        callback(response);
      } else {
        callback({
          result: false,
          data: []
        });
      }
    });
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvYXBpLWtleXMtYXBpLmpzIl0sIm5hbWVzIjpbIkFwaUtleXNBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXREZWZhdWx0IiwiZ2VuZXJhdGVLZXkiLCJnZXRBdmFpbGFibGVDb250cm9sbGVycyIsIk9iamVjdCIsImFzc2lnbiIsImdldE5ld1JlY29yZHMiLCJjYWxsYmFjayIsImdldExpc3QiLCJwYXJhbXMiLCJjYWxsR2V0IiwiZ2V0UmVjb3JkIiwiaWQiLCJpc05ldyIsImNhbGxDdXN0b21NZXRob2QiLCJkZWxldGVSZWNvcmQiLCJjYWxsRGVsZXRlIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxVQUFVLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUNoQ0MsRUFBQUEsUUFBUSxFQUFFLDBCQURzQjtBQUVoQ0MsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFVBQVUsRUFBRSxhQUREO0FBRVhDLElBQUFBLFdBQVcsRUFBRSxjQUZGO0FBR1hDLElBQUFBLHVCQUF1QixFQUFFO0FBSGQ7QUFGaUIsQ0FBakIsQ0FBbkIsQyxDQVNBOztBQUNBQyxNQUFNLENBQUNDLE1BQVAsQ0FBY1IsVUFBZCxFQUEwQjtBQUV0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJUyxFQUFBQSxhQU5zQix5QkFNUkMsUUFOUSxFQU1FO0FBQ3BCLFNBQUtDLE9BQUwsQ0FBYSxFQUFiLEVBQWlCRCxRQUFqQjtBQUNILEdBUnFCOztBQVV0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FoQnNCLG1CQWdCZEMsTUFoQmMsRUFnQk5GLFFBaEJNLEVBZ0JJO0FBQ3RCO0FBQ0EsUUFBSSxPQUFPRSxNQUFQLEtBQWtCLFVBQXRCLEVBQWtDO0FBQzlCRixNQUFBQSxRQUFRLEdBQUdFLE1BQVg7QUFDQUEsTUFBQUEsTUFBTSxHQUFHLEVBQVQ7QUFDSDs7QUFFRCxXQUFPLEtBQUtDLE9BQUwsQ0FBYUQsTUFBTSxJQUFJLEVBQXZCLEVBQTJCRixRQUEzQixDQUFQO0FBQ0gsR0F4QnFCOztBQTBCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLFNBaENzQixxQkFnQ1pDLEVBaENZLEVBZ0NSTCxRQWhDUSxFQWdDRTtBQUNwQjtBQUNBLFFBQU1NLEtBQUssR0FBRyxDQUFDRCxFQUFELElBQU9BLEVBQUUsS0FBSyxFQUFkLElBQW9CQSxFQUFFLEtBQUssS0FBekM7O0FBRUEsUUFBSUMsS0FBSixFQUFXO0FBQ1AsYUFBTyxLQUFLQyxnQkFBTCxDQUFzQixZQUF0QixFQUFvQyxFQUFwQyxFQUF3Q1AsUUFBeEMsQ0FBUDtBQUNILEtBRkQsTUFFTztBQUNILGFBQU8sS0FBS0csT0FBTCxDQUFhLEVBQWIsRUFBaUJILFFBQWpCLEVBQTJCSyxFQUEzQixDQUFQO0FBQ0g7QUFDSixHQXpDcUI7O0FBMkN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lWLEVBQUFBLFdBaERzQix1QkFnRFZLLFFBaERVLEVBZ0RBO0FBQ2xCLFdBQU8sS0FBS08sZ0JBQUwsQ0FBc0IsYUFBdEIsRUFBcUMsRUFBckMsRUFBeUNQLFFBQXpDLEVBQW1ELE1BQW5ELENBQVA7QUFDSCxHQWxEcUI7O0FBb0R0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSVEsRUFBQUEsWUExRHNCLHdCQTBEVEgsRUExRFMsRUEwRExMLFFBMURLLEVBMERLO0FBQ3ZCLFdBQU8sS0FBS1MsVUFBTCxDQUFnQlQsUUFBaEIsRUFBMEJLLEVBQTFCLENBQVA7QUFDSCxHQTVEcUI7O0FBOER0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lULEVBQUFBLHVCQW5Fc0IsbUNBbUVFSSxRQW5FRixFQW1FWTtBQUM5QixXQUFPLEtBQUtPLGdCQUFMLENBQXNCLHlCQUF0QixFQUFpRCxFQUFqRCxFQUFxRCxVQUFDRyxRQUFELEVBQWM7QUFDdEUsVUFBSUEsUUFBUSxDQUFDQyxNQUFiLEVBQXFCO0FBQ2pCWCxRQUFBQSxRQUFRLENBQUNVLFFBQUQsQ0FBUjtBQUNILE9BRkQsTUFFTztBQUNIVixRQUFBQSxRQUFRLENBQUM7QUFBQ1csVUFBQUEsTUFBTSxFQUFFLEtBQVQ7QUFBZ0JDLFVBQUFBLElBQUksRUFBRTtBQUF0QixTQUFELENBQVI7QUFDSDtBQUNKLEtBTk0sQ0FBUDtBQU9IO0FBM0VxQixDQUExQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGksIENvbmZpZywgUGJ4QXBpQ2xpZW50LCAkICovXG5cbi8qKlxuICogQXBpS2V5c0FQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgQVBJIGtleXMgbWFuYWdlbWVudFxuICpcbiAqIFByb3ZpZGVzIGEgY2xlYW4gaW50ZXJmYWNlIGZvciBBUEkga2V5cyBvcGVyYXRpb25zIHVzaW5nIHRoZSBuZXcgUkVTVGZ1bCBBUEkuXG4gKlxuICogQGNsYXNzIEFwaUtleXNBUEkgXG4gKi9cbmNvbnN0IEFwaUtleXNBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9hcGkta2V5cycsXG4gICAgY3VzdG9tTWV0aG9kczoge1xuICAgICAgICBnZXREZWZhdWx0OiAnOmdldERlZmF1bHQnLFxuICAgICAgICBnZW5lcmF0ZUtleTogJzpnZW5lcmF0ZUtleScsXG4gICAgICAgIGdldEF2YWlsYWJsZUNvbnRyb2xsZXJzOiAnOmdldEF2YWlsYWJsZUNvbnRyb2xsZXJzJ1xuICAgIH1cbn0pO1xuXG4vLyBBZGQgbWV0aG9kIGFsaWFzZXMgZm9yIGNvbXBhdGliaWxpdHkgYW5kIGVhc2llciB1c2Vcbk9iamVjdC5hc3NpZ24oQXBpS2V5c0FQSSwge1xuXG4gICAgLyoqXG4gICAgICogR2V0IG5ldyByZWNvcmRzIGZvciBEYXRhVGFibGUgKGFsaWFzIGZvciBnZXRMaXN0KVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gY2FsbCB3aXRoIHJlc3BvbnNlIGRhdGFcbiAgICAgKi9cbiAgICBnZXROZXdSZWNvcmRzKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuZ2V0TGlzdCh7fSwgY2FsbGJhY2spO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGlzdCBvZiBhbGwgQVBJIGtleXNcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBHRVQgL2FwaS1rZXlzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFF1ZXJ5IHBhcmFtZXRlcnMgKGxpbWl0LCBvZmZzZXQsIHNlYXJjaCwgZXRjLilcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0TGlzdChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIFN1cHBvcnQgb2xkIHNpZ25hdHVyZSB3aGVyZSBjYWxsYmFjayBpcyB0aGUgZmlyc3QgcGFyYW1ldGVyXG4gICAgICAgIGlmICh0eXBlb2YgcGFyYW1zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHBhcmFtcztcbiAgICAgICAgICAgIHBhcmFtcyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5jYWxsR2V0KHBhcmFtcyB8fCB7fSwgY2FsbGJhY2spO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIGJ5IElEXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogR0VUIC9hcGkta2V5cy97aWR9IG9yIEdFVCAvYXBpLWtleXM6Z2V0RGVmYXVsdCBmb3IgbmV3XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gUmVjb3JkIElEIG9yIGVtcHR5IHN0cmluZyBmb3IgbmV3XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFJlY29yZChpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gVXNlIDpnZXREZWZhdWx0IGZvciBuZXcgcmVjb3Jkcywgb3RoZXJ3aXNlIEdFVCBieSBJRFxuICAgICAgICBjb25zdCBpc05ldyA9ICFpZCB8fCBpZCA9PT0gJycgfHwgaWQgPT09ICduZXcnO1xuXG4gICAgICAgIGlmIChpc05ldykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0RGVmYXVsdCcsIHt9LCBjYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsR2V0KHt9LCBjYWxsYmFjaywgaWQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGEgbmV3IEFQSSBrZXlcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBQT1NUIC9hcGkta2V5czpnZW5lcmF0ZUtleVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZW5lcmF0ZUtleShjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZW5lcmF0ZUtleScsIHt9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJlY29yZFxuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IERFTEVURSAvYXBpLWtleXMve2lkfVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlY29yZCBJRFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQoaWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxEZWxldGUoY2FsbGJhY2ssIGlkKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGxpc3Qgb2YgYXZhaWxhYmxlIGNvbnRyb2xsZXJzL2VuZHBvaW50cyBmb3IgcGVybWlzc2lvbnNcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBHRVQgL2FwaS1rZXlzOmdldEF2YWlsYWJsZUNvbnRyb2xsZXJzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldEF2YWlsYWJsZUNvbnRyb2xsZXJzKGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldEF2YWlsYWJsZUNvbnRyb2xsZXJzJywge30sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IFtdfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn0pOyJdfQ==