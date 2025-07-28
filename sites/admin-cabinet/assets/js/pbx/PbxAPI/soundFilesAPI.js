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

/* global globalRootUrl, Config */

/**
 * SoundFilesAPI - REST API for sound file management
 * 
 * Uses unified approach with centralized endpoint definitions.
 * This provides:
 * - Single point of API URL management
 * - Easy API version switching (v2 -> v3)
 * - Consistent endpoint usage throughout code
 * - Simplified debugging and support
 */
var SoundFilesAPI = {
  /**
   * API endpoints
   */
  apiUrl: "".concat(Config.pbxUrl, "/pbxcore/api/v2/sound-files/"),
  // Endpoint definitions for unification
  endpoints: {
    getList: "".concat(Config.pbxUrl, "/pbxcore/api/v2/sound-files/getList"),
    getRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v2/sound-files/getRecord"),
    saveRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v2/sound-files/saveRecord"),
    deleteRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v2/sound-files/deleteRecord"),
    uploadFile: "".concat(Config.pbxUrl, "/pbxcore/api/v2/sound-files/uploadFile"),
    getForSelect: "".concat(Config.pbxUrl, "/pbxcore/api/v2/sound-files/getForSelect")
  },

  /**
   * Get record by ID
   * @param {string} id - Record ID or empty string for new
   * @param {function} callback - Callback function
   */
  getRecord: function getRecord(id, callback) {
    var recordId = !id || id === '' ? 'new' : id;
    $.api({
      url: "".concat(this.endpoints.getRecord, "/").concat(recordId),
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
   * Get list of all records
   * @param {object} params - Query parameters (e.g., category filter)
   * @param {function} callback - Callback function
   */
  getList: function getList(params, callback) {
    var url = params && Object.keys(params).length > 0 ? "".concat(this.endpoints.getList, "?").concat($.param(params)) : this.endpoints.getList;
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
          data: []
        });
      }
    });
  },

  /**
   * Save record
   * @param {object} data - Data to save
   * @param {function} callback - Callback function
   */
  saveRecord: function saveRecord(data, callback) {
    var method = data.id ? 'PUT' : 'POST';
    var url = data.id ? "".concat(this.endpoints.saveRecord, "/").concat(data.id) : this.endpoints.saveRecord;
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
   * Delete record
   * @param {string} id - Record ID
   * @param {function} callback - Callback function
   */
  deleteRecord: function deleteRecord(id, callback) {
    $.api({
      url: "".concat(this.endpoints.deleteRecord, "/").concat(id),
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
   * Upload file endpoint for Resumable.js
   * @returns {string}
   */
  getUploadUrl: function getUploadUrl() {
    return this.endpoints.uploadFile;
  },

  /**
   * Get sound files for dropdown select
   * @param {string} category - Category filter (custom/moh)
   * @param {function} callback - Callback function
   */
  getForSelect: function getForSelect(category, callback) {
    $.api({
      url: this.endpoints.getForSelect,
      method: 'GET',
      data: {
        category: category
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
          data: []
        });
      }
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvc291bmRGaWxlc0FQSS5qcyJdLCJuYW1lcyI6WyJTb3VuZEZpbGVzQVBJIiwiYXBpVXJsIiwiQ29uZmlnIiwicGJ4VXJsIiwiZW5kcG9pbnRzIiwiZ2V0TGlzdCIsImdldFJlY29yZCIsInNhdmVSZWNvcmQiLCJkZWxldGVSZWNvcmQiLCJ1cGxvYWRGaWxlIiwiZ2V0Rm9yU2VsZWN0IiwiaWQiLCJjYWxsYmFjayIsInJlY29yZElkIiwiJCIsImFwaSIsInVybCIsIm1ldGhvZCIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwicmVzdWx0IiwibWVzc2FnZXMiLCJlcnJvciIsInBhcmFtcyIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJwYXJhbSIsImRhdGEiLCJzdWNjZXNzVGVzdCIsIlBieEFwaSIsImdldFVwbG9hZFVybCIsImNhdGVnb3J5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFDbEI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLE1BQU0sWUFBS0MsTUFBTSxDQUFDQyxNQUFaLGlDQUpZO0FBTWxCO0FBQ0FDLEVBQUFBLFNBQVMsRUFBRTtBQUNQQyxJQUFBQSxPQUFPLFlBQUtILE1BQU0sQ0FBQ0MsTUFBWix3Q0FEQTtBQUVQRyxJQUFBQSxTQUFTLFlBQUtKLE1BQU0sQ0FBQ0MsTUFBWiwwQ0FGRjtBQUdQSSxJQUFBQSxVQUFVLFlBQUtMLE1BQU0sQ0FBQ0MsTUFBWiwyQ0FISDtBQUlQSyxJQUFBQSxZQUFZLFlBQUtOLE1BQU0sQ0FBQ0MsTUFBWiw2Q0FKTDtBQUtQTSxJQUFBQSxVQUFVLFlBQUtQ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ZUssVUFBdEI7QUFDSCxHQTNIaUI7O0FBNkhsQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBbElrQix3QkFrSUx5QixRQWxJSyxFQWtJS3ZCLFFBbElMLEVBa0llO0FBQzdCRSxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUUsS0FBS1osU0FBTCxDQUFlTSxZQURsQjtBQUVGTyxNQUFBQSxNQUFNLEVBQUUsS0FGTjtBQUdGYyxNQUFBQSxJQUFJLEVBQUU7QUFBRUksUUFBQUEsUUFBUSxFQUFFQTtBQUFaLE9BSEo7QUFJRmpCLE1BQUFBLEVBQUUsRUFBRSxLQUpGO0FBS0ZDLE1BQUFBLFNBTEUscUJBS1FDLFFBTFIsRUFLa0I7QUFDaEJSLFFBQUFBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ0gsT0FQQztBQVFGQyxNQUFBQSxTQVJFLHFCQVFRRCxRQVJSLEVBUWtCO0FBQ2hCUixRQUFBQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNILE9BVkM7QUFXRkUsTUFBQUEsT0FYRSxxQkFXUTtBQUNOVixRQUFBQSxRQUFRLENBQUM7QUFBQ1csVUFBQUEsTUFBTSxFQUFFLEtBQVQ7QUFBZ0JRLFVBQUFBLElBQUksRUFBRTtBQUF0QixTQUFELENBQVI7QUFDSDtBQWJDLEtBQU47QUFlSDtBQWxKaUIsQ0FBdEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgQ29uZmlnICovXG5cbi8qKlxuICogU291bmRGaWxlc0FQSSAtIFJFU1QgQVBJIGZvciBzb3VuZCBmaWxlIG1hbmFnZW1lbnRcbiAqIFxuICogVXNlcyB1bmlmaWVkIGFwcHJvYWNoIHdpdGggY2VudHJhbGl6ZWQgZW5kcG9pbnQgZGVmaW5pdGlvbnMuXG4gKiBUaGlzIHByb3ZpZGVzOlxuICogLSBTaW5nbGUgcG9pbnQgb2YgQVBJIFVSTCBtYW5hZ2VtZW50XG4gKiAtIEVhc3kgQVBJIHZlcnNpb24gc3dpdGNoaW5nICh2MiAtPiB2MylcbiAqIC0gQ29uc2lzdGVudCBlbmRwb2ludCB1c2FnZSB0aHJvdWdob3V0IGNvZGVcbiAqIC0gU2ltcGxpZmllZCBkZWJ1Z2dpbmcgYW5kIHN1cHBvcnRcbiAqL1xuY29uc3QgU291bmRGaWxlc0FQSSA9IHtcbiAgICAvKipcbiAgICAgKiBBUEkgZW5kcG9pbnRzXG4gICAgICovXG4gICAgYXBpVXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9zb3VuZC1maWxlcy9gLFxuICAgIFxuICAgIC8vIEVuZHBvaW50IGRlZmluaXRpb25zIGZvciB1bmlmaWNhdGlvblxuICAgIGVuZHBvaW50czoge1xuICAgICAgICBnZXRMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9zb3VuZC1maWxlcy9nZXRMaXN0YCxcbiAgICAgICAgZ2V0UmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9zb3VuZC1maWxlcy9nZXRSZWNvcmRgLFxuICAgICAgICBzYXZlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9zb3VuZC1maWxlcy9zYXZlUmVjb3JkYCxcbiAgICAgICAgZGVsZXRlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9zb3VuZC1maWxlcy9kZWxldGVSZWNvcmRgLFxuICAgICAgICB1cGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9zb3VuZC1maWxlcy91cGxvYWRGaWxlYCxcbiAgICAgICAgZ2V0Rm9yU2VsZWN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9zb3VuZC1maWxlcy9nZXRGb3JTZWxlY3RgXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIGJ5IElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gUmVjb3JkIElEIG9yIGVtcHR5IHN0cmluZyBmb3IgbmV3XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFJlY29yZChpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAoIWlkIHx8IGlkID09PSAnJykgPyAnbmV3JyA6IGlkO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmVuZHBvaW50cy5nZXRSZWNvcmR9LyR7cmVjb3JkSWR9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6ICdOZXR3b3JrIGVycm9yJ319KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgbGlzdCBvZiBhbGwgcmVjb3Jkc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBRdWVyeSBwYXJhbWV0ZXJzIChlLmcuLCBjYXRlZ29yeSBmaWx0ZXIpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldExpc3QocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCB1cmwgPSBwYXJhbXMgJiYgT2JqZWN0LmtleXMocGFyYW1zKS5sZW5ndGggPiAwIFxuICAgICAgICAgICAgPyBgJHt0aGlzLmVuZHBvaW50cy5nZXRMaXN0fT8keyQucGFyYW0ocGFyYW1zKX1gXG4gICAgICAgICAgICA6IHRoaXMuZW5kcG9pbnRzLmdldExpc3Q7XG4gICAgICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiBbXX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhdmUgcmVjb3JkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNhdmVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgc2F2ZVJlY29yZChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBtZXRob2QgPSBkYXRhLmlkID8gJ1BVVCcgOiAnUE9TVCc7XG4gICAgICAgIGNvbnN0IHVybCA9IGRhdGEuaWQgPyBcbiAgICAgICAgICAgIGAke3RoaXMuZW5kcG9pbnRzLnNhdmVSZWNvcmR9LyR7ZGF0YS5pZH1gIDogXG4gICAgICAgICAgICB0aGlzLmVuZHBvaW50cy5zYXZlUmVjb3JkO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6ICdOZXR3b3JrIGVycm9yJ319KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWxldGUgcmVjb3JkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gUmVjb3JkIElEXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGRlbGV0ZVJlY29yZChpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmVuZHBvaW50cy5kZWxldGVSZWNvcmR9LyR7aWR9YCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGxvYWQgZmlsZSBlbmRwb2ludCBmb3IgUmVzdW1hYmxlLmpzXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXRVcGxvYWRVcmwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmVuZHBvaW50cy51cGxvYWRGaWxlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHNvdW5kIGZpbGVzIGZvciBkcm9wZG93biBzZWxlY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2F0ZWdvcnkgLSBDYXRlZ29yeSBmaWx0ZXIgKGN1c3RvbS9tb2gpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldEZvclNlbGVjdChjYXRlZ29yeSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5nZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YTogeyBjYXRlZ29yeTogY2F0ZWdvcnkgfSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgZGF0YTogW119KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTsiXX0=