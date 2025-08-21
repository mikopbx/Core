"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, Config */

/**
 * GeneralSettingsAPI module
 * Handles all API calls related to general system settings
 * 
 * @module GeneralSettingsAPI
 */
var GeneralSettingsAPI = {
  /**
   * Get all general settings from the REST API
   * @param {Function} callback - Callback function to handle the response
   */
  getSettings: function getSettings(callback) {
    $.api({
      url: "".concat(Config.pbxUrl, "/pbxcore/api/v2/general-settings/getSettings"),
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Save general settings via REST API
   * @param {Object} data - Settings data to save
   * @param {Function} callback - Callback function to handle the response
   */
  saveSettings: function saveSettings(data, callback) {
    $.api({
      url: "".concat(Config.pbxUrl, "/pbxcore/api/v2/general-settings/saveSettings"),
      on: 'now',
      method: 'POST',
      data: data,
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Update codecs configuration separately if needed
   * @param {Array} codecs - Array of codec configurations
   * @param {Function} callback - Callback function to handle the response
   */
  updateCodecs: function updateCodecs(codecs, callback) {
    $.api({
      url: "".concat(Config.pbxUrl, "/pbxcore/api/v2/general-settings/updateCodecs"),
      on: 'now',
      method: 'POST',
      data: {
        codecs: codecs
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
      }
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvR2VuZXJhbFNldHRpbmdzQVBJLmpzIl0sIm5hbWVzIjpbIkdlbmVyYWxTZXR0aW5nc0FQSSIsImdldFNldHRpbmdzIiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwiQ29uZmlnIiwicGJ4VXJsIiwib24iLCJzdWNjZXNzVGVzdCIsIlBieEFwaSIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwib25GYWlsdXJlIiwib25FcnJvciIsInNhdmVTZXR0aW5ncyIsImRhdGEiLCJtZXRob2QiLCJ1cGRhdGVDb2RlY3MiLCJjb2RlY3MiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxrQkFBa0IsR0FBRztBQUN2QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxXQUx1Qix1QkFLWEMsUUFMVyxFQUtEO0FBQ2xCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLFlBQUtDLE1BQU0sQ0FBQ0MsTUFBWixpREFERDtBQUVGQyxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGQyxNQUFBQSxXQUFXLEVBQUVDLE1BQU0sQ0FBQ0QsV0FIbEI7QUFJRkUsTUFBQUEsU0FKRSxxQkFJUUMsUUFKUixFQUlrQjtBQUNoQlYsUUFBQUEsUUFBUSxDQUFDVSxRQUFELENBQVI7QUFDSCxPQU5DO0FBT0ZDLE1BQUFBLFNBUEUscUJBT1FELFFBUFIsRUFPa0I7QUFDaEJWLFFBQUFBLFFBQVEsQ0FBQ1UsUUFBRCxDQUFSO0FBQ0gsT0FUQztBQVVGRSxNQUFBQSxPQVZFLHFCQVVRO0FBQ05aLFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSDtBQVpDLEtBQU47QUFjSCxHQXBCc0I7O0FBc0J2QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lhLEVBQUFBLFlBM0J1Qix3QkEyQlZDLElBM0JVLEVBMkJKZCxRQTNCSSxFQTJCTTtBQUN6QkMsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxZQUFLQyxNQUFNLENBQUNDLE1BQVosa0RBREQ7QUFFRkMsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlMsTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkQsTUFBQUEsSUFBSSxFQUFFQSxJQUpKO0FBS0ZQLE1BQUFBLFdBQVcsRUFBRUMsTUFBTSxDQUFDRCxXQUxsQjtBQU1GRSxNQUFBQSxTQU5FLHFCQU1RQyxRQU5SLEVBTWtCO0FBQ2hCVixRQUFBQSxRQUFRLENBQUNVLFFBQUQsQ0FBUjtBQUNILE9BUkM7QUFTRkMsTUFBQUEsU0FURSxxQkFTUUQsUUFUUixFQVNrQjtBQUNoQlYsUUFBQUEsUUFBUSxDQUFDVSxRQUFELENBQVI7QUFDSCxPQVhDO0FBWUZFLE1BQUFBLE9BWkUscUJBWVE7QUFDTlosUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSCxHQTVDc0I7O0FBOEN2QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lnQixFQUFBQSxZQW5EdUIsd0JBbURWQyxNQW5EVSxFQW1ERmpCLFFBbkRFLEVBbURRO0FBQzNCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLFlBQUtDLE1BQU0sQ0FBQ0MsTUFBWixrREFERDtBQUVGQyxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGUyxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGRCxNQUFBQSxJQUFJLEVBQUU7QUFBRUcsUUFBQUEsTUFBTSxFQUFFQTtBQUFWLE9BSko7QUFLRlYsTUFBQUEsV0FBVyxFQUFFQyxNQUFNLENBQUNELFdBTGxCO0FBTUZFLE1BQUFBLFNBTkUscUJBTVFDLFFBTlIsRUFNa0I7QUFDaEJWLFFBQUFBLFFBQVEsQ0FBQ1UsUUFBRCxDQUFSO0FBQ0gsT0FSQztBQVNGQyxNQUFBQSxTQVRFLHFCQVNRRCxRQVRSLEVBU2tCO0FBQ2hCVixRQUFBQSxRQUFRLENBQUNVLFFBQUQsQ0FBUjtBQUNILE9BWEM7QUFZRkUsTUFBQUEsT0FaRSxxQkFZUTtBQUNOWixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFkQyxLQUFOO0FBZ0JIO0FBcEVzQixDQUEzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBDb25maWcgKi9cblxuLyoqXG4gKiBHZW5lcmFsU2V0dGluZ3NBUEkgbW9kdWxlXG4gKiBIYW5kbGVzIGFsbCBBUEkgY2FsbHMgcmVsYXRlZCB0byBnZW5lcmFsIHN5c3RlbSBzZXR0aW5nc1xuICogXG4gKiBAbW9kdWxlIEdlbmVyYWxTZXR0aW5nc0FQSVxuICovXG5jb25zdCBHZW5lcmFsU2V0dGluZ3NBUEkgPSB7XG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBnZW5lcmFsIHNldHRpbmdzIGZyb20gdGhlIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZ2V0U2V0dGluZ3MoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9nZW5lcmFsLXNldHRpbmdzL2dldFNldHRpbmdzYCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZSBnZW5lcmFsIHNldHRpbmdzIHZpYSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gU2V0dGluZ3MgZGF0YSB0byBzYXZlXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gICAgICovXG4gICAgc2F2ZVNldHRpbmdzKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjIvZ2VuZXJhbC1zZXR0aW5ncy9zYXZlU2V0dGluZ3NgLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgY29kZWNzIGNvbmZpZ3VyYXRpb24gc2VwYXJhdGVseSBpZiBuZWVkZWRcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb2RlY3MgLSBBcnJheSBvZiBjb2RlYyBjb25maWd1cmF0aW9uc1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICAgICAqL1xuICAgIHVwZGF0ZUNvZGVjcyhjb2RlY3MsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjIvZ2VuZXJhbC1zZXR0aW5ncy91cGRhdGVDb2RlY3NgLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7IGNvZGVjczogY29kZWNzIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTsiXX0=