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

/* global PbxApiClient, $ */

/**
 * DialplanApplicationsAPI - REST API v3 client for dialplan applications management
 * 
 * Provides a clean interface for dialplan applications operations using the new RESTful API.
 * 
 * @class DialplanApplicationsAPI
 */
var DialplanApplicationsAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/dialplan-applications',
  customMethods: {
    getDefault: ':getDefault',
    copy: ':copy'
  }
});
/**
 * Get default values for a new dialplan application
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * DialplanApplicationsAPI.getDefault((response) => {
 *     if (response.result) {
 *         console.log('Default values:', response.data);
 *     }
 * });
 */

DialplanApplicationsAPI.getDefault = function (callback) {
  return this.callCustomMethod('getDefault', {}, callback);
};
/**
 * Copy an existing dialplan application
 *
 * @param {string} id - ID of the dialplan application to copy
 * @param {function} callback - Callback function to handle the response
 * @example
 * DialplanApplicationsAPI.copy('DIALPLAN-APP-123', (response) => {
 *     if (response.result) {
 *         console.log('Copied application:', response.data);
 *     }
 * });
 */


DialplanApplicationsAPI.copy = function (id, callback) {
  return this.callCustomMethod('copy', {
    id: id
  }, callback, 'GET', id);
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZGlhbHBsYW4tYXBwbGljYXRpb25zLWFwaS5qcyJdLCJuYW1lcyI6WyJEaWFscGxhbkFwcGxpY2F0aW9uc0FQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImdldERlZmF1bHQiLCJjb3B5IiwiY2FsbGJhY2siLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaWQiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLHVCQUF1QixHQUFHLElBQUlDLFlBQUosQ0FBaUI7QUFDN0NDLEVBQUFBLFFBQVEsRUFBRSx1Q0FEbUM7QUFFN0NDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxVQUFVLEVBQUUsYUFERDtBQUVYQyxJQUFBQSxJQUFJLEVBQUU7QUFGSztBQUY4QixDQUFqQixDQUFoQztBQVFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FMLHVCQUF1QixDQUFDSSxVQUF4QixHQUFxQyxVQUFTRSxRQUFULEVBQW1CO0FBQ3BELFNBQU8sS0FBS0MsZ0JBQUwsQ0FBc0IsWUFBdEIsRUFBb0MsRUFBcEMsRUFBd0NELFFBQXhDLENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQU4sdUJBQXVCLENBQUNLLElBQXhCLEdBQStCLFVBQVNHLEVBQVQsRUFBYUYsUUFBYixFQUF1QjtBQUNsRCxTQUFPLEtBQUtDLGdCQUFMLENBQXNCLE1BQXRCLEVBQThCO0FBQUNDLElBQUFBLEVBQUUsRUFBRUE7QUFBTCxHQUE5QixFQUF3Q0YsUUFBeEMsRUFBa0QsS0FBbEQsRUFBeURFLEVBQXpELENBQVA7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaUNsaWVudCwgJCAqLyBcblxuLyoqXG4gKiBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgZGlhbHBsYW4gYXBwbGljYXRpb25zIG1hbmFnZW1lbnRcbiAqIFxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIGRpYWxwbGFuIGFwcGxpY2F0aW9ucyBvcGVyYXRpb25zIHVzaW5nIHRoZSBuZXcgUkVTVGZ1bCBBUEkuXG4gKiBcbiAqIEBjbGFzcyBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSVxuICovXG5jb25zdCBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL2RpYWxwbGFuLWFwcGxpY2F0aW9ucycsXG4gICAgY3VzdG9tTWV0aG9kczoge1xuICAgICAgICBnZXREZWZhdWx0OiAnOmdldERlZmF1bHQnLFxuICAgICAgICBjb3B5OiAnOmNvcHknXG4gICAgfVxufSk7XG5cbi8qKlxuICogR2V0IGRlZmF1bHQgdmFsdWVzIGZvciBhIG5ldyBkaWFscGxhbiBhcHBsaWNhdGlvblxuICogXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSS5nZXREZWZhdWx0KChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ0RlZmF1bHQgdmFsdWVzOicsIHJlc3BvbnNlLmRhdGEpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5EaWFscGxhbkFwcGxpY2F0aW9uc0FQSS5nZXREZWZhdWx0ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXREZWZhdWx0Jywge30sIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogQ29weSBhbiBleGlzdGluZyBkaWFscGxhbiBhcHBsaWNhdGlvblxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIElEIG9mIHRoZSBkaWFscGxhbiBhcHBsaWNhdGlvbiB0byBjb3B5XG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSS5jb3B5KCdESUFMUExBTi1BUFAtMTIzJywgKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnQ29waWVkIGFwcGxpY2F0aW9uOicsIHJlc3BvbnNlLmRhdGEpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5EaWFscGxhbkFwcGxpY2F0aW9uc0FQSS5jb3B5ID0gZnVuY3Rpb24oaWQsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnY29weScsIHtpZDogaWR9LCBjYWxsYmFjaywgJ0dFVCcsIGlkKTtcbn07Il19