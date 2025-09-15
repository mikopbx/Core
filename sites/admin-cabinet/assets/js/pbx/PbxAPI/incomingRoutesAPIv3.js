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
 * IncomingRoutesAPI - REST API v3 client for incoming routes management
 * 
 * Provides a clean interface for incoming routes operations using the new RESTful API.
 * This replaces the legacy v2 API client.
 * 
 * @class IncomingRoutesAPI
 */
var IncomingRoutesAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/incoming-routes',
  customMethods: {
    getDefault: ':getDefault',
    changePriority: ':changePriority',
    copy: ':copy'
  }
});
/**
 * Change priority of multiple incoming routes
 * 
 * @param {object} priorities - Map of route ID to new priority value
 * @param {function} callback - Callback function
 */

IncomingRoutesAPI.changePriority = function (priorities, callback) {
  $.api({
    url: "".concat(this.apiUrl, ":changePriority"),
    method: 'POST',
    data: {
      priorities: priorities
    },
    on: 'now',
    onSuccess: function onSuccess(response) {
      callback(response);
    },
    onFailure: function onFailure(response) {
      callback(response);
    },
    onError: function onError() {
      callback({
        result: false,
        messages: {
          error: ['Network error occurred']
        }
      });
    }
  });
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvaW5jb21pbmdSb3V0ZXNBUEl2My5qcyJdLCJuYW1lcyI6WyJJbmNvbWluZ1JvdXRlc0FQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImdldERlZmF1bHQiLCJjaGFuZ2VQcmlvcml0eSIsImNvcHkiLCJwcmlvcml0aWVzIiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwiYXBpVXJsIiwibWV0aG9kIiwiZGF0YSIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwicmVzdWx0IiwibWVzc2FnZXMiLCJlcnJvciJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxpQkFBaUIsR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQ3ZDQyxFQUFBQSxRQUFRLEVBQUUsaUNBRDZCO0FBRXZDQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsVUFBVSxFQUFFLGFBREQ7QUFFWEMsSUFBQUEsY0FBYyxFQUFFLGlCQUZMO0FBR1hDLElBQUFBLElBQUksRUFBRTtBQUhLO0FBRndCLENBQWpCLENBQTFCO0FBU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBTixpQkFBaUIsQ0FBQ0ssY0FBbEIsR0FBbUMsVUFBU0UsVUFBVCxFQUFxQkMsUUFBckIsRUFBK0I7QUFDOURDLEVBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLElBQUFBLEdBQUcsWUFBSyxLQUFLQyxNQUFWLG9CQUREO0FBRUZDLElBQUFBLE1BQU0sRUFBRSxNQUZOO0FBR0ZDLElBQUFBLElBQUksRUFBRTtBQUFFUCxNQUFBQSxVQUFVLEVBQUVBO0FBQWQsS0FISjtBQUlGUSxJQUFBQSxFQUFFLEVBQUUsS0FKRjtBQUtGQyxJQUFBQSxTQUxFLHFCQUtRQyxRQUxSLEVBS2tCO0FBQ2hCVCxNQUFBQSxRQUFRLENBQUNTLFFBQUQsQ0FBUjtBQUNILEtBUEM7QUFRRkMsSUFBQUEsU0FSRSxxQkFRUUQsUUFSUixFQVFrQjtBQUNoQlQsTUFBQUEsUUFBUSxDQUFDUyxRQUFELENBQVI7QUFDSCxLQVZDO0FBV0ZFLElBQUFBLE9BWEUscUJBV1E7QUFDTlgsTUFBQUEsUUFBUSxDQUFDO0FBQ0xZLFFBQUFBLE1BQU0sRUFBRSxLQURIO0FBRUxDLFFBQUFBLFFBQVEsRUFBRTtBQUFFQyxVQUFBQSxLQUFLLEVBQUUsQ0FBQyx3QkFBRDtBQUFUO0FBRkwsT0FBRCxDQUFSO0FBSUg7QUFoQkMsR0FBTjtBQWtCSCxDQW5CRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGlDbGllbnQsICQgKi9cblxuLyoqXG4gKiBJbmNvbWluZ1JvdXRlc0FQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgaW5jb21pbmcgcm91dGVzIG1hbmFnZW1lbnRcbiAqIFxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIGluY29taW5nIHJvdXRlcyBvcGVyYXRpb25zIHVzaW5nIHRoZSBuZXcgUkVTVGZ1bCBBUEkuXG4gKiBUaGlzIHJlcGxhY2VzIHRoZSBsZWdhY3kgdjIgQVBJIGNsaWVudC5cbiAqIFxuICogQGNsYXNzIEluY29taW5nUm91dGVzQVBJXG4gKi9cbmNvbnN0IEluY29taW5nUm91dGVzQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvaW5jb21pbmctcm91dGVzJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIGdldERlZmF1bHQ6ICc6Z2V0RGVmYXVsdCcsXG4gICAgICAgIGNoYW5nZVByaW9yaXR5OiAnOmNoYW5nZVByaW9yaXR5JyxcbiAgICAgICAgY29weTogJzpjb3B5J1xuICAgIH1cbn0pO1xuXG4vKipcbiAqIENoYW5nZSBwcmlvcml0eSBvZiBtdWx0aXBsZSBpbmNvbWluZyByb3V0ZXNcbiAqIFxuICogQHBhcmFtIHtvYmplY3R9IHByaW9yaXRpZXMgLSBNYXAgb2Ygcm91dGUgSUQgdG8gbmV3IHByaW9yaXR5IHZhbHVlXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gKi9cbkluY29taW5nUm91dGVzQVBJLmNoYW5nZVByaW9yaXR5ID0gZnVuY3Rpb24ocHJpb3JpdGllcywgY2FsbGJhY2spIHtcbiAgICAkLmFwaSh7XG4gICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9OmNoYW5nZVByaW9yaXR5YCxcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGRhdGE6IHsgcHJpb3JpdGllczogcHJpb3JpdGllcyB9LFxuICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICB9LFxuICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7IGVycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXSB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufTsiXX0=