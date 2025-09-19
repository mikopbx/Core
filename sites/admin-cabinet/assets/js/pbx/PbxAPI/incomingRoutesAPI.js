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
    getDefaultRoute: ':getDefaultRoute',
    changePriority: ':changePriority',
    copy: ':copy'
  }
});
/**
 * Get or create default incoming route (ID=1)
 *
 * @param {function} callback - Callback function
 */

IncomingRoutesAPI.getDefaultRoute = function (callback) {
  $.api({
    url: "".concat(this.apiUrl, ":getDefaultRoute"),
    method: 'GET',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvaW5jb21pbmdSb3V0ZXNBUEkuanMiXSwibmFtZXMiOlsiSW5jb21pbmdSb3V0ZXNBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXREZWZhdWx0IiwiZ2V0RGVmYXVsdFJvdXRlIiwiY2hhbmdlUHJpb3JpdHkiLCJjb3B5IiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwiYXBpVXJsIiwibWV0aG9kIiwib24iLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsIm9uRmFpbHVyZSIsIm9uRXJyb3IiLCJyZXN1bHQiLCJtZXNzYWdlcyIsImVycm9yIiwicHJpb3JpdGllcyIsImRhdGEiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsaUJBQWlCLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUN2Q0MsRUFBQUEsUUFBUSxFQUFFLGlDQUQ2QjtBQUV2Q0MsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFVBQVUsRUFBRSxhQUREO0FBRVhDLElBQUFBLGVBQWUsRUFBRSxrQkFGTjtBQUdYQyxJQUFBQSxjQUFjLEVBQUUsaUJBSEw7QUFJWEMsSUFBQUEsSUFBSSxFQUFFO0FBSks7QUFGd0IsQ0FBakIsQ0FBMUI7QUFVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBUCxpQkFBaUIsQ0FBQ0ssZUFBbEIsR0FBb0MsVUFBU0csUUFBVCxFQUFtQjtBQUNuREMsRUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsSUFBQUEsR0FBRyxZQUFLLEtBQUtDLE1BQVYscUJBREQ7QUFFRkMsSUFBQUEsTUFBTSxFQUFFLEtBRk47QUFHRkMsSUFBQUEsRUFBRSxFQUFFLEtBSEY7QUFJRkMsSUFBQUEsU0FKRSxxQkFJUUMsUUFKUixFQUlrQjtBQUNoQlIsTUFBQUEsUUFBUSxDQUFDUSxRQUFELENBQVI7QUFDSCxLQU5DO0FBT0ZDLElBQUFBLFNBUEUscUJBT1FELFFBUFIsRUFPa0I7QUFDaEJSLE1BQUFBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ0gsS0FUQztBQVVGRSxJQUFBQSxPQVZFLHFCQVVRO0FBQ05WLE1BQUFBLFFBQVEsQ0FBQztBQUNMVyxRQUFBQSxNQUFNLEVBQUUsS0FESDtBQUVMQyxRQUFBQSxRQUFRLEVBQUU7QUFBRUMsVUFBQUEsS0FBSyxFQUFFLENBQUMsd0JBQUQ7QUFBVDtBQUZMLE9BQUQsQ0FBUjtBQUlIO0FBZkMsR0FBTjtBQWlCSCxDQWxCRDtBQW9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBckIsaUJBQWlCLENBQUNNLGNBQWxCLEdBQW1DLFVBQVNnQixVQUFULEVBQXFCZCxRQUFyQixFQUErQjtBQUM5REMsRUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsSUFBQUEsR0FBRyxZQUFLLEtBQUtDLE1BQVYsb0JBREQ7QUFFRkMsSUFBQUEsTUFBTSxFQUFFLE1BRk47QUFHRlUsSUFBQUEsSUFBSSxFQUFFO0FBQUVELE1BQUFBLFVBQVUsRUFBRUE7QUFBZCxLQUhKO0FBSUZSLElBQUFBLEVBQUUsRUFBRSxLQUpGO0FBS0ZDLElBQUFBLFNBTEUscUJBS1FDLFFBTFIsRUFLa0I7QUFDaEJSLE1BQUFBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ0gsS0FQQztBQVFGQyxJQUFBQSxTQVJFLHFCQVFRRCxRQVJSLEVBUWtCO0FBQ2hCUixNQUFBQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNILEtBVkM7QUFXRkUsSUFBQUEsT0FYRSxxQkFXUTtBQUNOVixNQUFBQSxRQUFRLENBQUM7QUFDTFcsUUFBQUEsTUFBTSxFQUFFLEtBREg7QUFFTEMsUUFBQUEsUUFBUSxFQUFFO0FBQUVDLFVBQUFBLEtBQUssRUFBRSxDQUFDLHdCQUFEO0FBQVQ7QUFGTCxPQUFELENBQVI7QUFJSDtBQWhCQyxHQUFOO0FBa0JILENBbkJEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaUNsaWVudCwgJCAqL1xuXG4vKipcbiAqIEluY29taW5nUm91dGVzQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBpbmNvbWluZyByb3V0ZXMgbWFuYWdlbWVudFxuICogXG4gKiBQcm92aWRlcyBhIGNsZWFuIGludGVyZmFjZSBmb3IgaW5jb21pbmcgcm91dGVzIG9wZXJhdGlvbnMgdXNpbmcgdGhlIG5ldyBSRVNUZnVsIEFQSS5cbiAqIFRoaXMgcmVwbGFjZXMgdGhlIGxlZ2FjeSB2MiBBUEkgY2xpZW50LlxuICogXG4gKiBAY2xhc3MgSW5jb21pbmdSb3V0ZXNBUElcbiAqL1xuY29uc3QgSW5jb21pbmdSb3V0ZXNBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9pbmNvbWluZy1yb3V0ZXMnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0RGVmYXVsdDogJzpnZXREZWZhdWx0JyxcbiAgICAgICAgZ2V0RGVmYXVsdFJvdXRlOiAnOmdldERlZmF1bHRSb3V0ZScsXG4gICAgICAgIGNoYW5nZVByaW9yaXR5OiAnOmNoYW5nZVByaW9yaXR5JyxcbiAgICAgICAgY29weTogJzpjb3B5J1xuICAgIH1cbn0pO1xuXG4vKipcbiAqIEdldCBvciBjcmVhdGUgZGVmYXVsdCBpbmNvbWluZyByb3V0ZSAoSUQ9MSlcbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gKi9cbkluY29taW5nUm91dGVzQVBJLmdldERlZmF1bHRSb3V0ZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgJC5hcGkoe1xuICAgICAgICB1cmw6IGAke3RoaXMuYXBpVXJsfTpnZXREZWZhdWx0Um91dGVgLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICB9LFxuICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7IGVycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXSB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBDaGFuZ2UgcHJpb3JpdHkgb2YgbXVsdGlwbGUgaW5jb21pbmcgcm91dGVzXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IHByaW9yaXRpZXMgLSBNYXAgb2Ygcm91dGUgSUQgdG8gbmV3IHByaW9yaXR5IHZhbHVlXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gKi9cbkluY29taW5nUm91dGVzQVBJLmNoYW5nZVByaW9yaXR5ID0gZnVuY3Rpb24ocHJpb3JpdGllcywgY2FsbGJhY2spIHtcbiAgICAkLmFwaSh7XG4gICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9OmNoYW5nZVByaW9yaXR5YCxcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGRhdGE6IHsgcHJpb3JpdGllczogcHJpb3JpdGllcyB9LFxuICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICB9LFxuICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7IGVycm9yOiBbJ05ldHdvcmsgZXJyb3Igb2NjdXJyZWQnXSB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufTsiXX0=