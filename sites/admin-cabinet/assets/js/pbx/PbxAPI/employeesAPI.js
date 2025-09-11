"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global Config, PbxApi, $ */

/**
 * Employees API methods for V3 RESTful architecture
 * These methods provide clean REST API interface for employee data management
 * following REST conventions with proper HTTP methods
 */
var EmployeesAPI = {
  /**
   * API base URL for v3 RESTful endpoints
   */
  apiUrl: "".concat(Config.pbxUrl, "/pbxcore/api/v3/employees"),
  // Legacy v2 endpoints for backward compatibility (will be removed in future)
  v2Endpoints: {
    getRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v2/employees/getRecord"),
    getNew: "".concat(Config.pbxUrl, "/pbxcore/api/v2/employees/new"),
    saveRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v2/employees/saveRecord"),
    deleteRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v2/employees/deleteRecord")
  },

  /**
   * Get employee record for editing
   * Uses v3 RESTful API: GET /employees/{id}
   * @param {string} recordId - Employee ID or 'new' for new employee
   * @param {function} callback - Callback function to handle response
   */
  getRecord: function getRecord(recordId, callback) {
    var id = !recordId || recordId === '' ? 'new' : recordId; // v3 API: GET /employees/{id} or GET /employees/new

    var url = "".concat(this.apiUrl, "/").concat(id);
    $.api({
      url: url,
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
            error: 'Network error'
          }
        });
      }
    });
  },

  /**
   * Save employee record with proper POST/PUT method selection
   * Uses v3 RESTful API: POST /employees (create) or PUT /employees/{id} (update)
   * @param {object} data - Employee data to save
   * @param {function} callback - Callback function to handle response
   */
  saveRecord: function saveRecord(data, callback) {
    // Check if this is a new record using the _isNew flag passed from form
    var isNew = data._isNew === true || !data.id || data.id === ''; // Remove the flag before sending to server

    if (data._isNew !== undefined) {
      delete data._isNew;
    } // v3 API: POST for new records, PUT for updates


    var method = isNew ? 'POST' : 'PUT';
    var url = isNew ? this.apiUrl : "".concat(this.apiUrl, "/").concat(data.id);
    $.api({
      url: url,
      method: method,
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
            error: 'Network error'
          }
        });
      }
    });
  },

  /**
   * Delete employee record
   * Uses v3 RESTful API: DELETE /employees/{id}
   * @param {string} id - Employee ID to delete
   * @param {function} callback - Callback function to handle response
   */
  deleteRecord: function deleteRecord(id, callback) {
    // v3 API: DELETE /employees/{id}
    $.api({
      url: "".concat(this.apiUrl, "/").concat(id),
      on: 'now',
      method: 'DELETE',
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
   * Get list of employees for DataTable
   * Uses v3 RESTful API: GET /employees with query parameters
   * @param {object} params - Query parameters (search, limit, offset, order_by, order_direction)
   * @param {function} callback - Callback function to handle response
   */
  getList: function getList(params, callback) {
    // v3 API: GET /employees with query parameters
    $.api({
      url: this.apiUrl,
      method: 'GET',
      data: params,
      on: 'now',
      successTest: PbxApi.successTest,
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
            error: 'Network error'
          }
        });
      }
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZW1wbG95ZWVzQVBJLmpzIl0sIm5hbWVzIjpbIkVtcGxveWVlc0FQSSIsImFwaVVybCIsIkNvbmZpZyIsInBieFVybCIsInYyRW5kcG9pbnRzIiwiZ2V0UmVjb3JkIiwiZ2V0TmV3Iiwic2F2ZVJlY29yZCIsImRlbGV0ZVJlY29yZCIsInJlY29yZElkIiwiY2FsbGJhY2siLCJpZCIsInVybCIsIiQiLCJhcGkiLCJtZXRob2QiLCJvbiIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwib25GYWlsdXJlIiwib25FcnJvciIsInJlc3VsdCIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJkYXRhIiwiaXNOZXciLCJfaXNOZXciLCJ1bmRlZmluZWQiLCJzdWNjZXNzVGVzdCIsIlBieEFwaSIsImdldExpc3QiLCJwYXJhbXMiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsWUFBWSxHQUFHO0FBQ2pCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxNQUFNLFlBQUtDLE1BQU0sQ0FBQ0MsTUFBWiw4QkFKVztBQU1qQjtBQUNBQyxFQUFBQSxXQUFXLEVBQUU7QUFDVEMsSUFBQUEsU0FBUyxZQUFLSCxNQUFNLENBQUNDLE1BQVosd0NBREE7QUFFVEcsSUFBQUEsTUFBTSxZQUFLSixNQUFNLENBQUNDLE1BQVosa0NBRkc7QUFHVEksSUFBQUEsVUFBVSxZQUFLTCxNQUFNLENBQUNDLE1BQVoseUNBSEQ7QUFJVEssSUFBQUEsWUFBWSxZQUFLTixNQUFNLENBQUNDLE1BQVo7QUFKSCxHQVBJOztBQWNqQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsU0FwQmlCLHFCQW9CUEksUUFwQk8sRUFvQkdDLFFBcEJILEVBb0JhO0FBQzFCLFFB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aEJSLFFBQUFBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ0gsT0FQQztBQVFGQyxNQUFBQSxTQVJFLHFCQVFRRCxRQVJSLEVBUWtCO0FBQ2hCUixRQUFBQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNILE9BVkM7QUFXRkUsTUFBQUEsT0FYRSxxQkFXUTtBQUNOVixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFiQyxLQUFOO0FBZUgsR0FyR2dCOztBQXVHakI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lvQixFQUFBQSxPQTdHaUIsbUJBNkdUQyxNQTdHUyxFQTZHRHJCLFFBN0dDLEVBNkdTO0FBQ3RCO0FBQ0FHLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZGLE1BQUFBLEdBQUcsRUFBRSxLQUFLWCxNQURSO0FBRUZjLE1BQUFBLE1BQU0sRUFBRSxLQUZOO0FBR0ZTLE1BQUFBLElBQUksRUFBRU8sTUFISjtBQUlGZixNQUFBQSxFQUFFLEVBQUUsS0FKRjtBQUtGWSxNQUFBQSxXQUFXLEVBQUVDLE1BQU0sQ0FBQ0QsV0FMbEI7QUFNRlgsTUFBQUEsU0FORSxxQkFNUUMsUUFOUixFQU1rQjtBQUNoQlIsUUFBQUEsUUFBUSxDQUFDUSxRQUFELENBQVI7QUFDSCxPQVJDO0FBU0ZDLE1BQUFBLFNBVEUscUJBU1FELFFBVFIsRUFTa0I7QUFDaEJSLFFBQUFBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ0gsT0FYQztBQVlGRSxNQUFBQSxPQVpFLHFCQVlRO0FBQ05WLFFBQUFBLFFBQVEsQ0FBQztBQUFDVyxVQUFBQSxNQUFNLEVBQUUsS0FBVDtBQUFnQkMsVUFBQUEsUUFBUSxFQUFFO0FBQUNDLFlBQUFBLEtBQUssRUFBRTtBQUFSO0FBQTFCLFNBQUQsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSDtBQS9IZ0IsQ0FBckIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBQYnhBcGksICQgKi9cblxuLyoqXG4gKiBFbXBsb3llZXMgQVBJIG1ldGhvZHMgZm9yIFYzIFJFU1RmdWwgYXJjaGl0ZWN0dXJlXG4gKiBUaGVzZSBtZXRob2RzIHByb3ZpZGUgY2xlYW4gUkVTVCBBUEkgaW50ZXJmYWNlIGZvciBlbXBsb3llZSBkYXRhIG1hbmFnZW1lbnRcbiAqIGZvbGxvd2luZyBSRVNUIGNvbnZlbnRpb25zIHdpdGggcHJvcGVyIEhUVFAgbWV0aG9kc1xuICovXG5jb25zdCBFbXBsb3llZXNBUEkgPSB7XG4gICAgLyoqXG4gICAgICogQVBJIGJhc2UgVVJMIGZvciB2MyBSRVNUZnVsIGVuZHBvaW50c1xuICAgICAqL1xuICAgIGFwaVVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjMvZW1wbG95ZWVzYCxcbiAgICBcbiAgICAvLyBMZWdhY3kgdjIgZW5kcG9pbnRzIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5ICh3aWxsIGJlIHJlbW92ZWQgaW4gZnV0dXJlKVxuICAgIHYyRW5kcG9pbnRzOiB7XG4gICAgICAgIGdldFJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjIvZW1wbG95ZWVzL2dldFJlY29yZGAsXG4gICAgICAgIGdldE5ldzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjIvZW1wbG95ZWVzL25ld2AsXG4gICAgICAgIHNhdmVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YyL2VtcGxveWVlcy9zYXZlUmVjb3JkYCxcbiAgICAgICAgZGVsZXRlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9lbXBsb3llZXMvZGVsZXRlUmVjb3JkYFxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGVtcGxveWVlIHJlY29yZCBmb3IgZWRpdGluZ1xuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IEdFVCAvZW1wbG95ZWVzL3tpZH1cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBFbXBsb3llZSBJRCBvciAnbmV3JyBmb3IgbmV3IGVtcGxveWVlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBnZXRSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGlkID0gKCFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJycpID8gJ25ldycgOiByZWNvcmRJZDtcbiAgICAgICAgXG4gICAgICAgIC8vIHYzIEFQSTogR0VUIC9lbXBsb3llZXMve2lkfSBvciBHRVQgL2VtcGxveWVlcy9uZXdcbiAgICAgICAgY29uc3QgdXJsID0gYCR7dGhpcy5hcGlVcmx9LyR7aWR9YDtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogJ05ldHdvcmsgZXJyb3InfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhdmUgZW1wbG95ZWUgcmVjb3JkIHdpdGggcHJvcGVyIFBPU1QvUFVUIG1ldGhvZCBzZWxlY3Rpb25cbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBQT1NUIC9lbXBsb3llZXMgKGNyZWF0ZSkgb3IgUFVUIC9lbXBsb3llZXMve2lkfSAodXBkYXRlKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRW1wbG95ZWUgZGF0YSB0byBzYXZlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBzYXZlUmVjb3JkKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBuZXcgcmVjb3JkIHVzaW5nIHRoZSBfaXNOZXcgZmxhZyBwYXNzZWQgZnJvbSBmb3JtXG4gICAgICAgIGNvbnN0IGlzTmV3ID0gZGF0YS5faXNOZXcgPT09IHRydWUgfHwgIWRhdGEuaWQgfHwgZGF0YS5pZCA9PT0gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgdGhlIGZsYWcgYmVmb3JlIHNlbmRpbmcgdG8gc2VydmVyXG4gICAgICAgIGlmIChkYXRhLl9pc05ldyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWxldGUgZGF0YS5faXNOZXc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHYzIEFQSTogUE9TVCBmb3IgbmV3IHJlY29yZHMsIFBVVCBmb3IgdXBkYXRlc1xuICAgICAgICBjb25zdCBtZXRob2QgPSBpc05ldyA/ICdQT1NUJyA6ICdQVVQnO1xuICAgICAgICBjb25zdCB1cmwgPSBpc05ldyA/IHRoaXMuYXBpVXJsIDogYCR7dGhpcy5hcGlVcmx9LyR7ZGF0YS5pZH1gO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6ICdOZXR3b3JrIGVycm9yJ319KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWxldGUgZW1wbG95ZWUgcmVjb3JkXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogREVMRVRFIC9lbXBsb3llZXMve2lkfVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIEVtcGxveWVlIElEIHRvIGRlbGV0ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkKGlkLCBjYWxsYmFjaykge1xuICAgICAgICAvLyB2MyBBUEk6IERFTEVURSAvZW1wbG95ZWVzL3tpZH1cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmFwaVVybH0vJHtpZH1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBsaXN0IG9mIGVtcGxveWVlcyBmb3IgRGF0YVRhYmxlXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogR0VUIC9lbXBsb3llZXMgd2l0aCBxdWVyeSBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFF1ZXJ5IHBhcmFtZXRlcnMgKHNlYXJjaCwgbGltaXQsIG9mZnNldCwgb3JkZXJfYnksIG9yZGVyX2RpcmVjdGlvbilcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGdldExpc3QocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAvLyB2MyBBUEk6IEdFVCAvZW1wbG95ZWVzIHdpdGggcXVlcnkgcGFyYW1ldGVyc1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuYXBpVXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHBhcmFtcyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6ICdOZXR3b3JrIGVycm9yJ319KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTsiXX0=