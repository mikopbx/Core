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

/* global PbxApiClient, $, globalRootUrl, PbxApi */

/**
 * StorageAPI - REST API v3 client for Storage management (Singleton resource)
 *
 * Provides a clean interface for Storage operations.
 * Storage is a singleton resource - there's only one storage configuration in the system.
 *
 * @class StorageAPI 
 */
var StorageAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/storage',
  singleton: true,
  customMethods: {
    getUsage: ':usage',
    getList: ':list'
  }
});
/**
 * Get Storage settings (Singleton GET)
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * StorageAPI.get((response) => {
 *     if (response.result) {
 *         console.log('Settings:', response.data);
 *     }
 * });
 */

StorageAPI.get = function (callback) {
  return this.callGet({}, callback);
}; // Alias for backward compatibility


StorageAPI.getSettings = StorageAPI.get;
/**
 * Update Storage settings (Singleton PUT)
 *
 * @param {object} data - Settings data to update
 * @param {function} callback - Callback function to handle the response
 * @example
 * StorageAPI.update({
 *     PBXRecordSavePeriod: '180'
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Settings updated successfully');
 *     }
 * });
 */

StorageAPI.update = function (data, callback) {
  return this.callPut(data, callback);
}; // Alias for backward compatibility


StorageAPI.updateSettings = StorageAPI.update;
/**
 * Partially update Storage settings (Singleton PATCH)
 *
 * @param {object} data - Settings data to patch
 * @param {function} callback - Callback function to handle the response
 * @example
 * StorageAPI.patch({
 *     PBXRecordSavePeriod: '360'
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Settings patched successfully');
 *     }
 * });
 */

StorageAPI.patch = function (data, callback) {
  return this.callPatch(data, callback);
};
/**
 * Get storage usage statistics (Custom method)
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * StorageAPI.getUsage((response) => {
 *     if (response.result) {
 *         console.log('Usage statistics:', response.data);
 *     }
 * });
 */


StorageAPI.getUsage = function (callback) {
  return this.callCustomMethod('getUsage', {}, callback);
}; // Backward compatibility - wrap old method to use new API


StorageAPI.getStorageUsage = function (callback) {
  this.getUsage(function (response) {
    if (response.result) {
      callback(response.data);
    } else {
      callback(false);
    }
  });
};
/**
 * Get list of all storage devices (Custom method)
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * StorageAPI.getList((response) => {
 *     if (response.result) {
 *         console.log('Storage devices:', response.data);
 *     }
 * });
 */


StorageAPI.getList = function (callback) {
  return this.callCustomMethod('getList', {}, callback);
}; // Backward compatibility - wrap old method to use new API


StorageAPI.getStorageList = function (callback) {
  this.getList(function (response) {
    if (response.result) {
      callback(response.data);
    } else {
      callback(false);
    }
  });
};
/**
 * Test S3 connection with provided credentials
 *
 * @param {object} data - S3 connection settings to test
 * @param {string} data.s3_endpoint - S3 endpoint URL
 * @param {string} data.s3_region - S3 region
 * @param {string} data.s3_bucket - S3 bucket name
 * @param {string} data.s3_access_key - S3 access key
 * @param {string} data.s3_secret_key - S3 secret key
 * @param {function} callback - Callback function to handle the response
 * @example
 * StorageAPI.testS3Connection({
 *     s3_endpoint: 'https://s3.amazonaws.com',
 *     s3_region: 'us-east-1',
 *     s3_bucket: 'my-bucket',
 *     s3_access_key: 'AKIAIOSFODNN7EXAMPLE',
 *     s3_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Connection test:', response.data.message);
 *     }
 * });
 */

/**
 * S3StorageAPI - REST API v3 client for S3 Storage management (Singleton resource)
 *
 * Provides interface for S3-compatible cloud storage operations.
 * S3 Storage is a singleton resource - there's only one S3 configuration in the system.
 *
 * @class S3StorageAPI
 */


var S3StorageAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/s3-storage',
  singleton: true,
  customMethods: {
    testConnection: ':testConnection',
    stats: ':stats'
  }
});
/**
 * Get S3 Storage settings (Singleton GET)
 *
 * @param {function} callback - Callback function to handle the response
 */

S3StorageAPI.get = function (callback) {
  return this.callGet({}, callback);
};
/**
 * Update S3 Storage settings (Singleton PUT)
 *
 * @param {object} data - S3 settings data to update
 * @param {function} callback - Callback function to handle the response
 */


S3StorageAPI.update = function (data, callback) {
  return this.callPut(data, callback);
};
/**
 * Partially update S3 Storage settings (Singleton PATCH)
 *
 * @param {object} data - S3 settings data to patch
 * @param {function} callback - Callback function to handle the response
 */


S3StorageAPI.patch = function (data, callback) {
  return this.callPatch(data, callback);
};
/**
 * Test S3 connection with provided credentials (Custom method)
 *
 * @param {object} data - S3 connection settings to test
 * @param {function} callback - Callback function to handle the response
 */


S3StorageAPI.testConnection = function (data, callback) {
  return this.callCustomMethod('testConnection', data, callback);
};
/**
 * Get S3 synchronization statistics (Custom method)
 *
 * Returns detailed statistics about S3 storage synchronization including:
 * - Number of files in S3 and locally
 * - Total size in S3 and pending upload
 * - Sync percentage and status (synced/syncing/pending/disabled)
 * - Last upload timestamp and oldest pending file date
 * - S3 connection status
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * S3StorageAPI.getStats((response) => {
 *     if (response.result) {
 *         console.log('S3 Stats:', response.data);
 *         console.log('Sync %:', response.data.sync_percentage);
 *     }
 * });
 */


S3StorageAPI.getStats = function (callback) {
  return this.callCustomMethod('stats', {}, callback);
}; // Backward compatibility - keep old method name


StorageAPI.testS3Connection = function (data, callback) {
  S3StorageAPI.testConnection(data, callback);
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvc3RvcmFnZS1hcGkuanMiXSwibmFtZXMiOlsiU3RvcmFnZUFQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50Iiwic2luZ2xldG9uIiwiY3VzdG9tTWV0aG9kcyIsImdldFVzYWdlIiwiZ2V0TGlzdCIsImdldCIsImNhbGxiYWNrIiwiY2FsbEdldCIsImdldFNldHRpbmdzIiwidXBkYXRlIiwiZGF0YSIsImNhbGxQdXQiLCJ1cGRhdGVTZXR0aW5ncyIsInBhdGNoIiwiY2FsbFBhdGNoIiwiY2FsbEN1c3RvbU1ldGhvZCIsImdldFN0b3JhZ2VVc2FnZSIsInJlc3BvbnNlIiwicmVzdWx0IiwiZ2V0U3RvcmFnZUxpc3QiLCJTM1N0b3JhZ2VBUEkiLCJ0ZXN0Q29ubmVjdGlvbiIsInN0YXRzIiwiZ2V0U3RhdHMiLCJ0ZXN0UzNDb25uZWN0aW9uIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFVBQVUsR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQ2hDQyxFQUFBQSxRQUFRLEVBQUUseUJBRHNCO0FBRWhDQyxFQUFBQSxTQUFTLEVBQUUsSUFGcUI7QUFHaENDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxRQUFRLEVBQUUsUUFEQztBQUVYQyxJQUFBQSxPQUFPLEVBQUU7QUFGRTtBQUhpQixDQUFqQixDQUFuQjtBQVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FOLFVBQVUsQ0FBQ08sR0FBWCxHQUFpQixVQUFTQyxRQUFULEVBQW1CO0FBQ2hDLFNBQU8sS0FBS0MsT0FBTCxDQUFhLEVBQWIsRUFBaUJELFFBQWpCLENBQVA7QUFDSCxD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LENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQWMsWUFBWSxDQUFDWCxNQUFiLEdBQXNCLFVBQVNDLElBQVQsRUFBZUosUUFBZixFQUF5QjtBQUMzQyxTQUFPLEtBQUtLLE9BQUwsQ0FBYUQsSUFBYixFQUFtQkosUUFBbkIsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBYyxZQUFZLENBQUNQLEtBQWIsR0FBcUIsVUFBU0gsSUFBVCxFQUFlSixRQUFmLEVBQXlCO0FBQzFDLFNBQU8sS0FBS1EsU0FBTCxDQUFlSixJQUFmLEVBQXFCSixRQUFyQixDQUFQO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FjLFlBQVksQ0FBQ0MsY0FBYixHQUE4QixVQUFTWCxJQUFULEVBQWVKLFFBQWYsRUFBeUI7QUFDbkQsU0FBTyxLQUFLUyxnQkFBTCxDQUFzQixnQkFBdEIsRUFBd0NMLElBQXhDLEVBQThDSixRQUE5QyxDQUFQO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQWMsWUFBWSxDQUFDRyxRQUFiLEdBQXdCLFVBQVNqQixRQUFULEVBQW1CO0FBQ3ZDLFNBQU8sS0FBS1MsZ0JBQUwsQ0FBc0IsT0FBdEIsRUFBK0IsRUFBL0IsRUFBbUNULFFBQW5DLENBQVA7QUFDSCxDQUZELEMsQ0FJQTs7O0FBQ0FSLFVBQVUsQ0FBQzBCLGdCQUFYLEdBQThCLFVBQVNkLElBQVQsRUFBZUosUUFBZixFQUF5QjtBQUNuRGMsRUFBQUEsWUFBWSxDQUFDQyxjQUFiLENBQTRCWCxJQUE1QixFQUFrQ0osUUFBbEM7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaUNsaWVudCwgJCwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpICovXG5cbi8qKlxuICogU3RvcmFnZUFQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgU3RvcmFnZSBtYW5hZ2VtZW50IChTaW5nbGV0b24gcmVzb3VyY2UpXG4gKlxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIFN0b3JhZ2Ugb3BlcmF0aW9ucy5cbiAqIFN0b3JhZ2UgaXMgYSBzaW5nbGV0b24gcmVzb3VyY2UgLSB0aGVyZSdzIG9ubHkgb25lIHN0b3JhZ2UgY29uZmlndXJhdGlvbiBpbiB0aGUgc3lzdGVtLlxuICpcbiAqIEBjbGFzcyBTdG9yYWdlQVBJIFxuICovXG5jb25zdCBTdG9yYWdlQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvc3RvcmFnZScsXG4gICAgc2luZ2xldG9uOiB0cnVlLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0VXNhZ2U6ICc6dXNhZ2UnLFxuICAgICAgICBnZXRMaXN0OiAnOmxpc3QnXG4gICAgfVxufSk7XG5cbi8qKlxuICogR2V0IFN0b3JhZ2Ugc2V0dGluZ3MgKFNpbmdsZXRvbiBHRVQpXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogU3RvcmFnZUFQSS5nZXQoKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnU2V0dGluZ3M6JywgcmVzcG9uc2UuZGF0YSk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cblN0b3JhZ2VBUEkuZ2V0ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsR2V0KHt9LCBjYWxsYmFjayk7XG59O1xuXG4vLyBBbGlhcyBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuU3RvcmFnZUFQSS5nZXRTZXR0aW5ncyA9IFN0b3JhZ2VBUEkuZ2V0O1xuXG4vKipcbiAqIFVwZGF0ZSBTdG9yYWdlIHNldHRpbmdzIChTaW5nbGV0b24gUFVUKVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gU2V0dGluZ3MgZGF0YSB0byB1cGRhdGVcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICogQGV4YW1wbGVcbiAqIFN0b3JhZ2VBUEkudXBkYXRlKHtcbiAqICAgICBQQlhSZWNvcmRTYXZlUGVyaW9kOiAnMTgwJ1xuICogfSwgKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnU2V0dGluZ3MgdXBkYXRlZCBzdWNjZXNzZnVsbHknKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuU3RvcmFnZUFQSS51cGRhdGUgPSBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxQdXQoZGF0YSwgY2FsbGJhY2spO1xufTtcblxuLy8gQWxpYXMgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcblN0b3JhZ2VBUEkudXBkYXRlU2V0dGluZ3MgPSBTdG9yYWdlQVBJLnVwZGF0ZTtcblxuLyoqXG4gKiBQYXJ0aWFsbHkgdXBkYXRlIFN0b3JhZ2Ugc2V0dGluZ3MgKFNpbmdsZXRvbiBQQVRDSClcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFNldHRpbmdzIGRhdGEgdG8gcGF0Y2hcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICogQGV4YW1wbGVcbiAqIFN0b3JhZ2VBUEkucGF0Y2goe1xuICogICAgIFBCWFJlY29yZFNhdmVQZXJpb2Q6ICczNjAnXG4gKiB9LCAocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdTZXR0aW5ncyBwYXRjaGVkIHN1Y2Nlc3NmdWxseScpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5TdG9yYWdlQVBJLnBhdGNoID0gZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsUGF0Y2goZGF0YSwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBHZXQgc3RvcmFnZSB1c2FnZSBzdGF0aXN0aWNzIChDdXN0b20gbWV0aG9kKVxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICogQGV4YW1wbGVcbiAqIFN0b3JhZ2VBUEkuZ2V0VXNhZ2UoKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnVXNhZ2Ugc3RhdGlzdGljczonLCByZXNwb25zZS5kYXRhKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuU3RvcmFnZUFQSS5nZXRVc2FnZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0VXNhZ2UnLCB7fSwgY2FsbGJhY2spO1xufTtcblxuLy8gQmFja3dhcmQgY29tcGF0aWJpbGl0eSAtIHdyYXAgb2xkIG1ldGhvZCB0byB1c2UgbmV3IEFQSVxuU3RvcmFnZUFQSS5nZXRTdG9yYWdlVXNhZ2UgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHRoaXMuZ2V0VXNhZ2UoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEdldCBsaXN0IG9mIGFsbCBzdG9yYWdlIGRldmljZXMgKEN1c3RvbSBtZXRob2QpXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogU3RvcmFnZUFQSS5nZXRMaXN0KChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1N0b3JhZ2UgZGV2aWNlczonLCByZXNwb25zZS5kYXRhKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuU3RvcmFnZUFQSS5nZXRMaXN0ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRMaXN0Jywge30sIGNhbGxiYWNrKTtcbn07XG5cbi8vIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgLSB3cmFwIG9sZCBtZXRob2QgdG8gdXNlIG5ldyBBUElcblN0b3JhZ2VBUEkuZ2V0U3RvcmFnZUxpc3QgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHRoaXMuZ2V0TGlzdCgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogVGVzdCBTMyBjb25uZWN0aW9uIHdpdGggcHJvdmlkZWQgY3JlZGVudGlhbHNcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFMzIGNvbm5lY3Rpb24gc2V0dGluZ3MgdG8gdGVzdFxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGEuczNfZW5kcG9pbnQgLSBTMyBlbmRwb2ludCBVUkxcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhLnMzX3JlZ2lvbiAtIFMzIHJlZ2lvblxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGEuczNfYnVja2V0IC0gUzMgYnVja2V0IG5hbWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhLnMzX2FjY2Vzc19rZXkgLSBTMyBhY2Nlc3Mga2V5XG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YS5zM19zZWNyZXRfa2V5IC0gUzMgc2VjcmV0IGtleVxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogU3RvcmFnZUFQSS50ZXN0UzNDb25uZWN0aW9uKHtcbiAqICAgICBzM19lbmRwb2ludDogJ2h0dHBzOi8vczMuYW1hem9uYXdzLmNvbScsXG4gKiAgICAgczNfcmVnaW9uOiAndXMtZWFzdC0xJyxcbiAqICAgICBzM19idWNrZXQ6ICdteS1idWNrZXQnLFxuICogICAgIHMzX2FjY2Vzc19rZXk6ICdBS0lBSU9TRk9ETk43RVhBTVBMRScsXG4gKiAgICAgczNfc2VjcmV0X2tleTogJ3dKYWxyWFV0bkZFTUkvSzdNREVORy9iUHhSZmlDWUVYQU1QTEVLRVknXG4gKiB9LCAocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdDb25uZWN0aW9uIHRlc3Q6JywgcmVzcG9uc2UuZGF0YS5tZXNzYWdlKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuLyoqXG4gKiBTM1N0b3JhZ2VBUEkgLSBSRVNUIEFQSSB2MyBjbGllbnQgZm9yIFMzIFN0b3JhZ2UgbWFuYWdlbWVudCAoU2luZ2xldG9uIHJlc291cmNlKVxuICpcbiAqIFByb3ZpZGVzIGludGVyZmFjZSBmb3IgUzMtY29tcGF0aWJsZSBjbG91ZCBzdG9yYWdlIG9wZXJhdGlvbnMuXG4gKiBTMyBTdG9yYWdlIGlzIGEgc2luZ2xldG9uIHJlc291cmNlIC0gdGhlcmUncyBvbmx5IG9uZSBTMyBjb25maWd1cmF0aW9uIGluIHRoZSBzeXN0ZW0uXG4gKlxuICogQGNsYXNzIFMzU3RvcmFnZUFQSVxuICovXG5jb25zdCBTM1N0b3JhZ2VBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9zMy1zdG9yYWdlJyxcbiAgICBzaW5nbGV0b246IHRydWUsXG4gICAgY3VzdG9tTWV0aG9kczoge1xuICAgICAgICB0ZXN0Q29ubmVjdGlvbjogJzp0ZXN0Q29ubmVjdGlvbicsXG4gICAgICAgIHN0YXRzOiAnOnN0YXRzJ1xuICAgIH1cbn0pO1xuXG4vKipcbiAqIEdldCBTMyBTdG9yYWdlIHNldHRpbmdzIChTaW5nbGV0b24gR0VUKVxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICovXG5TM1N0b3JhZ2VBUEkuZ2V0ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsR2V0KHt9LCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSBTMyBTdG9yYWdlIHNldHRpbmdzIChTaW5nbGV0b24gUFVUKVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUzMgc2V0dGluZ3MgZGF0YSB0byB1cGRhdGVcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICovXG5TM1N0b3JhZ2VBUEkudXBkYXRlID0gZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsUHV0KGRhdGEsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogUGFydGlhbGx5IHVwZGF0ZSBTMyBTdG9yYWdlIHNldHRpbmdzIChTaW5nbGV0b24gUEFUQ0gpXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTMyBzZXR0aW5ncyBkYXRhIHRvIHBhdGNoXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqL1xuUzNTdG9yYWdlQVBJLnBhdGNoID0gZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsUGF0Y2goZGF0YSwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBUZXN0IFMzIGNvbm5lY3Rpb24gd2l0aCBwcm92aWRlZCBjcmVkZW50aWFscyAoQ3VzdG9tIG1ldGhvZClcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFMzIGNvbm5lY3Rpb24gc2V0dGluZ3MgdG8gdGVzdFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKi9cblMzU3RvcmFnZUFQSS50ZXN0Q29ubmVjdGlvbiA9IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgndGVzdENvbm5lY3Rpb24nLCBkYXRhLCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIEdldCBTMyBzeW5jaHJvbml6YXRpb24gc3RhdGlzdGljcyAoQ3VzdG9tIG1ldGhvZClcbiAqXG4gKiBSZXR1cm5zIGRldGFpbGVkIHN0YXRpc3RpY3MgYWJvdXQgUzMgc3RvcmFnZSBzeW5jaHJvbml6YXRpb24gaW5jbHVkaW5nOlxuICogLSBOdW1iZXIgb2YgZmlsZXMgaW4gUzMgYW5kIGxvY2FsbHlcbiAqIC0gVG90YWwgc2l6ZSBpbiBTMyBhbmQgcGVuZGluZyB1cGxvYWRcbiAqIC0gU3luYyBwZXJjZW50YWdlIGFuZCBzdGF0dXMgKHN5bmNlZC9zeW5jaW5nL3BlbmRpbmcvZGlzYWJsZWQpXG4gKiAtIExhc3QgdXBsb2FkIHRpbWVzdGFtcCBhbmQgb2xkZXN0IHBlbmRpbmcgZmlsZSBkYXRlXG4gKiAtIFMzIGNvbm5lY3Rpb24gc3RhdHVzXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogUzNTdG9yYWdlQVBJLmdldFN0YXRzKChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1MzIFN0YXRzOicsIHJlc3BvbnNlLmRhdGEpO1xuICogICAgICAgICBjb25zb2xlLmxvZygnU3luYyAlOicsIHJlc3BvbnNlLmRhdGEuc3luY19wZXJjZW50YWdlKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuUzNTdG9yYWdlQVBJLmdldFN0YXRzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdzdGF0cycsIHt9LCBjYWxsYmFjayk7XG59O1xuXG4vLyBCYWNrd2FyZCBjb21wYXRpYmlsaXR5IC0ga2VlcCBvbGQgbWV0aG9kIG5hbWVcblN0b3JhZ2VBUEkudGVzdFMzQ29ubmVjdGlvbiA9IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgUzNTdG9yYWdlQVBJLnRlc3RDb25uZWN0aW9uKGRhdGEsIGNhbGxiYWNrKTtcbn07Il19