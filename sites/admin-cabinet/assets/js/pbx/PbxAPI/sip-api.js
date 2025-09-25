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
   * Get SIP peer status (legacy compatibility)
   * @param {object} data - Data with peer information
   * @param {function} callback - Callback function
   */
  getPeerStatus: function getPeerStatus(data, callback) {
    // Use legacy endpoint for now as it expects different data format
    $.api({
      url: "".concat(Config.pbxUrl, "/pbxcore/api/sip/getSipPeer"),
      on: 'now',
      method: 'POST',
      data: JSON.stringify(data),
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError(errorMessage, element, xhr) {
        if (xhr.status === 401) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
      }
    });
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

    return this.callCustomMethod('getSecret', {
      peer: peer
    }, function (response) {
      callback(response);
    });
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvc2lwLWFwaS5qcyJdLCJuYW1lcyI6WyJTaXBBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXRTdGF0dXNlcyIsImdldFN0YXR1cyIsImZvcmNlQ2hlY2siLCJnZXRIaXN0b3J5IiwiZ2V0U3RhdHMiLCJnZXRQZWVyc1N0YXR1c2VzIiwiZ2V0UmVnaXN0cnkiLCJnZXRTZWNyZXQiLCJPYmplY3QiLCJhc3NpZ24iLCJjYWxsYmFja09yT3B0aW9ucyIsImNhbGxiYWNrIiwib3B0aW9ucyIsImNiIiwiY29uc29sZSIsImVycm9yIiwiY2FsbEN1c3RvbU1ldGhvZCIsImV4dGVuc2lvbiIsInJlc3VsdCIsIm1lc3NhZ2VzIiwiZXh0ZW5zaW9uT3JDYWxsYmFjayIsImdldFBlZXJTdGF0dXMiLCJkYXRhIiwiJCIsImFwaSIsInVybCIsIkNvbmZpZyIsInBieFVybCIsIm9uIiwibWV0aG9kIiwiSlNPTiIsInN0cmluZ2lmeSIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInhociIsInN0YXR1cyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsImdldFNpcFByb3ZpZGVyc1N0YXR1c2VzIiwicGVlciJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE1BQU0sR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQzVCQyxFQUFBQSxRQUFRLEVBQUUscUJBRGtCO0FBRTVCQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsV0FB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a0JILEdBN0lpQjs7QUErSWxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLHVCQW5Ka0IsbUNBbUpNbEMsUUFuSk4sRUFtSmdCO0FBQzlCLFdBQU8sS0FBS0ssZ0JBQUwsQ0FBc0IsYUFBdEIsRUFBcUMsRUFBckMsRUFBeUNMLFFBQXpDLENBQVA7QUFDSCxHQXJKaUI7O0FBdUpsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJTCxFQUFBQSxXQTNKa0IsdUJBMkpOSyxRQTNKTSxFQTJKSTtBQUNsQixXQUFPLEtBQUtLLGdCQUFMLENBQXNCLGFBQXRCLEVBQXFDLEVBQXJDLEVBQXlDTCxRQUF6QyxDQUFQO0FBQ0gsR0E3SmlCOztBQStKbEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJSixFQUFBQSxTQXBLa0IscUJBb0tSdUMsSUFwS1EsRUFvS0ZuQyxRQXBLRSxFQW9LUTtBQUN0QixRQUFJLENBQUNtQyxJQUFMLEVBQVc7QUFDUGhDLE1BQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjLDhDQUFkO0FBQ0EsVUFBSUosUUFBSixFQUFjQSxRQUFRLENBQUM7QUFBQ08sUUFBQUEsTUFBTSxFQUFFLEtBQVQ7QUFBZ0JDLFFBQUFBLFFBQVEsRUFBRTtBQUFDSixVQUFBQSxLQUFLLEVBQUUsQ0FBQyw0QkFBRDtBQUFSO0FBQTFCLE9BQUQsQ0FBUjtBQUNkO0FBQ0g7O0FBRUQsV0FBTyxLQUFLQyxnQkFBTCxDQUFzQixXQUF0QixFQUFtQztBQUFFOEIsTUFBQUEsSUFBSSxFQUFKQTtBQUFGLEtBQW5DLEVBQTZDLFVBQUNYLFFBQUQsRUFBYztBQUMxRHhCLE1BQUFBLFFBQVEsQ0FBQ3dCLFFBQUQsQ0FBUjtBQUNQLEtBRk0sQ0FBUDtBQUdIO0FBOUtpQixDQUF0QiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGlDbGllbnQsIENvbmZpZywgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUgKi9cbiBcbi8qKlxuICogU2lwQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBTSVAgZGV2aWNlIHN0YXR1cyBtb25pdG9yaW5nXG4gKlxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIFNJUCBkZXZpY2Ugb3BlcmF0aW9ucyB1c2luZyB0aGUgbmV3IFJFU1RmdWwgQVBJLlxuICogSGFuZGxlcyBkZXZpY2UgcmVnaXN0cmF0aW9uIHN0YXR1c2VzLCBjb25uZWN0aW9uIG1vbml0b3JpbmcsIGFuZCBzdGF0aXN0aWNzLlxuICpcbiAqIEBjbGFzcyBTaXBBUElcbiAqL1xuY29uc3QgU2lwQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvc2lwJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIGdldFN0YXR1c2VzOiAnOmdldFN0YXR1c2VzJyxcbiAgICAgICAgZ2V0U3RhdHVzOiAnOmdldFN0YXR1cycsXG4gICAgICAgIGZvcmNlQ2hlY2s6ICc6Zm9yY2VDaGVjaycsXG4gICAgICAgIGdldEhpc3Rvcnk6ICc6Z2V0SGlzdG9yeScsXG4gICAgICAgIGdldFN0YXRzOiAnOmdldFN0YXRzJyxcbiAgICAgICAgZ2V0UGVlcnNTdGF0dXNlczogJzpnZXRQZWVyc1N0YXR1c2VzJyxcbiAgICAgICAgZ2V0UmVnaXN0cnk6ICc6Z2V0UmVnaXN0cnknLFxuICAgICAgICBnZXRTZWNyZXQ6ICc6Z2V0U2VjcmV0J1xuICAgIH1cbn0pO1xuXG4vLyBBZGQgbWV0aG9kIGltcGxlbWVudGF0aW9ucyB0byBTaXBBUElcbk9iamVjdC5hc3NpZ24oU2lwQVBJLCB7XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIGV4dGVuc2lvbiBzdGF0dXNlc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb258b2JqZWN0fSBjYWxsYmFja09yT3B0aW9ucyAtIEVpdGhlciBjYWxsYmFjayBmdW5jdGlvbiBvciBvcHRpb25zIG9iamVjdFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gLSBDYWxsYmFjayBmdW5jdGlvbiB3aGVuIGZpcnN0IHBhcmFtIGlzIG9wdGlvbnNcbiAgICAgKi9cbiAgICBnZXRTdGF0dXNlcyhjYWxsYmFja09yT3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgbGV0IG9wdGlvbnMgPSB7fTtcbiAgICAgICAgbGV0IGNiID0gY2FsbGJhY2s7XG5cbiAgICAgICAgLy8gSGFuZGxlIG92ZXJsb2FkZWQgcGFyYW1ldGVyc1xuICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrT3JPcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYiA9IGNhbGxiYWNrT3JPcHRpb25zO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjYWxsYmFja09yT3B0aW9ucyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSBjYWxsYmFja09yT3B0aW9ucztcbiAgICAgICAgICAgIC8vIGNhbGxiYWNrIG11c3QgYmUgcHJvdmlkZWQgYXMgc2Vjb25kIHBhcmFtZXRlciB3aGVuIGZpcnN0IGlzIG9wdGlvbnNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTaXBBUEkuZ2V0U3RhdHVzZXM6IGNhbGxiYWNrIGZ1bmN0aW9uIHJlcXVpcmVkIHdoZW4gb3B0aW9ucyBwcm92aWRlZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSBHRVQgbWV0aG9kIGZvciByZWFkaW5nIGRhdGFcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0U3RhdHVzZXMnLCBvcHRpb25zLCBjYik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBzdGF0dXMgZm9yIHNwZWNpZmljIGV4dGVuc2lvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb24gLSBFeHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBnZXRTdGF0dXMoZXh0ZW5zaW9uLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIWV4dGVuc2lvbikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignU2lwQVBJLmdldFN0YXR1czogZXh0ZW5zaW9uIHBhcmFtZXRlciBpcyByZXF1aXJlZCcpO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydFeHRlbnNpb24gcGFyYW1ldGVyIGlzIHJlcXVpcmVkJ119fSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRTdGF0dXMnLCB7fSwgY2FsbGJhY2ssICdHRVQnLCBleHRlbnNpb24pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JjZSBzdGF0dXMgY2hlY2sgZm9yIGV4dGVuc2lvbihzKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGZ1bmN0aW9ufSBleHRlbnNpb25PckNhbGxiYWNrIC0gRXh0ZW5zaW9uIG51bWJlciBvciBjYWxsYmFjayBmb3IgYWxsIGV4dGVuc2lvbnNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQ2FsbGJhY2sgZnVuY3Rpb24gd2hlbiBmaXJzdCBwYXJhbSBpcyBleHRlbnNpb25cbiAgICAgKi9cbiAgICBmb3JjZUNoZWNrKGV4dGVuc2lvbk9yQ2FsbGJhY2ssIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIEhhbmRsZSBvdmVybG9hZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgaWYgKHR5cGVvZiBleHRlbnNpb25PckNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAvLyBGb3JjZSBjaGVjayBmb3IgYWxsIGV4dGVuc2lvbnNcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2ZvcmNlQ2hlY2snLCB7fSwgZXh0ZW5zaW9uT3JDYWxsYmFjaywgJ1BPU1QnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvcmNlIGNoZWNrIGZvciBzcGVjaWZpYyBleHRlbnNpb25cbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IGV4dGVuc2lvbk9yQ2FsbGJhY2s7XG4gICAgICAgICAgICBpZiAoIWV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpcEFQSS5mb3JjZUNoZWNrOiBleHRlbnNpb24gcGFyYW1ldGVyIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydFeHRlbnNpb24gcGFyYW1ldGVyIGlzIHJlcXVpcmVkJ119fSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZm9yY2VDaGVjaycsIHt9LCBjYWxsYmFjaywgJ1BPU1QnLCBleHRlbnNpb24pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBleHRlbnNpb24gaGlzdG9yeVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb24gLSBFeHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBPcHRpb25zIChsaW1pdCwgb2Zmc2V0LCBwZXJpb2QpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBnZXRIaXN0b3J5KGV4dGVuc2lvbiwgb3B0aW9ucyA9IHt9LCBjYWxsYmFjaykge1xuICAgICAgICAvLyBIYW5kbGUgb3ZlcmxvYWRlZCBwYXJhbWV0ZXJzXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFleHRlbnNpb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpcEFQSS5nZXRIaXN0b3J5OiBleHRlbnNpb24gcGFyYW1ldGVyIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiBbJ0V4dGVuc2lvbiBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnXX19KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldEhpc3RvcnknLCBvcHRpb25zLCBjYWxsYmFjaywgJ0dFVCcsIGV4dGVuc2lvbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBleHRlbnNpb24gc3RhdGlzdGljc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb24gLSBFeHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBPcHRpb25zIChkYXlzLCB0eXBlKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZ2V0U3RhdHMoZXh0ZW5zaW9uLCBvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIEhhbmRsZSBvdmVybG9hZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWV4dGVuc2lvbikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignU2lwQVBJLmdldFN0YXRzOiBleHRlbnNpb24gcGFyYW1ldGVyIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiBbJ0V4dGVuc2lvbiBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnXX19KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFN0YXRzJywgb3B0aW9ucywgY2FsbGJhY2ssICdHRVQnLCBleHRlbnNpb24pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgU0lQIHBlZXJzIHN0YXR1c2VzIChsZWdhY3kgY29tcGF0aWJpbGl0eSlcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0UGVlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRQZWVyc1N0YXR1c2VzJywge30sIGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IFNJUCBwZWVyIHN0YXR1cyAobGVnYWN5IGNvbXBhdGliaWxpdHkpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHdpdGggcGVlciBpbmZvcm1hdGlvblxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRQZWVyU3RhdHVzKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIFVzZSBsZWdhY3kgZW5kcG9pbnQgZm9yIG5vdyBhcyBpdCBleHBlY3RzIGRpZmZlcmVudCBkYXRhIGZvcm1hdFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRTaXBQZWVyYCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgU0lQIHByb3ZpZGVycyByZWdpc3RyeSBzdGF0dXNlc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRTaXBQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRSZWdpc3RyeScsIHt9LCBjYWxsYmFjayk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBTSVAgcmVnaXN0cnkgc3RhdHVzZXMgKGxlZ2FjeSBjb21wYXRpYmlsaXR5KVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRSZWdpc3RyeShjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRSZWdpc3RyeScsIHt9LCBjYWxsYmFjayk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBTSVAgc2VjcmV0IGZvciBleHRlbnNpb24gKGxlZ2FjeSBjb21wYXRpYmlsaXR5IGFuZCB2MyBBUEkpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBlZXIgLSBQZWVyL2V4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0U2VjcmV0KHBlZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghcGVlcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignU2lwQVBJLmdldFNlY3JldDogcGVlciBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnUGVlciBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnXX19KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFNlY3JldCcsIHsgcGVlciB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn0pOyJdfQ==