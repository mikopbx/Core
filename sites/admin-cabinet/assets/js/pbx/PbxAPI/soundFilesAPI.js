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

/* global Config, PbxApi, $ */

/**
 * SoundFilesAPI - REST API v3 for sound file management
 *
 * These methods provide clean REST API interface for sound file management
 * following REST conventions with proper HTTP methods
 */
var SoundFilesAPI = {
  /**
   * API base URL for v3 RESTful endpoints
   */
  apiUrl: "".concat(Config.pbxUrl, "/pbxcore/api/v3/sound-files"),

  /**
   * Get sound file record for editing
   * Uses v3 RESTful API: GET /sound-files/{id} or GET /sound-files:getDefault for new
   * @param {string} recordId - Sound file ID or empty/null for new sound file
   * @param {function} callback - Callback function to handle response
   */
  getRecord: function getRecord(recordId, callback) {
    // Use :getDefault for new records, otherwise GET by ID
    var isNew = !recordId || recordId === '' || recordId === 'new';
    var url = isNew ? "".concat(this.apiUrl, ":getDefault") : "".concat(this.apiUrl, "/").concat(recordId);
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
   * Save sound file record with proper POST/PUT method selection
   * Uses v3 RESTful API: POST /sound-files (create) or PUT /sound-files/{id} (update)
   * @param {object} data - Sound file data to save
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
   * Delete sound file record
   * Uses v3 RESTful API: DELETE /sound-files/{id}
   * @param {string} id - Sound file ID to delete
   * @param {function} callback - Callback function to handle response
   */
  deleteRecord: function deleteRecord(id, callback) {
    // v3 API: DELETE /sound-files/{id}
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
   * Get list of sound files for DataTable
   * Uses v3 RESTful API: GET /sound-files with query parameters
   * @param {object} params - Query parameters (category, search, limit, offset, etc.)
   * @param {function} callback - Callback function to handle response
   */
  getList: function getList(params, callback) {
    // v3 API: GET /sound-files with query parameters
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
  },

  /**
   * Upload sound file endpoint for Resumable.js
   * Uses v3 RESTful API: POST /sound-files:uploadFile
   * @returns {string}
   */
  getUploadUrl: function getUploadUrl() {
    return "".concat(this.apiUrl, ":uploadFile");
  },

  /**
   * Get sound files for dropdown select
   * Uses v3 RESTful API: GET /sound-files:getForSelect
   * @param {string} category - Category filter (custom/moh)
   * @param {function} callback - Callback function to handle response
   */
  getForSelect: function getForSelect(category, callback) {
    // v3 API: GET /sound-files:getForSelect (custom action)
    $.api({
      url: "".concat(this.apiUrl, ":getForSelect"),
      method: 'GET',
      data: {
        category: category
      },
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
          data: []
        });
      }
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvc291bmRGaWxlc0FQSS5qcyJdLCJuYW1lcyI6WyJTb3VuZEZpbGVzQVBJIiwiYXBpVXJsIiwiQ29uZmlnIiwicGJ4VXJsIiwiZ2V0UmVjb3JkIiwicmVjb3JkSWQiLCJjYWxsYmFjayIsImlzTmV3IiwidXJsIiwiJCIsImFwaSIsIm1ldGhvZCIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwicmVzdWx0IiwibWVzc2FnZXMiLCJlcnJvciIsInNhdmVSZWNvcmQiLCJkYXRhIiwiX2lzTmV3IiwiaWQiLCJ1bmRlZmluZWQiLCJkZWxldGVSZWNvcmQiLCJzdWNjZXNzVGVzdCIsIlBieEFwaSIsImdldExpc3QiLCJwYXJhbXMiLCJnZXRVcGxvYWRVcmwiLCJnZXRGb3JTZWxlY3QiLCJjYXRlZ29yeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGFBQWEsR0FBRztBQUNsQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsTUFBTSxZQUFLQyxNQUFNLENBQUNDLE1BQVosZ0NBSlk7O0FBTWxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQVprQixxQkFZUkMsUUFaUSxFQVlFQyxRQVpGLEVBWVk7QUFDMUI7QUFDQSxRQUFNQyxLQUFLLEdBQUcsQ0FBQ0YsUUFBRCxJQUFhQSxRQUFRLEtBQUssRUFBMUIsSUFBZ0NBLFFBQVEsS0FBSyxLQUEzRDtBQUNBLFFBQU1HLEdBQUcsR0FBR0QsS0FBSyxhQUFNLEtBQUtOLE1BQVgsNkJBQW9DLEtBQUtBLE1BQXpDLGNBQW1ESSxRQUFuRCxDQUFqQjtBQUVBSSxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNG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LE1BQU0sRUFBRSxLQUZOO0FBR0ZVLE1BQUFBLElBQUksRUFBRTtBQUFFVyxRQUFBQSxRQUFRLEVBQUVBO0FBQVosT0FISjtBQUlGcEIsTUFBQUEsRUFBRSxFQUFFLEtBSkY7QUFLRmMsTUFBQUEsV0FBVyxFQUFFQyxNQUFNLENBQUNELFdBTGxCO0FBTUZiLE1BQUFBLFNBTkUscUJBTVFDLFFBTlIsRUFNa0I7QUFDaEJSLFFBQUFBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ0gsT0FSQztBQVNGQyxNQUFBQSxTQVRFLHFCQVNRRCxRQVRSLEVBU2tCO0FBQ2hCUixRQUFBQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNILE9BWEM7QUFZRkUsTUFBQUEsT0FaRSxxQkFZUTtBQUNOVixRQUFBQSxRQUFRLENBQUM7QUFBQ1csVUFBQUEsTUFBTSxFQUFFLEtBQVQ7QUFBZ0JJLFVBQUFBLElBQUksRUFBRTtBQUF0QixTQUFELENBQVI7QUFDSDtBQWRDLEtBQU47QUFnQkg7QUF6SmlCLENBQXRCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIENvbmZpZywgUGJ4QXBpLCAkICovXG5cbi8qKlxuICogU291bmRGaWxlc0FQSSAtIFJFU1QgQVBJIHYzIGZvciBzb3VuZCBmaWxlIG1hbmFnZW1lbnRcbiAqXG4gKiBUaGVzZSBtZXRob2RzIHByb3ZpZGUgY2xlYW4gUkVTVCBBUEkgaW50ZXJmYWNlIGZvciBzb3VuZCBmaWxlIG1hbmFnZW1lbnRcbiAqIGZvbGxvd2luZyBSRVNUIGNvbnZlbnRpb25zIHdpdGggcHJvcGVyIEhUVFAgbWV0aG9kc1xuICovXG5jb25zdCBTb3VuZEZpbGVzQVBJID0ge1xuICAgIC8qKlxuICAgICAqIEFQSSBiYXNlIFVSTCBmb3IgdjMgUkVTVGZ1bCBlbmRwb2ludHNcbiAgICAgKi9cbiAgICBhcGlVcmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YzL3NvdW5kLWZpbGVzYCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc291bmQgZmlsZSByZWNvcmQgZm9yIGVkaXRpbmdcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBHRVQgL3NvdW5kLWZpbGVzL3tpZH0gb3IgR0VUIC9zb3VuZC1maWxlczpnZXREZWZhdWx0IGZvciBuZXdcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBTb3VuZCBmaWxlIElEIG9yIGVtcHR5L251bGwgZm9yIG5ldyBzb3VuZCBmaWxlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBnZXRSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIFVzZSA6Z2V0RGVmYXVsdCBmb3IgbmV3IHJlY29yZHMsIG90aGVyd2lzZSBHRVQgYnkgSURcbiAgICAgICAgY29uc3QgaXNOZXcgPSAhcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnIHx8IHJlY29yZElkID09PSAnbmV3JztcbiAgICAgICAgY29uc3QgdXJsID0gaXNOZXcgPyBgJHt0aGlzLmFwaVVybH06Z2V0RGVmYXVsdGAgOiBgJHt0aGlzLmFwaVVybH0vJHtyZWNvcmRJZH1gO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogJ05ldHdvcmsgZXJyb3InfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZSBzb3VuZCBmaWxlIHJlY29yZCB3aXRoIHByb3BlciBQT1NUL1BVVCBtZXRob2Qgc2VsZWN0aW9uXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogUE9TVCAvc291bmQtZmlsZXMgKGNyZWF0ZSkgb3IgUFVUIC9zb3VuZC1maWxlcy97aWR9ICh1cGRhdGUpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTb3VuZCBmaWxlIGRhdGEgdG8gc2F2ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgc2F2ZVJlY29yZChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgbmV3IHJlY29yZCB1c2luZyB0aGUgX2lzTmV3IGZsYWcgcGFzc2VkIGZyb20gZm9ybVxuICAgICAgICBjb25zdCBpc05ldyA9IGRhdGEuX2lzTmV3ID09PSB0cnVlIHx8ICFkYXRhLmlkIHx8IGRhdGEuaWQgPT09ICcnO1xuXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgZmxhZyBiZWZvcmUgc2VuZGluZyB0byBzZXJ2ZXJcbiAgICAgICAgaWYgKGRhdGEuX2lzTmV3ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhLl9pc05ldztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHYzIEFQSTogUE9TVCBmb3IgbmV3IHJlY29yZHMsIFBVVCBmb3IgdXBkYXRlc1xuICAgICAgICBjb25zdCBtZXRob2QgPSBpc05ldyA/ICdQT1NUJyA6ICdQVVQnO1xuICAgICAgICBjb25zdCB1cmwgPSBpc05ldyA/IHRoaXMuYXBpVXJsIDogYCR7dGhpcy5hcGlVcmx9LyR7ZGF0YS5pZH1gO1xuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiAnTmV0d29yayBlcnJvcid9fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgc291bmQgZmlsZSByZWNvcmRcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBERUxFVEUgL3NvdW5kLWZpbGVzL3tpZH1cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBTb3VuZCBmaWxlIElEIHRvIGRlbGV0ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkKGlkLCBjYWxsYmFjaykge1xuICAgICAgICAvLyB2MyBBUEk6IERFTEVURSAvc291bmQtZmlsZXMve2lkfVxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuYXBpVXJsfS8ke2lkfWAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGlzdCBvZiBzb3VuZCBmaWxlcyBmb3IgRGF0YVRhYmxlXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogR0VUIC9zb3VuZC1maWxlcyB3aXRoIHF1ZXJ5IHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gUXVlcnkgcGFyYW1ldGVycyAoY2F0ZWdvcnksIHNlYXJjaCwgbGltaXQsIG9mZnNldCwgZXRjLilcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGdldExpc3QocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAvLyB2MyBBUEk6IEdFVCAvc291bmQtZmlsZXMgd2l0aCBxdWVyeSBwYXJhbWV0ZXJzXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5hcGlVcmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YTogcGFyYW1zLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogJ05ldHdvcmsgZXJyb3InfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBsb2FkIHNvdW5kIGZpbGUgZW5kcG9pbnQgZm9yIFJlc3VtYWJsZS5qc1xuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IFBPU1QgL3NvdW5kLWZpbGVzOnVwbG9hZEZpbGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldFVwbG9hZFVybCgpIHtcbiAgICAgICAgcmV0dXJuIGAke3RoaXMuYXBpVXJsfTp1cGxvYWRGaWxlYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHNvdW5kIGZpbGVzIGZvciBkcm9wZG93biBzZWxlY3RcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBHRVQgL3NvdW5kLWZpbGVzOmdldEZvclNlbGVjdFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSAtIENhdGVnb3J5IGZpbHRlciAoY3VzdG9tL21vaClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGdldEZvclNlbGVjdChjYXRlZ29yeSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gdjMgQVBJOiBHRVQgL3NvdW5kLWZpbGVzOmdldEZvclNlbGVjdCAoY3VzdG9tIGFjdGlvbilcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmFwaVVybH06Z2V0Rm9yU2VsZWN0YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiB7IGNhdGVnb3J5OiBjYXRlZ29yeSB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgZGF0YTogW119KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTsiXX0=