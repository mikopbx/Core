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
    testConnection: ':testConnection'
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
}; // Backward compatibility - keep old method name


StorageAPI.testS3Connection = function (data, callback) {
  S3StorageAPI.testConnection(data, callback);
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvc3RvcmFnZS1hcGkuanMiXSwibmFtZXMiOlsiU3RvcmFnZUFQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50Iiwic2luZ2xldG9uIiwiY3VzdG9tTWV0aG9kcyIsImdldFVzYWdlIiwiZ2V0TGlzdCIsImdldCIsImNhbGxiYWNrIiwiY2FsbEdldCIsImdldFNldHRpbmdzIiwidXBkYXRlIiwiZGF0YSIsImNhbGxQdXQiLCJ1cGRhdGVTZXR0aW5ncyIsInBhdGNoIiwiY2FsbFBhdGNoIiwiY2FsbEN1c3RvbU1ldGhvZCIsImdldFN0b3JhZ2VVc2FnZSIsInJlc3BvbnNlIiwicmVzdWx0IiwiZ2V0U3RvcmFnZUxpc3QiLCJTM1N0b3JhZ2VBUEkiLCJ0ZXN0Q29ubmVjdGlvbiIsInRlc3RTM0Nvbm5lY3Rpb24iXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsVUFBVSxHQUFHLElBQUlDLFlBQUosQ0FBaUI7QUFDaENDLEVBQUFBLFFBQVEsRUFBRSx5QkFEc0I7QUFFaENDLEVBQUFBLFNBQVMsRUFBRSxJQUZxQjtBQUdoQ0MsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFFBQVEsRUFBRSxRQURDO0FBRVhDLElBQUFBLE9BQU8sRUFBRTtBQUZFO0FBSGlCLENBQWpCLENBQW5CO0FBU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQU4sVUFBVSxDQUFDTyxHQUFYLEdBQWlCLFVBQVNDLFFBQVQsRUFBbUI7QUFDaEMsU0FBTyxLQUFLQyxPQUFMLENBQWEsRUFBYixFQUFpQkQsUUFBakIsQ0FBUDtBQUNILENBRkQsQyxDQUlBOzs7QUFDQVIs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O0FBQ0FjLFlBQVksQ0FBQ1gsTUFBYixHQUFzQixVQUFTQyxJQUFULEVBQWVKLFFBQWYsRUFBeUI7QUFDM0MsU0FBTyxLQUFLSyxPQUFMLENBQWFELElBQWIsRUFBbUJKLFFBQW5CLENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQWMsWUFBWSxDQUFDUCxLQUFiLEdBQXFCLFVBQVNILElBQVQsRUFBZUosUUFBZixFQUF5QjtBQUMxQyxTQUFPLEtBQUtRLFNBQUwsQ0FBZUosSUFBZixFQUFxQkosUUFBckIsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBYyxZQUFZLENBQUNDLGNBQWIsR0FBOEIsVUFBU1gsSUFBVCxFQUFlSixRQUFmLEVBQXlCO0FBQ25ELFNBQU8sS0FBS1MsZ0JBQUwsQ0FBc0IsZ0JBQXRCLEVBQXdDTCxJQUF4QyxFQUE4Q0osUUFBOUMsQ0FBUDtBQUNILENBRkQsQyxDQUlBOzs7QUFDQVIsVUFBVSxDQUFDd0IsZ0JBQVgsR0FBOEIsVUFBU1osSUFBVCxFQUFlSixRQUFmLEVBQXlCO0FBQ25EYyxFQUFBQSxZQUFZLENBQUNDLGNBQWIsQ0FBNEJYLElBQTVCLEVBQWtDSixRQUFsQztBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpQ2xpZW50LCAkLCBnbG9iYWxSb290VXJsLCBQYnhBcGkgKi9cblxuLyoqXG4gKiBTdG9yYWdlQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBTdG9yYWdlIG1hbmFnZW1lbnQgKFNpbmdsZXRvbiByZXNvdXJjZSlcbiAqXG4gKiBQcm92aWRlcyBhIGNsZWFuIGludGVyZmFjZSBmb3IgU3RvcmFnZSBvcGVyYXRpb25zLlxuICogU3RvcmFnZSBpcyBhIHNpbmdsZXRvbiByZXNvdXJjZSAtIHRoZXJlJ3Mgb25seSBvbmUgc3RvcmFnZSBjb25maWd1cmF0aW9uIGluIHRoZSBzeXN0ZW0uXG4gKlxuICogQGNsYXNzIFN0b3JhZ2VBUEkgXG4gKi9cbmNvbnN0IFN0b3JhZ2VBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9zdG9yYWdlJyxcbiAgICBzaW5nbGV0b246IHRydWUsXG4gICAgY3VzdG9tTWV0aG9kczoge1xuICAgICAgICBnZXRVc2FnZTogJzp1c2FnZScsXG4gICAgICAgIGdldExpc3Q6ICc6bGlzdCdcbiAgICB9XG59KTtcblxuLyoqXG4gKiBHZXQgU3RvcmFnZSBzZXR0aW5ncyAoU2luZ2xldG9uIEdFVClcbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBTdG9yYWdlQVBJLmdldCgocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdTZXR0aW5nczonLCByZXNwb25zZS5kYXRhKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuU3RvcmFnZUFQSS5nZXQgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxHZXQoe30sIGNhbGxiYWNrKTtcbn07XG5cbi8vIEFsaWFzIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG5TdG9yYWdlQVBJLmdldFNldHRpbmdzID0gU3RvcmFnZUFQSS5nZXQ7XG5cbi8qKlxuICogVXBkYXRlIFN0b3JhZ2Ugc2V0dGluZ3MgKFNpbmdsZXRvbiBQVVQpXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTZXR0aW5ncyBkYXRhIHRvIHVwZGF0ZVxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogU3RvcmFnZUFQSS51cGRhdGUoe1xuICogICAgIFBCWFJlY29yZFNhdmVQZXJpb2Q6ICcxODAnXG4gKiB9LCAocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdTZXR0aW5ncyB1cGRhdGVkIHN1Y2Nlc3NmdWxseScpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5TdG9yYWdlQVBJLnVwZGF0ZSA9IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbFB1dChkYXRhLCBjYWxsYmFjayk7XG59O1xuXG4vLyBBbGlhcyBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuU3RvcmFnZUFQSS51cGRhdGVTZXR0aW5ncyA9IFN0b3JhZ2VBUEkudXBkYXRlO1xuXG4vKipcbiAqIFBhcnRpYWxseSB1cGRhdGUgU3RvcmFnZSBzZXR0aW5ncyAoU2luZ2xldG9uIFBBVENIKVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gU2V0dGluZ3MgZGF0YSB0byBwYXRjaFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogU3RvcmFnZUFQSS5wYXRjaCh7XG4gKiAgICAgUEJYUmVjb3JkU2F2ZVBlcmlvZDogJzM2MCdcbiAqIH0sIChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1NldHRpbmdzIHBhdGNoZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cblN0b3JhZ2VBUEkucGF0Y2ggPSBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxQYXRjaChkYXRhLCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIEdldCBzdG9yYWdlIHVzYWdlIHN0YXRpc3RpY3MgKEN1c3RvbSBtZXRob2QpXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogU3RvcmFnZUFQSS5nZXRVc2FnZSgocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdVc2FnZSBzdGF0aXN0aWNzOicsIHJlc3BvbnNlLmRhdGEpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5TdG9yYWdlQVBJLmdldFVzYWdlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRVc2FnZScsIHt9LCBjYWxsYmFjayk7XG59O1xuXG4vLyBCYWNrd2FyZCBjb21wYXRpYmlsaXR5IC0gd3JhcCBvbGQgbWV0aG9kIHRvIHVzZSBuZXcgQVBJXG5TdG9yYWdlQVBJLmdldFN0b3JhZ2VVc2FnZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5nZXRVc2FnZSgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogR2V0IGxpc3Qgb2YgYWxsIHN0b3JhZ2UgZGV2aWNlcyAoQ3VzdG9tIG1ldGhvZClcbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBTdG9yYWdlQVBJLmdldExpc3QoKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnU3RvcmFnZSBkZXZpY2VzOicsIHJlc3BvbnNlLmRhdGEpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5TdG9yYWdlQVBJLmdldExpc3QgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldExpc3QnLCB7fSwgY2FsbGJhY2spO1xufTtcblxuLy8gQmFja3dhcmQgY29tcGF0aWJpbGl0eSAtIHdyYXAgb2xkIG1ldGhvZCB0byB1c2UgbmV3IEFQSVxuU3RvcmFnZUFQSS5nZXRTdG9yYWdlTGlzdCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5nZXRMaXN0KChyZXNwb25zZSkgPT4ge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBUZXN0IFMzIGNvbm5lY3Rpb24gd2l0aCBwcm92aWRlZCBjcmVkZW50aWFsc1xuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUzMgY29ubmVjdGlvbiBzZXR0aW5ncyB0byB0ZXN0XG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YS5zM19lbmRwb2ludCAtIFMzIGVuZHBvaW50IFVSTFxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGEuczNfcmVnaW9uIC0gUzMgcmVnaW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YS5zM19idWNrZXQgLSBTMyBidWNrZXQgbmFtZVxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGEuczNfYWNjZXNzX2tleSAtIFMzIGFjY2VzcyBrZXlcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhLnMzX3NlY3JldF9rZXkgLSBTMyBzZWNyZXQga2V5XG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBTdG9yYWdlQVBJLnRlc3RTM0Nvbm5lY3Rpb24oe1xuICogICAgIHMzX2VuZHBvaW50OiAnaHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tJyxcbiAqICAgICBzM19yZWdpb246ICd1cy1lYXN0LTEnLFxuICogICAgIHMzX2J1Y2tldDogJ215LWJ1Y2tldCcsXG4gKiAgICAgczNfYWNjZXNzX2tleTogJ0FLSUFJT1NGT0ROTjdFWEFNUExFJyxcbiAqICAgICBzM19zZWNyZXRfa2V5OiAnd0phbHJYVXRuRkVNSS9LN01ERU5HL2JQeFJmaUNZRVhBTVBMRUtFWSdcbiAqIH0sIChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ0Nvbm5lY3Rpb24gdGVzdDonLCByZXNwb25zZS5kYXRhLm1lc3NhZ2UpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG4vKipcbiAqIFMzU3RvcmFnZUFQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgUzMgU3RvcmFnZSBtYW5hZ2VtZW50IChTaW5nbGV0b24gcmVzb3VyY2UpXG4gKlxuICogUHJvdmlkZXMgaW50ZXJmYWNlIGZvciBTMy1jb21wYXRpYmxlIGNsb3VkIHN0b3JhZ2Ugb3BlcmF0aW9ucy5cbiAqIFMzIFN0b3JhZ2UgaXMgYSBzaW5nbGV0b24gcmVzb3VyY2UgLSB0aGVyZSdzIG9ubHkgb25lIFMzIGNvbmZpZ3VyYXRpb24gaW4gdGhlIHN5c3RlbS5cbiAqXG4gKiBAY2xhc3MgUzNTdG9yYWdlQVBJXG4gKi9cbmNvbnN0IFMzU3RvcmFnZUFQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL3MzLXN0b3JhZ2UnLFxuICAgIHNpbmdsZXRvbjogdHJ1ZSxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIHRlc3RDb25uZWN0aW9uOiAnOnRlc3RDb25uZWN0aW9uJ1xuICAgIH1cbn0pO1xuXG4vKipcbiAqIEdldCBTMyBTdG9yYWdlIHNldHRpbmdzIChTaW5nbGV0b24gR0VUKVxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICovXG5TM1N0b3JhZ2VBUEkuZ2V0ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsR2V0KHt9LCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSBTMyBTdG9yYWdlIHNldHRpbmdzIChTaW5nbGV0b24gUFVUKVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUzMgc2V0dGluZ3MgZGF0YSB0byB1cGRhdGVcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICovXG5TM1N0b3JhZ2VBUEkudXBkYXRlID0gZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsUHV0KGRhdGEsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogUGFydGlhbGx5IHVwZGF0ZSBTMyBTdG9yYWdlIHNldHRpbmdzIChTaW5nbGV0b24gUEFUQ0gpXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTMyBzZXR0aW5ncyBkYXRhIHRvIHBhdGNoXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqL1xuUzNTdG9yYWdlQVBJLnBhdGNoID0gZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsUGF0Y2goZGF0YSwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBUZXN0IFMzIGNvbm5lY3Rpb24gd2l0aCBwcm92aWRlZCBjcmVkZW50aWFscyAoQ3VzdG9tIG1ldGhvZClcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFMzIGNvbm5lY3Rpb24gc2V0dGluZ3MgdG8gdGVzdFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKi9cblMzU3RvcmFnZUFQSS50ZXN0Q29ubmVjdGlvbiA9IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgndGVzdENvbm5lY3Rpb24nLCBkYXRhLCBjYWxsYmFjayk7XG59O1xuXG4vLyBCYWNrd2FyZCBjb21wYXRpYmlsaXR5IC0ga2VlcCBvbGQgbWV0aG9kIG5hbWVcblN0b3JhZ2VBUEkudGVzdFMzQ29ubmVjdGlvbiA9IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgUzNTdG9yYWdlQVBJLnRlc3RDb25uZWN0aW9uKGRhdGEsIGNhbGxiYWNrKTtcbn07Il19