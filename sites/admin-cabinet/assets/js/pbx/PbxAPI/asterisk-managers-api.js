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
 * AsteriskManagersAPI - REST API v3 client for Asterisk managers management
 *
 * Provides a clean interface for Asterisk managers operations using the new RESTful API.
 * Asterisk managers are used for AMI (Asterisk Manager Interface) access control.
 *
 * @class AsteriskManagersAPI
 */
var AsteriskManagersAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/asterisk-managers',
  customMethods: {
    getDefault: ':getDefault',
    copy: ':copy',
    getForSelect: ':getForSelect'
  }
}); // Add method aliases for compatibility and easier use

Object.assign(AsteriskManagersAPI, {
  /**
   * Get new records for DataTable (alias for getList)
   * @param {Function} callback - Function to call with response data
   */
  getNewRecords: function getNewRecords(callback) {
    this.getList({}, callback);
  },

  /**
   * Get list of all Asterisk managers
   * Uses v3 RESTful API: GET /asterisk-managers
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
   * Uses v3 RESTful API: GET /asterisk-managers/{id} or GET /asterisk-managers:getDefault for new
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
   * Delete record
   * Uses v3 RESTful API: DELETE /asterisk-managers/{id}
   * @param {string} id - Record ID
   * @param {function} callback - Callback function
   */
  deleteRecord: function deleteRecord(id, callback) {
    return this.callDelete(callback, id);
  },

  /**
   * Get copy data for an Asterisk manager by ID
   * Uses v3 RESTful API: GET /asterisk-managers/{id}:copy
   * @param {string} id - Manager ID to copy from
   * @param {function} callback - Callback function to handle response
   */
  getCopyData: function getCopyData(id, callback) {
    return this.callCustomMethod('copy', {}, callback, 'GET', id);
  },

  /**
   * Get managers formatted for dropdown selection
   * Uses v3 RESTful API: GET /asterisk-managers:getForSelect
   * @param {function} callback - Callback function
   */
  getForSelect: function getForSelect(callback) {
    return this.callCustomMethod('getForSelect', {}, function (response) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvYXN0ZXJpc2stbWFuYWdlcnMtYXBpLmpzIl0sIm5hbWVzIjpbIkFzdGVyaXNrTWFuYWdlcnNBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXREZWZhdWx0IiwiY29weSIsImdldEZvclNlbGVjdCIsIk9iamVjdCIsImFzc2lnbiIsImdldE5ld1JlY29yZHMiLCJjYWxsYmFjayIsImdldExpc3QiLCJwYXJhbXMiLCJjYWxsR2V0IiwiZ2V0UmVjb3JkIiwiaWQiLCJpc05ldyIsImNhbGxDdXN0b21NZXRob2QiLCJkZWxldGVSZWNvcmQiLCJjYWxsRGVsZXRlIiwiZ2V0Q29weURhdGEiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsbUJBQW1CLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUN6Q0MsRUFBQUEsUUFBUSxFQUFFLG1DQUQrQjtBQUV6Q0MsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFVBQVUsRUFBRSxhQUREO0FBRVhDLElBQUFBLElBQUksRUFBRSxPQUZLO0FBR1hDLElBQUFBLFlBQVksRUFBRTtBQUhIO0FBRjBCLENBQWpCLENBQTVCLEMsQ0FTQTs7QUFDQUMsTUFBTSxDQUFDQyxNQUFQLENBQWNSLG1CQUFkLEVBQW1DO0FBRS9CO0FBQ0o7QUFDQTtBQUNBO0FBQ0lTLEVBQUFBLGFBTitCLHlCQU1qQkMsUUFOaUIsRUFNUDtBQUNwQixTQUFLQyxPQUFMLENBQWEsRUFBYixFQUFpQkQsUUFBakI7QUFDSCxHQVI4Qjs7QUFVL0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE9BaEIrQixtQkFnQnZCQyxNQWhCdUIsRUFnQmZGLFFBaEJlLEVBZ0JMO0FBQ3RCO0FBQ0EsUUFBSSxPQUFPRSxNQUFQLEtBQWtCLFVBQXRCLEVBQWtDO0FBQzlCRixNQUFBQSxRQUFRLEdBQUdFLE1BQVg7QUFDQUEsTUFBQUEsTUFBTSxHQUFHLEVBQVQ7QUFDSDs7QUFFRCxXQUFPLEtBQUtDLE9BQUwsQ0FBYUQsTUFBTSxJQUFJLEVBQXZCLEVBQTJCRixRQUEzQixDQUFQO0FBQ0gsR0F4QjhCOztBQTBCL0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLFNBaEMrQixxQkFnQ3JCQyxFQWhDcUIsRUFnQ2pCTCxRQWhDaUIsRUFnQ1A7QUFDcEI7QUFDQSxRQUFNTSxLQUFLLEdBQUcsQ0FBQ0QsRUFBRCxJQUFPQSxFQUFFLEtBQUssRUFBZCxJQUFvQkEsRUFBRSxLQUFLLEtBQXpDOztBQUVBLFFBQUlDLEtBQUosRUFBVztBQUNQLGFBQU8sS0FBS0MsZ0JBQUwsQ0FBc0IsWUFBdEIsRUFBb0MsRUFBcEMsRUFBd0NQLFFBQXhDLENBQVA7QUFDSCxLQUZELE1BRU87QUFDSCxhQUFPLEtBQUtHLE9BQUwsQ0FBYSxFQUFiLEVBQWlCSCxRQUFqQixFQUEyQkssRUFBM0IsQ0FBUDtBQUNIO0FBQ0osR0F6QzhCOztBQTJDL0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFlBakQrQix3QkFpRGxCSCxFQWpEa0IsRUFpRGRMLFFBakRjLEVBaURKO0FBQ3ZCLFdBQU8sS0FBS1MsVUFBTCxDQUFnQlQsUUFBaEIsRUFBMEJLLEVBQTFCLENBQVA7QUFDSCxHQW5EOEI7O0FBcUQvQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsV0EzRCtCLHVCQTJEbkJMLEVBM0RtQixFQTJEZkwsUUEzRGUsRUEyREw7QUFDdEIsV0FBTyxLQUFLTyxnQkFBTCxDQUFzQixNQUF0QixFQUE4QixFQUE5QixFQUFrQ1AsUUFBbEMsRUFBNEMsS0FBNUMsRUFBbURLLEVBQW5ELENBQVA7QUFDSCxHQTdEOEI7O0FBK0QvQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lULEVBQUFBLFlBcEUrQix3QkFvRWxCSSxRQXBFa0IsRUFvRVI7QUFDbkIsV0FBTyxLQUFLTyxnQkFBTCxDQUFzQixjQUF0QixFQUFzQyxFQUF0QyxFQUEwQyxVQUFDSSxRQUFELEVBQWM7QUFDM0QsVUFBSUEsUUFBUSxDQUFDQyxNQUFiLEVBQXFCO0FBQ2pCWixRQUFBQSxRQUFRLENBQUNXLFFBQUQsQ0FBUjtBQUNILE9BRkQsTUFFTztBQUNIWCxRQUFBQSxRQUFRLENBQUM7QUFBQ1ksVUFBQUEsTUFBTSxFQUFFLEtBQVQ7QUFBZ0JDLFVBQUFBLElBQUksRUFBRTtBQUF0QixTQUFELENBQVI7QUFDSDtBQUNKLEtBTk0sQ0FBUDtBQU9IO0FBNUU4QixDQUFuQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGksIENvbmZpZywgUGJ4QXBpQ2xpZW50LCAkICovXG5cbi8qKlxuICogQXN0ZXJpc2tNYW5hZ2Vyc0FQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgQXN0ZXJpc2sgbWFuYWdlcnMgbWFuYWdlbWVudFxuICpcbiAqIFByb3ZpZGVzIGEgY2xlYW4gaW50ZXJmYWNlIGZvciBBc3RlcmlzayBtYW5hZ2VycyBvcGVyYXRpb25zIHVzaW5nIHRoZSBuZXcgUkVTVGZ1bCBBUEkuXG4gKiBBc3RlcmlzayBtYW5hZ2VycyBhcmUgdXNlZCBmb3IgQU1JIChBc3RlcmlzayBNYW5hZ2VyIEludGVyZmFjZSkgYWNjZXNzIGNvbnRyb2wuXG4gKlxuICogQGNsYXNzIEFzdGVyaXNrTWFuYWdlcnNBUElcbiAqL1xuY29uc3QgQXN0ZXJpc2tNYW5hZ2Vyc0FQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL2FzdGVyaXNrLW1hbmFnZXJzJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIGdldERlZmF1bHQ6ICc6Z2V0RGVmYXVsdCcsXG4gICAgICAgIGNvcHk6ICc6Y29weScsXG4gICAgICAgIGdldEZvclNlbGVjdDogJzpnZXRGb3JTZWxlY3QnXG4gICAgfVxufSk7XG5cbi8vIEFkZCBtZXRob2QgYWxpYXNlcyBmb3IgY29tcGF0aWJpbGl0eSBhbmQgZWFzaWVyIHVzZVxuT2JqZWN0LmFzc2lnbihBc3Rlcmlza01hbmFnZXJzQVBJLCB7XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbmV3IHJlY29yZHMgZm9yIERhdGFUYWJsZSAoYWxpYXMgZm9yIGdldExpc3QpXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBGdW5jdGlvbiB0byBjYWxsIHdpdGggcmVzcG9uc2UgZGF0YVxuICAgICAqL1xuICAgIGdldE5ld1JlY29yZHMoY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5nZXRMaXN0KHt9LCBjYWxsYmFjayk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBsaXN0IG9mIGFsbCBBc3RlcmlzayBtYW5hZ2Vyc1xuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IEdFVCAvYXN0ZXJpc2stbWFuYWdlcnNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gUXVlcnkgcGFyYW1ldGVycyAobGltaXQsIG9mZnNldCwgc2VhcmNoLCBldGMuKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRMaXN0KHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gU3VwcG9ydCBvbGQgc2lnbmF0dXJlIHdoZXJlIGNhbGxiYWNrIGlzIHRoZSBmaXJzdCBwYXJhbWV0ZXJcbiAgICAgICAgaWYgKHR5cGVvZiBwYXJhbXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gcGFyYW1zO1xuICAgICAgICAgICAgcGFyYW1zID0ge307XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5jYWxsR2V0KHBhcmFtcyB8fCB7fSwgY2FsbGJhY2spO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIGJ5IElEXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogR0VUIC9hc3Rlcmlzay1tYW5hZ2Vycy97aWR9IG9yIEdFVCAvYXN0ZXJpc2stbWFuYWdlcnM6Z2V0RGVmYXVsdCBmb3IgbmV3XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gUmVjb3JkIElEIG9yIGVtcHR5IHN0cmluZyBmb3IgbmV3XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFJlY29yZChpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gVXNlIDpnZXREZWZhdWx0IGZvciBuZXcgcmVjb3Jkcywgb3RoZXJ3aXNlIEdFVCBieSBJRFxuICAgICAgICBjb25zdCBpc05ldyA9ICFpZCB8fCBpZCA9PT0gJycgfHwgaWQgPT09ICduZXcnO1xuXG4gICAgICAgIGlmIChpc05ldykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0RGVmYXVsdCcsIHt9LCBjYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsR2V0KHt9LCBjYWxsYmFjaywgaWQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSByZWNvcmRcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBERUxFVEUgL2FzdGVyaXNrLW1hbmFnZXJzL3tpZH1cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBSZWNvcmQgSURcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkKGlkLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWxsRGVsZXRlKGNhbGxiYWNrLCBpZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBjb3B5IGRhdGEgZm9yIGFuIEFzdGVyaXNrIG1hbmFnZXIgYnkgSURcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBHRVQgL2FzdGVyaXNrLW1hbmFnZXJzL3tpZH06Y29weVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIE1hbmFnZXIgSUQgdG8gY29weSBmcm9tXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBnZXRDb3B5RGF0YShpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnY29weScsIHt9LCBjYWxsYmFjaywgJ0dFVCcsIGlkKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG1hbmFnZXJzIGZvcm1hdHRlZCBmb3IgZHJvcGRvd24gc2VsZWN0aW9uXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogR0VUIC9hc3Rlcmlzay1tYW5hZ2VyczpnZXRGb3JTZWxlY3RcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0Rm9yU2VsZWN0KGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldEZvclNlbGVjdCcsIHt9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiBbXX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59KTsiXX0=