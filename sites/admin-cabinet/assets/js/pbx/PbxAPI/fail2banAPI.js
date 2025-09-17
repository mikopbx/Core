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
 * Fail2BanAPI - REST API v3 client for Fail2Ban management (Singleton resource)
 *
 * Provides a clean interface for Fail2Ban operations.
 * Fail2Ban is a singleton resource - there's only one configuration in the system.
 *
 * @class Fail2BanAPI
 */
var Fail2BanAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/fail2ban',
  singleton: true
});
/**
 * Get Fail2Ban settings (Singleton GET)
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * Fail2BanAPI.get((response) => {
 *     if (response.result) {
 *         console.log('Settings:', response.data);
 *     }
 * });
 */

Fail2BanAPI.get = function (callback) {
  $.api({
    url: this.apiUrl,
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
}; // Alias for backward compatibility


Fail2BanAPI.getSettings = Fail2BanAPI.get;
/**
 * Update Fail2Ban settings (Singleton PUT)
 *
 * @param {object} data - Settings data to update
 * @param {function} callback - Callback function to handle the response
 * @example
 * Fail2BanAPI.update({
 *     maxretry: 5,
 *     bantime: 86400,
 *     findtime: 1800,
 *     whitelist: '192.168.1.0/24'
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Settings updated successfully');
 *     }
 * });
 */

Fail2BanAPI.update = function (data, callback) {
  $.api({
    url: this.apiUrl,
    method: 'PUT',
    data: data,
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
}; // Alias for backward compatibility


Fail2BanAPI.updateSettings = Fail2BanAPI.update;
/**
 * Partially update Fail2Ban settings (Singleton PATCH)
 *
 * @param {object} data - Settings data to patch
 * @param {function} callback - Callback function to handle the response
 * @example
 * Fail2BanAPI.patch({
 *     maxretry: 10
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Settings patched successfully');
 *     }
 * });
 */

Fail2BanAPI.patch = function (data, callback) {
  $.api({
    url: this.apiUrl,
    method: 'PATCH',
    data: data,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZmFpbDJiYW5BUEkuanMiXSwibmFtZXMiOlsiRmFpbDJCYW5BUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsInNpbmdsZXRvbiIsImdldCIsImNhbGxiYWNrIiwiJCIsImFwaSIsInVybCIsImFwaVVybCIsIm1ldGhvZCIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwicmVzdWx0IiwibWVzc2FnZXMiLCJlcnJvciIsImdldFNldHRpbmdzIiwidXBkYXRlIiwiZGF0YSIsInVwZGF0ZVNldHRpbmdzIiwicGF0Y2giXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsV0FBVyxHQUFHLElBQUlDLFlBQUosQ0FBaUI7QUFDakNDLEVBQUFBLFFBQVEsRUFBRSwwQkFEdUI7QUFFakNDLEVBQUFBLFNBQVMsRUFBRTtBQUZzQixDQUFqQixDQUFwQjtBQUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FILFdBQVcsQ0FBQ0ksR0FBWixHQUFrQixVQUFTQyxRQUFULEVBQW1CO0FBQ2pDQyxFQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxJQUFBQSxHQUFHLEVBQUUsS0FBS0MsTUFEUjtBQUVGQyxJQUFBQSxNQUFNLEVBQUUsS0FGTjtBQUdGQyxJQUFBQSxFQUFFLEVBQUUsS0FIRjtBQUlGQyxJQUFBQSxTQUpFLHFCQUlRQyxRQUpSLEVBSWtCO0FBQ2hCUixNQUFBQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNILEtBTkM7QUFPRkMsSUFBQUEsU0FQRSxxQkFPUUQsUUFQUixFQU9rQjtBQUNoQlIsTUFBQUEsUUFBUSxDQUFDUSxRQUFELENBQVI7QUFDSCxLQVRDO0FBVUZFLElBQUFBLE9BVkUscUJBVVE7QUFDTlYsTUFBQUEsUUFBUSxDQUFDO0FBQ0xXLFFBQUFBLE1BQU0sRUFBRSxLQURIO0FBRUxDLFFBQUFBLFFBQVEsRUFBRTtBQUFFQyxVQUFBQSxLQUFLLEVBQUUsQ0FBQyx3QkFBRDtBQUFUO0FBRkwsT0FBRCxDQUFSO0FBSUg7QUFmQyxHQUFOO0FBaUJILENBbEJELEMsQ0FvQkE7OztBQUNBbEIsV0FBVyxDQUFDbUIsV0FBWixHQUEwQm5CLFdBQVcsQ0FBQ0ksR0FBdEM7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBSixXQUFXLENBQUNvQixNQUFaLEdBQXFCLFVBQVNDLElBQVQsRUFBZWhCLFFBQWYsRUFBeUI7QUFDMUNDLEVBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLElBQUFBLEdBQUcsRUFBRSxLQUFLQyxNQURSO0FBRUZDLElBQUFBLE1BQU0sRUFBRSxLQUZOO0FBR0ZXLElBQUFBLElBQUksRUFBRUEsSUFISjtBQUlGVixJQUFBQSxFQUFFLEVBQUUsS0FKRjtBQUtGQyxJQUFBQSxTQUxFLHFCQUtRQyxRQUxSLEVBS2tCO0FBQ2hCUixNQUFBQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNILEtBUEM7QUFRRkMsSUFBQUEsU0FSRSxxQkFRUUQsUUFSUixFQVFrQjtBQUNoQlIsTUFBQUEsUUFBUSxDQUFDUSxRQUFELENBQVI7QUFDSCxLQVZDO0FBV0ZFLElBQUFBLE9BWEUscUJBV1E7QUFDTlYsTUFBQUEsUUFBUSxDQUFDO0FBQ0xXLFFBQUFBLE1BQU0sRUFBRSxLQURIO0FBRUxDLFFBQUFBLFFBQVEsRUFBRTtBQUFFQyxVQUFBQSxLQUFLLEVBQUUsQ0FBQyx3QkFBRDtBQUFUO0FBRkwsT0FBRCxDQUFSO0FBSUg7QUFoQkMsR0FBTjtBQWtCSCxDQW5CRCxDLENBcUJBOzs7QUFDQWxCLFdBQVcsQ0FBQ3NCLGNBQVosR0FBNkJ0QixXQUFXLENBQUNvQixNQUF6QztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FwQixXQUFXLENBQUN1QixLQUFaLEdBQW9CLFVBQVNGLElBQVQsRUFBZWhCLFFBQWYsRUFBeUI7QUFDekNDLEVBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLElBQUFBLEdBQUcsRUFBRSxLQUFLQyxNQURSO0FBRUZDLElBQUFBLE1BQU0sRUFBRSxPQUZOO0FBR0ZXLElBQUFBLElBQUksRUFBRUEsSUFISjtBQUlGVixJQUFBQSxFQUFFLEVBQUUsS0FKRjtBQUtGQyxJQUFBQSxTQUxFLHFCQUtRQyxRQUxSLEVBS2tCO0FBQ2hCUixNQUFBQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNILEtBUEM7QUFRRkMsSUFBQUEsU0FSRSxxQkFRUUQsUUFSUixFQVFrQjtBQUNoQlIsTUFBQUEsUUFBUSxDQUFDUSxRQUFELENBQVI7QUFDSCxLQVZDO0FBV0ZFLElBQUFBLE9BWEUscUJBV1E7QUFDTlYsTUFBQUEsUUFBUSxDQUFDO0FBQ0xXLFFBQUFBLE1BQU0sRUFBRSxLQURIO0FBRUxDLFFBQUFBLFFBQVEsRUFBRTtBQUFFQyxVQUFBQSxLQUFLLEVBQUUsQ0FBQyx3QkFBRDtBQUFUO0FBRkwsT0FBRCxDQUFSO0FBSUg7QUFoQkMsR0FBTjtBQWtCSCxDQW5CRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGlDbGllbnQsICQgKi9cblxuLyoqXG4gKiBGYWlsMkJhbkFQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgRmFpbDJCYW4gbWFuYWdlbWVudCAoU2luZ2xldG9uIHJlc291cmNlKVxuICpcbiAqIFByb3ZpZGVzIGEgY2xlYW4gaW50ZXJmYWNlIGZvciBGYWlsMkJhbiBvcGVyYXRpb25zLlxuICogRmFpbDJCYW4gaXMgYSBzaW5nbGV0b24gcmVzb3VyY2UgLSB0aGVyZSdzIG9ubHkgb25lIGNvbmZpZ3VyYXRpb24gaW4gdGhlIHN5c3RlbS5cbiAqXG4gKiBAY2xhc3MgRmFpbDJCYW5BUElcbiAqL1xuY29uc3QgRmFpbDJCYW5BUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9mYWlsMmJhbicsXG4gICAgc2luZ2xldG9uOiB0cnVlXG59KTtcblxuLyoqXG4gKiBHZXQgRmFpbDJCYW4gc2V0dGluZ3MgKFNpbmdsZXRvbiBHRVQpXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogRmFpbDJCYW5BUEkuZ2V0KChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1NldHRpbmdzOicsIHJlc3BvbnNlLmRhdGEpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5GYWlsMkJhbkFQSS5nZXQgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICQuYXBpKHtcbiAgICAgICAgdXJsOiB0aGlzLmFwaVVybCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgb246ICdub3cnLFxuICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlczogeyBlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ10gfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8vIEFsaWFzIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG5GYWlsMkJhbkFQSS5nZXRTZXR0aW5ncyA9IEZhaWwyQmFuQVBJLmdldDtcblxuLyoqXG4gKiBVcGRhdGUgRmFpbDJCYW4gc2V0dGluZ3MgKFNpbmdsZXRvbiBQVVQpXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTZXR0aW5ncyBkYXRhIHRvIHVwZGF0ZVxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogRmFpbDJCYW5BUEkudXBkYXRlKHtcbiAqICAgICBtYXhyZXRyeTogNSxcbiAqICAgICBiYW50aW1lOiA4NjQwMCxcbiAqICAgICBmaW5kdGltZTogMTgwMCxcbiAqICAgICB3aGl0ZWxpc3Q6ICcxOTIuMTY4LjEuMC8yNCdcbiAqIH0sIChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1NldHRpbmdzIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cbkZhaWwyQmFuQVBJLnVwZGF0ZSA9IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgJC5hcGkoe1xuICAgICAgICB1cmw6IHRoaXMuYXBpVXJsLFxuICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICB9LFxuICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7IGVycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXSB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLy8gQWxpYXMgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbkZhaWwyQmFuQVBJLnVwZGF0ZVNldHRpbmdzID0gRmFpbDJCYW5BUEkudXBkYXRlO1xuXG4vKipcbiAqIFBhcnRpYWxseSB1cGRhdGUgRmFpbDJCYW4gc2V0dGluZ3MgKFNpbmdsZXRvbiBQQVRDSClcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFNldHRpbmdzIGRhdGEgdG8gcGF0Y2hcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICogQGV4YW1wbGVcbiAqIEZhaWwyQmFuQVBJLnBhdGNoKHtcbiAqICAgICBtYXhyZXRyeTogMTBcbiAqIH0sIChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1NldHRpbmdzIHBhdGNoZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cbkZhaWwyQmFuQVBJLnBhdGNoID0gZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICAkLmFwaSh7XG4gICAgICAgIHVybDogdGhpcy5hcGlVcmwsXG4gICAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgb246ICdub3cnLFxuICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlczogeyBlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ10gfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07Il19