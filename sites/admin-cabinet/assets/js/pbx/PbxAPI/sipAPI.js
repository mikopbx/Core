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
 * This module encapsulates a collection of functions related to SIP records
 *
 * @module SipAPI
 */
var SipAPI = {
  /**
   * Get SIP password for selected extension.
   * @param {string} number - The number of the extension.
   * @param {function} callback - The callback function
   */
  getSecret: function getSecret(number, callback) {
    var secret = '';
    $.api({
      url: PbxApi.sipGetSecret,
      on: 'now',
      urlData: {
        number: number
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      }
    });
    return secret;
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvc2lwQVBJLmpzIl0sIm5hbWVzIjpbIlNpcEFQSSIsImdldFNlY3JldCIsIm51bWJlciIsImNhbGxiYWNrIiwic2VjcmV0IiwiJCIsImFwaSIsInVybCIsIlBieEFwaSIsInNpcEdldFNlY3JldCIsIm9uIiwidXJsRGF0YSIsInN1Y2Nlc3NUZXN0Iiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJvbkZhaWx1cmUiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUEsSUFBTUEsTUFBTSxHQUFFO0FBQ1Y7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQU5VLHFCQU1DQyxNQU5ELEVBTVNDLFFBTlQsRUFNbUI7QUFDekIsUUFBSUMsTUFBTSxHQUFHLEVBQWI7QUFDQUMsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFQyxNQUFNLENBQUNDLFlBRFY7QUFFRkMsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRkMsTUFBQUEsT0FBTyxFQUFFO0FBQ0xULFFBQUFBLE1BQU0sRUFBRUE7QUFESCxPQUhQO0FBTUZVLE1BQUFBLFdBQVcsRUFBRUosTUFBTSxDQUFDSSxXQU5sQjtBQU9GQyxNQUFBQSxTQVBFLHFCQU9RQyxRQVBSLEVBT2tCO0FBQ2hCWCxRQUFBQSxRQUFRLENBQUNXLFFBQUQsQ0FBUjtBQUNILE9BVEM7QUFVRkMsTUFBQUEsU0FWRSxxQkFVUUQsUUFWUixFQVVrQjtBQUNoQlgsUUFBQUEsUUFBUSxDQUFDVyxRQUFELENBQVI7QUFDSDtBQVpDLEtBQU47QUFjQSxXQUFPVixNQUFQO0FBQ0g7QUF2QlMsQ0FBZCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIFRoaXMgbW9kdWxlIGVuY2Fwc3VsYXRlcyBhIGNvbGxlY3Rpb24gb2YgZnVuY3Rpb25zIHJlbGF0ZWQgdG8gU0lQIHJlY29yZHNcbiAqXG4gKiBAbW9kdWxlIFNpcEFQSVxuICovXG5cbmNvbnN0IFNpcEFQST0ge1xuICAgIC8qKlxuICAgICAqIEdldCBTSVAgcGFzc3dvcmQgZm9yIHNlbGVjdGVkIGV4dGVuc2lvbi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbnVtYmVyIC0gVGhlIG51bWJlciBvZiB0aGUgZXh0ZW5zaW9uLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0U2VjcmV0KCBudW1iZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIGxldCBzZWNyZXQgPSAnJztcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc2lwR2V0U2VjcmV0LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgIG51bWJlcjogbnVtYmVyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHNlY3JldDtcbiAgICB9LFxufSJdfQ==