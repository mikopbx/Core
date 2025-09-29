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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvY3VzdG9tLWZpbGVzLWFwaS5qcyJdLCJuYW1lcyI6WyJjdXN0b21GaWxlc0FQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImdldERlZmF1bHQiLCJzYXZlIiwiZGF0YSIsImNhbGxiYWNrIiwiYXBpRGF0YSIsImNvbnRlbnQiLCJpc0Jhc2U2NCIsInRlc3QiLCJyZXBsYWNlIiwiYnRvYSIsImlkIiwiaXNOZXciLCJjYWxsUGF0Y2giLCJjYWxsUG9zdCIsImdldFJlY29yZCIsImNhbGxHZXQiLCJnZXRSZWNvcmRzIiwiZGVsZXRlUmVjb3JkIiwiY2FsbERlbGV0ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxjQUFjLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUNwQ0MsRUFBQUEsUUFBUSxFQUFFLDhCQUQwQjtBQUVwQ0MsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFVBQVUsRUFBRTtBQUREO0FBRnFCLENBQWpCLENBQXZCLEMsQ0FPQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBSixjQUFjLENBQUNLLElBQWYsR0FBc0IsVUFBU0MsSUFBVCxFQUFlQyxRQUFmLEVBQXlCO0FBQzNDO0FBQ0EsTUFBTUMsT0FBTyxxQkFBUUYsSUFBUixDQUFiLENBRjJDLENBSTNDOzs7QUFDQSxNQUFJRSxPQUFPLENBQUNDLE9BQVosRUFBcUI7QUFDakI7QUFDQTtBQUNBLFFBQU1DLFFBQVEsR0FBRyx5QkFBeUJDLElBQXpCLENBQThCSCxPQUFPLENBQUNDLE9BQVIsQ0FBZ0JHLE9BQWhCLENBQXdCLEtBQXhCLEVBQStCLEVBQS9CLENBQTlCLENBQWpCOztBQUNBLFFBQUksQ0FBQ0YsUUFBTCxFQUFlO0FBQ1g7QUFDQUYsTUFBQUEsT0FBTyxDQUFDQyxPQUFSLEdBQWtCSSxJQUFJLENBQUNMLE9BQU8sQ0FBQ0MsT0FBVCxDQUF0QjtBQUNIO0FBQ0o7O0FBRUQsTUFBSUQsT0FBTyxDQUFDTSxFQUFSLElBQWNOLE9BQU8sQ0FBQ00sRUFBUixLQUFlLEVBQWpDLEVBQXFDO0FBQ2pDO0FBQ0EsUUFBTUEsRUFBRSxHQUFHTixPQUFPLENBQUNNLEVBQW5CO0FBQ0EsV0FBT04sT0FBTyxDQUFDTSxFQUFmO0FBQ0EsV0FBT04sT0FBTyxDQUFDTyxLQUFmO0FBRUEsU0FBS0MsU0FBTCxDQUFlUixPQUFmLEVBQXdCRCxRQUF4QixFQUFrQ08sRUFBbEM7QUFDSCxHQVBELE1BT087QUFDSDtBQUNBLFdBQU9OLE9BQU8sQ0FBQ00sRUFBZjtBQUNBLFdBQU9OLE9BQU8sQ0FBQ08sS0FBZjtBQUVBLFNBQUtFLFFBQUwsQ0FBY1QsT0FBZCxFQUF1QkQsUUFBdkI7QUFDSDtBQUNKLENBN0JEO0FBK0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQVAsY0FBYyxDQUFDa0IsU0FBZixHQUEyQixVQUFTSixFQUFULEVBQWFQLFFBQWIsRUFBdUI7QUFDOUMsU0FBTyxLQUFLWSxPQUFMLENBQWEsRUFBYixFQUFpQlosUUFBakIsRUFBMkJPLEVBQTNCLENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBO0FBQ0E7OztBQUNBZCxjQUFjLENBQUNvQixVQUFmLEdBQTRCLFVBQVNiLFFBQVQsRUFBbUI7QUFDM0MsU0FBTyxLQUFLWSxPQUFMLENBQWEsRUFBYixFQUFpQlosUUFBakIsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBUCxjQUFjLENBQUNxQixZQUFmLEdBQThCLFVBQVNQLEVBQVQsRUFBYVAsUUFBYixFQUF1QjtBQUNqRCxTQUFPLEtBQUtlLFVBQUwsQ0FBZ0JmLFFBQWhCLEVBQTBCTyxFQUExQixDQUFQO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBQYnhBcGlDbGllbnQsICQgKi8gXG5cbi8qKlxuICogQ3VzdG9tRmlsZXNBUEkgLSBSRVNUZnVsIEFQSSBjbGllbnQgZm9yIGN1c3RvbSBmaWxlcyBtYW5hZ2VtZW50XG4gKlxuICogVGhpcyBtb2R1bGUgcHJvdmlkZXMgbWV0aG9kcyB0byBpbnRlcmFjdCB3aXRoIHRoZSBjdXN0b20gZmlsZXMgQVBJIHYzXG4gKiB1c2luZyB0aGUgY2VudHJhbGl6ZWQgUGJ4QXBpQ2xpZW50IGZvciBhbGwgSFRUUCBvcGVyYXRpb25zLlxuICpcbiAqIEBtb2R1bGUgY3VzdG9tRmlsZXNBUElcbiAqL1xuY29uc3QgY3VzdG9tRmlsZXNBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9jdXN0b20tZmlsZXMnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0RGVmYXVsdDogJzpnZXREZWZhdWx0J1xuICAgIH1cbn0pO1xuXG4vLyBVc2UgY3VzdG9tRmlsZXNBUEkuZ2V0UmVjb3JkKCduZXcnLCBjYWxsYmFjaykgZm9yIGRlZmF1bHQgdmFsdWVzXG5cbi8qKlxuICogU2F2ZSBjdXN0b20gZmlsZSAoaW50ZWxsaWdlbnQgY3JlYXRlIG9yIHVwZGF0ZSlcbiAqIFRoaXMgaXMgYSBjb252ZW5pZW5jZSBtZXRob2QgdGhhdCBkZXRlcm1pbmVzIHdoZXRoZXIgdG8gY3JlYXRlIG9yIHVwZGF0ZVxuICogYmFzZWQgb24gdGhlIHByZXNlbmNlIG9mIGFuIElELlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gQ3VzdG9tIGZpbGUgZGF0YVxuICogQHBhcmFtIHtzdHJpbmd9IFtkYXRhLmlkXSAtIEZpbGUgSUQgKGlmIHByZXNlbnQsIHVwZGF0ZXM7IGlmIG5vdCwgY3JlYXRlcylcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhLmZpbGVwYXRoIC0gRmlsZSBwYXRoXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YS5jb250ZW50IC0gRmlsZSBjb250ZW50ICh3aWxsIGJlIGJhc2U2NCBlbmNvZGVkIGlmIG5vdCBhbHJlYWR5KVxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGEubW9kZSAtIEZpbGUgbW9kZVxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGEuZGVzY3JpcHRpb24gLSBGaWxlIGRlc2NyaXB0aW9uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqXG4gKiBAZXhhbXBsZVxuICogLy8gTmV3IGZpbGUgKG5vIElEKVxuICogY3VzdG9tRmlsZXNBUEkuc2F2ZSh7XG4gKiAgICAgZmlsZXBhdGg6ICcvZXRjL25ldy5jb25mJyxcbiAqICAgICBjb250ZW50OiAnZGF0YScsXG4gKiAgICAgbW9kZTogJ25vbmUnXG4gKiB9LCBjYWxsYmFjayk7XG4gKlxuICogLy8gRXhpc3RpbmcgZmlsZSAod2l0aCBJRClcbiAqIGN1c3RvbUZpbGVzQVBJLnNhdmUoe1xuICogICAgIGlkOiAnMTIzJyxcbiAqICAgICBmaWxlcGF0aDogJy9ldGMvZXhpc3RpbmcuY29uZicsXG4gKiAgICAgY29udGVudDogJ3VwZGF0ZWQgZGF0YScsXG4gKiAgICAgbW9kZTogJ292ZXJyaWRlJ1xuICogfSwgY2FsbGJhY2spO1xuICovXG5jdXN0b21GaWxlc0FQSS5zYXZlID0gZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICAvLyBQcmVwYXJlIGRhdGEgZm9yIEFQSVxuICAgIGNvbnN0IGFwaURhdGEgPSB7IC4uLmRhdGEgfTtcblxuICAgIC8vIEhhbmRsZSBjb250ZW50IGVuY29kaW5nIC0gY2hlY2sgaWYgaXQncyBhbHJlYWR5IGJhc2U2NFxuICAgIGlmIChhcGlEYXRhLmNvbnRlbnQpIHtcbiAgICAgICAgLy8gU2ltcGxlIGNoZWNrIGlmIGNvbnRlbnQgaXMgYWxyZWFkeSBiYXNlNjQgZW5jb2RlZFxuICAgICAgICAvLyBCYXNlNjQgc3RyaW5ncyBtYXRjaCB0aGUgcGF0dGVybjogXltBLVphLXowLTkrL10qPXswLDJ9JFxuICAgICAgICBjb25zdCBpc0Jhc2U2NCA9IC9eW0EtWmEtejAtOSsvXSo9ezAsMn0kLy50ZXN0KGFwaURhdGEuY29udGVudC5yZXBsYWNlKC9cXHMvZywgJycpKTtcbiAgICAgICAgaWYgKCFpc0Jhc2U2NCkge1xuICAgICAgICAgICAgLy8gRW5jb2RlIHRvIGJhc2U2NCBpZiBub3QgYWxyZWFkeSBlbmNvZGVkXG4gICAgICAgICAgICBhcGlEYXRhLmNvbnRlbnQgPSBidG9hKGFwaURhdGEuY29udGVudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYXBpRGF0YS5pZCAmJiBhcGlEYXRhLmlkICE9PSAnJykge1xuICAgICAgICAvLyBVcGRhdGUgZXhpc3RpbmcgZmlsZSB1c2luZyBQQVRDSCBmb3IgcGFydGlhbCB1cGRhdGVcbiAgICAgICAgY29uc3QgaWQgPSBhcGlEYXRhLmlkO1xuICAgICAgICBkZWxldGUgYXBpRGF0YS5pZDtcbiAgICAgICAgZGVsZXRlIGFwaURhdGEuaXNOZXc7XG5cbiAgICAgICAgdGhpcy5jYWxsUGF0Y2goYXBpRGF0YSwgY2FsbGJhY2ssIGlkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBDcmVhdGUgbmV3IGZpbGVcbiAgICAgICAgZGVsZXRlIGFwaURhdGEuaWQ7XG4gICAgICAgIGRlbGV0ZSBhcGlEYXRhLmlzTmV3O1xuXG4gICAgICAgIHRoaXMuY2FsbFBvc3QoYXBpRGF0YSwgY2FsbGJhY2spO1xuICAgIH1cbn07XG5cbi8qKlxuICogR2V0IGEgc2luZ2xlIGN1c3RvbSBmaWxlIHJlY29yZCBieSBJRFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFRoZSBJRCBvZiB0aGUgY3VzdG9tIGZpbGUgdG8gcmV0cmlldmVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICpcbiAqIEBleGFtcGxlXG4gKiBjdXN0b21GaWxlc0FQSS5nZXRSZWNvcmQoJzEyMycsIChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ0ZpbGUgZGF0YTonLCByZXNwb25zZS5kYXRhKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuY3VzdG9tRmlsZXNBUEkuZ2V0UmVjb3JkID0gZnVuY3Rpb24oaWQsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEdldCh7fSwgY2FsbGJhY2ssIGlkKTtcbn07XG5cbi8qKlxuICogR2V0IGFsbCByZWNvcmRzIHdpdGggb3B0aW9uYWwgZmlsdGVyaW5nXG4gKiBUaGlzIG1ldGhvZCBpcyBuZWVkZWQgZm9yIFBieERhdGFUYWJsZUluZGV4IGNvbXBhdGliaWxpdHlcbiAqL1xuY3VzdG9tRmlsZXNBUEkuZ2V0UmVjb3JkcyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEdldCh7fSwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBEZWxldGUgYSBjdXN0b20gZmlsZSByZWNvcmRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBUaGUgSUQgb2YgdGhlIGN1c3RvbSBmaWxlIHRvIGRlbGV0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKi9cbmN1c3RvbUZpbGVzQVBJLmRlbGV0ZVJlY29yZCA9IGZ1bmN0aW9uKGlkLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxEZWxldGUoY2FsbGJhY2ssIGlkKTtcbn07Il19