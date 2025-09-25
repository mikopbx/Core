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
    getForSelect: ':getForSelect'
  }
}); // Add method aliases for compatibility and easier use

Object.assign(SoundFilesAPI, {
  /**
   * Get sound file record for editing
   * Uses v3 RESTful API: GET /sound-files/{id} or GET /sound-files:getDefault for new
   * @param {string} recordId - Sound file ID or empty/null for new sound file
   * @param {function} callback - Callback function to handle response
   */
  getRecord: function getRecord(recordId, callback) {
    // Use :getDefault for new records, otherwise GET by ID
    var isNew = !recordId || recordId === '' || recordId === 'new';

    if (isNew) {
      return this.callCustomMethod('getDefault', {}, callback);
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
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvc291bmQtZmlsZXMtYXBpLmpzIl0sIm5hbWVzIjpbIlNvdW5kRmlsZXNBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXREZWZhdWx0IiwidXBsb2FkRmlsZSIsImdldEZvclNlbGVjdCIsIk9iamVjdCIsImFzc2lnbiIsImdldFJlY29yZCIsInJlY29yZElkIiwiY2FsbGJhY2siLCJpc05ldyIsImNhbGxDdXN0b21NZXRob2QiLCJjYWxsR2V0IiwiZGVsZXRlUmVjb3JkIiwiaWQiLCJjYWxsRGVsZXRlIiwiZ2V0TGlzdCIsInBhcmFtcyIsImdldFVwbG9hZFVybCIsImFwaVVybCIsImNhdGVnb3J5IiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUNuQ0MsRUFBQUEsUUFBUSxFQUFFLDZCQUR5QjtBQUVuQ0MsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFVBQVUsRUFBRSxhQUREO0FBRVhDLElBQUFBLFVBQVUsRUFBRSxhQUZEO0FBR1hDLElBQUFBLFlBQVksRUFBRTtBQUhIO0FBRm9CLENBQWpCLENBQXRCLEMsQ0FTQTs7QUFDQUMsTUFBTSxDQUFDQyxNQUFQLENBQWNSLGFBQWQsRUFBNkI7QUFFekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lTLEVBQUFBLFNBUnlCLHFCQVFmQyxRQVJlLEVBUUxDLFFBUkssRUFRSztBQUMxQjtBQUNBLFFBQU1DLEtBQUssR0FBRyxDQUFDRixRQUFELElBQWFBLFFBQVEsS0FBSyxFQUExQixJQUFnQ0EsUUFBUSxLQUFLLEtBQTNEOztBQUVBLFFBQUlFLEtBQUosRUFBVztBQUNQLGFBQU8sS0FBS0MsZ0JBQUwsQ0FBc0IsWUFBdEIsRUFBb0MsRUFBcEMsRUFBd0NGLFFBQXhDLENBQVA7QUFDSCxLQUZELE1BRU87QUFDSCxhQUFPLEtBQUtHLE9BQUwsQ0FBYSxFQUFiLEVBQWlCSCxRQUFqQixFQUEyQkQsUUFBM0IsQ0FBUDtBQUNIO0FBQ0osR0FqQndCOztBQW1CekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lLLEVBQUFBLFlBekJ5Qix3QkF5QlpDLEVBekJZLEVBeUJSTCxRQXpCUSxFQXlCRTtBQUN2QixXQUFPLEtBQUtNLFVBQUwsQ0FBZ0JOLFFBQWhCLEVBQTBCSyxFQUExQixDQUFQO0FBQ0gsR0EzQndCOztBQTZCekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLE9BbkN5QixtQkFtQ2pCQyxNQW5DaUIsRUFtQ1RSLFFBbkNTLEVBbUNDO0FBQ3RCLFdBQU8sS0FBS0csT0FBTCxDQUFhSyxNQUFNLElBQUksRUFBdkIsRUFBMkJSLFFBQTNCLENBQVA7QUFDSCxHQXJDd0I7O0FBdUN6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lTLEVBQUFBLFlBNUN5QiwwQkE0Q1Y7QUFDWCxxQkFBVSxLQUFLQyxNQUFmO0FBQ0gsR0E5Q3dCOztBQWdEekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lmLEVBQUFBLFlBdER5Qix3QkFzRFpnQixRQXREWSxFQXNERlgsUUF0REUsRUFzRFE7QUFDN0IsV0FBTyxLQUFLRSxnQkFBTCxDQUFzQixjQUF0QixFQUFzQztBQUFFUyxNQUFBQSxRQUFRLEVBQUVBO0FBQVosS0FBdEMsRUFBOEQsVUFBQ0MsUUFBRCxFQUFjO0FBQy9FLFVBQUlBLFFBQVEsQ0FBQ0MsTUFBYixFQUFxQjtBQUNqQmIsUUFBQUEsUUFBUSxDQUFDWSxRQUFELENBQVI7QUFDSCxPQUZELE1BRU87QUFDSFosUUFBQUEsUUFBUSxDQUFDO0FBQUNhLFVBQUFBLE1BQU0sRUFBRSxLQUFUO0FBQWdCQyxVQUFBQSxJQUFJLEVBQUU7QUFBdEIsU0FBRCxDQUFSO0FBQ0g7QUFDSixLQU5NLENBQVA7QUFPSDtBQTlEd0IsQ0FBN0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBQYnhBcGksIFBieEFwaUNsaWVudCwgJCAqL1xuXG4vKipcbiAqIFNvdW5kRmlsZXNBUEkgLSBSRVNUIEFQSSB2MyBjbGllbnQgZm9yIHNvdW5kIGZpbGVzIG1hbmFnZW1lbnRcbiAqXG4gKiBQcm92aWRlcyBhIGNsZWFuIGludGVyZmFjZSBmb3Igc291bmQgZmlsZXMgb3BlcmF0aW9ucyB1c2luZyB0aGUgbmV3IFJFU1RmdWwgQVBJLlxuICpcbiAqIEBjbGFzcyBTb3VuZEZpbGVzQVBJIFxuICovXG5jb25zdCBTb3VuZEZpbGVzQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvc291bmQtZmlsZXMnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0RGVmYXVsdDogJzpnZXREZWZhdWx0JyxcbiAgICAgICAgdXBsb2FkRmlsZTogJzp1cGxvYWRGaWxlJyxcbiAgICAgICAgZ2V0Rm9yU2VsZWN0OiAnOmdldEZvclNlbGVjdCdcbiAgICB9XG59KTtcblxuLy8gQWRkIG1ldGhvZCBhbGlhc2VzIGZvciBjb21wYXRpYmlsaXR5IGFuZCBlYXNpZXIgdXNlXG5PYmplY3QuYXNzaWduKFNvdW5kRmlsZXNBUEksIHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc291bmQgZmlsZSByZWNvcmQgZm9yIGVkaXRpbmdcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBHRVQgL3NvdW5kLWZpbGVzL3tpZH0gb3IgR0VUIC9zb3VuZC1maWxlczpnZXREZWZhdWx0IGZvciBuZXdcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBTb3VuZCBmaWxlIElEIG9yIGVtcHR5L251bGwgZm9yIG5ldyBzb3VuZCBmaWxlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBnZXRSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIFVzZSA6Z2V0RGVmYXVsdCBmb3IgbmV3IHJlY29yZHMsIG90aGVyd2lzZSBHRVQgYnkgSURcbiAgICAgICAgY29uc3QgaXNOZXcgPSAhcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnIHx8IHJlY29yZElkID09PSAnbmV3JztcblxuICAgICAgICBpZiAoaXNOZXcpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldERlZmF1bHQnLCB7fSwgY2FsbGJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEdldCh7fSwgY2FsbGJhY2ssIHJlY29yZElkKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgc291bmQgZmlsZSByZWNvcmRcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBERUxFVEUgL3NvdW5kLWZpbGVzL3tpZH1cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBTb3VuZCBmaWxlIElEIHRvIGRlbGV0ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkKGlkLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWxsRGVsZXRlKGNhbGxiYWNrLCBpZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBsaXN0IG9mIHNvdW5kIGZpbGVzIGZvciBEYXRhVGFibGVcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBHRVQgL3NvdW5kLWZpbGVzIHdpdGggcXVlcnkgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBRdWVyeSBwYXJhbWV0ZXJzIChjYXRlZ29yeSwgc2VhcmNoLCBsaW1pdCwgb2Zmc2V0LCBldGMuKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZ2V0TGlzdChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxHZXQocGFyYW1zIHx8IHt9LCBjYWxsYmFjayk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwbG9hZCBzb3VuZCBmaWxlIGVuZHBvaW50IGZvciBSZXN1bWFibGUuanNcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBQT1NUIC9zb3VuZC1maWxlczp1cGxvYWRGaWxlXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXRVcGxvYWRVcmwoKSB7XG4gICAgICAgIHJldHVybiBgJHt0aGlzLmFwaVVybH06dXBsb2FkRmlsZWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBzb3VuZCBmaWxlcyBmb3IgZHJvcGRvd24gc2VsZWN0XG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogR0VUIC9zb3VuZC1maWxlczpnZXRGb3JTZWxlY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2F0ZWdvcnkgLSBDYXRlZ29yeSBmaWx0ZXIgKGN1c3RvbS9tb2gpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBnZXRGb3JTZWxlY3QoY2F0ZWdvcnksIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldEZvclNlbGVjdCcsIHsgY2F0ZWdvcnk6IGNhdGVnb3J5IH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IFtdfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn0pOyJdfQ==