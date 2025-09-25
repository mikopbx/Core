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

/* global Config, PbxApi */

/**
 * Password validation and generation API (v3)
 * Uses RESTful v3 endpoints with custom method notation
 * @module PasswordsAPI
 */
var PasswordsAPI = {
  /**
   * Validate password strength
   * 
   * @param {string} password - Password to validate
   * @param {string} field - Field name (WebAdminPassword or SSHPassword)
   * @param {function} callback - Callback function
   */
  validatePassword: function validatePassword(password, field, callback) {
    $.api({
      url: "".concat(Config.pbxUrl, "/pbxcore/api/v3/passwords:validate"),
      on: 'now',
      method: 'POST',
      data: {
        password: password,
        field: field
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        if (callback && typeof callback === 'function') {
          callback(response.data);
        }
      },
      onFailure: function onFailure(response) {
        if (callback && typeof callback === 'function') {
          callback(false);
        }
      }
    });
  },

  /**
   * Generate a secure password
   * 
   * @param {number} length - Desired password length (8-64)
   * @param {function} callback - Callback function
   */
  generatePassword: function generatePassword(length, callback) {
    $.api({
      url: "".concat(Config.pbxUrl, "/pbxcore/api/v3/passwords:generate"),
      on: 'now',
      method: 'POST',
      data: {
        length: length || 16
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        if (callback && typeof callback === 'function') {
          callback(response.data);
        }
      },
      onFailure: function onFailure(response) {
        if (callback && typeof callback === 'function') {
          callback(false);
        }
      }
    });
  },

  /**
   * Check if password exists in dictionary (lightweight check)
   * 
   * @param {string} password - Password to check
   * @param {function} callback - Callback function
   */
  checkDictionary: function checkDictionary(password, callback) {
    $.api({
      url: "".concat(Config.pbxUrl, "/pbxcore/api/v3/passwords:checkDictionary"),
      on: 'now',
      method: 'POST',
      data: {
        password: password
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        if (callback && typeof callback === 'function') {
          callback(response.data);
        }
      },
      onFailure: function onFailure(response) {
        if (callback && typeof callback === 'function') {
          callback(false);
        }
      }
    });
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
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGFzc3dvcmRzLWFwaS5qcyJdLCJuYW1lcyI6WyJQYXNzd29yZHNBUEkiLCJ2YWxpZGF0ZVBhc3N3b3JkIiwicGFzc3dvcmQiLCJmaWVsZCIsImNhbGxiYWNrIiwiJCIsImFwaSIsInVybCIsIkNvbmZpZyIsInBieFVybCIsIm9uIiwibWV0aG9kIiwiZGF0YSIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJvbkZhaWx1cmUiLCJnZW5lcmF0ZVBhc3N3b3JkIiwibGVuZ3RoIiwiY2hlY2tEaWN0aW9uYXJ5IiwiY3JlYXRlRGVib3VuY2VkVmFsaWRhdG9yIiwiZGVsYXkiLCJ0aW1lb3V0SWQiLCJjbGVhclRpbWVvdXQiLCJpc0xvYWRpbmciLCJzZXRUaW1lb3V0Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRztBQUNqQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkFSaUIsNEJBUUFDLFFBUkEsRUFRVUMsS0FSVixFQVFpQkMsUUFSakIsRUFRMkI7QUFDeENDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsWUFBS0MsTUFBTSxDQUFDQyxNQUFaLHVDQUREO0FBRUZDLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZDLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZDLE1BQUFBLElBQUksRUFBRTtBQUNGVixRQUFBQSxRQUFRLEVBQUVBLFFBRFI7QUFFRkMsUUFBQUEsS0FBSyxFQUFFQTtBQUZMLE9BSko7QUFRRlUsTUFBQUEsV0FBVyxFQUFFQyxNQUFNLENBQUNELFdBUmxCO0FBU0ZFLE1BQUFBLFNB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Q0EsUUFBQUEsUUFBUSxDQUFDO0FBQUVxQixVQUFBQSxTQUFTLEVBQUU7QUFBYixTQUFELENBQVI7QUFDSDs7QUFFREYsTUFBQUEsU0FBUyxHQUFHRyxVQUFVLENBQUMsWUFBTTtBQUN6QjFCLFFBQUFBLFlBQVksQ0FBQ0MsZ0JBQWIsQ0FBOEJDLFFBQTlCLEVBQXdDQyxLQUF4QyxFQUErQ0MsUUFBL0M7QUFDSCxPQUZxQixFQUVuQmtCLEtBRm1CLENBQXRCO0FBR0gsS0FYRDtBQVlIO0FBOUdnQixDQUFyQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBDb25maWcsIFBieEFwaSAqLyBcblxuLyoqXG4gKiBQYXNzd29yZCB2YWxpZGF0aW9uIGFuZCBnZW5lcmF0aW9uIEFQSSAodjMpXG4gKiBVc2VzIFJFU1RmdWwgdjMgZW5kcG9pbnRzIHdpdGggY3VzdG9tIG1ldGhvZCBub3RhdGlvblxuICogQG1vZHVsZSBQYXNzd29yZHNBUElcbiAqL1xuY29uc3QgUGFzc3dvcmRzQVBJID0ge1xuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIHBhc3N3b3JkIHN0cmVuZ3RoXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3N3b3JkIC0gUGFzc3dvcmQgdG8gdmFsaWRhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGQgLSBGaWVsZCBuYW1lIChXZWJBZG1pblBhc3N3b3JkIG9yIFNTSFBhc3N3b3JkKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVBhc3N3b3JkKHBhc3N3b3JkLCBmaWVsZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92My9wYXNzd29yZHM6dmFsaWRhdGVgLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgcGFzc3dvcmQ6IHBhc3N3b3JkLFxuICAgICAgICAgICAgICAgIGZpZWxkOiBmaWVsZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBzZWN1cmUgcGFzc3dvcmRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbGVuZ3RoIC0gRGVzaXJlZCBwYXNzd29yZCBsZW5ndGggKDgtNjQpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdlbmVyYXRlUGFzc3dvcmQobGVuZ3RoLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YzL3Bhc3N3b3JkczpnZW5lcmF0ZWAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBsZW5ndGg6IGxlbmd0aCB8fCAxNlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgcGFzc3dvcmQgZXhpc3RzIGluIGRpY3Rpb25hcnkgKGxpZ2h0d2VpZ2h0IGNoZWNrKVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIGNoZWNrXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGNoZWNrRGljdGlvbmFyeShwYXNzd29yZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92My9wYXNzd29yZHM6Y2hlY2tEaWN0aW9uYXJ5YCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHBhc3N3b3JkOiBwYXNzd29yZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVib3VuY2VkIHBhc3N3b3JkIHZhbGlkYXRpb24gZm9yIHJlYWwtdGltZSBjaGVja2luZ1xuICAgICAqIFJldHVybnMgYSBkZWJvdW5jZWQgZnVuY3Rpb24gdGhhdCBkZWxheXMgZXhlY3V0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZWxheSAtIERlbGF5IGluIG1pbGxpc2Vjb25kc1xuICAgICAqIEByZXR1cm4ge2Z1bmN0aW9ufSBEZWJvdW5jZWQgdmFsaWRhdGlvbiBmdW5jdGlvblxuICAgICAqL1xuICAgIGNyZWF0ZURlYm91bmNlZFZhbGlkYXRvcihjYWxsYmFjaywgZGVsYXkgPSA1MDApIHtcbiAgICAgICAgbGV0IHRpbWVvdXRJZDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmdW5jdGlvbihwYXNzd29yZCwgZmllbGQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGUgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAmJiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7IGlzTG9hZGluZzogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgUGFzc3dvcmRzQVBJLnZhbGlkYXRlUGFzc3dvcmQocGFzc3dvcmQsIGZpZWxkLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9LCBkZWxheSk7XG4gICAgICAgIH07XG4gICAgfVxufTsiXX0=