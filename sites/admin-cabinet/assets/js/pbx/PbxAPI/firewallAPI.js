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

/* global PbxApiClient, $ */

/**
 * FirewallAPI - REST API v3 client for firewall management
 * 
 * Provides a clean interface for firewall operations using the new RESTful API.
 * 
 * @class FirewallAPI
 */
var FirewallAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/firewall',
  customMethods: {
    getDefault: ':getDefault',
    getBannedIps: ':getBannedIps',
    unbanIp: ':unbanIp',
    enable: ':enable',
    disable: ':disable'
  }
});
/**
 * Get default values for a new firewall rule
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.getDefault((response) => {
 *     if (response.result) {
 *         console.log('Default values:', response.data);
 *     }
 * });
 */

FirewallAPI.getDefault = function (callback) {
  $.api({
    url: "".concat(this.apiUrl, ":getDefault"),
    method: 'GET',
    on: 'now',
    onSuccess: function onSuccess(response) {
      callback(response);
    },
    onFailure: function onFailure(response) {
      callback(response);
    },
    onError: function onError() {
      callback({
        result: false,
        messages: {
          error: ['Network error occurred']
        }
      });
    }
  });
};
/**
 * Get list of banned IP addresses
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.getBannedIps((response) => {
 *     if (response.result) {
 *         console.log('Banned IPs:', response.data);
 *     }
 * });
 */


FirewallAPI.getBannedIps = function (callback) {
  $.api({
    url: "".concat(this.apiUrl, ":getBannedIps"),
    method: 'GET',
    on: 'now',
    onSuccess: function onSuccess(response) {
      callback(response);
    },
    onFailure: function onFailure(response) {
      callback(response);
    },
    onError: function onError() {
      callback({
        result: false,
        messages: {
          error: ['Network error occurred']
        }
      });
    }
  });
};
/**
 * Unban an IP address
 * 
 * @param {string} ip - IP address to unban
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.unbanIp('192.168.1.100', (response) => {
 *     if (response.result) {
 *         console.log('IP unbanned successfully');
 *     }
 * });
 */


FirewallAPI.unbanIp = function (ip, callback) {
  $.api({
    url: "".concat(this.apiUrl, ":unbanIp"),
    method: 'POST',
    data: {
      ip: ip
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
        result: false,
        messages: {
          error: ['Network error occurred']
        }
      });
    }
  });
};
/**
 * Enable firewall and fail2ban
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.enable((response) => {
 *     if (response.result) {
 *         console.log('Firewall enabled');
 *     }
 * });
 */


FirewallAPI.enable = function (callback) {
  $.api({
    url: "".concat(this.apiUrl, ":enable"),
    method: 'POST',
    on: 'now',
    onSuccess: function onSuccess(response) {
      callback(response);
    },
    onFailure: function onFailure(response) {
      callback(response);
    },
    onError: function onError() {
      callback({
        result: false,
        messages: {
          error: ['Network error occurred']
        }
      });
    }
  });
};
/**
 * Disable firewall and fail2ban
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.disable((response) => {
 *     if (response.result) {
 *         console.log('Firewall disabled');
 *     }
 * });
 */


FirewallAPI.disable = function (callback) {
  $.api({
    url: "".concat(this.apiUrl, ":disable"),
    method: 'POST',
    on: 'now',
    onSuccess: function onSuccess(response) {
      callback(response);
    },
    onFailure: function onFailure(response) {
      callback(response);
    },
    onError: function onError() {
      callback({
        result: false,
        messages: {
          error: ['Network error occurred']
        }
      });
    }
  });
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZmlyZXdhbGxBUEkuanMiXSwibmFtZXMiOlsiRmlyZXdhbGxBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXREZWZhdWx0IiwiZ2V0QmFubmVkSXBzIiwidW5iYW5JcCIsImVuYWJsZSIsImRpc2FibGUiLCJjYWxsYmFjayIsIiQiLCJhcGkiLCJ1cmwiLCJhcGlVcmwiLCJtZXRob2QiLCJvbiIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwib25GYWlsdXJlIiwib25FcnJvciIsInJlc3VsdCIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJpcCIsImRhdGEiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFdBQVcsR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQ2pDQyxFQUFBQSxRQUFRLEVBQUUsMEJBRHVCO0FBRWpDQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsVUFBVSxFQUFFLGFBREQ7QUFFWEMsSUFBQUEsWUFBWSxFQUFFLGVBRkg7QUFHWEMsSUFBQUEsT0FBTyxFQUFFLFVBSEU7QUFJWEMsSUFBQUEsTUFBTSxFQUFFLFNBSkc7QUFLWEMsSUFBQUEsT0FBTyxFQUFFO0FBTEU7QUFGa0IsQ0FBakIsQ0FBcEI7QUFXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBUixXQUFXLENBQUNJLFVBQVosR0FBeUIsVUFBU0ssUUFBVCxFQUFtQjtBQUN4Q0MsRUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsSUFBQUEsR0FBRyxZQUFLLEtBQUtDLE1BQVYsZ0JBREQ7QUFFRkMsSUFBQUEsTUFBTSxFQUFFLEtB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IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGlDbGllbnQsICQgKi9cblxuLyoqXG4gKiBGaXJld2FsbEFQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgZmlyZXdhbGwgbWFuYWdlbWVudFxuICogXG4gKiBQcm92aWRlcyBhIGNsZWFuIGludGVyZmFjZSBmb3IgZmlyZXdhbGwgb3BlcmF0aW9ucyB1c2luZyB0aGUgbmV3IFJFU1RmdWwgQVBJLlxuICogXG4gKiBAY2xhc3MgRmlyZXdhbGxBUElcbiAqL1xuY29uc3QgRmlyZXdhbGxBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9maXJld2FsbCcsXG4gICAgY3VzdG9tTWV0aG9kczoge1xuICAgICAgICBnZXREZWZhdWx0OiAnOmdldERlZmF1bHQnLFxuICAgICAgICBnZXRCYW5uZWRJcHM6ICc6Z2V0QmFubmVkSXBzJyxcbiAgICAgICAgdW5iYW5JcDogJzp1bmJhbklwJyxcbiAgICAgICAgZW5hYmxlOiAnOmVuYWJsZScsXG4gICAgICAgIGRpc2FibGU6ICc6ZGlzYWJsZSdcbiAgICB9XG59KTtcblxuLyoqXG4gKiBHZXQgZGVmYXVsdCB2YWx1ZXMgZm9yIGEgbmV3IGZpcmV3YWxsIHJ1bGVcbiAqIFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogRmlyZXdhbGxBUEkuZ2V0RGVmYXVsdCgocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdEZWZhdWx0IHZhbHVlczonLCByZXNwb25zZS5kYXRhKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuRmlyZXdhbGxBUEkuZ2V0RGVmYXVsdCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgJC5hcGkoe1xuICAgICAgICB1cmw6IGAke3RoaXMuYXBpVXJsfTpnZXREZWZhdWx0YCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgb246ICdub3cnLFxuICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlczogeyBlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ10gfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogR2V0IGxpc3Qgb2YgYmFubmVkIElQIGFkZHJlc3Nlc1xuICogXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBGaXJld2FsbEFQSS5nZXRCYW5uZWRJcHMoKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnQmFubmVkIElQczonLCByZXNwb25zZS5kYXRhKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuRmlyZXdhbGxBUEkuZ2V0QmFubmVkSXBzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAkLmFwaSh7XG4gICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9OmdldEJhbm5lZElwc2AsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICB9LFxuICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZXM6IHsgZXJyb3I6IFsnTmV0d29yayBlcnJvciBvY2N1cnJlZCddIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFVuYmFuIGFuIElQIGFkZHJlc3NcbiAqIFxuICogQHBhcmFtIHtzdHJpbmd9IGlwIC0gSVAgYWRkcmVzcyB0byB1bmJhblxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogRmlyZXdhbGxBUEkudW5iYW5JcCgnMTkyLjE2OC4xLjEwMCcsIChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ0lQIHVuYmFubmVkIHN1Y2Nlc3NmdWxseScpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5GaXJld2FsbEFQSS51bmJhbklwID0gZnVuY3Rpb24oaXAsIGNhbGxiYWNrKSB7XG4gICAgJC5hcGkoe1xuICAgICAgICB1cmw6IGAke3RoaXMuYXBpVXJsfTp1bmJhbklwYCxcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGRhdGE6IHsgaXA6IGlwIH0sXG4gICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICB9LFxuICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZXM6IHsgZXJyb3I6IFsnTmV0d29yayBlcnJvciBvY2N1cnJlZCddIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEVuYWJsZSBmaXJld2FsbCBhbmQgZmFpbDJiYW5cbiAqIFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogRmlyZXdhbGxBUEkuZW5hYmxlKChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ0ZpcmV3YWxsIGVuYWJsZWQnKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuRmlyZXdhbGxBUEkuZW5hYmxlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAkLmFwaSh7XG4gICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9OmVuYWJsZWAsXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICB9LFxuICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7IGVycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXSB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBEaXNhYmxlIGZpcmV3YWxsIGFuZCBmYWlsMmJhblxuICogXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBGaXJld2FsbEFQSS5kaXNhYmxlKChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ0ZpcmV3YWxsIGRpc2FibGVkJyk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cbkZpcmV3YWxsQVBJLmRpc2FibGUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICQuYXBpKHtcbiAgICAgICAgdXJsOiBgJHt0aGlzLmFwaVVybH06ZGlzYWJsZWAsXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICB9LFxuICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7IGVycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXSB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufTsiXX0=