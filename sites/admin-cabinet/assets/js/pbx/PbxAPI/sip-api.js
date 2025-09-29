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

/* global PbxApiClient, Config, PbxApi, globalTranslate */

/**
 * SipAPI - REST API v3 client for SIP device status monitoring
 *
 * Provides a clean interface for SIP device operations using the new RESTful API.
 * Handles device registration statuses, connection monitoring, and statistics.
 *
 * @class SipAPI
 */
var SipAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/sip',
  customMethods: {
    getStatuses: ':getStatuses',
    getStatus: ':getStatus',
    forceCheck: ':forceCheck',
    getHistory: ':getHistory',
    getStats: ':getStats',
    getPeersStatuses: ':getPeersStatuses',
    getRegistry: ':getRegistry',
    getSecret: ':getSecret'
  }
}); // Add method implementations to SipAPI

Object.assign(SipAPI, {
  /**
   * Get all extension statuses
   * @param {function|object} callbackOrOptions - Either callback function or options object
   * @param {function} [callback] - Callback function when first param is options
   */
  getStatuses: function getStatuses(callbackOrOptions, callback) {
    var options = {};
    var cb = callback; // Handle overloaded parameters

    if (typeof callbackOrOptions === 'function') {
      cb = callbackOrOptions;
    } else if (_typeof(callbackOrOptions) === 'object') {
      options = callbackOrOptions; // callback must be provided as second parameter when first is options

      if (typeof callback !== 'function') {
        console.error('SipAPI.getStatuses: callback function required when options provided');
        return;
      }
    } // Use GET method for reading data


    return this.callCustomMethod('getStatuses', options, cb);
  },

  /**
   * Get status for specific extension
   * @param {string} extension - Extension number
   * @param {function} callback - Callback function to handle response
   */
  getStatus: function getStatus(extension, callback) {
    if (!extension) {
      console.error('SipAPI.getStatus: extension parameter is required');
      if (callback) callback({
        result: false,
        messages: {
          error: ['Extension parameter is required']
        }
      });
      return;
    }

    return this.callCustomMethod('getStatus', {}, callback, 'GET', extension);
  },

  /**
   * Force status check for extension(s)
   * @param {string|function} extensionOrCallback - Extension number or callback for all extensions
   * @param {function} [callback] - Callback function when first param is extension
   */
  forceCheck: function forceCheck(extensionOrCallback, callback) {
    // Handle overloaded parameters
    if (typeof extensionOrCallback === 'function') {
      // Force check for all extensions
      return this.callCustomMethod('forceCheck', {}, extensionOrCallback, 'POST');
    } else {
      // Force check for specific extension
      var extension = extensionOrCallback;

      if (!extension) {
        console.error('SipAPI.forceCheck: extension parameter is required');
        if (callback) callback({
          result: false,
          messages: {
            error: ['Extension parameter is required']
          }
        });
        return;
      }

      return this.callCustomMethod('forceCheck', {}, callback, 'POST', extension);
    }
  },

  /**
   * Get extension history
   * @param {string} extension - Extension number
   * @param {object} options - Options (limit, offset, period)
   * @param {function} callback - Callback function to handle response
   */
  getHistory: function getHistory(extension) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var callback = arguments.length > 2 ? arguments[2] : undefined;

    // Handle overloaded parameters
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (!extension) {
      console.error('SipAPI.getHistory: extension parameter is required');
      if (callback) callback({
        result: false,
        messages: {
          error: ['Extension parameter is required']
        }
      });
      return;
    }

    return this.callCustomMethod('getHistory', options, callback, 'GET', extension);
  },

  /**
   * Get extension statistics
   * @param {string} extension - Extension number
   * @param {object} options - Options (days, type)
   * @param {function} callback - Callback function to handle response
   */
  getStats: function getStats(extension) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var callback = arguments.length > 2 ? arguments[2] : undefined;

    // Handle overloaded parameters
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (!extension) {
      console.error('SipAPI.getStats: extension parameter is required');
      if (callback) callback({
        result: false,
        messages: {
          error: ['Extension parameter is required']
        }
      });
      return;
    }

    return this.callCustomMethod('getStats', options, callback, 'GET', extension);
  },

  /**
   * Get SIP peers statuses (legacy compatibility)
   * @param {function} callback - Callback function
   */
  getPeersStatuses: function getPeersStatuses(callback) {
    return this.callCustomMethod('getPeersStatuses', {}, callback);
  },

  /**
   * Get SIP providers registry statuses
   * @param {function} callback - Callback function
   */
  getSipProvidersStatuses: function getSipProvidersStatuses(callback) {
    return this.callCustomMethod('getRegistry', {}, callback);
  },

  /**
   * Get SIP registry statuses (legacy compatibility)
   * @param {function} callback - Callback function
   */
  getRegistry: function getRegistry(callback) {
    return this.callCustomMethod('getRegistry', {}, callback);
  },

  /**
   * Get SIP secret for extension (legacy compatibility and v3 API)
   * @param {string} peer - Peer/extension number
   * @param {function} callback - Callback function
   */
  getSecret: function getSecret(peer, callback) {
    if (!peer) {
      console.error('SipAPI.getSecret: peer parameter is required');
      if (callback) callback({
        result: false,
        messages: {
          error: ['Peer parameter is required']
        }
      });
      return;
    }

    return this.callCustomMethod('getSecret', {}, callback, 'GET', peer);
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvc2lwLWFwaS5qcyJdLCJuYW1lcyI6WyJTaXBBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXRTdGF0dXNlcyIsImdldFN0YXR1cyIsImZvcmNlQ2hlY2siLCJnZXRIaXN0b3J5IiwiZ2V0U3RhdHMiLCJnZXRQZWVyc1N0YXR1c2VzIiwiZ2V0UmVnaXN0cnkiLCJnZXRTZWNyZXQiLCJPYmplY3QiLCJhc3NpZ24iLCJjYWxsYmFja09yT3B0aW9ucyIsImNhbGxiYWNrIiwib3B0aW9ucyIsImNiIiwiY29uc29sZSIsImVycm9yIiwiY2FsbEN1c3RvbU1ldGhvZCIsImV4dGVuc2lvbiIsInJlc3VsdCIsIm1lc3NhZ2VzIiwiZXh0ZW5zaW9uT3JDYWxsYmFjayIsImdldFNpcFByb3ZpZGVyc1N0YXR1c2VzIiwicGVlciJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE1BQU0sR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQzVCQyxFQUFBQSxRQUFRLEVBQUUscUJBRGtCO0FBRTVCQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsV0FBVyxFQUFFLGNBREY7QUFFWEMsSUFBQUEsU0FBUyxFQUFFLFlBRkE7QUFHWEMsSUFBQUEsVUFBVSxFQUFFLGFBSEQ7QUFJWEMsSUFBQUEsVUFBVSxFQUFFLGFBSkQ7QUFLWEMsSUFBQUEsUUFBUSxFQUFFLFdBTEM7QUFNWEMsSUFBQUEsZ0JBQWdCLEVBQUUsbUJBTlA7QUFPWEMsSUFBQUEsV0FBVyxFQUFFLGNBUEY7QUFRWEMsSUFBQUEsU0FBUyxFQUFFO0FBUkE7QUFGYSxDQUFqQixDQUFmLEMsQ0FjQTs7QUFDQUMs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UUFBOUMsQ0FBUDtBQUNILEdBbEhpQjs7QUFxSGxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lVLEVBQUFBLHVCQXpIa0IsbUNBeUhNVixRQXpITixFQXlIZ0I7QUFDOUIsV0FBTyxLQUFLSyxnQkFBTCxDQUFzQixhQUF0QixFQUFxQyxFQUFyQyxFQUF5Q0wsUUFBekMsQ0FBUDtBQUNILEdBM0hpQjs7QUE2SGxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lMLEVBQUFBLFdBaklrQix1QkFpSU5LLFFBaklNLEVBaUlJO0FBQ2xCLFdBQU8sS0FBS0ssZ0JBQUwsQ0FBc0IsYUFBdEIsRUFBcUMsRUFBckMsRUFBeUNMLFFBQXpDLENBQVA7QUFDSCxHQW5JaUI7O0FBcUlsQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lKLEVBQUFBLFNBMUlrQixxQkEwSVJlLElBMUlRLEVBMElGWCxRQTFJRSxFQTBJUTtBQUN0QixRQUFJLENBQUNXLElBQUwsRUFBVztBQUNQUixNQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYyw4Q0FBZDtBQUNBLFVBQUlKLFFBQUosRUFBY0EsUUFBUSxDQUFDO0FBQUNPLFFBQUFBLE1BQU0sRUFBRSxLQUFUO0FBQWdCQyxRQUFBQSxRQUFRLEVBQUU7QUFBQ0osVUFBQUEsS0FBSyxFQUFFLENBQUMsNEJBQUQ7QUFBUjtBQUExQixPQUFELENBQVI7QUFDZDtBQUNIOztBQUVELFdBQU8sS0FBS0MsZ0JBQUwsQ0FBc0IsV0FBdEIsRUFBbUMsRUFBbkMsRUFBdUNMLFFBQXZDLEVBQWlELEtBQWpELEVBQXdEVyxJQUF4RCxDQUFQO0FBQ0g7QUFsSmlCLENBQXRCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaUNsaWVudCwgQ29uZmlnLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSAqL1xuIFxuLyoqXG4gKiBTaXBBUEkgLSBSRVNUIEFQSSB2MyBjbGllbnQgZm9yIFNJUCBkZXZpY2Ugc3RhdHVzIG1vbml0b3JpbmdcbiAqXG4gKiBQcm92aWRlcyBhIGNsZWFuIGludGVyZmFjZSBmb3IgU0lQIGRldmljZSBvcGVyYXRpb25zIHVzaW5nIHRoZSBuZXcgUkVTVGZ1bCBBUEkuXG4gKiBIYW5kbGVzIGRldmljZSByZWdpc3RyYXRpb24gc3RhdHVzZXMsIGNvbm5lY3Rpb24gbW9uaXRvcmluZywgYW5kIHN0YXRpc3RpY3MuXG4gKlxuICogQGNsYXNzIFNpcEFQSVxuICovXG5jb25zdCBTaXBBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9zaXAnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0U3RhdHVzZXM6ICc6Z2V0U3RhdHVzZXMnLFxuICAgICAgICBnZXRTdGF0dXM6ICc6Z2V0U3RhdHVzJyxcbiAgICAgICAgZm9yY2VDaGVjazogJzpmb3JjZUNoZWNrJyxcbiAgICAgICAgZ2V0SGlzdG9yeTogJzpnZXRIaXN0b3J5JyxcbiAgICAgICAgZ2V0U3RhdHM6ICc6Z2V0U3RhdHMnLFxuICAgICAgICBnZXRQZWVyc1N0YXR1c2VzOiAnOmdldFBlZXJzU3RhdHVzZXMnLFxuICAgICAgICBnZXRSZWdpc3RyeTogJzpnZXRSZWdpc3RyeScsXG4gICAgICAgIGdldFNlY3JldDogJzpnZXRTZWNyZXQnXG4gICAgfVxufSk7XG5cbi8vIEFkZCBtZXRob2QgaW1wbGVtZW50YXRpb25zIHRvIFNpcEFQSVxuT2JqZWN0LmFzc2lnbihTaXBBUEksIHtcblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgZXh0ZW5zaW9uIHN0YXR1c2VzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbnxvYmplY3R9IGNhbGxiYWNrT3JPcHRpb25zIC0gRWl0aGVyIGNhbGxiYWNrIGZ1bmN0aW9uIG9yIG9wdGlvbnMgb2JqZWN0XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gZmlyc3QgcGFyYW0gaXMgb3B0aW9uc1xuICAgICAqL1xuICAgIGdldFN0YXR1c2VzKGNhbGxiYWNrT3JPcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgICBsZXQgb3B0aW9ucyA9IHt9O1xuICAgICAgICBsZXQgY2IgPSBjYWxsYmFjaztcblxuICAgICAgICAvLyBIYW5kbGUgb3ZlcmxvYWRlZCBwYXJhbWV0ZXJzXG4gICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2tPck9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNiID0gY2FsbGJhY2tPck9wdGlvbnM7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNhbGxiYWNrT3JPcHRpb25zID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgb3B0aW9ucyA9IGNhbGxiYWNrT3JPcHRpb25zO1xuICAgICAgICAgICAgLy8gY2FsbGJhY2sgbXVzdCBiZSBwcm92aWRlZCBhcyBzZWNvbmQgcGFyYW1ldGVyIHdoZW4gZmlyc3QgaXMgb3B0aW9uc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpcEFQSS5nZXRTdGF0dXNlczogY2FsbGJhY2sgZnVuY3Rpb24gcmVxdWlyZWQgd2hlbiBvcHRpb25zIHByb3ZpZGVkJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIEdFVCBtZXRob2QgZm9yIHJlYWRpbmcgZGF0YVxuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRTdGF0dXNlcycsIG9wdGlvbnMsIGNiKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHN0YXR1cyBmb3Igc3BlY2lmaWMgZXh0ZW5zaW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGdldFN0YXR1cyhleHRlbnNpb24sIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTaXBBUEkuZ2V0U3RhdHVzOiBleHRlbnNpb24gcGFyYW1ldGVyIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiBbJ0V4dGVuc2lvbiBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnXX19KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFN0YXR1cycsIHt9LCBjYWxsYmFjaywgJ0dFVCcsIGV4dGVuc2lvbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcmNlIHN0YXR1cyBjaGVjayBmb3IgZXh0ZW5zaW9uKHMpXG4gICAgICogQHBhcmFtIHtzdHJpbmd8ZnVuY3Rpb259IGV4dGVuc2lvbk9yQ2FsbGJhY2sgLSBFeHRlbnNpb24gbnVtYmVyIG9yIGNhbGxiYWNrIGZvciBhbGwgZXh0ZW5zaW9uc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gLSBDYWxsYmFjayBmdW5jdGlvbiB3aGVuIGZpcnN0IHBhcmFtIGlzIGV4dGVuc2lvblxuICAgICAqL1xuICAgIGZvcmNlQ2hlY2soZXh0ZW5zaW9uT3JDYWxsYmFjaywgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gSGFuZGxlIG92ZXJsb2FkZWQgcGFyYW1ldGVyc1xuICAgICAgICBpZiAodHlwZW9mIGV4dGVuc2lvbk9yQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIC8vIEZvcmNlIGNoZWNrIGZvciBhbGwgZXh0ZW5zaW9uc1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZm9yY2VDaGVjaycsIHt9LCBleHRlbnNpb25PckNhbGxiYWNrLCAnUE9TVCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yY2UgY2hlY2sgZm9yIHNwZWNpZmljIGV4dGVuc2lvblxuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gZXh0ZW5zaW9uT3JDYWxsYmFjaztcbiAgICAgICAgICAgIGlmICghZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignU2lwQVBJLmZvcmNlQ2hlY2s6IGV4dGVuc2lvbiBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiBbJ0V4dGVuc2lvbiBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnXX19KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdmb3JjZUNoZWNrJywge30sIGNhbGxiYWNrLCAnUE9TVCcsIGV4dGVuc2lvbik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGV4dGVuc2lvbiBoaXN0b3J5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIE9wdGlvbnMgKGxpbWl0LCBvZmZzZXQsIHBlcmlvZClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGdldEhpc3RvcnkoZXh0ZW5zaW9uLCBvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIEhhbmRsZSBvdmVybG9hZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWV4dGVuc2lvbikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignU2lwQVBJLmdldEhpc3Rvcnk6IGV4dGVuc2lvbiBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnRXh0ZW5zaW9uIHBhcmFtZXRlciBpcyByZXF1aXJlZCddfX0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0SGlzdG9yeScsIG9wdGlvbnMsIGNhbGxiYWNrLCAnR0VUJywgZXh0ZW5zaW9uKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGV4dGVuc2lvbiBzdGF0aXN0aWNzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIE9wdGlvbnMgKGRheXMsIHR5cGUpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBnZXRTdGF0cyhleHRlbnNpb24sIG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gSGFuZGxlIG92ZXJsb2FkZWQgcGFyYW1ldGVyc1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTaXBBUEkuZ2V0U3RhdHM6IGV4dGVuc2lvbiBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnRXh0ZW5zaW9uIHBhcmFtZXRlciBpcyByZXF1aXJlZCddfX0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0U3RhdHMnLCBvcHRpb25zLCBjYWxsYmFjaywgJ0dFVCcsIGV4dGVuc2lvbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBTSVAgcGVlcnMgc3RhdHVzZXMgKGxlZ2FjeSBjb21wYXRpYmlsaXR5KVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRQZWVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFBlZXJzU3RhdHVzZXMnLCB7fSwgY2FsbGJhY2spO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEdldCBTSVAgcHJvdmlkZXJzIHJlZ2lzdHJ5IHN0YXR1c2VzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFNpcFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFJlZ2lzdHJ5Jywge30sIGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IFNJUCByZWdpc3RyeSBzdGF0dXNlcyAobGVnYWN5IGNvbXBhdGliaWxpdHkpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFJlZ2lzdHJ5KGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFJlZ2lzdHJ5Jywge30sIGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IFNJUCBzZWNyZXQgZm9yIGV4dGVuc2lvbiAobGVnYWN5IGNvbXBhdGliaWxpdHkgYW5kIHYzIEFQSSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGVlciAtIFBlZXIvZXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRTZWNyZXQocGVlciwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCFwZWVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTaXBBUEkuZ2V0U2VjcmV0OiBwZWVyIHBhcmFtZXRlciBpcyByZXF1aXJlZCcpO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydQZWVyIHBhcmFtZXRlciBpcyByZXF1aXJlZCddfX0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0U2VjcmV0Jywge30sIGNhbGxiYWNrLCAnR0VUJywgcGVlcik7XG4gICAgfVxufSk7Il19