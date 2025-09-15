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
 * DialplanApplicationsAPI - REST API v3 client for dialplan applications management
 * 
 * Provides a clean interface for dialplan applications operations using the new RESTful API.
 * 
 * @class DialplanApplicationsAPI
 */
var DialplanApplicationsAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/dialplan-applications',
  customMethods: {
    getDefault: ':getDefault',
    copy: ':copy'
  }
});
/**
 * Get default values for a new dialplan application
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * DialplanApplicationsAPI.getDefault((response) => {
 *     if (response.result) {
 *         console.log('Default values:', response.data);
 *     }
 * });
 */

DialplanApplicationsAPI.getDefault = function (callback) {
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
 * Copy an existing dialplan application
 * 
 * @param {string} id - ID of the dialplan application to copy
 * @param {function} callback - Callback function to handle the response
 * @example
 * DialplanApplicationsAPI.copy('DIALPLAN-APP-123', (response) => {
 *     if (response.result) {
 *         console.log('Copied application:', response.data);
 *     }
 * });
 */


DialplanApplicationsAPI.copy = function (id, callback) {
  $.api({
    url: "".concat(this.apiUrl, "/").concat(id, ":copy"),
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZGlhbHBsYW5BcHBsaWNhdGlvbnNBUEkuanMiXSwibmFtZXMiOlsiRGlhbHBsYW5BcHBsaWNhdGlvbnNBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXREZWZhdWx0IiwiY29weSIsImNhbGxiYWNrIiwiJCIsImFwaSIsInVybCIsImFwaVVybCIsIm1ldGhvZCIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwicmVzdWx0IiwibWVzc2FnZXMiLCJlcnJvciIsImlkIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSx1QkFBdUIsR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQzdDQyxFQUFBQSxRQUFRLEVBQUUsdUNBRG1DO0FBRTdDQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsVUFBVSxFQUFFLGFBREQ7QUFFWEMsSUFBQUEsSUFBSSxFQUFFO0FBRks7QUFGOEIsQ0FBakIsQ0FBaEM7QUFRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBTCx1QkFBdUIsQ0FBQ0ksVUFBeEIsR0FBcUMsVUFBU0UsUUFBVCxFQUFtQjtBQUNwREMsRUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsSUFBQUEsR0FBRyxZQUFLLEtBQUtDLE1BQVYsZ0JBREQ7QUFFRkMsSUFBQUEsTUFBTSxFQUFFLEtBRk47QUFHRkMsSUFBQUEsRUFBRSxFQUFFLEtBSEY7QUFJRkMsSUFBQUEsU0FKRSxxQkFJUUMsUUFKUixFQUlrQjtBQUNoQlIsTUFBQUEsUUFBUSxDQUFDUSxRQUFELENBQVI7QUFDSCxLQU5DO0FBT0ZDLElBQUFBLFNBUEUscUJBT1FELFFBUFIsRUFPa0I7QUFDaEJSLE1BQUFBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ0gsS0FUQztBQVVGRSxJQUFBQSxPQVZFLHFCQVVRO0FBQ05WLE1BQUFBLFFBQVEsQ0FBQztBQUNMVyxRQUFBQSxNQUFNLEVBQUUsS0FESDtBQUVMQyxRQUFBQSxRQUFRLEVBQUU7QUFBRUMsVUFBQUEsS0FBSyxFQUFFLENBQUMsd0JBQUQ7QUFBVDtBQUZMLE9BQUQsQ0FBUjtBQUlIO0FBZkMsR0FBTjtBQWlCSCxDQWxCRDtBQW9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBbkIsdUJBQXVCLENBQUNLLElBQXhCLEdBQStCLFVBQVNlLEVBQVQsRUFBYWQsUUFBYixFQUF1QjtBQUNsREMsRUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsSUFBQUEsR0FBRyxZQUFLLEtBQUtDLE1BQVYsY0FBb0JVLEVBQXBCLFVBREQ7QUFFRlQsSUFBQUEsTUFBTSxFQUFFLEtBRk47QUFHRkMsSUFBQUEsRUFBRSxFQUFFLEtBSEY7QUFJRkMsSUFBQUEsU0FKRSxxQkFJUUMsUUFKUixFQUlrQjtBQUNoQlIsTUFBQUEsUUFBUSxDQUFDUSxRQUFELENBQVI7QUFDSCxLQU5DO0FBT0ZDLElBQUFBLFNBUEUscUJBT1FELFFBUFIsRUFPa0I7QUFDaEJSLE1BQUFBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ0gsS0FUQztBQVVGRSxJQUFBQSxPQVZFLHFCQVVRO0FBQ05WLE1BQUFBLFFBQVEsQ0FBQztBQUNMVyxRQUFBQSxNQUFNLEVBQUUsS0FESDtBQUVMQyxRQUFBQSxRQUFRLEVBQUU7QUFBRUMsVUFBQUEsS0FBSyxFQUFFLENBQUMsd0JBQUQ7QUFBVDtBQUZMLE9BQUQsQ0FBUjtBQUlIO0FBZkMsR0FBTjtBQWlCSCxDQWxCRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGlDbGllbnQsICQgKi9cblxuLyoqXG4gKiBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgZGlhbHBsYW4gYXBwbGljYXRpb25zIG1hbmFnZW1lbnRcbiAqIFxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIGRpYWxwbGFuIGFwcGxpY2F0aW9ucyBvcGVyYXRpb25zIHVzaW5nIHRoZSBuZXcgUkVTVGZ1bCBBUEkuXG4gKiBcbiAqIEBjbGFzcyBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSVxuICovXG5jb25zdCBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL2RpYWxwbGFuLWFwcGxpY2F0aW9ucycsXG4gICAgY3VzdG9tTWV0aG9kczoge1xuICAgICAgICBnZXREZWZhdWx0OiAnOmdldERlZmF1bHQnLFxuICAgICAgICBjb3B5OiAnOmNvcHknXG4gICAgfVxufSk7XG5cbi8qKlxuICogR2V0IGRlZmF1bHQgdmFsdWVzIGZvciBhIG5ldyBkaWFscGxhbiBhcHBsaWNhdGlvblxuICogXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSS5nZXREZWZhdWx0KChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ0RlZmF1bHQgdmFsdWVzOicsIHJlc3BvbnNlLmRhdGEpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5EaWFscGxhbkFwcGxpY2F0aW9uc0FQSS5nZXREZWZhdWx0ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAkLmFwaSh7XG4gICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9OmdldERlZmF1bHRgLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICB9LFxuICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7IGVycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXSB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBDb3B5IGFuIGV4aXN0aW5nIGRpYWxwbGFuIGFwcGxpY2F0aW9uXG4gKiBcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIElEIG9mIHRoZSBkaWFscGxhbiBhcHBsaWNhdGlvbiB0byBjb3B5XG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSS5jb3B5KCdESUFMUExBTi1BUFAtMTIzJywgKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnQ29waWVkIGFwcGxpY2F0aW9uOicsIHJlc3BvbnNlLmRhdGEpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5EaWFscGxhbkFwcGxpY2F0aW9uc0FQSS5jb3B5ID0gZnVuY3Rpb24oaWQsIGNhbGxiYWNrKSB7XG4gICAgJC5hcGkoe1xuICAgICAgICB1cmw6IGAke3RoaXMuYXBpVXJsfS8ke2lkfTpjb3B5YCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgb246ICdub3cnLFxuICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlczogeyBlcnJvcjogWydOZXR3b3JrIGVycm9yIG9jY3VycmVkJ10gfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07Il19