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

/* global PbxApi, Config */

/**
 * ApiKeysAPI - REST API for API Keys management
 * 
 * Uses v3 RESTful API with proper HTTP methods.
 * This provides:
 * - RESTful resource-oriented endpoints
 * - Proper HTTP method usage (GET, POST, PUT, PATCH, DELETE)
 * - Custom methods using colon notation (:method)
 * - Backward compatibility through method mapping
 */
var ApiKeysAPI = {
  /**
   * API base URL for v3 RESTful endpoints
   */
  apiUrl: "".concat(Config.pbxUrl, "/pbxcore/api/v3/api-keys"),
  // Centralized endpoint definitions for PbxDataTableIndex compatibility
  endpoints: {
    getList: "".concat(Config.pbxUrl, "/pbxcore/api/v3/api-keys"),
    getRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v3/api-keys"),
    saveRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v3/api-keys"),
    deleteRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v3/api-keys"),
    generateKey: "".concat(Config.pbxUrl, "/pbxcore/api/v3/api-keys:generateKey"),
    getAvailableControllers: "".concat(Config.pbxUrl, "/pbxcore/api/v3/api-keys:getAvailableControllers")
  },
  // Legacy v2 endpoints for backward compatibility (will be removed in future)
  v2Endpoints: {
    getList: "".concat(Config.pbxUrl, "/pbxcore/api/v2/api-keys/getList"),
    getRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v2/api-keys/getRecord"),
    saveRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v2/api-keys/saveRecord"),
    deleteRecord: "".concat(Config.pbxUrl, "/pbxcore/api/v2/api-keys/deleteRecord"),
    generateKey: "".concat(Config.pbxUrl, "/pbxcore/api/v2/api-keys/generateKey"),
    getAvailableControllers: "".concat(Config.pbxUrl, "/pbxcore/api/v2/api-keys/getAvailableControllers")
  },

  /**
   * Get new records for DataTable (alias for getList)
   * @param {Function} callback - Function to call with response data
   */
  getNewRecords: function getNewRecords(callback) {
    this.getList(callback);
  },

  /**
   * Get list of all API keys
   * Uses v3 RESTful API: GET /api-keys
   * @param {object} params - Query parameters (limit, offset, search, etc.)
   * @param {function} callback - Callback function
   */
  getList: function getList(params, callback) {
    // Support old signature where callback is the first parameter
    if (typeof params === 'function') {
      callback = params;
      params = {};
    } // v3 API: GET /api-keys with query parameters


    $.api({
      url: this.endpoints.getList,
      method: 'GET',
      data: params,
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
   * Get record by ID
   * Uses v3 RESTful API: GET /api-keys/{id} or GET /api-keys:getDefault for new
   * @param {string} id - Record ID or empty string for new
   * @param {function} callback - Callback function
   */
  getRecord: function getRecord(id, callback) {
    // Use :getDefault for new records, otherwise GET by ID
    var isNew = !id || id === '' || id === 'new';
    var url = isNew ? "".concat(this.apiUrl, ":getDefault") : "".concat(this.apiUrl, "/").concat(id);
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
   * Generate a new API key
   * Uses v3 RESTful API: POST /api-keys:generateKey
   * @param {function} callback - Callback function
   */
  generateKey: function generateKey(callback) {
    // v3 API: POST /api-keys:generateKey (custom method)
    $.api({
      url: "".concat(this.apiUrl, ":generateKey"),
      method: 'POST',
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
   * Save record
   * Uses v3 RESTful API: POST /api-keys (create) or PUT /api-keys/{id} (update)
   * @param {object} data - Data to save
   * @param {function} callback - Callback function
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
   * Delete record
   * Uses v3 RESTful API: DELETE /api-keys/{id}
   * @param {string} id - Record ID
   * @param {function} callback - Callback function
   */
  deleteRecord: function deleteRecord(id, callback) {
    // v3 API: DELETE /api-keys/{id}
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
   * Get list of available controllers/endpoints for permissions
   * Uses v3 RESTful API: GET /api-keys:getAvailableControllers
   * @param {function} callback - Callback function
   */
  getAvailableControllers: function getAvailableControllers(callback) {
    // v3 API: GET /api-keys:getAvailableControllers (custom method)
    $.api({
      url: "".concat(this.apiUrl, ":getAvailableControllers"),
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
  }
}; // Export for use in other modules

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiKeysAPI;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvYXBpS2V5c0FQSS5qcyJdLCJuYW1lcyI6WyJBcGlLZXlzQVBJIiwiYXBpVXJsIiwiQ29uZmlnIiwicGJ4VXJsIiwiZW5kcG9pbnRzIiwiZ2V0TGlzdCIsImdldFJlY29yZCIsInNhdmVSZWNvcmQiLCJkZWxldGVSZWNvcmQiLCJnZW5lcmF0ZUtleSIsImdldEF2YWlsYWJsZUNvbnRyb2xsZXJzIiwidjJFbmRwb2ludHMiLCJnZXROZXdSZWNvcmRzIiwiY2FsbGJhY2siLCJwYXJhbXMiLCIkIiwiYXBpIiwidXJsIiwibWV0aG9kIiwiZGF0YSIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwicmVzdWx0IiwiaWQiLCJpc05ldyIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJfaXNOZXciLCJ1bmRlZmluZWQiLCJzdWNjZXNzVGVzdCIsIlBieEFwaSIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFVBQVUsR0FBRztBQUNmO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxNQUFNLFlBQUtDLE1BQU0sQ0FBQ0MsTUFBWiw2QkFKUztBQU1mO0FBQ0FDLEVBQUFBLFNBQVMsRUFBRTtBQUNQQyxJQUFBQSxPQUFPLFlBQUtILE1BQU0sQ0FBQ0MsTUFBWiw2QkFEQTtBQUVQRyxJQUFBQSxTQUFTLFlBQUtKLE1BQU0sQ0FBQ0MsTUFBWiw2QkFGRjtBQUdQSSxJQUFBQSxVQUFVLFlBQUtMLE1BQU0sQ0FBQ0MsTUFBWiw2QkFISDtBQUlQSyxJQUFBQSxZQUFZLFlBQUtOLE1BQU0sQ0FBQ0MsTUFBWiw2QkFKTDtBQUtQTSxJQUFB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Q1MsUUFBRCxDQUFSO0FBQ0gsT0FQQztBQVFGQyxNQUFBQSxTQVJFLHFCQVFRRCxRQVJSLEVBUWtCO0FBQ2hCVCxRQUFBQSxRQUFRLENBQUNTLFFBQUQsQ0FBUjtBQUNILE9BVkM7QUFXRkUsTUFBQUEsT0FYRSxxQkFXUTtBQUNOWCxRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFiQyxLQUFOO0FBZUgsR0E5S2M7O0FBZ0xmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUgsRUFBQUEsdUJBckxlLG1DQXFMU0csUUFyTFQsRUFxTG1CO0FBQzlCO0FBQ0FFLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsWUFBSyxLQUFLaEIsTUFBViw2QkFERDtBQUVGaUIsTUFBQUEsTUFBTSxFQUFFLEtBRk47QUFHRkUsTUFBQUEsRUFBRSxFQUFFLEtBSEY7QUFJRkMsTUFBQUEsU0FKRSxxQkFJUUMsUUFKUixFQUlrQjtBQUNoQlQsUUFBQUEsUUFBUSxDQUFDUyxRQUFELENBQVI7QUFDSCxPQU5DO0FBT0ZDLE1BQUFBLFNBUEUscUJBT1FELFFBUFIsRUFPa0I7QUFDaEJULFFBQUFBLFFBQVEsQ0FBQ1MsUUFBRCxDQUFSO0FBQ0gsT0FUQztBQVVGRSxNQUFBQSxPQVZFLHFCQVVRO0FBQ05YLFFBQUFBLFFBQVEsQ0FBQztBQUFDWSxVQUFBQSxNQUFNLEVBQUUsS0FBVDtBQUFnQk4sVUFBQUEsSUFBSSxFQUFFO0FBQXRCLFNBQUQsQ0FBUjtBQUNIO0FBWkMsS0FBTjtBQWNIO0FBck1jLENBQW5CLEMsQ0F3TUE7O0FBQ0EsSUFBSSxPQUFPZSxNQUFQLEtBQWtCLFdBQWxCLElBQWlDQSxNQUFNLENBQUNDLE9BQTVDLEVBQXFEO0FBQ2pERCxFQUFBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUJuQyxVQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgQ29uZmlnICovXG5cbi8qKlxuICogQXBpS2V5c0FQSSAtIFJFU1QgQVBJIGZvciBBUEkgS2V5cyBtYW5hZ2VtZW50XG4gKiBcbiAqIFVzZXMgdjMgUkVTVGZ1bCBBUEkgd2l0aCBwcm9wZXIgSFRUUCBtZXRob2RzLlxuICogVGhpcyBwcm92aWRlczpcbiAqIC0gUkVTVGZ1bCByZXNvdXJjZS1vcmllbnRlZCBlbmRwb2ludHNcbiAqIC0gUHJvcGVyIEhUVFAgbWV0aG9kIHVzYWdlIChHRVQsIFBPU1QsIFBVVCwgUEFUQ0gsIERFTEVURSlcbiAqIC0gQ3VzdG9tIG1ldGhvZHMgdXNpbmcgY29sb24gbm90YXRpb24gKDptZXRob2QpXG4gKiAtIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgdGhyb3VnaCBtZXRob2QgbWFwcGluZ1xuICovXG5jb25zdCBBcGlLZXlzQVBJID0ge1xuICAgIC8qKlxuICAgICAqIEFQSSBiYXNlIFVSTCBmb3IgdjMgUkVTVGZ1bCBlbmRwb2ludHNcbiAgICAgKi9cbiAgICBhcGlVcmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YzL2FwaS1rZXlzYCxcbiAgICBcbiAgICAvLyBDZW50cmFsaXplZCBlbmRwb2ludCBkZWZpbml0aW9ucyBmb3IgUGJ4RGF0YVRhYmxlSW5kZXggY29tcGF0aWJpbGl0eVxuICAgIGVuZHBvaW50czoge1xuICAgICAgICBnZXRMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92My9hcGkta2V5c2AsXG4gICAgICAgIGdldFJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjMvYXBpLWtleXNgLFxuICAgICAgICBzYXZlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92My9hcGkta2V5c2AsXG4gICAgICAgIGRlbGV0ZVJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjMvYXBpLWtleXNgLFxuICAgICAgICBnZW5lcmF0ZUtleTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjMvYXBpLWtleXM6Z2VuZXJhdGVLZXlgLFxuICAgICAgICBnZXRBdmFpbGFibGVDb250cm9sbGVyczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjMvYXBpLWtleXM6Z2V0QXZhaWxhYmxlQ29udHJvbGxlcnNgXG4gICAgfSxcbiAgICBcbiAgICAvLyBMZWdhY3kgdjIgZW5kcG9pbnRzIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5ICh3aWxsIGJlIHJlbW92ZWQgaW4gZnV0dXJlKVxuICAgIHYyRW5kcG9pbnRzOiB7XG4gICAgICAgIGdldExpc3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YyL2FwaS1rZXlzL2dldExpc3RgLFxuICAgICAgICBnZXRSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YyL2FwaS1rZXlzL2dldFJlY29yZGAsXG4gICAgICAgIHNhdmVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YyL2FwaS1rZXlzL3NhdmVSZWNvcmRgLFxuICAgICAgICBkZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YyL2FwaS1rZXlzL2RlbGV0ZVJlY29yZGAsXG4gICAgICAgIGdlbmVyYXRlS2V5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9hcGkta2V5cy9nZW5lcmF0ZUtleWAsXG4gICAgICAgIGdldEF2YWlsYWJsZUNvbnRyb2xsZXJzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92Mi9hcGkta2V5cy9nZXRBdmFpbGFibGVDb250cm9sbGVyc2BcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG5ldyByZWNvcmRzIGZvciBEYXRhVGFibGUgKGFsaWFzIGZvciBnZXRMaXN0KVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gY2FsbCB3aXRoIHJlc3BvbnNlIGRhdGFcbiAgICAgKi9cbiAgICBnZXROZXdSZWNvcmRzKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuZ2V0TGlzdChjYWxsYmFjayk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBsaXN0IG9mIGFsbCBBUEkga2V5c1xuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IEdFVCAvYXBpLWtleXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gUXVlcnkgcGFyYW1ldGVycyAobGltaXQsIG9mZnNldCwgc2VhcmNoLCBldGMuKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRMaXN0KHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gU3VwcG9ydCBvbGQgc2lnbmF0dXJlIHdoZXJlIGNhbGxiYWNrIGlzIHRoZSBmaXJzdCBwYXJhbWV0ZXJcbiAgICAgICAgaWYgKHR5cGVvZiBwYXJhbXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gcGFyYW1zO1xuICAgICAgICAgICAgcGFyYW1zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHYzIEFQSTogR0VUIC9hcGkta2V5cyB3aXRoIHF1ZXJ5IHBhcmFtZXRlcnNcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5nZXRMaXN0LFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHBhcmFtcyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgZGF0YTogW119KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgYnkgSURcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBHRVQgL2FwaS1rZXlzL3tpZH0gb3IgR0VUIC9hcGkta2V5czpnZXREZWZhdWx0IGZvciBuZXdcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBSZWNvcmQgSUQgb3IgZW1wdHkgc3RyaW5nIGZvciBuZXdcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0UmVjb3JkKGlkLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBVc2UgOmdldERlZmF1bHQgZm9yIG5ldyByZWNvcmRzLCBvdGhlcndpc2UgR0VUIGJ5IElEXG4gICAgICAgIGNvbnN0IGlzTmV3ID0gIWlkIHx8IGlkID09PSAnJyB8fCBpZCA9PT0gJ25ldyc7XG4gICAgICAgIGNvbnN0IHVybCA9IGlzTmV3ID8gYCR7dGhpcy5hcGlVcmx9OmdldERlZmF1bHRgIDogYCR7dGhpcy5hcGlVcmx9LyR7aWR9YDtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogJ05ldHdvcmsgZXJyb3InfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBuZXcgQVBJIGtleVxuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IFBPU1QgL2FwaS1rZXlzOmdlbmVyYXRlS2V5XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdlbmVyYXRlS2V5KGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIHYzIEFQSTogUE9TVCAvYXBpLWtleXM6Z2VuZXJhdGVLZXkgKGN1c3RvbSBtZXRob2QpXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9OmdlbmVyYXRlS2V5YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiAnTmV0d29yayBlcnJvcid9fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlIHJlY29yZFxuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IFBPU1QgL2FwaS1rZXlzIChjcmVhdGUpIG9yIFBVVCAvYXBpLWtleXMve2lkfSAodXBkYXRlKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzYXZlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIHNhdmVSZWNvcmQoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmQgdXNpbmcgdGhlIF9pc05ldyBmbGFnIHBhc3NlZCBmcm9tIGZvcm1cbiAgICAgICAgY29uc3QgaXNOZXcgPSBkYXRhLl9pc05ldyA9PT0gdHJ1ZSB8fCAhZGF0YS5pZCB8fCBkYXRhLmlkID09PSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgZmxhZyBiZWZvcmUgc2VuZGluZyB0byBzZXJ2ZXJcbiAgICAgICAgaWYgKGRhdGEuX2lzTmV3ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhLl9pc05ldztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gdjMgQVBJOiBQT1NUIGZvciBuZXcgcmVjb3JkcywgUFVUIGZvciB1cGRhdGVzXG4gICAgICAgIGNvbnN0IG1ldGhvZCA9IGlzTmV3ID8gJ1BPU1QnIDogJ1BVVCc7XG4gICAgICAgIGNvbnN0IHVybCA9IGlzTmV3ID8gdGhpcy5hcGlVcmwgOiBgJHt0aGlzLmFwaVVybH0vJHtkYXRhLmlkfWA7XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogJ05ldHdvcmsgZXJyb3InfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJlY29yZFxuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IERFTEVURSAvYXBpLWtleXMve2lkfVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlY29yZCBJRFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQoaWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIHYzIEFQSTogREVMRVRFIC9hcGkta2V5cy97aWR9XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9LyR7aWR9YCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBsaXN0IG9mIGF2YWlsYWJsZSBjb250cm9sbGVycy9lbmRwb2ludHMgZm9yIHBlcm1pc3Npb25zXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogR0VUIC9hcGkta2V5czpnZXRBdmFpbGFibGVDb250cm9sbGVyc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRBdmFpbGFibGVDb250cm9sbGVycyhjYWxsYmFjaykge1xuICAgICAgICAvLyB2MyBBUEk6IEdFVCAvYXBpLWtleXM6Z2V0QXZhaWxhYmxlQ29udHJvbGxlcnMgKGN1c3RvbSBtZXRob2QpXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9OmdldEF2YWlsYWJsZUNvbnRyb2xsZXJzYCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IFtdfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gQXBpS2V5c0FQSTtcbn0iXX0=