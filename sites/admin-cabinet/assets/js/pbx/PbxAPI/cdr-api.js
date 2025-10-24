"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

/* global globalRootUrl, Config, PbxApi, PbxApiClient */

/**
 * CdrAPI - REST API v3 client for call detail records management
 *
 * Provides methods for working with historical call records.
 * For real-time monitoring (active calls/channels), use PbxStatusAPI instead.
 *
 * @class CdrAPI
 */
var CdrAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/cdr',
  customMethods: {
    getMetadata: ':getMetadata'
  }
});
/**
 * Add method aliases to CdrAPI
 */

Object.assign(CdrAPI, {
  /**
   * Get CDR metadata (date range, record count)
   * @param {Object} params - Request parameters (e.g., {limit: 100})
   * @param {function} callback - Callback function
   */
  getMetadata: function getMetadata(params, callback) {
    return this.callCustomMethod('getMetadata', params, function (response) {
      if (response && response.result === true && response.data) {
        callback(response.data);
      } else {
        callback(false);
      }
    });
  },

  /**
   * Delete CDR record
   * WHY: 'delete' is a reserved keyword in JavaScript, so we use 'deleteRecord' as method name
   * @param {string} id - Record ID to delete (numeric ID or linkedid like "mikopbx-xxx")
   *                      - linkedid (mikopbx-*): Deletes entire conversation (all linked records)
   *                      - numeric ID: Deletes single record only
   * @param {Object} params - Optional parameters {deleteRecording: boolean}
   * @param {function} callback - Callback function
   */
  deleteRecord: function deleteRecord(id, params, callback) {
    // If params is a function, it means no params were passed
    if (typeof params === 'function') {
      callback = params;
      params = {};
    }

    var apiSettings = this.getBaseApiSettings(function (response) {
      return callback(response, true);
    }, callback);
    $.api(_objectSpread({
      url: "".concat(this.apiUrl, "/").concat(id),
      method: 'DELETE',
      data: params,
      // deleteRecording and deleteLinked will be sent as query params
      beforeXHR: function beforeXHR(xhr) {
        // Add Bearer token for API authentication
        // WHY: REST API v3 uses JWT Bearer tokens, not CSRF tokens
        if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
          xhr.setRequestHeader('Authorization', "Bearer ".concat(TokenManager.accessToken));
        }

        return xhr;
      }
    }, apiSettings));
  }
}); // Export for use in other modules

window.CdrAPI = CdrAPI;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvY2RyLWFwaS5qcyJdLCJuYW1lcyI6WyJDZHJBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXRNZXRhZGF0YSIsIk9iamVjdCIsImFzc2lnbiIsInBhcmFtcyIsImNhbGxiYWNrIiwiY2FsbEN1c3RvbU1ldGhvZCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsImRlbGV0ZVJlY29yZCIsImlkIiwiYXBpU2V0dGluZ3MiLCJnZXRCYXNlQXBpU2V0dGluZ3MiLCIkIiwiYXBpIiwidXJsIiwiYXBpVXJsIiwibWV0aG9kIiwiYmVmb3JlWEhSIiwieGhyIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJzZXRSZXF1ZXN0SGVhZGVyIiwid2luZG93Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE1BQU0sR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQzVCQyxFQUFBQSxRQUFRLEVBQUUscUJBRGtCO0FBRTVCQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsV0FBVyxFQUFFO0FBREY7QUFGYSxDQUFqQixDQUFmO0FBT0E7QUFDQTtBQUNBOztBQUNBQyxNQUFNLENBQUNDLE1BQVAsQ0FBY04sTUFBZCxFQUFzQjtBQUNsQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLFdBTmtCLHVCQU1ORyxNQU5NLEVBTUVDLFFBTkYsRUFNWTtBQUMxQixXQUFPLEtBQUtDLGdCQUFMLENBQXNCLGFBQXRCLEVBQXFDRixNQUFyQyxFQUE2QyxVQUFDRyxRQUFELEVBQWM7QUFDOUQsVUFBSUEsUUFBUSxJQUFJQSxRQUFRLENBQUNDLE1BQVQsS0FBb0IsSUFBaEMsSUFBd0NELFFBQVEsQ0FBQ0UsSUFBckQsRUFBMkQ7QUFDdkRKLFFBQUFBLFFBQVEsQ0FBQ0UsUUFBUSxDQUFDRSxJQUFWLENBQVI7QUFDSCxPQUZELE1BRU87QUFDSEosUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBQ0osS0FOTSxDQUFQO0FBT0gsR0FkaUI7O0FBZ0JsQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsWUF6QmtCLHdCQXlCTEMsRUF6QkssRUF5QkRQLE1BekJDLEVBeUJPQyxRQXpCUCxFQXlCaUI7QUFDL0I7QUFDQSxRQUFJLE9BQU9ELE1BQVAsS0FBa0IsVUFBdEIsRUFBa0M7QUFDOUJDLE1BQUFBLFFBQVEsR0FBR0QsTUFBWDtBQUNBQSxNQUFBQSxNQUFNLEdBQUcsRUFBVDtBQUNIOztBQUVELFFBQU1RLFdBQVcsR0FBRyxLQUFLQyxrQkFBTCxDQUNoQixVQUFDTixRQUFEO0FBQUEsYUFBY0YsUUFBUSxDQUFDRSxRQUFELEVBQVcsSUFBWCxDQUF0QjtBQUFBLEtBRGdCLEVBRWhCRixRQUZnQixDQUFwQjtBQUtBUyxJQUFBQSxDQUFDLENBQUNDLEdBQUY7QUFDSUMsTUFBQUEsR0FBRyxZQUFLLEtBQUtDLE1BQVYsY0FBb0JOLEVBQXBCLENBRFA7QUFFSU8sTUFBQUEsTUFBTSxFQUFFLFFBRlo7QUFHSVQsTUFBQUEsSUFBSSxFQUFFTCxNQUhWO0FBR21CO0FBQ2ZlLE1BQUFBLFNBSkoscUJBSWNDLEdBSmQsRUFJbUI7QUFDWDtBQUNBO0FBQ0EsWUFBSSxPQUFPQyxZQUFQLEtBQXdCLFdBQXhCLElBQXVDQSxZQUFZLENBQUNDLFdBQXhELEVBQXFFO0FBQ2pFRixVQUFBQSxHQUFHLENBQUNHLGdCQUFKLENBQXFCLGVBQXJCLG1CQUFnREYsWUFBWSxDQUFDQyxXQUE3RDtBQUNIOztBQUNELGVBQU9GLEdBQVA7QUFDSDtBQVhMLE9BWU9SLFdBWlA7QUFjSDtBQW5EaUIsQ0FBdEIsRSxDQXNEQTs7QUFDQVksTUFBTSxDQUFDM0IsTUFBUCxHQUFnQkEsTUFBaEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgQ29uZmlnLCBQYnhBcGksIFBieEFwaUNsaWVudCAqL1xuXG4vKipcbiAqIENkckFQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgY2FsbCBkZXRhaWwgcmVjb3JkcyBtYW5hZ2VtZW50XG4gKlxuICogUHJvdmlkZXMgbWV0aG9kcyBmb3Igd29ya2luZyB3aXRoIGhpc3RvcmljYWwgY2FsbCByZWNvcmRzLlxuICogRm9yIHJlYWwtdGltZSBtb25pdG9yaW5nIChhY3RpdmUgY2FsbHMvY2hhbm5lbHMpLCB1c2UgUGJ4U3RhdHVzQVBJIGluc3RlYWQuXG4gKlxuICogQGNsYXNzIENkckFQSVxuICovXG5jb25zdCBDZHJBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9jZHInLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0TWV0YWRhdGE6ICc6Z2V0TWV0YWRhdGEnXG4gICAgfVxufSk7XG5cbi8qKlxuICogQWRkIG1ldGhvZCBhbGlhc2VzIHRvIENkckFQSVxuICovXG5PYmplY3QuYXNzaWduKENkckFQSSwge1xuICAgIC8qKlxuICAgICAqIEdldCBDRFIgbWV0YWRhdGEgKGRhdGUgcmFuZ2UsIHJlY29yZCBjb3VudClcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gUmVxdWVzdCBwYXJhbWV0ZXJzIChlLmcuLCB7bGltaXQ6IDEwMH0pXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldE1ldGFkYXRhKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0TWV0YWRhdGEnLCBwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBDRFIgcmVjb3JkXG4gICAgICogV0hZOiAnZGVsZXRlJyBpcyBhIHJlc2VydmVkIGtleXdvcmQgaW4gSmF2YVNjcmlwdCwgc28gd2UgdXNlICdkZWxldGVSZWNvcmQnIGFzIG1ldGhvZCBuYW1lXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gUmVjb3JkIElEIHRvIGRlbGV0ZSAobnVtZXJpYyBJRCBvciBsaW5rZWRpZCBsaWtlIFwibWlrb3BieC14eHhcIilcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAtIGxpbmtlZGlkIChtaWtvcGJ4LSopOiBEZWxldGVzIGVudGlyZSBjb252ZXJzYXRpb24gKGFsbCBsaW5rZWQgcmVjb3JkcylcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAtIG51bWVyaWMgSUQ6IERlbGV0ZXMgc2luZ2xlIHJlY29yZCBvbmx5XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIE9wdGlvbmFsIHBhcmFtZXRlcnMge2RlbGV0ZVJlY29yZGluZzogYm9vbGVhbn1cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkKGlkLCBwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIElmIHBhcmFtcyBpcyBhIGZ1bmN0aW9uLCBpdCBtZWFucyBubyBwYXJhbXMgd2VyZSBwYXNzZWRcbiAgICAgICAgaWYgKHR5cGVvZiBwYXJhbXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gcGFyYW1zO1xuICAgICAgICAgICAgcGFyYW1zID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IHRoaXMuZ2V0QmFzZUFwaVNldHRpbmdzKFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSksXG4gICAgICAgICAgICBjYWxsYmFja1xuICAgICAgICApO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9LyR7aWR9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMsICAvLyBkZWxldGVSZWNvcmRpbmcgYW5kIGRlbGV0ZUxpbmtlZCB3aWxsIGJlIHNlbnQgYXMgcXVlcnkgcGFyYW1zXG4gICAgICAgICAgICBiZWZvcmVYSFIoeGhyKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIEJlYXJlciB0b2tlbiBmb3IgQVBJIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBSRVNUIEFQSSB2MyB1c2VzIEpXVCBCZWFyZXIgdG9rZW5zLCBub3QgQ1NSRiB0b2tlbnNcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAuLi5hcGlTZXR0aW5nc1xuICAgICAgICB9KTtcbiAgICB9XG59KTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93LkNkckFQSSA9IENkckFQSTsiXX0=