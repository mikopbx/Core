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

/* global globalRootUrl, PbxApi, globalTranslate */

/**
 * ConferenceRoomsAPI - REST API for conference room management
 * 
 * Uses unified approach with centralized endpoint definitions.
 * This provides:
 * - Single point of API URL management
 * - Easy API version switching (v2 -> v3)
 * - Consistent endpoint usage throughout code
 * - Simplified debugging and support
 */
var ConferenceRoomsAPI = {
  /**
   * API endpoints
   */
  apiUrl: "".concat(Config.pbxUrl, "/pbxcore/api/v2/conference-rooms/"),
  // Endpoint definitions for unification
  endpoints: {
    getList: "".concat(Config.pbxUrl, "/pbxcore/api/v2/conference-rooms/getList"),
    getRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v2/conference-rooms/getRecord"),
    saveRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v2/conference-rooms/saveRecord"),
    deleteRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v2/conference-rooms/deleteRecord")
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
   * @param {function} callback - Callback function
   */
  getList: function getList(callback) {
    $.api({
      url: this.endpoints.getList,
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
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvY29uZmVyZW5jZVJvb21zQVBJLmpzIl0sIm5hbWVzIjpbIkNvbmZlcmVuY2VSb29tc0FQSSIsImFwaVVybCIsIkNvbmZpZyIsInBieFVybCIsImVuZHBvaW50cyIsImdldExpc3QiLCJnZXRSZWNvcmQiLCJzYXZlUmVjb3JkIiwiZGVsZXRlUmVjb3JkIiwiaWQiLCJjYWxsYmFjayIsInJlY29yZElkIiwiJCIsImFwaSIsInVybCIsIm1ldGhvZCIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwicmVzdWx0IiwibWVzc2FnZXMiLCJlcnJvciIsImRhdGEiLCJzdWNjZXNzVGVzdCIsIlBieEFwaSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsa0JBQWtCLEdBQUc7QUFDdkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLE1BQU0sWUFBS0MsTUFBTSxDQUFDQyxNQUFaLHNDQUppQjtBQU12QjtBQUNBQyxFQUFBQSxTQUFTLEVBQUU7QUFDUEMsSUFBQUEsT0FBTyxZQUFLSCxNQUFNLENBQUNDLE1BQVosNkNBREE7QUFFUEcsSUFBQUEsU0FBUyxZQUFLSixNQUFNLENBQUNDLE1BQVosK0NBRkY7QUFHUEksSUFBQUEsVUFBVSxZQUFLTCxNQUFNLENBQUNDLE1BQVosZ0RBSEg7QUFJUEssSUFBQUEsWUFBWSxZQUFLTixNQUFNLENBQUNDLE1BQVo7QUFKTCxHQVBZOztBQWN2QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFNBbkJ1QixxQkFtQmJHLEVBbkJhLEVBbUJUQyxRQW5CUyxFQW1CQztBQUNwQixRQUFNQyxRQUFRLEdBQUks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RlZDLEVBNUZVLEVBNEZOQyxRQTVGTSxFQTRGSTtBQUN2QkUsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxZQUFLLEtBQUtWLFNBQUwsQ0FBZUksWUFBcEIsY0FBb0NDLEVBQXBDLENBREQ7QUFFRk8sTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRkQsTUFBQUEsTUFBTSxFQUFFLFFBSE47QUFJRlUsTUFBQUEsV0FBVyxFQUFFQyxNQUFNLENBQUNELFdBSmxCO0FBS0ZSLE1BQUFBLFNBTEUscUJBS1FDLFFBTFIsRUFLa0I7QUFDaEJSLFFBQUFBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ0gsT0FQQztBQVFGQyxNQUFBQSxTQVJFLHFCQVFRRCxRQVJSLEVBUWtCO0FBQ2hCUixRQUFBQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNILE9BVkM7QUFXRkUsTUFBQUEsT0FYRSxxQkFXUTtBQUNOVixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFiQyxLQUFOO0FBZUg7QUE1R3NCLENBQTNCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogQ29uZmVyZW5jZVJvb21zQVBJIC0gUkVTVCBBUEkgZm9yIGNvbmZlcmVuY2Ugcm9vbSBtYW5hZ2VtZW50XG4gKiBcbiAqIFVzZXMgdW5pZmllZCBhcHByb2FjaCB3aXRoIGNlbnRyYWxpemVkIGVuZHBvaW50IGRlZmluaXRpb25zLlxuICogVGhpcyBwcm92aWRlczpcbiAqIC0gU2luZ2xlIHBvaW50IG9mIEFQSSBVUkwgbWFuYWdlbWVudFxuICogLSBFYXN5IEFQSSB2ZXJzaW9uIHN3aXRjaGluZyAodjIgLT4gdjMpXG4gKiAtIENvbnNpc3RlbnQgZW5kcG9pbnQgdXNhZ2UgdGhyb3VnaG91dCBjb2RlXG4gKiAtIFNpbXBsaWZpZWQgZGVidWdnaW5nIGFuZCBzdXBwb3J0XG4gKi9cbmNvbnN0IENvbmZlcmVuY2VSb29tc0FQSSA9IHtcbiAgICAvKipcbiAgICAgKiBBUEkgZW5kcG9pbnRzXG4gICAgICovXG4gICAgYXBpVXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9jb25mZXJlbmNlLXJvb21zL2AsXG4gICAgXG4gICAgLy8gRW5kcG9pbnQgZGVmaW5pdGlvbnMgZm9yIHVuaWZpY2F0aW9uXG4gICAgZW5kcG9pbnRzOiB7XG4gICAgICAgIGdldExpc3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YyL2NvbmZlcmVuY2Utcm9vbXMvZ2V0TGlzdGAsXG4gICAgICAgIGdldFJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjIvY29uZmVyZW5jZS1yb29tcy9nZXRSZWNvcmRgLFxuICAgICAgICBzYXZlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9jb25mZXJlbmNlLXJvb21zL3NhdmVSZWNvcmRgLFxuICAgICAgICBkZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YyL2NvbmZlcmVuY2Utcm9vbXMvZGVsZXRlUmVjb3JkYFxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBieSBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ld1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRSZWNvcmQoaWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gKCFpZCB8fCBpZCA9PT0gJycpID8gJ25ldycgOiBpZDtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5lbmRwb2ludHMuZ2V0UmVjb3JkfS8ke3JlY29yZElkfWAsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiAnTmV0d29yayBlcnJvcid9fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGxpc3Qgb2YgYWxsIHJlY29yZHNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0TGlzdChjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLmdldExpc3QsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiBbXX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhdmUgcmVjb3JkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNhdmVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgc2F2ZVJlY29yZChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBtZXRob2QgPSBkYXRhLmlkID8gJ1BVVCcgOiAnUE9TVCc7XG4gICAgICAgIGNvbnN0IHVybCA9IGRhdGEuaWQgPyBcbiAgICAgICAgICAgIGAke3RoaXMuZW5kcG9pbnRzLnNhdmVSZWNvcmR9LyR7ZGF0YS5pZH1gIDogXG4gICAgICAgICAgICB0aGlzLmVuZHBvaW50cy5zYXZlUmVjb3JkO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6ICdOZXR3b3JrIGVycm9yJ319KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWxldGUgcmVjb3JkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gUmVjb3JkIElEXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGRlbGV0ZVJlY29yZChpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmVuZHBvaW50cy5kZWxldGVSZWNvcmR9LyR7aWR9YCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTsiXX0=