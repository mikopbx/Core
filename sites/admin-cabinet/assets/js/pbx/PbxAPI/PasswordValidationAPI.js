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
 * Password validation and generation API
 * @module PasswordValidationAPI
 */
var PasswordValidationAPI = {
  /**
   * Validate password strength
   * 
   * @param {string} password - Password to validate
   * @param {string} field - Field name (WebAdminPassword or SSHPassword)
   * @param {function} callback - Callback function
   */
  validatePassword: function validatePassword(password, field, callback) {
    $.api({
      url: "".concat(Config.pbxUrl, "/pbxcore/api/v2/passwords/validate"),
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
      url: "".concat(Config.pbxUrl, "/pbxcore/api/v2/passwords/generate"),
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
      url: "".concat(Config.pbxUrl, "/pbxcore/api/v2/passwords/checkDictionary"),
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
        PasswordValidationAPI.validatePassword(password, field, callback);
      }, delay);
    };
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvUGFzc3dvcmRWYWxpZGF0aW9uQVBJLmpzIl0sIm5hbWVzIjpbIlBhc3N3b3JkVmFsaWRhdGlvbkFQSSIsInZhbGlkYXRlUGFzc3dvcmQiLCJwYXNzd29yZCIsImZpZWxkIiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwiQ29uZmlnIiwicGJ4VXJsIiwib24iLCJtZXRob2QiLCJkYXRhIiwic3VjY2Vzc1Rlc3QiLCJQYnhBcGkiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsIm9uRmFpbHVyZSIsImdlbmVyYXRlUGFzc3dvcmQiLCJsZW5ndGgiLCJjaGVja0RpY3Rpb25hcnkiLCJjcmVhdGVEZWJvdW5jZWRWYWxpZGF0b3IiLCJkZWxheSIsInRpbWVvdXRJZCIsImNsZWFyVGltZW91dCIsImlzTG9hZGluZyIsInNldFRpbWVvdXQiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLHFCQUFxQixHQUFHO0FBQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGdCQVIwQiw0QkFRVEMsUUFSUyxFQVFDQyxLQVJELEVBUVFDLFFBUlIsRUFRa0I7QUFDeENDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsWUFBS0MsTUFBTSxDQUFDQyxNQUFaLHVDQUREO0FBRUZDLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZDLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZDLE1BQUFBLElBQUksRUFBRTtBQUNGVixRQUFBQSxRQUFRLEVBQUVBLFFBRFI7QUFFRkMsUUFBQUEsS0FBSyxFQUFFQTtBQUZMLE9BSko7QUFRRlUsTUFBQUEsV0FBVyxFQUFFQyxNQUFNLENBQUNELFdBUmxCO0FB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RUFBZ0Q7QUFDNUNBLFFBQUFBLFFBQVEsQ0FBQztBQUFFcUIsVUFBQUEsU0FBUyxFQUFFO0FBQWIsU0FBRCxDQUFSO0FBQ0g7O0FBRURGLE1BQUFBLFNBQVMsR0FBR0csVUFBVSxDQUFDLFlBQU07QUFDekIxQixRQUFBQSxxQkFBcUIsQ0FBQ0MsZ0JBQXRCLENBQXVDQyxRQUF2QyxFQUFpREMsS0FBakQsRUFBd0RDLFFBQXhEO0FBQ0gsT0FGcUIsRUFFbkJrQixLQUZtQixDQUF0QjtBQUdILEtBWEQ7QUFZSDtBQTlHeUIsQ0FBOUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBQYnhBcGkgKi9cblxuLyoqXG4gKiBQYXNzd29yZCB2YWxpZGF0aW9uIGFuZCBnZW5lcmF0aW9uIEFQSVxuICogQG1vZHVsZSBQYXNzd29yZFZhbGlkYXRpb25BUElcbiAqL1xuY29uc3QgUGFzc3dvcmRWYWxpZGF0aW9uQVBJID0ge1xuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIHBhc3N3b3JkIHN0cmVuZ3RoXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3N3b3JkIC0gUGFzc3dvcmQgdG8gdmFsaWRhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGQgLSBGaWVsZCBuYW1lIChXZWJBZG1pblBhc3N3b3JkIG9yIFNTSFBhc3N3b3JkKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVBhc3N3b3JkKHBhc3N3b3JkLCBmaWVsZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9wYXNzd29yZHMvdmFsaWRhdGVgLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgcGFzc3dvcmQ6IHBhc3N3b3JkLFxuICAgICAgICAgICAgICAgIGZpZWxkOiBmaWVsZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBzZWN1cmUgcGFzc3dvcmRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbGVuZ3RoIC0gRGVzaXJlZCBwYXNzd29yZCBsZW5ndGggKDgtNjQpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdlbmVyYXRlUGFzc3dvcmQobGVuZ3RoLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YyL3Bhc3N3b3Jkcy9nZW5lcmF0ZWAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBsZW5ndGg6IGxlbmd0aCB8fCAxNlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgcGFzc3dvcmQgZXhpc3RzIGluIGRpY3Rpb25hcnkgKGxpZ2h0d2VpZ2h0IGNoZWNrKVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIGNoZWNrXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGNoZWNrRGljdGlvbmFyeShwYXNzd29yZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9wYXNzd29yZHMvY2hlY2tEaWN0aW9uYXJ5YCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHBhc3N3b3JkOiBwYXNzd29yZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVib3VuY2VkIHBhc3N3b3JkIHZhbGlkYXRpb24gZm9yIHJlYWwtdGltZSBjaGVja2luZ1xuICAgICAqIFJldHVybnMgYSBkZWJvdW5jZWQgZnVuY3Rpb24gdGhhdCBkZWxheXMgZXhlY3V0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZWxheSAtIERlbGF5IGluIG1pbGxpc2Vjb25kc1xuICAgICAqIEByZXR1cm4ge2Z1bmN0aW9ufSBEZWJvdW5jZWQgdmFsaWRhdGlvbiBmdW5jdGlvblxuICAgICAqL1xuICAgIGNyZWF0ZURlYm91bmNlZFZhbGlkYXRvcihjYWxsYmFjaywgZGVsYXkgPSA1MDApIHtcbiAgICAgICAgbGV0IHRpbWVvdXRJZDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmdW5jdGlvbihwYXNzd29yZCwgZmllbGQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGUgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAmJiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7IGlzTG9hZGluZzogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgUGFzc3dvcmRWYWxpZGF0aW9uQVBJLnZhbGlkYXRlUGFzc3dvcmQocGFzc3dvcmQsIGZpZWxkLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9LCBkZWxheSk7XG4gICAgICAgIH07XG4gICAgfVxufTsiXX0=