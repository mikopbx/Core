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

/* global Config, PbxApi */

/**
 * CdrAPI - Call Detail Records API
 *
 * Provides methods for working with call records and active channels.
 *
 * @class CdrAPI
 */
var CdrAPI = {
  /**
   * Get active channels (calls in progress)
   * @param {function} callback - Callback function
   */
  getActiveChannels: function getActiveChannels(callback) {
    $.api({
      url: "".concat(Config.pbxUrl, "/pbxcore/api/cdr/getActiveChannels"),
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        if (Object.keys(response).length > 0) {
          callback(response.data);
        } else {
          callback(false);
        }
      },
      onError: function onError(errorMessage, element, xhr) {
        if (xhr.status === 401) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
      }
    });
  }
}; // Export for use in other modules

window.CdrAPI = CdrAPI;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvY2RyLWFwaS5qcyJdLCJuYW1lcyI6WyJDZHJBUEkiLCJnZXRBY3RpdmVDaGFubmVscyIsImNhbGxiYWNrIiwiJCIsImFwaSIsInVybCIsIkNvbmZpZyIsInBieFVybCIsIm9uIiwic3VjY2Vzc1Rlc3QiLCJQYnhBcGkiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJkYXRhIiwib25FcnJvciIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE1BQU0sR0FBRztBQUNYO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUxXLDZCQUtPQyxRQUxQLEVBS2lCO0FBQ3hCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLFlBQUtDLE1BQU0sQ0FBQ0MsTUFBWix1Q0FERDtBQUVGQyxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGQyxNQUFBQSxXQUFXLEVBQUVDLE1BQU0sQ0FBQ0QsV0FIbEI7QUFJRkUsTUFBQUEsU0FKRSxxQkFJUUMsUUFKUixFQUlrQjtBQUNoQixZQUFJQyxNQUFNLENBQUNDLElBQVAsQ0FBWUYsUUFBWixFQUFzQkcsTUFBdEIsR0FBK0IsQ0FBbkMsRUFBc0M7QUFDbENiLFVBQUFBLFFBQVEsQ0FBQ1UsUUFBUSxDQUFDSSxJQUFWLENBQVI7QUFDSCxTQUZELE1BRU87QUFDSGQsVUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBQ0osT0FWQztBQVdGZSxNQUFBQSxPQVhFLG1CQVdNQyxZQVhOLEVBV29CQyxPQVhwQixFQVc2QkMsR0FYN0IsRUFXa0M7QUFDaEMsWUFBSUEsR0FBRyxDQUFDQyxNQUFKLEtBQWUsR0FBbkIsRUFBd0I7QUFDcEJDLFVBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQkMsYUFBckI7QUFDSDtBQUNKO0FBZkMsS0FBTjtBQWlCSDtBQXZCVSxDQUFmLEMsQ0EwQkE7O0FBQ0FGLE1BQU0sQ0FBQ3RCLE1BQVAsR0FBZ0JBLE1BQWhCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIENvbmZpZywgUGJ4QXBpICovIFxuXG4vKipcbiAqIENkckFQSSAtIENhbGwgRGV0YWlsIFJlY29yZHMgQVBJXG4gKlxuICogUHJvdmlkZXMgbWV0aG9kcyBmb3Igd29ya2luZyB3aXRoIGNhbGwgcmVjb3JkcyBhbmQgYWN0aXZlIGNoYW5uZWxzLlxuICpcbiAqIEBjbGFzcyBDZHJBUElcbiAqL1xuY29uc3QgQ2RyQVBJID0ge1xuICAgIC8qKlxuICAgICAqIEdldCBhY3RpdmUgY2hhbm5lbHMgKGNhbGxzIGluIHByb2dyZXNzKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRBY3RpdmVDaGFubmVscyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDaGFubmVsc2AsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuQ2RyQVBJID0gQ2RyQVBJOyJdfQ==