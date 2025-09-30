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
}); // Use customFilesAPI.getRecord('new', callback) for default values

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

/**
 * Encode UTF-8 string to base64
 * Handles Unicode characters (Russian, Chinese, etc.)
 *
 * @param {string} str - UTF-8 string to encode
 * @returns {string} Base64 encoded string
 */

customFilesAPI.utf8ToBase64 = function (str) {
  // Use TextEncoder for modern browsers (better than deprecated escape/unescape)
  if (typeof TextEncoder !== 'undefined') {
    var utf8Bytes = new TextEncoder().encode(str);
    var binaryString = '';
    utf8Bytes.forEach(function (byte) {
      binaryString += String.fromCharCode(byte);
    });
    return btoa(binaryString);
  } else {
    // Fallback for older browsers
    return btoa(unescape(encodeURIComponent(str)));
  }
};

customFilesAPI.save = function (data, callback) {
  // Prepare data for API
  var apiData = _objectSpread({}, data); // Handle content encoding
  // Content from cbBeforeSendForm is always plain text from Ace editor,
  // so we always need to encode it to base64 with UTF-8 support


  if (apiData.content && apiData.content !== '') {
    // Encode to base64 with UTF-8 support (handles Russian, Chinese, etc.)
    apiData.content = customFilesAPI.utf8ToBase64(apiData.content);
  }

  if (apiData.id && apiData.id !== '') {
    // Update existing file using PATCH for partial update
    // IMPORTANT: Keep id in data for PATCH request (server expects it in request body)
    delete apiData.isNew;
    this.callPatch(apiData, callback);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvY3VzdG9tLWZpbGVzLWFwaS5qcyJdLCJuYW1lcyI6WyJjdXN0b21GaWxlc0FQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImdldERlZmF1bHQiLCJ1dGY4VG9CYXNlNjQiLCJzdHIiLCJUZXh0RW5jb2RlciIsInV0ZjhCeXRlcyIsImVuY29kZSIsImJpbmFyeVN0cmluZyIsImZvckVhY2giLCJieXRlIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwiYnRvYSIsInVuZXNjYXBlIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwic2F2ZSIsImRhdGEiLCJjYWxsYmFjayIsImFwaURhdGEiLCJjb250ZW50IiwiaWQiLCJpc05ldyIsImNhbGxQYXRjaCIsImNhbGxQb3N0IiwiZ2V0UmVjb3JkIiwiY2FsbEdldCIsImdldFJlY29yZHMiLCJkZWxldGVSZWNvcmQiLCJjYWxsRGVsZXRlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGNBQWMsR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQ3BDQyxFQUFBQSxRQUFRLEVBQUUsOEJBRDBCO0FBRXBDQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsVUFBVSxFQUFFO0FBREQ7QUFGcUIsQ0FBakIsQ0FBdkIsQyxDQU9BOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FKLGNBQWMsQ0FBQ0ssWUFBZixHQUE4QixVQUFTQyxHQUFULEVBQWM7QUFDeEM7QUFDQSxNQUFJLE9BQU9DLFdBQVAsS0FBdUIsV0FBM0IsRUFBd0M7QUFDcEMsUUFBTUMsU0FBUyxHQUFHLElBQUlELFdBQUosR0FBa0JFLE1BQWxCLENBQXlCSCxHQUF6QixDQUFsQjtBQUNBLFFBQUlJLFlBQVksR0FBRyxFQUFuQjtBQUNBRixJQUFBQSxTQUFTLENBQUNHLE9BQVYsQ0FBa0IsVUFBQUMsSUFBSSxFQUFJO0FBQ3RCRixNQUFBQSxZQUFZLElBQUlHLE1BQU0sQ0FBQ0MsWUFBUCxDQUFvQkYsSUFBcEIsQ0FBaEI7QUFDSCxLQUZEO0FBR0EsV0FBT0csSUFBSSxDQUFDTCxZQUFELENBQVg7QUFDSCxHQVBELE1BT087QUFDSDtBQUNBLFdBQU9LLElBQUksQ0FBQ0MsUUFBUSxDQUFDQyxrQkFBa0IsQ0FBQ1gsR0FBRCxDQUFuQixDQUFULENBQVg7QUFDSDtBQUNKLENBYkQ7O0FBZUFOLGNBQWMsQ0FBQ2tCLElBQWYsR0FBc0IsVUFBU0MsSUFBVCxFQUFlQyxRQUFmLEVBQXlCO0FBQzNDO0FBQ0EsTUFBTUMsT0FBTyxxQkFBUUYsSUFBUixDQUFiLENBRjJDLENBSTNDO0FBQ0E7QUFDQTs7O0FBQ0EsTUFBSUUsT0FBTyxDQUFDQyxPQUFSLElBQW1CRCxPQUFPLENBQUNDLE9BQVIsS0FBb0IsRUFBM0MsRUFBK0M7QUFDM0M7QUFDQUQsSUFBQUEsT0FBTyxDQUFDQyxPQUFSLEdBQWtCdEIsY0FBYyxDQUFDSyxZQUFmLENBQTRCZ0IsT0FBTyxDQUFDQyxPQUFwQyxDQUFsQjtBQUNIOztBQUVELE1BQUlELE9BQU8sQ0FBQ0UsRUFBUixJQUFjRixPQUFPLENBQUNFLEVBQVIsS0FBZSxFQUFqQyxFQUFxQztBQUNqQztBQUNBO0FBQ0EsV0FBT0YsT0FBTyxDQUFDRyxLQUFmO0FBRUEsU0FBS0MsU0FBTCxDQUFlSixPQUFmLEVBQXdCRCxRQUF4QjtBQUNILEdBTkQsTUFNTztBQUNIO0FBQ0EsV0FBT0MsT0FBTyxDQUFDRSxFQUFmO0FBQ0EsV0FBT0YsT0FBTyxDQUFDRyxLQUFmO0FBRUEsU0FBS0UsUUFBTCxDQUFjTCxPQUFkLEVBQXVCRCxRQUF2QjtBQUNIO0FBQ0osQ0F6QkQ7QUEyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBcEIsY0FBYyxDQUFDMkIsU0FBZixHQUEyQixVQUFTSixFQUFULEVBQWFILFFBQWIsRUFBdUI7QUFDOUMsU0FBTyxLQUFLUSxPQUFMLENBQWEsRUFBYixFQUFpQlIsUUFBakIsRUFBMkJHLEVBQTNCLENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBO0FBQ0E7OztBQUNBdkIsY0FBYyxDQUFDNkIsVUFBZixHQUE0QixVQUFTVCxRQUFULEVBQW1CO0FBQzNDLFNBQU8sS0FBS1EsT0FBTCxDQUFhLEVBQWIsRUFBaUJSLFFBQWpCLENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQXBCLGNBQWMsQ0FBQzhCLFlBQWYsR0FBOEIsVUFBU1AsRUFBVCxFQUFhSCxRQUFiLEVBQXVCO0FBQ2pELFNBQU8sS0FBS1csVUFBTCxDQUFnQlgsUUFBaEIsRUFBMEJHLEVBQTFCLENBQVA7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaUNsaWVudCwgJCAqLyBcblxuLyoqXG4gKiBDdXN0b21GaWxlc0FQSSAtIFJFU1RmdWwgQVBJIGNsaWVudCBmb3IgY3VzdG9tIGZpbGVzIG1hbmFnZW1lbnRcbiAqXG4gKiBUaGlzIG1vZHVsZSBwcm92aWRlcyBtZXRob2RzIHRvIGludGVyYWN0IHdpdGggdGhlIGN1c3RvbSBmaWxlcyBBUEkgdjNcbiAqIHVzaW5nIHRoZSBjZW50cmFsaXplZCBQYnhBcGlDbGllbnQgZm9yIGFsbCBIVFRQIG9wZXJhdGlvbnMuXG4gKlxuICogQG1vZHVsZSBjdXN0b21GaWxlc0FQSVxuICovXG5jb25zdCBjdXN0b21GaWxlc0FQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL2N1c3RvbS1maWxlcycsXG4gICAgY3VzdG9tTWV0aG9kczoge1xuICAgICAgICBnZXREZWZhdWx0OiAnOmdldERlZmF1bHQnXG4gICAgfVxufSk7XG5cbi8vIFVzZSBjdXN0b21GaWxlc0FQSS5nZXRSZWNvcmQoJ25ldycsIGNhbGxiYWNrKSBmb3IgZGVmYXVsdCB2YWx1ZXNcblxuLyoqXG4gKiBTYXZlIGN1c3RvbSBmaWxlIChpbnRlbGxpZ2VudCBjcmVhdGUgb3IgdXBkYXRlKVxuICogVGhpcyBpcyBhIGNvbnZlbmllbmNlIG1ldGhvZCB0aGF0IGRldGVybWluZXMgd2hldGhlciB0byBjcmVhdGUgb3IgdXBkYXRlXG4gKiBiYXNlZCBvbiB0aGUgcHJlc2VuY2Ugb2YgYW4gSUQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBDdXN0b20gZmlsZSBkYXRhXG4gKiBAcGFyYW0ge3N0cmluZ30gW2RhdGEuaWRdIC0gRmlsZSBJRCAoaWYgcHJlc2VudCwgdXBkYXRlczsgaWYgbm90LCBjcmVhdGVzKVxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGEuZmlsZXBhdGggLSBGaWxlIHBhdGhcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhLmNvbnRlbnQgLSBGaWxlIGNvbnRlbnQgKHdpbGwgYmUgYmFzZTY0IGVuY29kZWQgaWYgbm90IGFscmVhZHkpXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YS5tb2RlIC0gRmlsZSBtb2RlXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YS5kZXNjcmlwdGlvbiAtIEZpbGUgZGVzY3JpcHRpb25cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICpcbiAqIEBleGFtcGxlXG4gKiAvLyBOZXcgZmlsZSAobm8gSUQpXG4gKiBjdXN0b21GaWxlc0FQSS5zYXZlKHtcbiAqICAgICBmaWxlcGF0aDogJy9ldGMvbmV3LmNvbmYnLFxuICogICAgIGNvbnRlbnQ6ICdkYXRhJyxcbiAqICAgICBtb2RlOiAnbm9uZSdcbiAqIH0sIGNhbGxiYWNrKTtcbiAqXG4gKiAvLyBFeGlzdGluZyBmaWxlICh3aXRoIElEKVxuICogY3VzdG9tRmlsZXNBUEkuc2F2ZSh7XG4gKiAgICAgaWQ6ICcxMjMnLFxuICogICAgIGZpbGVwYXRoOiAnL2V0Yy9leGlzdGluZy5jb25mJyxcbiAqICAgICBjb250ZW50OiAndXBkYXRlZCBkYXRhJyxcbiAqICAgICBtb2RlOiAnb3ZlcnJpZGUnXG4gKiB9LCBjYWxsYmFjayk7XG4gKi9cbi8qKlxuICogRW5jb2RlIFVURi04IHN0cmluZyB0byBiYXNlNjRcbiAqIEhhbmRsZXMgVW5pY29kZSBjaGFyYWN0ZXJzIChSdXNzaWFuLCBDaGluZXNlLCBldGMuKVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHIgLSBVVEYtOCBzdHJpbmcgdG8gZW5jb2RlXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBCYXNlNjQgZW5jb2RlZCBzdHJpbmdcbiAqL1xuY3VzdG9tRmlsZXNBUEkudXRmOFRvQmFzZTY0ID0gZnVuY3Rpb24oc3RyKSB7XG4gICAgLy8gVXNlIFRleHRFbmNvZGVyIGZvciBtb2Rlcm4gYnJvd3NlcnMgKGJldHRlciB0aGFuIGRlcHJlY2F0ZWQgZXNjYXBlL3VuZXNjYXBlKVxuICAgIGlmICh0eXBlb2YgVGV4dEVuY29kZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGNvbnN0IHV0ZjhCeXRlcyA9IG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShzdHIpO1xuICAgICAgICBsZXQgYmluYXJ5U3RyaW5nID0gJyc7XG4gICAgICAgIHV0ZjhCeXRlcy5mb3JFYWNoKGJ5dGUgPT4ge1xuICAgICAgICAgICAgYmluYXJ5U3RyaW5nICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gYnRvYShiaW5hcnlTdHJpbmcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEZhbGxiYWNrIGZvciBvbGRlciBicm93c2Vyc1xuICAgICAgICByZXR1cm4gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoc3RyKSkpO1xuICAgIH1cbn07XG5cbmN1c3RvbUZpbGVzQVBJLnNhdmUgPSBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykge1xuICAgIC8vIFByZXBhcmUgZGF0YSBmb3IgQVBJXG4gICAgY29uc3QgYXBpRGF0YSA9IHsgLi4uZGF0YSB9O1xuXG4gICAgLy8gSGFuZGxlIGNvbnRlbnQgZW5jb2RpbmdcbiAgICAvLyBDb250ZW50IGZyb20gY2JCZWZvcmVTZW5kRm9ybSBpcyBhbHdheXMgcGxhaW4gdGV4dCBmcm9tIEFjZSBlZGl0b3IsXG4gICAgLy8gc28gd2UgYWx3YXlzIG5lZWQgdG8gZW5jb2RlIGl0IHRvIGJhc2U2NCB3aXRoIFVURi04IHN1cHBvcnRcbiAgICBpZiAoYXBpRGF0YS5jb250ZW50ICYmIGFwaURhdGEuY29udGVudCAhPT0gJycpIHtcbiAgICAgICAgLy8gRW5jb2RlIHRvIGJhc2U2NCB3aXRoIFVURi04IHN1cHBvcnQgKGhhbmRsZXMgUnVzc2lhbiwgQ2hpbmVzZSwgZXRjLilcbiAgICAgICAgYXBpRGF0YS5jb250ZW50ID0gY3VzdG9tRmlsZXNBUEkudXRmOFRvQmFzZTY0KGFwaURhdGEuY29udGVudCk7XG4gICAgfVxuXG4gICAgaWYgKGFwaURhdGEuaWQgJiYgYXBpRGF0YS5pZCAhPT0gJycpIHtcbiAgICAgICAgLy8gVXBkYXRlIGV4aXN0aW5nIGZpbGUgdXNpbmcgUEFUQ0ggZm9yIHBhcnRpYWwgdXBkYXRlXG4gICAgICAgIC8vIElNUE9SVEFOVDogS2VlcCBpZCBpbiBkYXRhIGZvciBQQVRDSCByZXF1ZXN0IChzZXJ2ZXIgZXhwZWN0cyBpdCBpbiByZXF1ZXN0IGJvZHkpXG4gICAgICAgIGRlbGV0ZSBhcGlEYXRhLmlzTmV3O1xuXG4gICAgICAgIHRoaXMuY2FsbFBhdGNoKGFwaURhdGEsIGNhbGxiYWNrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBDcmVhdGUgbmV3IGZpbGVcbiAgICAgICAgZGVsZXRlIGFwaURhdGEuaWQ7XG4gICAgICAgIGRlbGV0ZSBhcGlEYXRhLmlzTmV3O1xuXG4gICAgICAgIHRoaXMuY2FsbFBvc3QoYXBpRGF0YSwgY2FsbGJhY2spO1xuICAgIH1cbn07XG5cbi8qKlxuICogR2V0IGEgc2luZ2xlIGN1c3RvbSBmaWxlIHJlY29yZCBieSBJRFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFRoZSBJRCBvZiB0aGUgY3VzdG9tIGZpbGUgdG8gcmV0cmlldmVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICpcbiAqIEBleGFtcGxlXG4gKiBjdXN0b21GaWxlc0FQSS5nZXRSZWNvcmQoJzEyMycsIChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ0ZpbGUgZGF0YTonLCByZXNwb25zZS5kYXRhKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuY3VzdG9tRmlsZXNBUEkuZ2V0UmVjb3JkID0gZnVuY3Rpb24oaWQsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEdldCh7fSwgY2FsbGJhY2ssIGlkKTtcbn07XG5cbi8qKlxuICogR2V0IGFsbCByZWNvcmRzIHdpdGggb3B0aW9uYWwgZmlsdGVyaW5nXG4gKiBUaGlzIG1ldGhvZCBpcyBuZWVkZWQgZm9yIFBieERhdGFUYWJsZUluZGV4IGNvbXBhdGliaWxpdHlcbiAqL1xuY3VzdG9tRmlsZXNBUEkuZ2V0UmVjb3JkcyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEdldCh7fSwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBEZWxldGUgYSBjdXN0b20gZmlsZSByZWNvcmRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBUaGUgSUQgb2YgdGhlIGN1c3RvbSBmaWxlIHRvIGRlbGV0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKi9cbmN1c3RvbUZpbGVzQVBJLmRlbGV0ZVJlY29yZCA9IGZ1bmN0aW9uKGlkLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxEZWxldGUoY2FsbGJhY2ssIGlkKTtcbn07Il19