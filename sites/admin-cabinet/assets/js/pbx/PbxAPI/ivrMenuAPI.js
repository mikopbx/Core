"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global PbxApi, globalTranslate */

/**
 * This module encapsulates a collection of functions related to Call queues.
 *
 * @module Call queues
 */
var IVRMenuAPI = {
  /**
   * Deletes the ivr menu record with its dependent tables.
   *
   * @param {string} id - id of deleting ivr menu record.
   * @param {function} callback - The callback function to handle the API response.
   */
  deleteRecord: function deleteRecord(id, callback) {
    $.api({
      url: PbxApi.ivrMenuDeleteRecord,
      on: 'now',
      method: 'POST',
      data: {
        id: id
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
      }
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvaXZyTWVudUFQSS5qcyJdLCJuYW1lcyI6WyJJVlJNZW51QVBJIiwiZGVsZXRlUmVjb3JkIiwiaWQiLCJjYWxsYmFjayIsIiQiLCJhcGkiLCJ1cmwiLCJQYnhBcGkiLCJpdnJNZW51RGVsZXRlUmVjb3JkIiwib24iLCJtZXRob2QiLCJkYXRhIiwic3VjY2Vzc1Rlc3QiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsIm9uRmFpbHVyZSIsIm9uRXJyb3IiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUEsSUFBTUEsVUFBVSxHQUFFO0FBQ2Q7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBUGMsd0JBT0RDLEVBUEMsRUFPR0MsUUFQSCxFQU9hO0FBQ3ZCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUVDLE1BQU0sQ0FBQ0MsbUJBRFY7QUFFRkMsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRkMsTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkMsTUFBQUEsSUFBSSxFQUFFO0FBQUNULFFBQUFBLEVBQUUsRUFBRkE7QUFBRCxPQUpKO0FBS0ZVLE1BQUFBLFdBQVcsRUFBRUwsTUFBTSxDQUFDSyxXQUxsQjtBQU1GQyxNQUFBQSxTQU5FLHFCQU1RQyxRQU5SLEVBTWtCO0FBQ2hCWCxRQUFBQSxRQUFRLENBQUNXLFFBQUQsQ0FBUjtBQUNILE9BUkM7QUFTRkMsTUFBQUEsU0FURSxxQkFTUUQsUUFUUixFQVNrQjtBQUNoQlgsUUFBQUEsUUFBUSxDQUFDVyxRQUFELENBQVI7QUFDSCxPQVhDO0FBWUZFLE1BQUFBLE9BWkUscUJBWVE7QUFDTmIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSDtBQXhCYSxDQUFsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIFRoaXMgbW9kdWxlIGVuY2Fwc3VsYXRlcyBhIGNvbGxlY3Rpb24gb2YgZnVuY3Rpb25zIHJlbGF0ZWQgdG8gQ2FsbCBxdWV1ZXMuXG4gKlxuICogQG1vZHVsZSBDYWxsIHF1ZXVlc1xuICovXG5cbmNvbnN0IElWUk1lbnVBUEk9IHtcbiAgICAvKipcbiAgICAgKiBEZWxldGVzIHRoZSBpdnIgbWVudSByZWNvcmQgd2l0aCBpdHMgZGVwZW5kZW50IHRhYmxlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIGlkIG9mIGRlbGV0aW5nIGl2ciBtZW51IHJlY29yZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIEFQSSByZXNwb25zZS5cbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQoaWQsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLml2ck1lbnVEZWxldGVSZWNvcmQsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtpZH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG59Il19