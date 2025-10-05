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
    getSecret: ':getSecret',
    getAuthFailureStats: ':getAuthFailureStats',
    clearAuthFailureStats: ':clearAuthFailureStats'
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
  },

  /**
   * Get authentication failure statistics for extension
   * @param {string} extension - Extension number
   * @param {function} callback - Callback function to handle response
   */
  getAuthFailureStats: function getAuthFailureStats(extension, callback) {
    if (!extension) {
      console.error('SipAPI.getAuthFailureStats: extension parameter is required');
      if (callback) callback({
        result: false,
        messages: {
          error: ['Extension parameter is required']
        }
      });
      return;
    }

    return this.callCustomMethod('getAuthFailureStats', {}, callback, 'GET', extension);
  },

  /**
   * Clear authentication failure statistics for extension
   * @param {string} extension - Extension number
   * @param {function} callback - Callback function to handle response
   */
  clearAuthFailureStats: function clearAuthFailureStats(extension, callback) {
    if (!extension) {
      console.error('SipAPI.clearAuthFailureStats: extension parameter is required');
      if (callback) callback({
        result: false,
        messages: {
          error: ['Extension parameter is required']
        }
      });
      return;
    }

    return this.callCustomMethod('clearAuthFailureStats', {}, callback, 'POST', extension);
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvc2lwLWFwaS5qcyJdLCJuYW1lcyI6WyJTaXBBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXRTdGF0dXNlcyIsImdldFN0YXR1cyIsImZvcmNlQ2hlY2siLCJnZXRIaXN0b3J5IiwiZ2V0U3RhdHMiLCJnZXRQZWVyc1N0YXR1c2VzIiwiZ2V0UmVnaXN0cnkiLCJnZXRTZWNyZXQiLCJnZXRBdXRoRmFpbHVyZVN0YXRzIiwiY2xlYXJBdXRoRmFpbHVyZVN0YXRzIiwiT2JqZWN0IiwiYXNzaWduIiwiY2FsbGJhY2tPck9wdGlvbnMiLCJjYWxsYmFjayIsIm9wdGlvbnMiLCJjYiIsImNvbnNvbGUiLCJlcnJvciIsImNhbGxDdXN0b21NZXRob2QiLCJleHRlbnNpb24iLCJyZXN1bHQiLCJtZXNzYWdlcyIsImV4dGVuc2lvbk9yQ2FsbGJhY2siLCJnZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsInBlZXIiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxNQUFNLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUM1QkMsRUFBQUEsUUFBUSxFQUFFLHFCQURrQjtBQUU1QkMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFdBQVcsRUFBRSxjQURGO0FBRVhDLElBQUFBLFNBQVMsRUFBRSxZQUZBO0FBR1hDLElBQUFBLFVBQVUsRUFBRSxhQUhEO0FBSVhDLElBQUFBLFVBQVUsRUFBRSxhQUpEO0FBS1hDLElBQUFBLFFBQVEsRUFBRSxXQUxDO0FBTVhDLElBQUFBLGdCQUFnQixFQUFFLG1CQU5QO0FBT1hDLElBQUFBLFdBQVcsRUFBRSxjQVBGO0FBUVhDLElBQUFBLFNBQVMsRUFBRSxZQVJBO0FBU1hDLElBQUFBLG1CQUFtQixFQUFFLHNCQVRWO0FBVVhDLElBQUFBLHFCQUFxQixFQUFFO0FBVlo7QUFGYSxDQUFqQixDQUFmLEMsQ0FnQkE7O0FBQ0FDLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjZixNQUFkLEVBQXNCO0FBRWxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsV0FQa0IsdUJBT05ZLGlCQVBNLEVBT2FDLFFBUGIsRUFPdUI7QUFDckMsUUFBSUMsT0FBTyxHQUFHLEVBQWQ7QUFDQSxRQUFJQyxFQUFFLEdBQUdGLFFBQVQsQ0FGcUMsQ0FJckM7O0FBQ0EsUUFBSSxPQUFPRCxpQkFBUCxLQUE2QixVQUFqQyxFQUE2QztBQUN6Q0csTUFBQUEsRUFBRSxHQUFHSCxpQkFBTDtBQUNILEtBRkQsTUFFTyxJQUFJLFFBQU9BLGlCQUFQLE1BQTZCLFFBQWpDLEVBQTJDO0FBQzlDRSxNQUFBQSxPQUFPLEdBQUdGLGlCQUFWLENBRDhDLENBRTlDOztBQUNBLFVBQUksT0FBT0MsUUFBUCxLQUFvQixVQUF4QixFQUFvQztBQUNoQ0csUUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsc0VBQWQ7QUFDQTtBQUNIO0FBQ0osS0Fkb0MsQ0FnQnJDOzs7QUFDQSxXQUFPLEtBQUtDLGdCQUFMLENBQXNCLGFBQXRCLEVBQXFDSixPQUFyQyxFQUE4Q0MsRUFBOUMsQ0FBUDtBQUNILEdBekJpQjs7QUEyQmxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWQsRUFBQUEsU0FoQ2tCLHFCQWdDUmtCLFNBaENRLEVBZ0NHTixRQWhDSCxFQWdDYTtBQUMzQixRQUFJLENBQUNNLFNBQUwsRUFBZ0I7QUFDWkgsTUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsbURBQWQ7QUFDQSxVQUFJSixRQUFKLEVBQWNBLFFBQVEsQ0FBQztBQUFDTyxRQUFBQSxNQUFNLEVBQUUsS0FBVDtBQUFnQkMsUUFBQUEsUUFBUSxFQUFFO0FBQUNKLFVBQUFBLEtBQUssRUFBRSxDQUFDLGlDQUFEO0FBQVI7QUFBMUIsT0FBRCxDQUFSO0FBQ2Q7QUFDSDs7QUFFRCxXQUFPLEtBQUtDLGdCQUFMLENBQXNCLFdBQXRCLEVBQW1DLEVBQW5DLEVBQXVDTCxRQUF2QyxFQUFpRCxLQUFqRCxFQUF3RE0sU0FBeEQsQ0FBUDtBQUNILEdBeENpQjs7QUEwQ2xCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWpCLEVBQUFBLFVBL0NrQixzQkErQ1BvQixtQkEvQ08sRUErQ2NULFFBL0NkLEVBK0N3QjtBQUN0QztBQUNBLFFBQUksT0FBT1MsbUJBQVAsS0FBK0IsVUFBbkMsRUFBK0M7QUFDM0M7QUFDQSxhQUFPLEtBQUtKLGdCQUFMLENBQXNCLFlBQXRCLEVBQW9DLEVBQXBDLEVBQXdDSSxtQkFBeEMsRUFBNkQsTUFBN0QsQ0FBUDtBQUNILEtBSEQsTUFHTztBQUNIO0FBQ0EsVUFBTUgsU0FBUyxHQUFHRyxtQkFBbEI7O0FBQ0EsVUFBSSxDQUFDSCxTQUFMLEVBQWdCO0FBQ1pILFFBQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjLG9EQUFkO0FBQ0EsWUFBSUosUUFBSixFQUFjQSxRQUFRLENBQUM7QUFBQ08sVUFBQUEsTUFBTSxFQUFFLEtBQVQ7QUFBZ0JDLFVBQUFBLFFBQVEsRUFBRTtBQUFDSixZQUFBQSxLQUFLLEVBQUUsQ0FBQyxpQ0FBRDtBQUFSO0FBQTFCLFNBQUQsQ0FBUjtBQUNkO0FBQ0g7O0FBQ0QsYUFBTyxLQUFLQyxnQkFBTCxDQUFzQixZQUF0QixFQUFvQyxFQUFwQyxFQUF3Q0wsUUFBeEMsRUFBa0QsTUFBbEQsRUFBMERNLFNBQTFELENBQVA7QUFDSDtBQUNKLEdBOURpQjs7QUFnRWxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJaEIsRUFBQUEsVUF0RWtCLHNCQXNFUGdCLFNBdEVPLEVBc0U0QjtBQUFBLFFBQXhCTCxPQUF3Qix1RUFBZCxFQUFjO0FBQUEsUUFBVkQsUUFBVTs7QUFDMUM7QUFDQSxRQUFJLE9BQU9DLE9BQVAsS0FBbUIsVUFBdkIsRUFBbUM7QUFDL0JELE1BQUFBLFFBQVEsR0FBR0MsT0FBWDtBQUNBQSxNQUFBQSxPQUFPLEdBQUcsRUFBVjtBQUNIOztBQUVELFFBQUksQ0FBQ0ssU0FBTCxFQUFnQjtBQUNaSCxNQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYyxvREFBZDtBQUNBLFVBQUlKLFFBQUosRUFBY0EsUUFBUSxDQUFDO0FBQUNPLFFBQUFBLE1BQU0sRUFBRSxLQUFUO0FBQWdCQyxRQUFBQSxRQUFRLEVBQUU7QUFBQ0osVUFBQUEsS0FBSyxFQUFFLENBQUMsaUNBQUQ7QUFBUjtBQUExQixPQUFELENBQVI7QUFDZDtBQUNIOztBQUVELFdBQU8sS0FBS0MsZ0JBQUwsQ0FBc0IsWUFBdEIsRUFBb0NKLE9BQXBDLEVBQTZDRCxRQUE3QyxFQUF1RCxLQUF2RCxFQUE4RE0sU0FBOUQsQ0FBUDtBQUNILEdBcEZpQjs7QUFzRmxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJZixFQUFBQSxRQTVGa0Isb0JBNEZUZSxTQTVGUyxFQTRGMEI7QUFBQSxRQUF4QkwsT0FBd0IsdUVBQWQsRUFBYztBQUFBLFFBQVZELFFBQVU7O0FBQ3hDO0FBQ0EsUUFBSSxPQUFPQyxPQUFQLEtBQW1CLFVBQXZCLEVBQW1DO0FBQy9CRCxNQUFBQSxRQUFRLEdBQUdDLE9BQVg7QUFDQUEsTUFBQUEsT0FBTyxHQUFHLEVBQVY7QUFDSDs7QUFFRCxRQUFJLENBQUNLLFNBQUwsRUFBZ0I7QUFDWkgsTUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsa0RBQWQ7QUFDQSxVQUFJSixRQUFKLEVBQWNBLFFBQVEsQ0FBQztBQUFDTyxRQUFBQSxNQUFNLEVBQUUsS0FBVDtBQUFnQkMsUUFBQUEsUUFBUSxFQUFFO0FBQUNKLFVBQUFBLEtBQUssRUFBRSxDQUFDLGlDQUFEO0FBQVI7QUFBMUIsT0FBRCxDQUFSO0FBQ2Q7QUFDSDs7QUFFRCxXQUFPLEtBQUtDLGdCQUFMLENBQXNCLFVBQXRCLEVBQWtDSixPQUFsQyxFQUEyQ0QsUUFBM0MsRUFBcUQsS0FBckQsRUFBNERNLFNBQTVELENBQVA7QUFDSCxHQTFHaUI7O0FBNEdsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJZCxFQUFBQSxnQkFoSGtCLDRCQWdIRFEsUUFoSEMsRUFnSFM7QUFDdkIsV0FBTyxLQUFLSyxnQkFBTCxDQUFzQixrQkFBdEIsRUFBMEMsRUFBMUMsRUFBOENMLFFBQTlDLENBQVA7QUFDSCxHQWxIaUI7O0FBcUhsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJVSxFQUFBQSx1QkF6SGtCLG1DQXlITVYsUUF6SE4sRUF5SGdCO0FBQzlCLFdBQU8sS0FBS0ssZ0JBQUwsQ0FBc0IsYUFBdEIsRUFBcUMsRUFBckMsRUFBeUNMLFFBQXpDLENBQVA7QUFDSCxHQTNIaUI7O0FBNkhsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJUCxFQUFBQSxXQWpJa0IsdUJBaUlOTyxRQWpJTSxFQWlJSTtBQUNsQixXQUFPLEtBQUtLLGdCQUFMLENBQXNCLGFBQXRCLEVBQXFDLEVBQXJDLEVBQXlDTCxRQUF6QyxDQUFQO0FBQ0gsR0FuSWlCOztBQXFJbEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJTixFQUFBQSxTQTFJa0IscUJBMElSaUIsSUExSVEsRUEwSUZYLFFBMUlFLEVBMElRO0FBQ3RCLFFBQUksQ0FBQ1csSUFBTCxFQUFXO0FBQ1BSLE1BQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjLDhDQUFkO0FBQ0EsVUFBSUosUUFBSixFQUFjQSxRQUFRLENBQUM7QUFBQ08sUUFBQUEsTUFBTSxFQUFFLEtBQVQ7QUFBZ0JDLFFBQUFBLFFBQVEsRUFBRTtBQUFDSixVQUFBQSxLQUFLLEVBQUUsQ0FBQyw0QkFBRDtBQUFSO0FBQTFCLE9BQUQsQ0FBUjtBQUNkO0FBQ0g7O0FBRUQsV0FBTyxLQUFLQyxnQkFBTCxDQUFzQixXQUF0QixFQUFtQyxFQUFuQyxFQUF1Q0wsUUFBdkMsRUFBaUQsS0FBakQsRUFBd0RXLElBQXhELENBQVA7QUFDSCxHQWxKaUI7O0FBb0psQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0loQixFQUFBQSxtQkF6SmtCLCtCQXlKRVcsU0F6SkYsRUF5SmFOLFFBekpiLEVBeUp1QjtBQUNyQyxRQUFJLENBQUNNLFNBQUwsRUFBZ0I7QUFDWkgsTUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsNkRBQWQ7QUFDQSxVQUFJSixRQUFKLEVBQWNBLFFBQVEsQ0FBQztBQUFDTyxRQUFBQSxNQUFNLEVBQUUsS0FBVDtBQUFnQkMsUUFBQUEsUUFBUSxFQUFFO0FBQUNKLFVBQUFBLEtBQUssRUFBRSxDQUFDLGlDQUFEO0FBQVI7QUFBMUIsT0FBRCxDQUFSO0FBQ2Q7QUFDSDs7QUFFRCxXQUFPLEtBQUtDLGdCQUFMLENBQXNCLHFCQUF0QixFQUE2QyxFQUE3QyxFQUFpREwsUUFBakQsRUFBMkQsS0FBM0QsRUFBa0VNLFNBQWxFLENBQVA7QUFDSCxHQWpLaUI7O0FBbUtsQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lWLEVBQUFBLHFCQXhLa0IsaUNBd0tJVSxTQXhLSixFQXdLZU4sUUF4S2YsRUF3S3lCO0FBQ3ZDLFFBQUksQ0FBQ00sU0FBTCxFQUFnQjtBQUNaSCxNQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYywrREFBZDtBQUNBLFVBQUlKLFFBQUosRUFBY0EsUUFBUSxDQUFDO0FBQUNPLFFBQUFBLE1BQU0sRUFBRSxLQUFUO0FBQWdCQyxRQUFBQSxRQUFRLEVBQUU7QUFBQ0osVUFBQUEsS0FBSyxFQUFFLENBQUMsaUNBQUQ7QUFBUjtBQUExQixPQUFELENBQVI7QUFDZDtBQUNIOztBQUVELFdBQU8sS0FBS0MsZ0JBQUwsQ0FBc0IsdUJBQXRCLEVBQStDLEVBQS9DLEVBQW1ETCxRQUFuRCxFQUE2RCxNQUE3RCxFQUFxRU0sU0FBckUsQ0FBUDtBQUNIO0FBaExpQixDQUF0QiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGlDbGllbnQsIENvbmZpZywgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUgKi9cbiBcbi8qKlxuICogU2lwQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBTSVAgZGV2aWNlIHN0YXR1cyBtb25pdG9yaW5nXG4gKlxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIFNJUCBkZXZpY2Ugb3BlcmF0aW9ucyB1c2luZyB0aGUgbmV3IFJFU1RmdWwgQVBJLlxuICogSGFuZGxlcyBkZXZpY2UgcmVnaXN0cmF0aW9uIHN0YXR1c2VzLCBjb25uZWN0aW9uIG1vbml0b3JpbmcsIGFuZCBzdGF0aXN0aWNzLlxuICpcbiAqIEBjbGFzcyBTaXBBUElcbiAqL1xuY29uc3QgU2lwQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvc2lwJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIGdldFN0YXR1c2VzOiAnOmdldFN0YXR1c2VzJyxcbiAgICAgICAgZ2V0U3RhdHVzOiAnOmdldFN0YXR1cycsXG4gICAgICAgIGZvcmNlQ2hlY2s6ICc6Zm9yY2VDaGVjaycsXG4gICAgICAgIGdldEhpc3Rvcnk6ICc6Z2V0SGlzdG9yeScsXG4gICAgICAgIGdldFN0YXRzOiAnOmdldFN0YXRzJyxcbiAgICAgICAgZ2V0UGVlcnNTdGF0dXNlczogJzpnZXRQZWVyc1N0YXR1c2VzJyxcbiAgICAgICAgZ2V0UmVnaXN0cnk6ICc6Z2V0UmVnaXN0cnknLFxuICAgICAgICBnZXRTZWNyZXQ6ICc6Z2V0U2VjcmV0JyxcbiAgICAgICAgZ2V0QXV0aEZhaWx1cmVTdGF0czogJzpnZXRBdXRoRmFpbHVyZVN0YXRzJyxcbiAgICAgICAgY2xlYXJBdXRoRmFpbHVyZVN0YXRzOiAnOmNsZWFyQXV0aEZhaWx1cmVTdGF0cydcbiAgICB9XG59KTtcblxuLy8gQWRkIG1ldGhvZCBpbXBsZW1lbnRhdGlvbnMgdG8gU2lwQVBJXG5PYmplY3QuYXNzaWduKFNpcEFQSSwge1xuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBleHRlbnNpb24gc3RhdHVzZXNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufG9iamVjdH0gY2FsbGJhY2tPck9wdGlvbnMgLSBFaXRoZXIgY2FsbGJhY2sgZnVuY3Rpb24gb3Igb3B0aW9ucyBvYmplY3RcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gd2hlbiBmaXJzdCBwYXJhbSBpcyBvcHRpb25zXG4gICAgICovXG4gICAgZ2V0U3RhdHVzZXMoY2FsbGJhY2tPck9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGxldCBvcHRpb25zID0ge307XG4gICAgICAgIGxldCBjYiA9IGNhbGxiYWNrO1xuXG4gICAgICAgIC8vIEhhbmRsZSBvdmVybG9hZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFja09yT3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2IgPSBjYWxsYmFja09yT3B0aW9ucztcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgY2FsbGJhY2tPck9wdGlvbnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBvcHRpb25zID0gY2FsbGJhY2tPck9wdGlvbnM7XG4gICAgICAgICAgICAvLyBjYWxsYmFjayBtdXN0IGJlIHByb3ZpZGVkIGFzIHNlY29uZCBwYXJhbWV0ZXIgd2hlbiBmaXJzdCBpcyBvcHRpb25zXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignU2lwQVBJLmdldFN0YXR1c2VzOiBjYWxsYmFjayBmdW5jdGlvbiByZXF1aXJlZCB3aGVuIG9wdGlvbnMgcHJvdmlkZWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgR0VUIG1ldGhvZCBmb3IgcmVhZGluZyBkYXRhXG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFN0YXR1c2VzJywgb3B0aW9ucywgY2IpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc3RhdHVzIGZvciBzcGVjaWZpYyBleHRlbnNpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uIC0gRXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZ2V0U3RhdHVzKGV4dGVuc2lvbiwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCFleHRlbnNpb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpcEFQSS5nZXRTdGF0dXM6IGV4dGVuc2lvbiBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnRXh0ZW5zaW9uIHBhcmFtZXRlciBpcyByZXF1aXJlZCddfX0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0U3RhdHVzJywge30sIGNhbGxiYWNrLCAnR0VUJywgZXh0ZW5zaW9uKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9yY2Ugc3RhdHVzIGNoZWNrIGZvciBleHRlbnNpb24ocylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xmdW5jdGlvbn0gZXh0ZW5zaW9uT3JDYWxsYmFjayAtIEV4dGVuc2lvbiBudW1iZXIgb3IgY2FsbGJhY2sgZm9yIGFsbCBleHRlbnNpb25zXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gZmlyc3QgcGFyYW0gaXMgZXh0ZW5zaW9uXG4gICAgICovXG4gICAgZm9yY2VDaGVjayhleHRlbnNpb25PckNhbGxiYWNrLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBIYW5kbGUgb3ZlcmxvYWRlZCBwYXJhbWV0ZXJzXG4gICAgICAgIGlmICh0eXBlb2YgZXh0ZW5zaW9uT3JDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgLy8gRm9yY2UgY2hlY2sgZm9yIGFsbCBleHRlbnNpb25zXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdmb3JjZUNoZWNrJywge30sIGV4dGVuc2lvbk9yQ2FsbGJhY2ssICdQT1NUJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3JjZSBjaGVjayBmb3Igc3BlY2lmaWMgZXh0ZW5zaW9uXG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb24gPSBleHRlbnNpb25PckNhbGxiYWNrO1xuICAgICAgICAgICAgaWYgKCFleHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTaXBBUEkuZm9yY2VDaGVjazogZXh0ZW5zaW9uIHBhcmFtZXRlciBpcyByZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnRXh0ZW5zaW9uIHBhcmFtZXRlciBpcyByZXF1aXJlZCddfX0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2ZvcmNlQ2hlY2snLCB7fSwgY2FsbGJhY2ssICdQT1NUJywgZXh0ZW5zaW9uKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgZXh0ZW5zaW9uIGhpc3RvcnlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uIC0gRXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gT3B0aW9ucyAobGltaXQsIG9mZnNldCwgcGVyaW9kKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZ2V0SGlzdG9yeShleHRlbnNpb24sIG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gSGFuZGxlIG92ZXJsb2FkZWQgcGFyYW1ldGVyc1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTaXBBUEkuZ2V0SGlzdG9yeTogZXh0ZW5zaW9uIHBhcmFtZXRlciBpcyByZXF1aXJlZCcpO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydFeHRlbnNpb24gcGFyYW1ldGVyIGlzIHJlcXVpcmVkJ119fSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRIaXN0b3J5Jywgb3B0aW9ucywgY2FsbGJhY2ssICdHRVQnLCBleHRlbnNpb24pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgZXh0ZW5zaW9uIHN0YXRpc3RpY3NcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uIC0gRXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gT3B0aW9ucyAoZGF5cywgdHlwZSlcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGdldFN0YXRzKGV4dGVuc2lvbiwgb3B0aW9ucyA9IHt9LCBjYWxsYmFjaykge1xuICAgICAgICAvLyBIYW5kbGUgb3ZlcmxvYWRlZCBwYXJhbWV0ZXJzXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFleHRlbnNpb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpcEFQSS5nZXRTdGF0czogZXh0ZW5zaW9uIHBhcmFtZXRlciBpcyByZXF1aXJlZCcpO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydFeHRlbnNpb24gcGFyYW1ldGVyIGlzIHJlcXVpcmVkJ119fSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRTdGF0cycsIG9wdGlvbnMsIGNhbGxiYWNrLCAnR0VUJywgZXh0ZW5zaW9uKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IFNJUCBwZWVycyBzdGF0dXNlcyAobGVnYWN5IGNvbXBhdGliaWxpdHkpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFBlZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0UGVlcnNTdGF0dXNlcycsIHt9LCBjYWxsYmFjayk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogR2V0IFNJUCBwcm92aWRlcnMgcmVnaXN0cnkgc3RhdHVzZXNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0U2lwUHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0UmVnaXN0cnknLCB7fSwgY2FsbGJhY2spO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgU0lQIHJlZ2lzdHJ5IHN0YXR1c2VzIChsZWdhY3kgY29tcGF0aWJpbGl0eSlcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0UmVnaXN0cnkoY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0UmVnaXN0cnknLCB7fSwgY2FsbGJhY2spO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgU0lQIHNlY3JldCBmb3IgZXh0ZW5zaW9uIChsZWdhY3kgY29tcGF0aWJpbGl0eSBhbmQgdjMgQVBJKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwZWVyIC0gUGVlci9leHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFNlY3JldChwZWVyLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIXBlZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpcEFQSS5nZXRTZWNyZXQ6IHBlZXIgcGFyYW1ldGVyIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiBbJ1BlZXIgcGFyYW1ldGVyIGlzIHJlcXVpcmVkJ119fSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRTZWNyZXQnLCB7fSwgY2FsbGJhY2ssICdHRVQnLCBwZWVyKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGF1dGhlbnRpY2F0aW9uIGZhaWx1cmUgc3RhdGlzdGljcyBmb3IgZXh0ZW5zaW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGdldEF1dGhGYWlsdXJlU3RhdHMoZXh0ZW5zaW9uLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIWV4dGVuc2lvbikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignU2lwQVBJLmdldEF1dGhGYWlsdXJlU3RhdHM6IGV4dGVuc2lvbiBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnRXh0ZW5zaW9uIHBhcmFtZXRlciBpcyByZXF1aXJlZCddfX0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0QXV0aEZhaWx1cmVTdGF0cycsIHt9LCBjYWxsYmFjaywgJ0dFVCcsIGV4dGVuc2lvbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFyIGF1dGhlbnRpY2F0aW9uIGZhaWx1cmUgc3RhdGlzdGljcyBmb3IgZXh0ZW5zaW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGNsZWFyQXV0aEZhaWx1cmVTdGF0cyhleHRlbnNpb24sIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTaXBBUEkuY2xlYXJBdXRoRmFpbHVyZVN0YXRzOiBleHRlbnNpb24gcGFyYW1ldGVyIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiBbJ0V4dGVuc2lvbiBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnXX19KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2NsZWFyQXV0aEZhaWx1cmVTdGF0cycsIHt9LCBjYWxsYmFjaywgJ1BPU1QnLCBleHRlbnNpb24pO1xuICAgIH1cbn0pOyJdfQ==