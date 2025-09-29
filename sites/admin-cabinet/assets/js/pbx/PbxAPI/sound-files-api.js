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

/* global Config, PbxApi, PbxApiClient, $ */

/**
 * SoundFilesAPI - REST API v3 client for sound files management
 *
 * Provides a clean interface for sound files operations using the new RESTful API.
 *
 * @class SoundFilesAPI 
 */
var SoundFilesAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/sound-files',
  customMethods: {
    getDefault: ':getDefault',
    uploadFile: ':uploadFile',
    getForSelect: ':getForSelect',
    convertAudioFile: ':convertAudioFile'
  }
}); // Add method aliases for compatibility and easier use

Object.assign(SoundFilesAPI, {
  /**
   * Get sound file record for editing
   * Uses v3 RESTful API: GET /sound-files/{id} or GET /sound-files:getDefault for new
   * @param {string} recordId - Sound file ID or empty/null for new sound file
   * @param {function} callback - Callback function to handle response
   * @param {object} params - Optional parameters (e.g., category for new records)
   */
  getRecord: function getRecord(recordId, callback) {
    var params = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    // Use :getDefault for new records, otherwise GET by ID
    var isNew = !recordId || recordId === '' || recordId === 'new';

    if (isNew) {
      return this.callCustomMethod('getDefault', params, callback);
    } else {
      return this.callGet({}, callback, recordId);
    }
  },

  /**
   * Delete sound file record
   * Uses v3 RESTful API: DELETE /sound-files/{id}
   * @param {string} id - Sound file ID to delete
   * @param {function} callback - Callback function to handle response
   */
  deleteRecord: function deleteRecord(id, callback) {
    return this.callDelete(callback, id);
  },

  /**
   * Get list of sound files for DataTable
   * Uses v3 RESTful API: GET /sound-files with query parameters
   * @param {object} params - Query parameters (category, search, limit, offset, etc.)
   * @param {function} callback - Callback function to handle response
   */
  getList: function getList(params, callback) {
    return this.callGet(params || {}, callback);
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
    return this.callCustomMethod('getForSelect', {
      category: category
    }, function (response) {
      if (response.result) {
        callback(response);
      } else {
        callback({
          result: false,
          data: []
        });
      }
    });
  },

  /**
   * Convert audio file to MP3 format
   * Uses v3 RESTful API: POST /sound-files:convertAudioFile
   * @param {object} params - Conversion parameters
   * @param {string} params.temp_filename - Path to temporary uploaded file
   * @param {string} params.category - File category (custom/moh)
   * @param {function} callback - Callback function to handle response
   */
  convertAudioFile: function convertAudioFile(params, callback) {
    return this.callCustomMethod('convertAudioFile', params, callback, 'POST');
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvc291bmQtZmlsZXMtYXBpLmpzIl0sIm5hbWVzIjpbIlNvdW5kRmlsZXNBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXREZWZhdWx0IiwidXBsb2FkRmlsZSIsImdldEZvclNlbGVjdCIsImNvbnZlcnRBdWRpb0ZpbGUiLCJPYmplY3QiLCJhc3NpZ24iLCJnZXRSZWNvcmQiLCJyZWNvcmRJZCIsImNhbGxiYWNrIiwicGFyYW1zIiwiaXNOZXciLCJjYWxsQ3VzdG9tTWV0aG9kIiwiY2FsbEdldCIsImRlbGV0ZVJlY29yZCIsImlkIiwiY2FsbERlbGV0ZSIsImdldExpc3QiLCJnZXRVcGxvYWRVcmwiLCJhcGlVcmwiLCJjYXRlZ29yeSIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHLElBQUlDLFlBQUosQ0FBaUI7QUFDbkNDLEVBQUFBLFFBQVEsRUFBRSw2QkFEeUI7QUFFbkNDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxVQUFVLEVBQUUsYUFERDtBQUVYQyxJQUFBQSxVQUFVLEVBQUUsYUFGRDtBQUdYQyxJQUFBQSxZQUFZLEVBQUUsZUFISDtBQUlYQyxJQUFBQSxnQkFBZ0IsRUFBRTtBQUpQO0FBRm9CLENBQWpCLENBQXRCLEMsQ0FVQTs7QUFDQUMsTUFBTSxDQUFDQyxNQUFQLENBQWNULGFBQWQsRUFBNkI7QUFFekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSVUsRUFBQUEsU0FUeUIscUJBU2ZDLFFBVGUsRUFTTEMsUUFUSyxFQVNrQjtBQUFBLFFBQWJDLE1BQWEsdUVBQUosRUFBSTtBQUN2QztBQUNBLFFBQU1DLEtBQUssR0FBRyxDQUFDSCxRQUFELElBQWFBLFFBQVEsS0FBSyxFQUExQixJQUFnQ0EsUUFBUSxLQUFLLEtBQTNEOztBQUVBLFFBQUlHLEtBQUosRUFBVztBQUNQLGFBQU8sS0FBS0MsZ0JBQUwsQ0FBc0IsWUFBdEIsRUFBb0NGLE1BQXBDLEVBQTRDRCxRQUE1QyxDQUFQO0FBQ0gsS0FGRCxNQUVPO0FBQ0gsYUFBTyxLQUFLSSxPQUFMLENBQWEsRUFBYixFQUFpQkosUUFBakIsRUFBMkJELFFBQTNCLENBQVA7QUFDSDtBQUNKLEdBbEJ3Qjs7QUFvQnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJTSxFQUFBQSxZQTFCeUIsd0JBMEJaQyxFQTFCWSxFQTBCUk4sUUExQlEsRUEwQkU7QUFDdkIsV0FBTyxLQUFLTyxVQUFMLENBQWdCUCxRQUFoQixFQUEwQk0sRUFBMUIsQ0FBUDtBQUNILEdBNUJ3Qjs7QUE4QnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxPQXBDeUIsbUJBb0NqQlAsTUFwQ2lCLEVBb0NURCxRQXBDUyxFQW9DQztBQUN0QixXQUFPLEtBQUtJLE9BQUwsQ0FBYUgsTUFBTSxJQUFJLEVBQXZCLEVBQTJCRCxRQUEzQixDQUFQO0FBQ0gsR0F0Q3dCOztBQXdDekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJUyxFQUFBQSxZQTdDeUIsMEJBNkNWO0FBQ1gscUJBQVUsS0FBS0MsTUFBZjtBQUNILEdBL0N3Qjs7QUFpRHpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJaEIsRUFBQUEsWUF2RHlCLHdCQXVEWmlCLFFBdkRZLEVBdURGWCxRQXZERSxFQXVEUTtBQUM3QixXQUFPLEtBQUtHLGdCQUFMLENBQXNCLGNBQXRCLEVBQXNDO0FBQUVRLE1BQUFBLFFBQVEsRUFBRUE7QUFBWixLQUF0QyxFQUE4RCxVQUFDQyxRQUFELEVBQWM7QUFDL0UsVUFBSUEsUUFBUSxDQUFDQyxNQUFiLEVBQXFCO0FBQ2pCYixRQUFBQSxRQUFRLENBQUNZLFFBQUQsQ0FBUjtBQUNILE9BRkQsTUFFTztBQUNIWixRQUFBQSxRQUFRLENBQUM7QUFBQ2EsVUFBQUEsTUFBTSxFQUFFLEtBQVQ7QUFBZ0JDLFVBQUFBLElBQUksRUFBRTtBQUF0QixTQUFELENBQVI7QUFDSDtBQUNKLEtBTk0sQ0FBUDtBQU9ILEdBL0R3Qjs7QUFpRXpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSW5CLEVBQUFBLGdCQXpFeUIsNEJBeUVSTSxNQXpFUSxFQXlFQUQsUUF6RUEsRUF5RVU7QUFDL0IsV0FBTyxLQUFLRyxnQkFBTCxDQUFzQixrQkFBdEIsRUFBMENGLE1BQTFDLEVBQWtERCxRQUFsRCxFQUE0RCxNQUE1RCxDQUFQO0FBQ0g7QUEzRXdCLENBQTdCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIENvbmZpZywgUGJ4QXBpLCBQYnhBcGlDbGllbnQsICQgKi9cblxuLyoqXG4gKiBTb3VuZEZpbGVzQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBzb3VuZCBmaWxlcyBtYW5hZ2VtZW50XG4gKlxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIHNvdW5kIGZpbGVzIG9wZXJhdGlvbnMgdXNpbmcgdGhlIG5ldyBSRVNUZnVsIEFQSS5cbiAqXG4gKiBAY2xhc3MgU291bmRGaWxlc0FQSSBcbiAqL1xuY29uc3QgU291bmRGaWxlc0FQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL3NvdW5kLWZpbGVzJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIGdldERlZmF1bHQ6ICc6Z2V0RGVmYXVsdCcsXG4gICAgICAgIHVwbG9hZEZpbGU6ICc6dXBsb2FkRmlsZScsXG4gICAgICAgIGdldEZvclNlbGVjdDogJzpnZXRGb3JTZWxlY3QnLFxuICAgICAgICBjb252ZXJ0QXVkaW9GaWxlOiAnOmNvbnZlcnRBdWRpb0ZpbGUnXG4gICAgfVxufSk7XG5cbi8vIEFkZCBtZXRob2QgYWxpYXNlcyBmb3IgY29tcGF0aWJpbGl0eSBhbmQgZWFzaWVyIHVzZVxuT2JqZWN0LmFzc2lnbihTb3VuZEZpbGVzQVBJLCB7XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHNvdW5kIGZpbGUgcmVjb3JkIGZvciBlZGl0aW5nXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogR0VUIC9zb3VuZC1maWxlcy97aWR9IG9yIEdFVCAvc291bmQtZmlsZXM6Z2V0RGVmYXVsdCBmb3IgbmV3XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gU291bmQgZmlsZSBJRCBvciBlbXB0eS9udWxsIGZvciBuZXcgc291bmQgZmlsZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIE9wdGlvbmFsIHBhcmFtZXRlcnMgKGUuZy4sIGNhdGVnb3J5IGZvciBuZXcgcmVjb3JkcylcbiAgICAgKi9cbiAgICBnZXRSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrLCBwYXJhbXMgPSB7fSkge1xuICAgICAgICAvLyBVc2UgOmdldERlZmF1bHQgZm9yIG5ldyByZWNvcmRzLCBvdGhlcndpc2UgR0VUIGJ5IElEXG4gICAgICAgIGNvbnN0IGlzTmV3ID0gIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJyB8fCByZWNvcmRJZCA9PT0gJ25ldyc7XG5cbiAgICAgICAgaWYgKGlzTmV3KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXREZWZhdWx0JywgcGFyYW1zLCBjYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsR2V0KHt9LCBjYWxsYmFjaywgcmVjb3JkSWQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBzb3VuZCBmaWxlIHJlY29yZFxuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IERFTEVURSAvc291bmQtZmlsZXMve2lkfVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFNvdW5kIGZpbGUgSUQgdG8gZGVsZXRlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQoaWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxEZWxldGUoY2FsbGJhY2ssIGlkKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGxpc3Qgb2Ygc291bmQgZmlsZXMgZm9yIERhdGFUYWJsZVxuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IEdFVCAvc291bmQtZmlsZXMgd2l0aCBxdWVyeSBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFF1ZXJ5IHBhcmFtZXRlcnMgKGNhdGVnb3J5LCBzZWFyY2gsIGxpbWl0LCBvZmZzZXQsIGV0Yy4pXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBnZXRMaXN0KHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEdldChwYXJhbXMgfHwge30sIGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBsb2FkIHNvdW5kIGZpbGUgZW5kcG9pbnQgZm9yIFJlc3VtYWJsZS5qc1xuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IFBPU1QgL3NvdW5kLWZpbGVzOnVwbG9hZEZpbGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldFVwbG9hZFVybCgpIHtcbiAgICAgICAgcmV0dXJuIGAke3RoaXMuYXBpVXJsfTp1cGxvYWRGaWxlYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHNvdW5kIGZpbGVzIGZvciBkcm9wZG93biBzZWxlY3RcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBHRVQgL3NvdW5kLWZpbGVzOmdldEZvclNlbGVjdFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSAtIENhdGVnb3J5IGZpbHRlciAoY3VzdG9tL21vaClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGdldEZvclNlbGVjdChjYXRlZ29yeSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0Rm9yU2VsZWN0JywgeyBjYXRlZ29yeTogY2F0ZWdvcnkgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgZGF0YTogW119KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgYXVkaW8gZmlsZSB0byBNUDMgZm9ybWF0XG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogUE9TVCAvc291bmQtZmlsZXM6Y29udmVydEF1ZGlvRmlsZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBDb252ZXJzaW9uIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnRlbXBfZmlsZW5hbWUgLSBQYXRoIHRvIHRlbXBvcmFyeSB1cGxvYWRlZCBmaWxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5jYXRlZ29yeSAtIEZpbGUgY2F0ZWdvcnkgKGN1c3RvbS9tb2gpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjb252ZXJ0QXVkaW9GaWxlKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnY29udmVydEF1ZGlvRmlsZScsIHBhcmFtcywgY2FsbGJhY2ssICdQT1NUJyk7XG4gICAgfVxufSk7Il19