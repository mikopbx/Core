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
    getList: ':list',
    getIoBenchmark: ':ioBenchmark',
    runIoBenchmark: ':runIoBenchmark'
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
 * Get cached disk I/O benchmark result (Custom method).
 *
 * Returns the last measured sequential write/read speeds, or
 * response.data === null when no measurement has been run yet.
 *
 * @param {function} callback - Callback function to handle the response
 */


StorageAPI.getIoBenchmark = function (callback) {
  return this.callCustomMethod('getIoBenchmark', {}, callback);
};
/**
 * Run a fresh disk I/O benchmark (Custom method).
 *
 * Blocking on the server side (~5–30 s) — caller should keep a UI
 * indicator visible until the response arrives. Result is cached on
 * the server, so subsequent getIoBenchmark() calls return it instantly.
 *
 * @param {function} callback - Callback function to handle the response
 */


StorageAPI.runIoBenchmark = function (callback) {
  return this.callCustomMethod('runIoBenchmark', {}, callback, 'POST');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvc3RvcmFnZS1hcGkuanMiXSwibmFtZXMiOlsiU3RvcmFnZUFQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50Iiwic2luZ2xldG9uIiwiY3VzdG9tTWV0aG9kcyIsImdldFVzYWdlIiwiZ2V0TGlzdCIsImdldElvQmVuY2htYXJrIiwicnVuSW9CZW5jaG1hcmsiLCJnZXQiLCJjYWxsYmFjayIsImNhbGxHZXQiLCJnZXRTZXR0aW5ncyIsInVwZGF0ZSIsImRhdGEiLCJjYWxsUHV0IiwidXBkYXRlU2V0dGluZ3MiLCJwYXRjaCIsImNhbGxQYXRjaCIsImNhbGxDdXN0b21NZXRob2QiLCJnZXRTdG9yYWdlVXNhZ2UiLCJyZXNwb25zZSIsInJlc3VsdCIsImdldFN0b3JhZ2VMaXN0IiwiUzNTdG9yYWdlQVBJIiwidGVzdENvbm5lY3Rpb24iLCJzdGF0cyIsImdldFN0YXRzIiwidGVzdFMzQ29ubmVjdGlvbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxVQUFVLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUNoQ0MsRUFBQUEsUUFBUSxFQUFFLHlCQURzQjtBQUVoQ0MsRUFBQUEsU0FBUyxFQUFFLElBRnFCO0FBR2hDQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsUUFBUSxFQUFFLFFBREM7QUFFWEMsSUFBQUEsT0FBTyxFQUFFLE9BRkU7QUFHWEMsSUFBQUEsY0FBYyxFQUFFLGNBSEw7QUFJWEMsSUFBQUEsY0FBYyxFQUFFO0FBSkw7QUFIaUIsQ0FBakIsQ0FBbkI7QUFXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBUixVQUFVLENB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QUFQO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQWMsWUFBWSxDQUFDRyxRQUFiLEdBQXdCLFVBQVNqQixRQUFULEVBQW1CO0FBQ3ZDLFNBQU8sS0FBS1MsZ0JBQUwsQ0FBc0IsT0FBdEIsRUFBK0IsRUFBL0IsRUFBbUNULFFBQW5DLENBQVA7QUFDSCxDQUZELEMsQ0FJQTs7O0FBQ0FWLFVBQVUsQ0FBQzRCLGdCQUFYLEdBQThCLFVBQVNkLElBQVQsRUFBZUosUUFBZixFQUF5QjtBQUNuRGMsRUFBQUEsWUFBWSxDQUFDQyxjQUFiLENBQTRCWCxJQUE1QixFQUFrQ0osUUFBbEM7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaUNsaWVudCwgJCwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpICovXG5cbi8qKlxuICogU3RvcmFnZUFQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgU3RvcmFnZSBtYW5hZ2VtZW50IChTaW5nbGV0b24gcmVzb3VyY2UpXG4gKlxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIFN0b3JhZ2Ugb3BlcmF0aW9ucy5cbiAqIFN0b3JhZ2UgaXMgYSBzaW5nbGV0b24gcmVzb3VyY2UgLSB0aGVyZSdzIG9ubHkgb25lIHN0b3JhZ2UgY29uZmlndXJhdGlvbiBpbiB0aGUgc3lzdGVtLlxuICpcbiAqIEBjbGFzcyBTdG9yYWdlQVBJIFxuICovXG5jb25zdCBTdG9yYWdlQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvc3RvcmFnZScsXG4gICAgc2luZ2xldG9uOiB0cnVlLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0VXNhZ2U6ICc6dXNhZ2UnLFxuICAgICAgICBnZXRMaXN0OiAnOmxpc3QnLFxuICAgICAgICBnZXRJb0JlbmNobWFyazogJzppb0JlbmNobWFyaycsXG4gICAgICAgIHJ1bklvQmVuY2htYXJrOiAnOnJ1bklvQmVuY2htYXJrJ1xuICAgIH1cbn0pO1xuXG4vKipcbiAqIEdldCBTdG9yYWdlIHNldHRpbmdzIChTaW5nbGV0b24gR0VUKVxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICogQGV4YW1wbGVcbiAqIFN0b3JhZ2VBUEkuZ2V0KChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1NldHRpbmdzOicsIHJlc3BvbnNlLmRhdGEpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5TdG9yYWdlQVBJLmdldCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEdldCh7fSwgY2FsbGJhY2spO1xufTtcblxuLy8gQWxpYXMgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcblN0b3JhZ2VBUEkuZ2V0U2V0dGluZ3MgPSBTdG9yYWdlQVBJLmdldDtcblxuLyoqXG4gKiBVcGRhdGUgU3RvcmFnZSBzZXR0aW5ncyAoU2luZ2xldG9uIFBVVClcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFNldHRpbmdzIGRhdGEgdG8gdXBkYXRlXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBTdG9yYWdlQVBJLnVwZGF0ZSh7XG4gKiAgICAgUEJYUmVjb3JkU2F2ZVBlcmlvZDogJzE4MCdcbiAqIH0sIChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1NldHRpbmdzIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cblN0b3JhZ2VBUEkudXBkYXRlID0gZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsUHV0KGRhdGEsIGNhbGxiYWNrKTtcbn07XG5cbi8vIEFsaWFzIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG5TdG9yYWdlQVBJLnVwZGF0ZVNldHRpbmdzID0gU3RvcmFnZUFQSS51cGRhdGU7XG5cbi8qKlxuICogUGFydGlhbGx5IHVwZGF0ZSBTdG9yYWdlIHNldHRpbmdzIChTaW5nbGV0b24gUEFUQ0gpXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTZXR0aW5ncyBkYXRhIHRvIHBhdGNoXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBTdG9yYWdlQVBJLnBhdGNoKHtcbiAqICAgICBQQlhSZWNvcmRTYXZlUGVyaW9kOiAnMzYwJ1xuICogfSwgKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnU2V0dGluZ3MgcGF0Y2hlZCBzdWNjZXNzZnVsbHknKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuU3RvcmFnZUFQSS5wYXRjaCA9IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbFBhdGNoKGRhdGEsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogR2V0IHN0b3JhZ2UgdXNhZ2Ugc3RhdGlzdGljcyAoQ3VzdG9tIG1ldGhvZClcbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBTdG9yYWdlQVBJLmdldFVzYWdlKChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1VzYWdlIHN0YXRpc3RpY3M6JywgcmVzcG9uc2UuZGF0YSk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cblN0b3JhZ2VBUEkuZ2V0VXNhZ2UgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFVzYWdlJywge30sIGNhbGxiYWNrKTtcbn07XG5cbi8vIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgLSB3cmFwIG9sZCBtZXRob2QgdG8gdXNlIG5ldyBBUElcblN0b3JhZ2VBUEkuZ2V0U3RvcmFnZVVzYWdlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICB0aGlzLmdldFVzYWdlKChyZXNwb25zZSkgPT4ge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBHZXQgbGlzdCBvZiBhbGwgc3RvcmFnZSBkZXZpY2VzIChDdXN0b20gbWV0aG9kKVxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICogQGV4YW1wbGVcbiAqIFN0b3JhZ2VBUEkuZ2V0TGlzdCgocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdTdG9yYWdlIGRldmljZXM6JywgcmVzcG9uc2UuZGF0YSk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cblN0b3JhZ2VBUEkuZ2V0TGlzdCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0TGlzdCcsIHt9LCBjYWxsYmFjayk7XG59O1xuXG4vLyBCYWNrd2FyZCBjb21wYXRpYmlsaXR5IC0gd3JhcCBvbGQgbWV0aG9kIHRvIHVzZSBuZXcgQVBJXG5TdG9yYWdlQVBJLmdldFN0b3JhZ2VMaXN0ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICB0aGlzLmdldExpc3QoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEdldCBjYWNoZWQgZGlzayBJL08gYmVuY2htYXJrIHJlc3VsdCAoQ3VzdG9tIG1ldGhvZCkuXG4gKlxuICogUmV0dXJucyB0aGUgbGFzdCBtZWFzdXJlZCBzZXF1ZW50aWFsIHdyaXRlL3JlYWQgc3BlZWRzLCBvclxuICogcmVzcG9uc2UuZGF0YSA9PT0gbnVsbCB3aGVuIG5vIG1lYXN1cmVtZW50IGhhcyBiZWVuIHJ1biB5ZXQuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKi9cblN0b3JhZ2VBUEkuZ2V0SW9CZW5jaG1hcmsgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldElvQmVuY2htYXJrJywge30sIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogUnVuIGEgZnJlc2ggZGlzayBJL08gYmVuY2htYXJrIChDdXN0b20gbWV0aG9kKS5cbiAqXG4gKiBCbG9ja2luZyBvbiB0aGUgc2VydmVyIHNpZGUgKH414oCTMzAgcykg4oCUIGNhbGxlciBzaG91bGQga2VlcCBhIFVJXG4gKiBpbmRpY2F0b3IgdmlzaWJsZSB1bnRpbCB0aGUgcmVzcG9uc2UgYXJyaXZlcy4gUmVzdWx0IGlzIGNhY2hlZCBvblxuICogdGhlIHNlcnZlciwgc28gc3Vic2VxdWVudCBnZXRJb0JlbmNobWFyaygpIGNhbGxzIHJldHVybiBpdCBpbnN0YW50bHkuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKi9cblN0b3JhZ2VBUEkucnVuSW9CZW5jaG1hcmsgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ3J1bklvQmVuY2htYXJrJywge30sIGNhbGxiYWNrLCAnUE9TVCcpO1xufTtcblxuLyoqXG4gKiBUZXN0IFMzIGNvbm5lY3Rpb24gd2l0aCBwcm92aWRlZCBjcmVkZW50aWFsc1xuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUzMgY29ubmVjdGlvbiBzZXR0aW5ncyB0byB0ZXN0XG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YS5zM19lbmRwb2ludCAtIFMzIGVuZHBvaW50IFVSTFxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGEuczNfcmVnaW9uIC0gUzMgcmVnaW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YS5zM19idWNrZXQgLSBTMyBidWNrZXQgbmFtZVxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGEuczNfYWNjZXNzX2tleSAtIFMzIGFjY2VzcyBrZXlcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhLnMzX3NlY3JldF9rZXkgLSBTMyBzZWNyZXQga2V5XG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBTdG9yYWdlQVBJLnRlc3RTM0Nvbm5lY3Rpb24oe1xuICogICAgIHMzX2VuZHBvaW50OiAnaHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tJyxcbiAqICAgICBzM19yZWdpb246ICd1cy1lYXN0LTEnLFxuICogICAgIHMzX2J1Y2tldDogJ215LWJ1Y2tldCcsXG4gKiAgICAgczNfYWNjZXNzX2tleTogJ0FLSUFJT1NGT0ROTjdFWEFNUExFJyxcbiAqICAgICBzM19zZWNyZXRfa2V5OiAnd0phbHJYVXRuRkVNSS9LN01ERU5HL2JQeFJmaUNZRVhBTVBMRUtFWSdcbiAqIH0sIChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ0Nvbm5lY3Rpb24gdGVzdDonLCByZXNwb25zZS5kYXRhLm1lc3NhZ2UpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG4vKipcbiAqIFMzU3RvcmFnZUFQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgUzMgU3RvcmFnZSBtYW5hZ2VtZW50IChTaW5nbGV0b24gcmVzb3VyY2UpXG4gKlxuICogUHJvdmlkZXMgaW50ZXJmYWNlIGZvciBTMy1jb21wYXRpYmxlIGNsb3VkIHN0b3JhZ2Ugb3BlcmF0aW9ucy5cbiAqIFMzIFN0b3JhZ2UgaXMgYSBzaW5nbGV0b24gcmVzb3VyY2UgLSB0aGVyZSdzIG9ubHkgb25lIFMzIGNvbmZpZ3VyYXRpb24gaW4gdGhlIHN5c3RlbS5cbiAqXG4gKiBAY2xhc3MgUzNTdG9yYWdlQVBJXG4gKi9cbmNvbnN0IFMzU3RvcmFnZUFQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL3MzLXN0b3JhZ2UnLFxuICAgIHNpbmdsZXRvbjogdHJ1ZSxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIHRlc3RDb25uZWN0aW9uOiAnOnRlc3RDb25uZWN0aW9uJyxcbiAgICAgICAgc3RhdHM6ICc6c3RhdHMnXG4gICAgfVxufSk7XG5cbi8qKlxuICogR2V0IFMzIFN0b3JhZ2Ugc2V0dGluZ3MgKFNpbmdsZXRvbiBHRVQpXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKi9cblMzU3RvcmFnZUFQSS5nZXQgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxHZXQoe30sIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogVXBkYXRlIFMzIFN0b3JhZ2Ugc2V0dGluZ3MgKFNpbmdsZXRvbiBQVVQpXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTMyBzZXR0aW5ncyBkYXRhIHRvIHVwZGF0ZVxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKi9cblMzU3RvcmFnZUFQSS51cGRhdGUgPSBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxQdXQoZGF0YSwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBQYXJ0aWFsbHkgdXBkYXRlIFMzIFN0b3JhZ2Ugc2V0dGluZ3MgKFNpbmdsZXRvbiBQQVRDSClcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFMzIHNldHRpbmdzIGRhdGEgdG8gcGF0Y2hcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICovXG5TM1N0b3JhZ2VBUEkucGF0Y2ggPSBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxQYXRjaChkYXRhLCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIFRlc3QgUzMgY29ubmVjdGlvbiB3aXRoIHByb3ZpZGVkIGNyZWRlbnRpYWxzIChDdXN0b20gbWV0aG9kKVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUzMgY29ubmVjdGlvbiBzZXR0aW5ncyB0byB0ZXN0XG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqL1xuUzNTdG9yYWdlQVBJLnRlc3RDb25uZWN0aW9uID0gZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCd0ZXN0Q29ubmVjdGlvbicsIGRhdGEsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogR2V0IFMzIHN5bmNocm9uaXphdGlvbiBzdGF0aXN0aWNzIChDdXN0b20gbWV0aG9kKVxuICpcbiAqIFJldHVybnMgZGV0YWlsZWQgc3RhdGlzdGljcyBhYm91dCBTMyBzdG9yYWdlIHN5bmNocm9uaXphdGlvbiBpbmNsdWRpbmc6XG4gKiAtIE51bWJlciBvZiBmaWxlcyBpbiBTMyBhbmQgbG9jYWxseVxuICogLSBUb3RhbCBzaXplIGluIFMzIGFuZCBwZW5kaW5nIHVwbG9hZFxuICogLSBTeW5jIHBlcmNlbnRhZ2UgYW5kIHN0YXR1cyAoc3luY2VkL3N5bmNpbmcvcGVuZGluZy9kaXNhYmxlZClcbiAqIC0gTGFzdCB1cGxvYWQgdGltZXN0YW1wIGFuZCBvbGRlc3QgcGVuZGluZyBmaWxlIGRhdGVcbiAqIC0gUzMgY29ubmVjdGlvbiBzdGF0dXNcbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBTM1N0b3JhZ2VBUEkuZ2V0U3RhdHMoKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnUzMgU3RhdHM6JywgcmVzcG9uc2UuZGF0YSk7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdTeW5jICU6JywgcmVzcG9uc2UuZGF0YS5zeW5jX3BlcmNlbnRhZ2UpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5TM1N0b3JhZ2VBUEkuZ2V0U3RhdHMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ3N0YXRzJywge30sIGNhbGxiYWNrKTtcbn07XG5cbi8vIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgLSBrZWVwIG9sZCBtZXRob2QgbmFtZVxuU3RvcmFnZUFQSS50ZXN0UzNDb25uZWN0aW9uID0gZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICBTM1N0b3JhZ2VBUEkudGVzdENvbm5lY3Rpb24oZGF0YSwgY2FsbGJhY2spO1xufTsiXX0=