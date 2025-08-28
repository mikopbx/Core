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
    // Check if this is a new record using the _isNew flag passed from form
    var isNew = data._isNew === true; // Remove the flag before sending to server

    if (data._isNew !== undefined) {
      delete data._isNew;
    } // For new records use POST, for existing use PUT
    // Don't rely on data.id since it's always present now (contains uniqid)


    var method = isNew ? 'POST' : 'PUT';
    var url = isNew ? this.endpoints.saveRecord : "".concat(this.endpoints.saveRecord, "/").concat(data.id);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvY29uZmVyZW5jZVJvb21zQVBJLmpzIl0sIm5hbWVzIjpbIkNvbmZlcmVuY2VSb29tc0FQSSIsImFwaVVybCIsIkNvbmZpZyIsInBieFVybCIsImVuZHBvaW50cyIsImdldExpc3QiLCJnZXRSZWNvcmQiLCJzYXZlUmVjb3JkIiwiZGVsZXRlUmVjb3JkIiwiaWQiLCJjYWxsYmFjayIsInJlY29yZElkIiwiJCIsImFwaSIsInVybCIsIm1ldGhvZCIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwicmVzdWx0IiwibWVzc2FnZXMiLCJlcnJvciIsImRhdGEiLCJpc05ldyIsIl9pc05ldyIsInVuZGVmaW5lZCIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxrQkFBa0IsR0FBRztBQUN2QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsTUFBTSxZQUFLQyxNQUFNLENBQUNDLE1BQVosc0NBSmlCO0FBTXZCO0FBQ0FDLEVBQUFBLFNBQVMsRUFBRTtBQUNQQyxJQUFBQSxPQUFPLFlBQUtILE1BQU0sQ0FBQ0MsTUFBWiw2Q0FEQTtBQUVQRyxJQUFBQSxTQUFTLFlBQUtKLE1BQU0sQ0FBQ0MsTUFBWiwrQ0FGRjtBQUdQSSxJQUFBQSxVQUFVLFlBQUtMLE1BQU0sQ0FBQ0MsTUFBWixnREFISDtBQUlQSyxJQUFBQSxZQUFZLFlBQUtOLE1BQU0sQ0FBQ0MsTUFBWjtBQUpMLEdBUFk7O0FBY3ZCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsU0FuQnVCLHFCQW1CYkcsRUFuQmEsRUFtQlRDLFFBbkJT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USxDQUFDO0FBQUNXLFVBQUFBLE1BQU0sRUFBRSxLQUFUO0FBQWdCQyxVQUFBQSxRQUFRLEVBQUU7QUFBQ0MsWUFBQUEsS0FBSyxFQUFFO0FBQVI7QUFBMUIsU0FBRCxDQUFSO0FBQ0g7QUFiQyxLQUFOO0FBZUgsR0EvRnNCOztBQWlHdkI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJZixFQUFBQSxZQXRHdUIsd0JBc0dWQyxFQXRHVSxFQXNHTkMsUUF0R00sRUFzR0k7QUFDdkJFLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsWUFBSyxLQUFLVixTQUFMLENBQWVJLFlBQXBCLGNBQW9DQyxFQUFwQyxDQUREO0FBRUZPLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZELE1BQUFBLE1BQU0sRUFBRSxRQUhOO0FBSUZhLE1BQUFBLFdBQVcsRUFBRUMsTUFBTSxDQUFDRCxXQUpsQjtBQUtGWCxNQUFBQSxTQUxFLHFCQUtRQyxRQUxSLEVBS2tCO0FBQ2hCUixRQUFBQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNILE9BUEM7QUFRRkMsTUFBQUEsU0FSRSxxQkFRUUQsUUFSUixFQVFrQjtBQUNoQlIsUUFBQUEsUUFBUSxDQUFDUSxRQUFELENBQVI7QUFDSCxPQVZDO0FBV0ZFLE1BQUFBLE9BWEUscUJBV1E7QUFDTlYsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBYkMsS0FBTjtBQWVIO0FBdEhzQixDQUEzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIENvbmZlcmVuY2VSb29tc0FQSSAtIFJFU1QgQVBJIGZvciBjb25mZXJlbmNlIHJvb20gbWFuYWdlbWVudFxuICogXG4gKiBVc2VzIHVuaWZpZWQgYXBwcm9hY2ggd2l0aCBjZW50cmFsaXplZCBlbmRwb2ludCBkZWZpbml0aW9ucy5cbiAqIFRoaXMgcHJvdmlkZXM6XG4gKiAtIFNpbmdsZSBwb2ludCBvZiBBUEkgVVJMIG1hbmFnZW1lbnRcbiAqIC0gRWFzeSBBUEkgdmVyc2lvbiBzd2l0Y2hpbmcgKHYyIC0+IHYzKVxuICogLSBDb25zaXN0ZW50IGVuZHBvaW50IHVzYWdlIHRocm91Z2hvdXQgY29kZVxuICogLSBTaW1wbGlmaWVkIGRlYnVnZ2luZyBhbmQgc3VwcG9ydFxuICovXG5jb25zdCBDb25mZXJlbmNlUm9vbXNBUEkgPSB7XG4gICAgLyoqXG4gICAgICogQVBJIGVuZHBvaW50c1xuICAgICAqL1xuICAgIGFwaVVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjIvY29uZmVyZW5jZS1yb29tcy9gLFxuICAgIFxuICAgIC8vIEVuZHBvaW50IGRlZmluaXRpb25zIGZvciB1bmlmaWNhdGlvblxuICAgIGVuZHBvaW50czoge1xuICAgICAgICBnZXRMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9jb25mZXJlbmNlLXJvb21zL2dldExpc3RgLFxuICAgICAgICBnZXRSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YyL2NvbmZlcmVuY2Utcm9vbXMvZ2V0UmVjb3JkYCxcbiAgICAgICAgc2F2ZVJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjIvY29uZmVyZW5jZS1yb29tcy9zYXZlUmVjb3JkYCxcbiAgICAgICAgZGVsZXRlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9jb25mZXJlbmNlLXJvb21zL2RlbGV0ZVJlY29yZGBcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgYnkgSURcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBSZWNvcmQgSUQgb3IgZW1wdHkgc3RyaW5nIGZvciBuZXdcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0UmVjb3JkKGlkLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9ICghaWQgfHwgaWQgPT09ICcnKSA/ICduZXcnIDogaWQ7XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuZW5kcG9pbnRzLmdldFJlY29yZH0vJHtyZWNvcmRJZH1gLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogJ05ldHdvcmsgZXJyb3InfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBsaXN0IG9mIGFsbCByZWNvcmRzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldExpc3QoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5nZXRMaXN0LFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgZGF0YTogW119KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlIHJlY29yZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzYXZlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIHNhdmVSZWNvcmQoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmQgdXNpbmcgdGhlIF9pc05ldyBmbGFnIHBhc3NlZCBmcm9tIGZvcm1cbiAgICAgICAgY29uc3QgaXNOZXcgPSBkYXRhLl9pc05ldyA9PT0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgZmxhZyBiZWZvcmUgc2VuZGluZyB0byBzZXJ2ZXJcbiAgICAgICAgaWYgKGRhdGEuX2lzTmV3ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhLl9pc05ldztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzIHVzZSBQT1NULCBmb3IgZXhpc3RpbmcgdXNlIFBVVFxuICAgICAgICAvLyBEb24ndCByZWx5IG9uIGRhdGEuaWQgc2luY2UgaXQncyBhbHdheXMgcHJlc2VudCBub3cgKGNvbnRhaW5zIHVuaXFpZClcbiAgICAgICAgY29uc3QgbWV0aG9kID0gaXNOZXcgPyAnUE9TVCcgOiAnUFVUJztcbiAgICAgICAgY29uc3QgdXJsID0gaXNOZXcgPyBcbiAgICAgICAgICAgIHRoaXMuZW5kcG9pbnRzLnNhdmVSZWNvcmQgOiBcbiAgICAgICAgICAgIGAke3RoaXMuZW5kcG9pbnRzLnNhdmVSZWNvcmR9LyR7ZGF0YS5pZH1gO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6ICdOZXR3b3JrIGVycm9yJ319KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWxldGUgcmVjb3JkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gUmVjb3JkIElEXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGRlbGV0ZVJlY29yZChpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHt0aGlzLmVuZHBvaW50cy5kZWxldGVSZWNvcmR9LyR7aWR9YCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTsiXX0=