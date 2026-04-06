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
    generateKey: ':generateKey'
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
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvYXBpLWtleXMtYXBpLmpzIl0sIm5hbWVzIjpbIkFwaUtleXNBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXREZWZhdWx0IiwiZ2VuZXJhdGVLZXkiLCJPYmplY3QiLCJhc3NpZ24iLCJnZXROZXdSZWNvcmRzIiwiY2FsbGJhY2siLCJnZXRMaXN0IiwicGFyYW1zIiwiY2FsbEdldCIsImdldFJlY29yZCIsImlkIiwiaXNOZXciLCJjYWxsQ3VzdG9tTWV0aG9kIiwiZGVsZXRlUmVjb3JkIiwiY2FsbERlbGV0ZSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsVUFBVSxHQUFHLElBQUlDLFlBQUosQ0FBaUI7QUFDaENDLEVBQUFBLFFBQVEsRUFBRSwwQkFEc0I7QUFFaENDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxVQUFVLEVBQUUsYUFERDtBQUVYQyxJQUFBQSxXQUFXLEVBQUU7QUFGRjtBQUZpQixDQUFqQixDQUFuQixDLENBUUE7O0FBQ0FDLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjUCxVQUFkLEVBQTBCO0FBRXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lRLEVBQUFBLGFBTnNCLHlCQU1SQyxRQU5RLEVBTUU7QUFDcEIsU0FBS0MsT0FBTCxDQUFhLEVBQWIsRUFBaUJELFFBQWpCO0FBQ0gsR0FScUI7O0FBVXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQWhCc0IsbUJBZ0JkQyxNQWhCYyxFQWdCTkYsUUFoQk0sRUFnQkk7QUFDdEI7QUFDQSxRQUFJLE9BQU9FLE1BQVAsS0FBa0IsVUFBdEIsRUFBa0M7QUFDOUJGLE1BQUFBLFFBQVEsR0FBR0UsTUFBWDtBQUNBQSxNQUFBQSxNQUFNLEdBQUcsRUFBVDtBQUNIOztBQUVELFdBQU8sS0FBS0MsT0FBTCxDQUFhRCxNQUFNLElBQUksRUFBdkIsRUFBMkJGLFFBQTNCLENBQVA7QUFDSCxHQXhCcUI7O0FBMEJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsU0FoQ3NCLHFCQWdDWkMsRUFoQ1ksRUFnQ1JMLFFBaENRLEVBZ0NFO0FBQ3BCO0FBQ0EsUUFBTU0sS0FBSyxHQUFHLENBQUNELEVBQUQsSUFBT0EsRUFBRSxLQUFLLEVBQWQsSUFBb0JBLEVBQUUsS0FBSyxLQUF6Qzs7QUFFQSxRQUFJQyxLQUFKLEVBQVc7QUFDUCxhQUFPLEtBQUtDLGdCQUFMLENBQXNCLFlBQXRCLEVBQW9DLEVBQXBDLEVBQXdDUCxRQUF4QyxDQUFQO0FBQ0gsS0FGRCxNQUVPO0FBQ0gsYUFBTyxLQUFLRyxPQUFMLENBQWEsRUFBYixFQUFpQkgsUUFBakIsRUFBMkJLLEVBQTNCLENBQVA7QUFDSDtBQUNKLEdBekNxQjs7QUEyQ3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSVQsRUFBQUEsV0FoRHNCLHVCQWdEVkksUUFoRFUsRUFnREE7QUFDbEIsV0FBTyxLQUFLTyxnQkFBTCxDQUFzQixhQUF0QixFQUFxQyxFQUFyQyxFQUF5Q1AsUUFBekMsRUFBbUQsTUFBbkQsQ0FBUDtBQUNILEdBbERxQjs7QUFvRHRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJUSxFQUFBQSxZQTFEc0Isd0JBMERUSCxFQTFEUyxFQTBETEwsUUExREssRUEwREs7QUFDdkIsV0FBTyxLQUFLUyxVQUFMLENBQWdCVCxRQUFoQixFQUEwQkssRUFBMUIsQ0FBUDtBQUNIO0FBNURxQixDQUExQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGksIENvbmZpZywgUGJ4QXBpQ2xpZW50LCAkICovXG5cbi8qKlxuICogQXBpS2V5c0FQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgQVBJIGtleXMgbWFuYWdlbWVudFxuICpcbiAqIFByb3ZpZGVzIGEgY2xlYW4gaW50ZXJmYWNlIGZvciBBUEkga2V5cyBvcGVyYXRpb25zIHVzaW5nIHRoZSBuZXcgUkVTVGZ1bCBBUEkuXG4gKlxuICogQGNsYXNzIEFwaUtleXNBUEkgXG4gKi9cbmNvbnN0IEFwaUtleXNBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9hcGkta2V5cycsXG4gICAgY3VzdG9tTWV0aG9kczoge1xuICAgICAgICBnZXREZWZhdWx0OiAnOmdldERlZmF1bHQnLFxuICAgICAgICBnZW5lcmF0ZUtleTogJzpnZW5lcmF0ZUtleSdcbiAgICB9XG59KTtcblxuLy8gQWRkIG1ldGhvZCBhbGlhc2VzIGZvciBjb21wYXRpYmlsaXR5IGFuZCBlYXNpZXIgdXNlXG5PYmplY3QuYXNzaWduKEFwaUtleXNBUEksIHtcblxuICAgIC8qKlxuICAgICAqIEdldCBuZXcgcmVjb3JkcyBmb3IgRGF0YVRhYmxlIChhbGlhcyBmb3IgZ2V0TGlzdClcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIEZ1bmN0aW9uIHRvIGNhbGwgd2l0aCByZXNwb25zZSBkYXRhXG4gICAgICovXG4gICAgZ2V0TmV3UmVjb3JkcyhjYWxsYmFjaykge1xuICAgICAgICB0aGlzLmdldExpc3Qoe30sIGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGxpc3Qgb2YgYWxsIEFQSSBrZXlzXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogR0VUIC9hcGkta2V5c1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBRdWVyeSBwYXJhbWV0ZXJzIChsaW1pdCwgb2Zmc2V0LCBzZWFyY2gsIGV0Yy4pXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldExpc3QocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBTdXBwb3J0IG9sZCBzaWduYXR1cmUgd2hlcmUgY2FsbGJhY2sgaXMgdGhlIGZpcnN0IHBhcmFtZXRlclxuICAgICAgICBpZiAodHlwZW9mIHBhcmFtcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBwYXJhbXM7XG4gICAgICAgICAgICBwYXJhbXMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEdldChwYXJhbXMgfHwge30sIGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBieSBJRFxuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IEdFVCAvYXBpLWtleXMve2lkfSBvciBHRVQgL2FwaS1rZXlzOmdldERlZmF1bHQgZm9yIG5ld1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ld1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRSZWNvcmQoaWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIFVzZSA6Z2V0RGVmYXVsdCBmb3IgbmV3IHJlY29yZHMsIG90aGVyd2lzZSBHRVQgYnkgSURcbiAgICAgICAgY29uc3QgaXNOZXcgPSAhaWQgfHwgaWQgPT09ICcnIHx8IGlkID09PSAnbmV3JztcblxuICAgICAgICBpZiAoaXNOZXcpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldERlZmF1bHQnLCB7fSwgY2FsbGJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEdldCh7fSwgY2FsbGJhY2ssIGlkKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhIG5ldyBBUEkga2V5XG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogUE9TVCAvYXBpLWtleXM6Z2VuZXJhdGVLZXlcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2VuZXJhdGVLZXkoY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2VuZXJhdGVLZXknLCB7fSwgY2FsbGJhY2ssICdQT1NUJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSByZWNvcmRcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBERUxFVEUgL2FwaS1rZXlzL3tpZH1cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBSZWNvcmQgSURcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkKGlkLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWxsRGVsZXRlKGNhbGxiYWNrLCBpZCk7XG4gICAgfVxufSk7Il19