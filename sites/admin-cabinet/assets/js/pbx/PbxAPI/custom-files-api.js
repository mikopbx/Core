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
 * Get default values for a new custom file
 *
 * @param {Function} callback - Callback function to handle the response
 *
 * @example
 * customFilesAPI.getDefault((response) => {
 *     if (response.result) {
 *         console.log('Default values:', response.data);
 *     }
 * });
 */


customFilesAPI.getDefault = function (callback) {
  return this.callCustomMethod('getDefault', {}, callback);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvY3VzdG9tLWZpbGVzLWFwaS5qcyJdLCJuYW1lcyI6WyJjdXN0b21GaWxlc0FQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImdldERlZmF1bHQiLCJ1dGY4VG9CYXNlNjQiLCJzdHIiLCJUZXh0RW5jb2RlciIsInV0ZjhCeXRlcyIsImVuY29kZSIsImJpbmFyeVN0cmluZyIsImZvckVhY2giLCJieXRlIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwiYnRvYSIsInVuZXNjYXBlIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwic2F2ZSIsImRhdGEiLCJjYWxsYmFjayIsImFwaURhdGEiLCJjb250ZW50IiwiaWQiLCJpc05ldyIsImNhbGxQYXRjaCIsImNhbGxQb3N0IiwiY2FsbEN1c3RvbU1ldGhvZCIsImdldFJlY29yZCIsImNhbGxHZXQiLCJnZXRSZWNvcmRzIiwiZGVsZXRlUmVjb3JkIiwiY2FsbERlbGV0ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxjQUFjLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUNwQ0MsRUFBQUEsUUFBUSxFQUFFLDhCQUQwQjtBQUVwQ0MsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFVBQVUsRUFBRTtBQUREO0FBRnFCLENBQWpCLENBQXZCLEMsQ0FPQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBSixjQUFjLENBQUNLLFlBQWYsR0FBOEIsVUFBU0MsR0FBVCxFQUFjO0FBQ3hDO0FBQ0EsTUFBSSxPQUFPQyxXQUFQLEtBQXVCLFdBQTNCLEVBQXdDO0FBQ3BDLFFBQU1DLFNBQVMsR0FBRyxJQUFJRCxXQUFKLEdBQWtCRSxNQUFsQixDQUF5QkgsR0FBekIsQ0FBbEI7QUFDQSxRQUFJSSxZQUFZLEdBQUcsRUFBbkI7QUFDQUYsSUFBQUEsU0FBUyxDQUFDRyxPQUFWLENBQWtCLFVBQUFDLElBQUksRUFBSTtBQUN0QkYsTUFBQUEsWUFBWSxJQUFJRyxNQUFNLENBQUNDLFlBQVAsQ0FBb0JGLElBQXBCLENBQWhCO0FBQ0gsS0FGRDtBQUdBLFdBQU9HLElBQUksQ0FBQ0wsWUFBRCxDQUFYO0FBQ0gsR0FQRCxNQU9PO0FBQ0g7QUFDQSxXQUFPSyxJQUFJLENBQUNDLFFBQVEsQ0FBQ0Msa0JBQWtCLENBQUNYLEdBQUQsQ0FBbkIsQ0FBVCxDQUFYO0FBQ0g7QUFDSixDQWJEOztBQWVBTixjQUFjLENBQUNrQixJQUFmLEdBQXNCLFVBQVNDLElBQVQsRUFBZUMsUUFBZixFQUF5QjtBQUMzQztBQUNBLE1BQU1DLE9BQU8scUJBQVFGLElBQVIsQ0FBYixDQUYyQyxDQUkzQztBQUNBO0FBQ0E7OztBQUNBLE1BQUlFLE9BQU8sQ0FBQ0MsT0FBUixJQUFtQkQsT0FBTyxDQUFDQyxPQUFSLEtBQW9CLEVBQTNDLEVBQStDO0FBQzNDO0FBQ0FELElBQUFBLE9BQU8sQ0FBQ0MsT0FBUixHQUFrQnRCLGNBQWMsQ0FBQ0ssWUFBZixDQUE0QmdCLE9BQU8sQ0FBQ0MsT0FBcEMsQ0FBbEI7QUFDSDs7QUFFRCxNQUFJRCxPQUFPLENBQUNFLEVBQVIsSUFBY0YsT0FBTyxDQUFDRSxFQUFSLEtBQWUsRUFBakMsRUFBcUM7QUFDakM7QUFDQTtBQUNBLFdBQU9GLE9BQU8sQ0FBQ0csS0FBZjtBQUVBLFNBQUtDLFNBQUwsQ0FBZUosT0FBZixFQUF3QkQsUUFBeEI7QUFDSCxHQU5ELE1BTU87QUFDSDtBQUNBLFdBQU9DLE9BQU8sQ0FBQ0UsRUFBZjtBQUNBLFdBQU9GLE9BQU8sQ0FBQ0csS0FBZjtBQUVBLFNBQUtFLFFBQUwsQ0FBY0wsT0FBZCxFQUF1QkQsUUFBdkI7QUFDSDtBQUNKLENBekJEO0FBMkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FwQixjQUFjLENBQUNJLFVBQWYsR0FBNEIsVUFBU2dCLFFBQVQsRUFBbUI7QUFDM0MsU0FBTyxLQUFLTyxnQkFBTCxDQUFzQixZQUF0QixFQUFvQyxFQUFwQyxFQUF3Q1AsUUFBeEMsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FwQixjQUFjLENBQUM0QixTQUFmLEdBQTJCLFVBQVNMLEVBQVQsRUFBYUgsUUFBYixFQUF1QjtBQUM5QyxTQUFPLEtBQUtTLE9BQUwsQ0FBYSxFQUFiLEVBQWlCVCxRQUFqQixFQUEyQkcsRUFBM0IsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0F2QixjQUFjLENBQUM4QixVQUFmLEdBQTRCLFVBQVNWLFFBQVQsRUFBbUI7QUFDM0MsU0FBTyxLQUFLUyxPQUFMLENBQWEsRUFBYixFQUFpQlQsUUFBakIsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBcEIsY0FBYyxDQUFDK0IsWUFBZixHQUE4QixVQUFTUixFQUFULEVBQWFILFFBQWIsRUFBdUI7QUFDakQsU0FBTyxLQUFLWSxVQUFMLENBQWdCWixRQUFoQixFQUEwQkcsRUFBMUIsQ0FBUDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpQ2xpZW50LCAkICovIFxuXG4vKipcbiAqIEN1c3RvbUZpbGVzQVBJIC0gUkVTVGZ1bCBBUEkgY2xpZW50IGZvciBjdXN0b20gZmlsZXMgbWFuYWdlbWVudFxuICpcbiAqIFRoaXMgbW9kdWxlIHByb3ZpZGVzIG1ldGhvZHMgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgY3VzdG9tIGZpbGVzIEFQSSB2M1xuICogdXNpbmcgdGhlIGNlbnRyYWxpemVkIFBieEFwaUNsaWVudCBmb3IgYWxsIEhUVFAgb3BlcmF0aW9ucy5cbiAqXG4gKiBAbW9kdWxlIGN1c3RvbUZpbGVzQVBJXG4gKi9cbmNvbnN0IGN1c3RvbUZpbGVzQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvY3VzdG9tLWZpbGVzJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIGdldERlZmF1bHQ6ICc6Z2V0RGVmYXVsdCdcbiAgICB9XG59KTtcblxuLy8gVXNlIGN1c3RvbUZpbGVzQVBJLmdldFJlY29yZCgnbmV3JywgY2FsbGJhY2spIGZvciBkZWZhdWx0IHZhbHVlc1xuXG4vKipcbiAqIFNhdmUgY3VzdG9tIGZpbGUgKGludGVsbGlnZW50IGNyZWF0ZSBvciB1cGRhdGUpXG4gKiBUaGlzIGlzIGEgY29udmVuaWVuY2UgbWV0aG9kIHRoYXQgZGV0ZXJtaW5lcyB3aGV0aGVyIHRvIGNyZWF0ZSBvciB1cGRhdGVcbiAqIGJhc2VkIG9uIHRoZSBwcmVzZW5jZSBvZiBhbiBJRC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEN1c3RvbSBmaWxlIGRhdGFcbiAqIEBwYXJhbSB7c3RyaW5nfSBbZGF0YS5pZF0gLSBGaWxlIElEIChpZiBwcmVzZW50LCB1cGRhdGVzOyBpZiBub3QsIGNyZWF0ZXMpXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YS5maWxlcGF0aCAtIEZpbGUgcGF0aFxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGEuY29udGVudCAtIEZpbGUgY29udGVudCAod2lsbCBiZSBiYXNlNjQgZW5jb2RlZCBpZiBub3QgYWxyZWFkeSlcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhLm1vZGUgLSBGaWxlIG1vZGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhLmRlc2NyaXB0aW9uIC0gRmlsZSBkZXNjcmlwdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKlxuICogQGV4YW1wbGVcbiAqIC8vIE5ldyBmaWxlIChubyBJRClcbiAqIGN1c3RvbUZpbGVzQVBJLnNhdmUoe1xuICogICAgIGZpbGVwYXRoOiAnL2V0Yy9uZXcuY29uZicsXG4gKiAgICAgY29udGVudDogJ2RhdGEnLFxuICogICAgIG1vZGU6ICdub25lJ1xuICogfSwgY2FsbGJhY2spO1xuICpcbiAqIC8vIEV4aXN0aW5nIGZpbGUgKHdpdGggSUQpXG4gKiBjdXN0b21GaWxlc0FQSS5zYXZlKHtcbiAqICAgICBpZDogJzEyMycsXG4gKiAgICAgZmlsZXBhdGg6ICcvZXRjL2V4aXN0aW5nLmNvbmYnLFxuICogICAgIGNvbnRlbnQ6ICd1cGRhdGVkIGRhdGEnLFxuICogICAgIG1vZGU6ICdvdmVycmlkZSdcbiAqIH0sIGNhbGxiYWNrKTtcbiAqL1xuLyoqXG4gKiBFbmNvZGUgVVRGLTggc3RyaW5nIHRvIGJhc2U2NFxuICogSGFuZGxlcyBVbmljb2RlIGNoYXJhY3RlcnMgKFJ1c3NpYW4sIENoaW5lc2UsIGV0Yy4pXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHN0ciAtIFVURi04IHN0cmluZyB0byBlbmNvZGVcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEJhc2U2NCBlbmNvZGVkIHN0cmluZ1xuICovXG5jdXN0b21GaWxlc0FQSS51dGY4VG9CYXNlNjQgPSBmdW5jdGlvbihzdHIpIHtcbiAgICAvLyBVc2UgVGV4dEVuY29kZXIgZm9yIG1vZGVybiBicm93c2VycyAoYmV0dGVyIHRoYW4gZGVwcmVjYXRlZCBlc2NhcGUvdW5lc2NhcGUpXG4gICAgaWYgKHR5cGVvZiBUZXh0RW5jb2RlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgY29uc3QgdXRmOEJ5dGVzID0gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKHN0cik7XG4gICAgICAgIGxldCBiaW5hcnlTdHJpbmcgPSAnJztcbiAgICAgICAgdXRmOEJ5dGVzLmZvckVhY2goYnl0ZSA9PiB7XG4gICAgICAgICAgICBiaW5hcnlTdHJpbmcgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBidG9hKGJpbmFyeVN0cmluZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRmFsbGJhY2sgZm9yIG9sZGVyIGJyb3dzZXJzXG4gICAgICAgIHJldHVybiBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChzdHIpKSk7XG4gICAgfVxufTtcblxuY3VzdG9tRmlsZXNBUEkuc2F2ZSA9IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgLy8gUHJlcGFyZSBkYXRhIGZvciBBUElcbiAgICBjb25zdCBhcGlEYXRhID0geyAuLi5kYXRhIH07XG5cbiAgICAvLyBIYW5kbGUgY29udGVudCBlbmNvZGluZ1xuICAgIC8vIENvbnRlbnQgZnJvbSBjYkJlZm9yZVNlbmRGb3JtIGlzIGFsd2F5cyBwbGFpbiB0ZXh0IGZyb20gQWNlIGVkaXRvcixcbiAgICAvLyBzbyB3ZSBhbHdheXMgbmVlZCB0byBlbmNvZGUgaXQgdG8gYmFzZTY0IHdpdGggVVRGLTggc3VwcG9ydFxuICAgIGlmIChhcGlEYXRhLmNvbnRlbnQgJiYgYXBpRGF0YS5jb250ZW50ICE9PSAnJykge1xuICAgICAgICAvLyBFbmNvZGUgdG8gYmFzZTY0IHdpdGggVVRGLTggc3VwcG9ydCAoaGFuZGxlcyBSdXNzaWFuLCBDaGluZXNlLCBldGMuKVxuICAgICAgICBhcGlEYXRhLmNvbnRlbnQgPSBjdXN0b21GaWxlc0FQSS51dGY4VG9CYXNlNjQoYXBpRGF0YS5jb250ZW50KTtcbiAgICB9XG5cbiAgICBpZiAoYXBpRGF0YS5pZCAmJiBhcGlEYXRhLmlkICE9PSAnJykge1xuICAgICAgICAvLyBVcGRhdGUgZXhpc3RpbmcgZmlsZSB1c2luZyBQQVRDSCBmb3IgcGFydGlhbCB1cGRhdGVcbiAgICAgICAgLy8gSU1QT1JUQU5UOiBLZWVwIGlkIGluIGRhdGEgZm9yIFBBVENIIHJlcXVlc3QgKHNlcnZlciBleHBlY3RzIGl0IGluIHJlcXVlc3QgYm9keSlcbiAgICAgICAgZGVsZXRlIGFwaURhdGEuaXNOZXc7XG5cbiAgICAgICAgdGhpcy5jYWxsUGF0Y2goYXBpRGF0YSwgY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIENyZWF0ZSBuZXcgZmlsZVxuICAgICAgICBkZWxldGUgYXBpRGF0YS5pZDtcbiAgICAgICAgZGVsZXRlIGFwaURhdGEuaXNOZXc7XG5cbiAgICAgICAgdGhpcy5jYWxsUG9zdChhcGlEYXRhLCBjYWxsYmFjayk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBHZXQgZGVmYXVsdCB2YWx1ZXMgZm9yIGEgbmV3IGN1c3RvbSBmaWxlXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKlxuICogQGV4YW1wbGVcbiAqIGN1c3RvbUZpbGVzQVBJLmdldERlZmF1bHQoKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnRGVmYXVsdCB2YWx1ZXM6JywgcmVzcG9uc2UuZGF0YSk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cbmN1c3RvbUZpbGVzQVBJLmdldERlZmF1bHQgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldERlZmF1bHQnLCB7fSwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBHZXQgYSBzaW5nbGUgY3VzdG9tIGZpbGUgcmVjb3JkIGJ5IElEXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIElEIG9mIHRoZSBjdXN0b20gZmlsZSB0byByZXRyaWV2ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKlxuICogQGV4YW1wbGVcbiAqIGN1c3RvbUZpbGVzQVBJLmdldFJlY29yZCgnMTIzJywgKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnRmlsZSBkYXRhOicsIHJlc3BvbnNlLmRhdGEpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5jdXN0b21GaWxlc0FQSS5nZXRSZWNvcmQgPSBmdW5jdGlvbihpZCwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsR2V0KHt9LCBjYWxsYmFjaywgaWQpO1xufTtcblxuLyoqXG4gKiBHZXQgYWxsIHJlY29yZHMgd2l0aCBvcHRpb25hbCBmaWx0ZXJpbmdcbiAqIFRoaXMgbWV0aG9kIGlzIG5lZWRlZCBmb3IgUGJ4RGF0YVRhYmxlSW5kZXggY29tcGF0aWJpbGl0eVxuICovXG5jdXN0b21GaWxlc0FQSS5nZXRSZWNvcmRzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsR2V0KHt9LCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIERlbGV0ZSBhIGN1c3RvbSBmaWxlIHJlY29yZFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFRoZSBJRCBvZiB0aGUgY3VzdG9tIGZpbGUgdG8gZGVsZXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqL1xuY3VzdG9tRmlsZXNBUEkuZGVsZXRlUmVjb3JkID0gZnVuY3Rpb24oaWQsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbERlbGV0ZShjYWxsYmFjaywgaWQpO1xufTsiXX0=