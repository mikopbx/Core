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

/* global Config, PbxApi, PbxApiClient */

/**
 * PasswordsAPI - REST API v3 client for password validation and generation
 *
 * Uses RESTful v3 endpoints with custom method notation
 *
 * @class PasswordsAPI
 */
var PasswordsAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/passwords',
  customMethods: {
    validate: ':validate',
    generate: ':generate',
    checkDictionary: ':checkDictionary'
  }
}); // Add method aliases to PasswordsAPI

Object.assign(PasswordsAPI, {
  /**
   * Validate password strength
   *
   * @param {string} password - Password to validate
   * @param {string} field - Field name (WebAdminPassword or SSHPassword)
   * @param {function} callback - Callback function
   */
  validatePassword: function validatePassword(password, field, callback) {
    var data = {
      password: password,
      field: field
    };
    return this.callCustomMethod('validate', data, function (response) {
      if (callback && typeof callback === 'function') {
        if (response && response.result === true && response.data) {
          callback(response.data);
        } else {
          callback(false);
        }
      }
    }, 'POST');
  },

  /**
   * Generate a secure password
   *
   * @param {number} length - Desired password length (8-64)
   * @param {function} callback - Callback function
   */
  generatePassword: function generatePassword(length, callback) {
    var data = {
      length: length || 16
    };
    return this.callCustomMethod('generate', data, function (response) {
      if (callback && typeof callback === 'function') {
        if (response && response.result === true && response.data) {
          callback(response.data);
        } else {
          callback(false);
        }
      }
    }, 'GET');
  },

  /**
   * Check if password exists in dictionary (lightweight check)
   *
   * @param {string} password - Password to check
   * @param {function} callback - Callback function
   */
  checkDictionary: function checkDictionary(password, callback) {
    var data = {
      password: password
    };
    return this.callCustomMethod('checkDictionary', data, function (response) {
      if (callback && typeof callback === 'function') {
        if (response && response.result === true && response.data) {
          callback(response.data);
        } else {
          callback(false);
        }
      }
    }, 'POST');
  },

  /**
   * Debounced password validation for real-time checking
   * Returns a debounced function that delays execution
   *
   * @param {function} callback - Callback function
   * @param {number} delay - Delay in milliseconds
   * @return {function} Debounced validation function
   */
  createDebouncedValidator: function createDebouncedValidator(callback) {
    var delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 500;
    var timeoutId;
    return function (password, field) {
      clearTimeout(timeoutId); // Show loading state immediately

      if (callback && typeof callback === 'function') {
        callback({
          isLoading: true
        });
      }

      timeoutId = setTimeout(function () {
        PasswordsAPI.validatePassword(password, field, callback);
      }, delay);
    };
  }
}); // Export for use in other modules

window.PasswordsAPI = PasswordsAPI;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGFzc3dvcmRzLWFwaS5qcyJdLCJuYW1lcyI6WyJQYXNzd29yZHNBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJ2YWxpZGF0ZSIsImdlbmVyYXRlIiwiY2hlY2tEaWN0aW9uYXJ5IiwiT2JqZWN0IiwiYXNzaWduIiwidmFsaWRhdGVQYXNzd29yZCIsInBhc3N3b3JkIiwiZmllbGQiLCJjYWxsYmFjayIsImRhdGEiLCJjYWxsQ3VzdG9tTWV0aG9kIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJnZW5lcmF0ZVBhc3N3b3JkIiwibGVuZ3RoIiwiY3JlYXRlRGVib3VuY2VkVmFsaWRhdG9yIiwiZGVsYXkiLCJ0aW1lb3V0SWQiLCJjbGVhclRpbWVvdXQiLCJpc0xvYWRpbmciLCJzZXRUaW1lb3V0Iiwid2luZG93Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxZQUFZLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUNsQ0MsRUFBQUEsUUFBUSxFQUFFLDJCQUR3QjtBQUVsQ0MsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFFBQVEsRUFBRSxXQURDO0FBRVhDLElBQUFBLFFBQVEsRUFBRSxXQUZDO0FBR1hDLElBQUFBLGVBQWUsRUFBRTtBQUhOO0FBRm1CLENBQWpCLENBQXJCLEMsQ0FTQTs7QUFDQUMsTUFBTSxDQUFDQyxNQUFQLENBQWNSLFlBQWQsRUFBNEI7QUFFeEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSVMsRUFBQUEsZ0JBVHdCLDRCQVNQQyxRQVRPLEVBU0dDLEtBVEgsRUFTVUMsUUFUVixFQVNvQjtBQUN4QyxRQUFNQyxJQUFJLEdBQUc7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QUErQ0MsUUFBL0M7QUFDSCxPQUZxQixFQUVuQlEsS0FGbUIsQ0FBdEI7QUFHSCxLQVhEO0FBWUg7QUE3RnVCLENBQTVCLEUsQ0FpR0E7O0FBQ0FLLE1BQU0sQ0FBQ3pCLFlBQVAsR0FBc0JBLFlBQXRCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIENvbmZpZywgUGJ4QXBpLCBQYnhBcGlDbGllbnQgKi9cblxuLyoqXG4gKiBQYXNzd29yZHNBUEkgLSBSRVNUIEFQSSB2MyBjbGllbnQgZm9yIHBhc3N3b3JkIHZhbGlkYXRpb24gYW5kIGdlbmVyYXRpb25cbiAqXG4gKiBVc2VzIFJFU1RmdWwgdjMgZW5kcG9pbnRzIHdpdGggY3VzdG9tIG1ldGhvZCBub3RhdGlvblxuICpcbiAqIEBjbGFzcyBQYXNzd29yZHNBUElcbiAqL1xuY29uc3QgUGFzc3dvcmRzQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvcGFzc3dvcmRzJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIHZhbGlkYXRlOiAnOnZhbGlkYXRlJyxcbiAgICAgICAgZ2VuZXJhdGU6ICc6Z2VuZXJhdGUnLFxuICAgICAgICBjaGVja0RpY3Rpb25hcnk6ICc6Y2hlY2tEaWN0aW9uYXJ5J1xuICAgIH1cbn0pO1xuXG4vLyBBZGQgbWV0aG9kIGFsaWFzZXMgdG8gUGFzc3dvcmRzQVBJXG5PYmplY3QuYXNzaWduKFBhc3N3b3Jkc0FQSSwge1xuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGUgcGFzc3dvcmQgc3RyZW5ndGhcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIHZhbGlkYXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkIC0gRmllbGQgbmFtZSAoV2ViQWRtaW5QYXNzd29yZCBvciBTU0hQYXNzd29yZClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgdmFsaWRhdGVQYXNzd29yZChwYXNzd29yZCwgZmllbGQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgICAgICBwYXNzd29yZDogcGFzc3dvcmQsXG4gICAgICAgICAgICBmaWVsZDogZmllbGRcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCd2YWxpZGF0ZScsIGRhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrICYmIHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCAnUE9TVCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhIHNlY3VyZSBwYXNzd29yZFxuICAgICAqXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxlbmd0aCAtIERlc2lyZWQgcGFzc3dvcmQgbGVuZ3RoICg4LTY0KVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZW5lcmF0ZVBhc3N3b3JkKGxlbmd0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgIGxlbmd0aDogbGVuZ3RoIHx8IDE2XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2VuZXJhdGUnLCBkYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAmJiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgJ0dFVCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBwYXNzd29yZCBleGlzdHMgaW4gZGljdGlvbmFyeSAobGlnaHR3ZWlnaHQgY2hlY2spXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBQYXNzd29yZCB0byBjaGVja1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBjaGVja0RpY3Rpb25hcnkocGFzc3dvcmQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgICAgICBwYXNzd29yZDogcGFzc3dvcmRcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdjaGVja0RpY3Rpb25hcnknLCBkYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAmJiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgJ1BPU1QnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVib3VuY2VkIHBhc3N3b3JkIHZhbGlkYXRpb24gZm9yIHJlYWwtdGltZSBjaGVja2luZ1xuICAgICAqIFJldHVybnMgYSBkZWJvdW5jZWQgZnVuY3Rpb24gdGhhdCBkZWxheXMgZXhlY3V0aW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlbGF5IC0gRGVsYXkgaW4gbWlsbGlzZWNvbmRzXG4gICAgICogQHJldHVybiB7ZnVuY3Rpb259IERlYm91bmNlZCB2YWxpZGF0aW9uIGZ1bmN0aW9uXG4gICAgICovXG4gICAgY3JlYXRlRGVib3VuY2VkVmFsaWRhdG9yKGNhbGxiYWNrLCBkZWxheSA9IDUwMCkge1xuICAgICAgICBsZXQgdGltZW91dElkO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbihwYXNzd29yZCwgZmllbGQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuXG4gICAgICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGUgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAmJiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7IGlzTG9hZGluZzogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgUGFzc3dvcmRzQVBJLnZhbGlkYXRlUGFzc3dvcmQocGFzc3dvcmQsIGZpZWxkLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9LCBkZWxheSk7XG4gICAgICAgIH07XG4gICAgfVxuXG59KTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93LlBhc3N3b3Jkc0FQSSA9IFBhc3N3b3Jkc0FQSTsiXX0=