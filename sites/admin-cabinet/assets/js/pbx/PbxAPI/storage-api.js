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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvc3RvcmFnZS1hcGkuanMiXSwibmFtZXMiOlsiU3RvcmFnZUFQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50Iiwic2luZ2xldG9uIiwiY3VzdG9tTWV0aG9kcyIsImdldFVzYWdlIiwiZ2V0TGlzdCIsImdldCIsImNhbGxiYWNrIiwiY2FsbEdldCIsImdldFNldHRpbmdzIiwidXBkYXRlIiwiZGF0YSIsImNhbGxQdXQiLCJ1cGRhdGVTZXR0aW5ncyIsInBhdGNoIiwiY2FsbFBhdGNoIiwiY2FsbEN1c3RvbU1ldGhvZCIsImdldFN0b3JhZ2VVc2FnZSIsInJlc3BvbnNlIiwicmVzdWx0IiwiZ2V0U3RvcmFnZUxpc3QiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsVUFBVSxHQUFHLElBQUlDLFlBQUosQ0FBaUI7QUFDaENDLEVBQUFBLFFBQVEsRUFBRSx5QkFEc0I7QUFFaENDLEVBQUFBLFNBQVMsRUFBRSxJQUZxQjtBQUdoQ0MsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFFBQVEsRUFBRSxRQURDO0FBRVhDLElBQUFBLE9BQU8sRUFBRTtBQUZFO0FBSGlCLENBQWpCLENBQW5CO0FBU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQU4sVUFBVSxDQUFDTyxHQUFYLEdBQWlCLFVBQVNDLFFBQVQsRUFBbUI7QUFDaEMsU0FBTyxLQUFLQyxPQUFMLENBQWEsRUFBYixFQUFpQkQsUUFBakIsQ0FBUDtBQUNILENBRkQsQyxDQUlBOzs7QUFDQVIsVUFBVSxDQUFDVSxXQUFYLEdBQXlCVixVQUFVLENBQUNPLEdBQXBDO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQVAsVUFBVSxDQUFDVyxNQUFYLEdBQW9CLFVBQVNDLElBQVQsRUFBZUosUUFBZixFQUF5QjtBQUN6QyxTQUFPLEtBQUtLLE9BQUwsQ0FBYUQsSUFBYixFQUFtQkosUUFBbkIsQ0FBUDtBQUNILENBRkQsQyxDQUlBOzs7QUFDQVIsVUFBVSxDQUFDYyxjQUFYLEdBQTRCZCxVQUFVLENBQUNXLE1BQXZDO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQVgsVUFBVSxDQUFDZSxLQUFYLEdBQW1CLFVBQVNILElBQVQsRUFBZUosUUFBZixFQUF5QjtBQUN4QyxTQUFPLEtBQUtRLFNBQUwsQ0FBZUosSUFBZixFQUFxQkosUUFBckIsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQVIsVUFBVSxDQUFDSyxRQUFYLEdBQXNCLFVBQVNHLFFBQVQsRUFBbUI7QUFDckMsU0FBTyxLQUFLUyxnQkFBTCxDQUFzQixVQUF0QixFQUFrQyxFQUFsQyxFQUFzQ1QsUUFBdEMsQ0FBUDtBQUNILENBRkQsQyxDQUlBOzs7QUFDQVIsVUFBVSxDQUFDa0IsZUFBWCxHQUE2QixVQUFTVixRQUFULEVBQW1CO0FBQzVDLE9BQUtILFFBQUwsQ0FBYyxVQUFDYyxRQUFELEVBQWM7QUFDeEIsUUFBSUEsUUFBUSxDQUFDQyxNQUFiLEVBQXFCO0FBQ2pCWixNQUFBQSxRQUFRLENBQUNXLFFBQVEsQ0FBQ1AsSUFBVixDQUFSO0FBQ0gsS0FGRCxNQUVPO0FBQ0hKLE1BQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSDtBQUNKLEdBTkQ7QUFPSCxDQVJEO0FBVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FSLFVBQVUsQ0FBQ00sT0FBWCxHQUFxQixVQUFTRSxRQUFULEVBQW1CO0FBQ3BDLFNBQU8sS0FBS1MsZ0JBQUwsQ0FBc0IsU0FBdEIsRUFBaUMsRUFBakMsRUFBcUNULFFBQXJDLENBQVA7QUFDSCxDQUZELEMsQ0FJQTs7O0FBQ0FSLFVBQVUsQ0FBQ3FCLGNBQVgsR0FBNEIsVUFBU2IsUUFBVCxFQUFtQjtBQUMzQyxPQUFLRixPQUFMLENBQWEsVUFBQ2EsUUFBRCxFQUFjO0FBQ3ZCLFFBQUlBLFFBQVEsQ0FBQ0MsTUFBYixFQUFxQjtBQUNqQlosTUFBQUEsUUFBUSxDQUFDVyxRQUFRLENBQUNQLElBQVYsQ0FBUjtBQUNILEtBRkQsTUFFTztBQUNISixNQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFDSixHQU5EO0FBT0gsQ0FSRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGlDbGllbnQsICQsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSAqL1xuXG4vKipcbiAqIFN0b3JhZ2VBUEkgLSBSRVNUIEFQSSB2MyBjbGllbnQgZm9yIFN0b3JhZ2UgbWFuYWdlbWVudCAoU2luZ2xldG9uIHJlc291cmNlKVxuICpcbiAqIFByb3ZpZGVzIGEgY2xlYW4gaW50ZXJmYWNlIGZvciBTdG9yYWdlIG9wZXJhdGlvbnMuXG4gKiBTdG9yYWdlIGlzIGEgc2luZ2xldG9uIHJlc291cmNlIC0gdGhlcmUncyBvbmx5IG9uZSBzdG9yYWdlIGNvbmZpZ3VyYXRpb24gaW4gdGhlIHN5c3RlbS5cbiAqXG4gKiBAY2xhc3MgU3RvcmFnZUFQSSBcbiAqL1xuY29uc3QgU3RvcmFnZUFQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL3N0b3JhZ2UnLFxuICAgIHNpbmdsZXRvbjogdHJ1ZSxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIGdldFVzYWdlOiAnOnVzYWdlJyxcbiAgICAgICAgZ2V0TGlzdDogJzpsaXN0J1xuICAgIH1cbn0pO1xuXG4vKipcbiAqIEdldCBTdG9yYWdlIHNldHRpbmdzIChTaW5nbGV0b24gR0VUKVxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICogQGV4YW1wbGVcbiAqIFN0b3JhZ2VBUEkuZ2V0KChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1NldHRpbmdzOicsIHJlc3BvbnNlLmRhdGEpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5TdG9yYWdlQVBJLmdldCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEdldCh7fSwgY2FsbGJhY2spO1xufTtcblxuLy8gQWxpYXMgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcblN0b3JhZ2VBUEkuZ2V0U2V0dGluZ3MgPSBTdG9yYWdlQVBJLmdldDtcblxuLyoqXG4gKiBVcGRhdGUgU3RvcmFnZSBzZXR0aW5ncyAoU2luZ2xldG9uIFBVVClcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFNldHRpbmdzIGRhdGEgdG8gdXBkYXRlXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBTdG9yYWdlQVBJLnVwZGF0ZSh7XG4gKiAgICAgUEJYUmVjb3JkU2F2ZVBlcmlvZDogJzE4MCdcbiAqIH0sIChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1NldHRpbmdzIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cblN0b3JhZ2VBUEkudXBkYXRlID0gZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsUHV0KGRhdGEsIGNhbGxiYWNrKTtcbn07XG5cbi8vIEFsaWFzIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG5TdG9yYWdlQVBJLnVwZGF0ZVNldHRpbmdzID0gU3RvcmFnZUFQSS51cGRhdGU7XG5cbi8qKlxuICogUGFydGlhbGx5IHVwZGF0ZSBTdG9yYWdlIHNldHRpbmdzIChTaW5nbGV0b24gUEFUQ0gpXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTZXR0aW5ncyBkYXRhIHRvIHBhdGNoXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBTdG9yYWdlQVBJLnBhdGNoKHtcbiAqICAgICBQQlhSZWNvcmRTYXZlUGVyaW9kOiAnMzYwJ1xuICogfSwgKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnU2V0dGluZ3MgcGF0Y2hlZCBzdWNjZXNzZnVsbHknKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuU3RvcmFnZUFQSS5wYXRjaCA9IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbFBhdGNoKGRhdGEsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogR2V0IHN0b3JhZ2UgdXNhZ2Ugc3RhdGlzdGljcyAoQ3VzdG9tIG1ldGhvZClcbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBTdG9yYWdlQVBJLmdldFVzYWdlKChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1VzYWdlIHN0YXRpc3RpY3M6JywgcmVzcG9uc2UuZGF0YSk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cblN0b3JhZ2VBUEkuZ2V0VXNhZ2UgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFVzYWdlJywge30sIGNhbGxiYWNrKTtcbn07XG5cbi8vIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgLSB3cmFwIG9sZCBtZXRob2QgdG8gdXNlIG5ldyBBUElcblN0b3JhZ2VBUEkuZ2V0U3RvcmFnZVVzYWdlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICB0aGlzLmdldFVzYWdlKChyZXNwb25zZSkgPT4ge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBHZXQgbGlzdCBvZiBhbGwgc3RvcmFnZSBkZXZpY2VzIChDdXN0b20gbWV0aG9kKVxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICogQGV4YW1wbGVcbiAqIFN0b3JhZ2VBUEkuZ2V0TGlzdCgocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdTdG9yYWdlIGRldmljZXM6JywgcmVzcG9uc2UuZGF0YSk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cblN0b3JhZ2VBUEkuZ2V0TGlzdCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0TGlzdCcsIHt9LCBjYWxsYmFjayk7XG59O1xuXG4vLyBCYWNrd2FyZCBjb21wYXRpYmlsaXR5IC0gd3JhcCBvbGQgbWV0aG9kIHRvIHVzZSBuZXcgQVBJXG5TdG9yYWdlQVBJLmdldFN0b3JhZ2VMaXN0ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICB0aGlzLmdldExpc3QoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICB9XG4gICAgfSk7XG59OyJdfQ==