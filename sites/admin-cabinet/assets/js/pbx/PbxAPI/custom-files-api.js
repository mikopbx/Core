"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

/* global globalRootUrl, PbxApiClient, $ */

/**
 * CustomFilesAPI - RESTful API client for custom files management
 *
 * This module provides methods to interact with the custom files API v3
 * using the centralized PbxApiClient for all HTTP operations.
 *
 * @module customFilesAPI
 */
var customFilesAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/custom-files',
  customMethods: {
    getDefault: ':getDefault'
  }
});
/**
 * Get default values for a new custom file
 *
 * @param {Function} callback - Callback function to handle the response
 *
 * @example
 * customFilesAPI.getDefault((response) => {
 *     if (response.result) {
 *         // Use default values to initialize new file form
 *         initializeForm(response.data);
 *     }
 * });
 */

customFilesAPI.getDefault = function (callback) {
  return this.callCustomMethod('getDefault', {}, callback);
};
/**
 * Save custom file (intelligent create or update)
 * This is a convenience method that determines whether to create or update
 * based on the presence of an ID.
 *
 * @param {Object} data - Custom file data
 * @param {string} [data.id] - File ID (if present, updates; if not, creates)
 * @param {string} data.filepath - File path
 * @param {string} data.content - File content (will be base64 encoded if not already)
 * @param {string} data.mode - File mode
 * @param {string} data.description - File description
 * @param {Function} callback - Callback function to handle the response
 *
 * @example
 * // New file (no ID)
 * customFilesAPI.save({
 *     filepath: '/etc/new.conf',
 *     content: 'data',
 *     mode: 'none'
 * }, callback);
 *
 * // Existing file (with ID)
 * customFilesAPI.save({
 *     id: '123',
 *     filepath: '/etc/existing.conf',
 *     content: 'updated data',
 *     mode: 'override'
 * }, callback);
 */


customFilesAPI.save = function (data, callback) {
  // Prepare data for API
  var apiData = _objectSpread({}, data); // Handle content encoding - check if it's already base64


  if (apiData.content) {
    // Simple check if content is already base64 encoded
    // Base64 strings match the pattern: ^[A-Za-z0-9+/]*={0,2}$
    var isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(apiData.content.replace(/\s/g, ''));

    if (!isBase64) {
      // Encode to base64 if not already encoded
      apiData.content = btoa(apiData.content);
    }
  }

  if (apiData.id && apiData.id !== '') {
    // Update existing file using PATCH for partial update
    var id = apiData.id;
    delete apiData.id;
    delete apiData.isNew;
    this.callPatch(apiData, callback, id);
  } else {
    // Create new file
    delete apiData.id;
    delete apiData.isNew;
    this.callPost(apiData, callback);
  }
};
/**
 * Get a single custom file record by ID
 *
 * @param {string} id - The ID of the custom file to retrieve
 * @param {Function} callback - Callback function to handle the response
 *
 * @example
 * customFilesAPI.getRecord('123', (response) => {
 *     if (response.result) {
 *         console.log('File data:', response.data);
 *     }
 * });
 */


customFilesAPI.getRecord = function (id, callback) {
  return this.callGet({}, callback, id);
};
/**
 * Get all records with optional filtering
 * This method is needed for PbxDataTableIndex compatibility
 */


customFilesAPI.getRecords = function (callback) {
  return this.callGet({}, callback);
};
/**
 * Delete a custom file record
 *
 * @param {string} id - The ID of the custom file to delete
 * @param {Function} callback - Callback function to handle the response
 */


customFilesAPI.deleteRecord = function (id, callback) {
  return this.callDelete(callback, id);
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvY3VzdG9tLWZpbGVzLWFwaS5qcyJdLCJuYW1lcyI6WyJjdXN0b21GaWxlc0FQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImdldERlZmF1bHQiLCJjYWxsYmFjayIsImNhbGxDdXN0b21NZXRob2QiLCJzYXZlIiwiZGF0YSIsImFwaURhdGEiLCJjb250ZW50IiwiaXNCYXNlNjQiLCJ0ZXN0IiwicmVwbGFjZSIsImJ0b2EiLCJpZCIsImlzTmV3IiwiY2FsbFBhdGNoIiwiY2FsbFBvc3QiLCJnZXRSZWNvcmQiLCJjYWxsR2V0IiwiZ2V0UmVjb3JkcyIsImRlbGV0ZVJlY29yZCIsImNhbGxEZWxldGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsY0FBYyxHQUFHLElBQUlDLFlBQUosQ0FBaUI7QUFDcENDLEVBQUFBLFFBQVEsRUFBRSw4QkFEMEI7QUFFcENDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxVQUFVLEVBQUU7QUFERDtBQUZxQixDQUFqQixDQUF2QjtBQU9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBSixjQUFjLENBQUNJLFVBQWYsR0FBNEIsVUFBU0MsUUFBVCxFQUFtQjtBQUMzQyxTQUFPLEtBQUtDLGdCQUFMLENBQXNCLFlBQXRCLEVBQW9DLEVBQXBDLEVBQXdDRCxRQUF4QyxDQUFQO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBTCxjQUFjLENBQUNPLElBQWYsR0FBc0IsVUFBU0MsSUFBVCxFQUFlSCxRQUFmLEVBQXlCO0FBQzNDO0FBQ0EsTUFBTUksT0FBTyxxQkFBUUQsSUFBUixDQUFiLENBRjJDLENBSTNDOzs7QUFDQSxNQUFJQyxPQUFPLENBQUNDLE9BQVosRUFBcUI7QUFDakI7QUFDQTtBQUNBLFFBQU1DLFFBQVEsR0FBRyx5QkFBeUJDLElBQXpCLENBQThCSCxPQUFPLENBQUNDLE9BQVIsQ0FBZ0JHLE9BQWhCLENBQXdCLEtBQXhCLEVBQStCLEVBQS9CLENBQTlCLENBQWpCOztBQUNBLFFBQUksQ0FBQ0YsUUFBTCxFQUFlO0FBQ1g7QUFDQUYsTUFBQUEsT0FBTyxDQUFDQyxPQUFSLEdBQWtCSSxJQUFJLENBQUNMLE9BQU8sQ0FBQ0MsT0FBVCxDQUF0QjtBQUNIO0FBQ0o7O0FBRUQsTUFBSUQsT0FBTyxDQUFDTSxFQUFSLElBQWNOLE9BQU8sQ0FBQ00sRUFBUixLQUFlLEVBQWpDLEVBQXFDO0FBQ2pDO0FBQ0EsUUFBTUEsRUFBRSxHQUFHTixPQUFPLENBQUNNLEVBQW5CO0FBQ0EsV0FBT04sT0FBTyxDQUFDTSxFQUFmO0FBQ0EsV0FBT04sT0FBTyxDQUFDTyxLQUFmO0FBRUEsU0FBS0MsU0FBTCxDQUFlUixPQUFmLEVBQXdCSixRQUF4QixFQUFrQ1UsRUFBbEM7QUFDSCxHQVBELE1BT087QUFDSDtBQUNBLFdBQU9OLE9BQU8sQ0FBQ00sRUFBZjtBQUNBLFdBQU9OLE9BQU8sQ0FBQ08sS0FBZjtBQUVBLFNBQUtFLFFBQUwsQ0FBY1QsT0FBZCxFQUF1QkosUUFBdkI7QUFDSDtBQUNKLENBN0JEO0FBK0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQUwsY0FBYyxDQUFDbUIsU0FBZixHQUEyQixVQUFTSixFQUFULEVBQWFWLFFBQWIsRUFBdUI7QUFDOUMsU0FBTyxLQUFLZSxPQUFMLENBQWEsRUFBYixFQUFpQmYsUUFBakIsRUFBMkJVLEVBQTNCLENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBO0FBQ0E7OztBQUNBZixjQUFjLENBQUNxQixVQUFmLEdBQTRCLFVBQVNoQixRQUFULEVBQW1CO0FBQzNDLFNBQU8sS0FBS2UsT0FBTCxDQUFhLEVBQWIsRUFBaUJmLFFBQWpCLENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQUwsY0FBYyxDQUFDc0IsWUFBZixHQUE4QixVQUFTUCxFQUFULEVBQWFWLFFBQWIsRUFBdUI7QUFDakQsU0FBTyxLQUFLa0IsVUFBTCxDQUFnQmxCLFFBQWhCLEVBQTBCVSxFQUExQixDQUFQO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBQYnhBcGlDbGllbnQsICQgKi8gXG5cbi8qKlxuICogQ3VzdG9tRmlsZXNBUEkgLSBSRVNUZnVsIEFQSSBjbGllbnQgZm9yIGN1c3RvbSBmaWxlcyBtYW5hZ2VtZW50XG4gKlxuICogVGhpcyBtb2R1bGUgcHJvdmlkZXMgbWV0aG9kcyB0byBpbnRlcmFjdCB3aXRoIHRoZSBjdXN0b20gZmlsZXMgQVBJIHYzXG4gKiB1c2luZyB0aGUgY2VudHJhbGl6ZWQgUGJ4QXBpQ2xpZW50IGZvciBhbGwgSFRUUCBvcGVyYXRpb25zLlxuICpcbiAqIEBtb2R1bGUgY3VzdG9tRmlsZXNBUElcbiAqL1xuY29uc3QgY3VzdG9tRmlsZXNBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9jdXN0b20tZmlsZXMnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0RGVmYXVsdDogJzpnZXREZWZhdWx0J1xuICAgIH1cbn0pO1xuXG4vKipcbiAqIEdldCBkZWZhdWx0IHZhbHVlcyBmb3IgYSBuZXcgY3VzdG9tIGZpbGVcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqXG4gKiBAZXhhbXBsZVxuICogY3VzdG9tRmlsZXNBUEkuZ2V0RGVmYXVsdCgocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIC8vIFVzZSBkZWZhdWx0IHZhbHVlcyB0byBpbml0aWFsaXplIG5ldyBmaWxlIGZvcm1cbiAqICAgICAgICAgaW5pdGlhbGl6ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cbmN1c3RvbUZpbGVzQVBJLmdldERlZmF1bHQgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldERlZmF1bHQnLCB7fSwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBTYXZlIGN1c3RvbSBmaWxlIChpbnRlbGxpZ2VudCBjcmVhdGUgb3IgdXBkYXRlKVxuICogVGhpcyBpcyBhIGNvbnZlbmllbmNlIG1ldGhvZCB0aGF0IGRldGVybWluZXMgd2hldGhlciB0byBjcmVhdGUgb3IgdXBkYXRlXG4gKiBiYXNlZCBvbiB0aGUgcHJlc2VuY2Ugb2YgYW4gSUQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBDdXN0b20gZmlsZSBkYXRhXG4gKiBAcGFyYW0ge3N0cmluZ30gW2RhdGEuaWRdIC0gRmlsZSBJRCAoaWYgcHJlc2VudCwgdXBkYXRlczsgaWYgbm90LCBjcmVhdGVzKVxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGEuZmlsZXBhdGggLSBGaWxlIHBhdGhcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhLmNvbnRlbnQgLSBGaWxlIGNvbnRlbnQgKHdpbGwgYmUgYmFzZTY0IGVuY29kZWQgaWYgbm90IGFscmVhZHkpXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YS5tb2RlIC0gRmlsZSBtb2RlXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YS5kZXNjcmlwdGlvbiAtIEZpbGUgZGVzY3JpcHRpb25cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICpcbiAqIEBleGFtcGxlXG4gKiAvLyBOZXcgZmlsZSAobm8gSUQpXG4gKiBjdXN0b21GaWxlc0FQSS5zYXZlKHtcbiAqICAgICBmaWxlcGF0aDogJy9ldGMvbmV3LmNvbmYnLFxuICogICAgIGNvbnRlbnQ6ICdkYXRhJyxcbiAqICAgICBtb2RlOiAnbm9uZSdcbiAqIH0sIGNhbGxiYWNrKTtcbiAqXG4gKiAvLyBFeGlzdGluZyBmaWxlICh3aXRoIElEKVxuICogY3VzdG9tRmlsZXNBUEkuc2F2ZSh7XG4gKiAgICAgaWQ6ICcxMjMnLFxuICogICAgIGZpbGVwYXRoOiAnL2V0Yy9leGlzdGluZy5jb25mJyxcbiAqICAgICBjb250ZW50OiAndXBkYXRlZCBkYXRhJyxcbiAqICAgICBtb2RlOiAnb3ZlcnJpZGUnXG4gKiB9LCBjYWxsYmFjayk7XG4gKi9cbmN1c3RvbUZpbGVzQVBJLnNhdmUgPSBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykge1xuICAgIC8vIFByZXBhcmUgZGF0YSBmb3IgQVBJXG4gICAgY29uc3QgYXBpRGF0YSA9IHsgLi4uZGF0YSB9O1xuXG4gICAgLy8gSGFuZGxlIGNvbnRlbnQgZW5jb2RpbmcgLSBjaGVjayBpZiBpdCdzIGFscmVhZHkgYmFzZTY0XG4gICAgaWYgKGFwaURhdGEuY29udGVudCkge1xuICAgICAgICAvLyBTaW1wbGUgY2hlY2sgaWYgY29udGVudCBpcyBhbHJlYWR5IGJhc2U2NCBlbmNvZGVkXG4gICAgICAgIC8vIEJhc2U2NCBzdHJpbmdzIG1hdGNoIHRoZSBwYXR0ZXJuOiBeW0EtWmEtejAtOSsvXSo9ezAsMn0kXG4gICAgICAgIGNvbnN0IGlzQmFzZTY0ID0gL15bQS1aYS16MC05Ky9dKj17MCwyfSQvLnRlc3QoYXBpRGF0YS5jb250ZW50LnJlcGxhY2UoL1xccy9nLCAnJykpO1xuICAgICAgICBpZiAoIWlzQmFzZTY0KSB7XG4gICAgICAgICAgICAvLyBFbmNvZGUgdG8gYmFzZTY0IGlmIG5vdCBhbHJlYWR5IGVuY29kZWRcbiAgICAgICAgICAgIGFwaURhdGEuY29udGVudCA9IGJ0b2EoYXBpRGF0YS5jb250ZW50KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChhcGlEYXRhLmlkICYmIGFwaURhdGEuaWQgIT09ICcnKSB7XG4gICAgICAgIC8vIFVwZGF0ZSBleGlzdGluZyBmaWxlIHVzaW5nIFBBVENIIGZvciBwYXJ0aWFsIHVwZGF0ZVxuICAgICAgICBjb25zdCBpZCA9IGFwaURhdGEuaWQ7XG4gICAgICAgIGRlbGV0ZSBhcGlEYXRhLmlkO1xuICAgICAgICBkZWxldGUgYXBpRGF0YS5pc05ldztcblxuICAgICAgICB0aGlzLmNhbGxQYXRjaChhcGlEYXRhLCBjYWxsYmFjaywgaWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIENyZWF0ZSBuZXcgZmlsZVxuICAgICAgICBkZWxldGUgYXBpRGF0YS5pZDtcbiAgICAgICAgZGVsZXRlIGFwaURhdGEuaXNOZXc7XG5cbiAgICAgICAgdGhpcy5jYWxsUG9zdChhcGlEYXRhLCBjYWxsYmFjayk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBHZXQgYSBzaW5nbGUgY3VzdG9tIGZpbGUgcmVjb3JkIGJ5IElEXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIElEIG9mIHRoZSBjdXN0b20gZmlsZSB0byByZXRyaWV2ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKlxuICogQGV4YW1wbGVcbiAqIGN1c3RvbUZpbGVzQVBJLmdldFJlY29yZCgnMTIzJywgKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnRmlsZSBkYXRhOicsIHJlc3BvbnNlLmRhdGEpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5jdXN0b21GaWxlc0FQSS5nZXRSZWNvcmQgPSBmdW5jdGlvbihpZCwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsR2V0KHt9LCBjYWxsYmFjaywgaWQpO1xufTtcblxuLyoqXG4gKiBHZXQgYWxsIHJlY29yZHMgd2l0aCBvcHRpb25hbCBmaWx0ZXJpbmdcbiAqIFRoaXMgbWV0aG9kIGlzIG5lZWRlZCBmb3IgUGJ4RGF0YVRhYmxlSW5kZXggY29tcGF0aWJpbGl0eVxuICovXG5jdXN0b21GaWxlc0FQSS5nZXRSZWNvcmRzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsR2V0KHt9LCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIERlbGV0ZSBhIGN1c3RvbSBmaWxlIHJlY29yZFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFRoZSBJRCBvZiB0aGUgY3VzdG9tIGZpbGUgdG8gZGVsZXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqL1xuY3VzdG9tRmlsZXNBUEkuZGVsZXRlUmVjb3JkID0gZnVuY3Rpb24oaWQsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbERlbGV0ZShjYWxsYmFjaywgaWQpO1xufTsiXX0=