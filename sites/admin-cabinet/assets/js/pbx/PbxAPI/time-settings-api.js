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
 * TimeSettingsAPI - REST API v3 client for Time Settings management (Singleton resource)
 *
 * Provides a clean interface for Time Settings operations.
 * Time Settings is a singleton resource - there's only one time configuration in the system.
 *
 * @class TimeSettingsAPI 
 */
var TimeSettingsAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/time-settings',
  singleton: true,
  customMethods: {
    getAvailableTimezones: ':getAvailableTimezones'
  }
});
/**
 * Get Time Settings (Singleton GET)
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * TimeSettingsAPI.get((response) => {
 *     if (response.result) {
 *         console.log('Settings:', response.data);
 *         console.log('Current timezone:', response.data.PBXTimezone);
 *         console.log('Timezone representation:', response.data.PBXTimezone_represent);
 *     }
 * });
 */

TimeSettingsAPI.get = function (callback) {
  return this.callGet({}, callback);
}; // Alias for backward compatibility


TimeSettingsAPI.getSettings = TimeSettingsAPI.get;
/**
 * Update Time Settings (Singleton PUT)
 *
 * @param {object} data - Settings data to update
 * @param {function} callback - Callback function to handle the response
 * @example
 * TimeSettingsAPI.update({
 *     PBXTimezone: 'Europe/Moscow',
 *     NTPServer: 'pool.ntp.org',
 *     PBXManualTimeSettings: '0',
 *     ManualDateTime: '2025-01-01 12:00:00'
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Settings updated successfully');
 *     }
 * });
 */

TimeSettingsAPI.update = function (data, callback) {
  return this.callPut(data, callback);
}; // Alias for backward compatibility


TimeSettingsAPI.updateSettings = TimeSettingsAPI.update;
/**
 * Partially update Time Settings (Singleton PATCH)
 *
 * @param {object} data - Settings data to patch
 * @param {function} callback - Callback function to handle the response
 * @example
 * TimeSettingsAPI.patch({
 *     PBXTimezone: 'America/New_York'
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Timezone updated successfully');
 *     }
 * });
 */

TimeSettingsAPI.patch = function (data, callback) {
  return this.callPatch(data, callback);
};
/**
 * Get available timezones for selection (Custom method)
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * TimeSettingsAPI.getAvailableTimezones((response) => {
 *     if (response.result) {
 *         console.log('Available timezones:', response.data);
 *     }
 * });
 */


TimeSettingsAPI.getAvailableTimezones = function (callback) {
  return this.callCustomMethod('getAvailableTimezones', {}, callback);
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvdGltZS1zZXR0aW5ncy1hcGkuanMiXSwibmFtZXMiOlsiVGltZVNldHRpbmdzQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJzaW5nbGV0b24iLCJjdXN0b21NZXRob2RzIiwiZ2V0QXZhaWxhYmxlVGltZXpvbmVzIiwiZ2V0IiwiY2FsbGJhY2siLCJjYWxsR2V0IiwiZ2V0U2V0dGluZ3MiLCJ1cGRhdGUiLCJkYXRhIiwiY2FsbFB1dCIsInVwZGF0ZVNldHRpbmdzIiwicGF0Y2giLCJjYWxsUGF0Y2giLCJjYWxsQ3VzdG9tTWV0aG9kIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGVBQWUsR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQ3JDQyxFQUFBQSxRQUFRLEVBQUUsK0JBRDJCO0FBRXJDQyxFQUFBQSxTQUFTLEVBQUUsSUFGMEI7QUFHckNDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxxQkFBcUIsRUFBRTtBQURaO0FBSHNCLENBQWpCLENBQXhCO0FBUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FMLGVBQWUsQ0FBQ00sR0FBaEIsR0FBc0IsVUFBU0MsUUFBVCxFQUFtQjtBQUNyQyxTQUFPLEtBQUtDLE9BQUwsQ0FBYSxFQUFiLEVBQWlCRCxRQUFqQixDQUFQO0FBQ0gsQ0FGRCxDLENBSUE7OztBQUNBUCxlQUFlLENBQUNTLFdBQWhCLEdBQThCVCxlQUFlLENBQUNNLEdBQTlDO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQU4sZUFBZSxDQUFDVSxNQUFoQixHQUF5QixVQUFTQyxJQUFULEVBQWVKLFFBQWYsRUFBeUI7QUFDOUMsU0FBTyxLQUFLSyxPQUFMLENBQWFELElBQWIsRUFBbUJKLFFBQW5CLENBQVA7QUFDSCxDQUZELEMsQ0FJQTs7O0FBQ0FQLGVBQWUsQ0FBQ2EsY0FBaEIsR0FBaUNiLGVBQWUsQ0FBQ1UsTUFBakQ7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBVixlQUFlLENBQUNjLEtBQWhCLEdBQXdCLFVBQVNILElBQVQsRUFBZUosUUFBZixFQUF5QjtBQUM3QyxTQUFPLEtBQUtRLFNBQUwsQ0FBZUosSUFBZixFQUFxQkosUUFBckIsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQVAsZUFBZSxDQUFDSyxxQkFBaEIsR0FBd0MsVUFBU0UsUUFBVCxFQUFtQjtBQUN2RCxTQUFPLEtBQUtTLGdCQUFMLENBQXNCLHVCQUF0QixFQUErQyxFQUEvQyxFQUFtRFQsUUFBbkQsQ0FBUDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpQ2xpZW50LCAkICovXG5cbi8qKlxuICogVGltZVNldHRpbmdzQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBUaW1lIFNldHRpbmdzIG1hbmFnZW1lbnQgKFNpbmdsZXRvbiByZXNvdXJjZSlcbiAqXG4gKiBQcm92aWRlcyBhIGNsZWFuIGludGVyZmFjZSBmb3IgVGltZSBTZXR0aW5ncyBvcGVyYXRpb25zLlxuICogVGltZSBTZXR0aW5ncyBpcyBhIHNpbmdsZXRvbiByZXNvdXJjZSAtIHRoZXJlJ3Mgb25seSBvbmUgdGltZSBjb25maWd1cmF0aW9uIGluIHRoZSBzeXN0ZW0uXG4gKlxuICogQGNsYXNzIFRpbWVTZXR0aW5nc0FQSSBcbiAqL1xuY29uc3QgVGltZVNldHRpbmdzQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvdGltZS1zZXR0aW5ncycsXG4gICAgc2luZ2xldG9uOiB0cnVlLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0QXZhaWxhYmxlVGltZXpvbmVzOiAnOmdldEF2YWlsYWJsZVRpbWV6b25lcydcbiAgICB9XG59KTtcblxuLyoqXG4gKiBHZXQgVGltZSBTZXR0aW5ncyAoU2luZ2xldG9uIEdFVClcbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBUaW1lU2V0dGluZ3NBUEkuZ2V0KChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1NldHRpbmdzOicsIHJlc3BvbnNlLmRhdGEpO1xuICogICAgICAgICBjb25zb2xlLmxvZygnQ3VycmVudCB0aW1lem9uZTonLCByZXNwb25zZS5kYXRhLlBCWFRpbWV6b25lKTtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1RpbWV6b25lIHJlcHJlc2VudGF0aW9uOicsIHJlc3BvbnNlLmRhdGEuUEJYVGltZXpvbmVfcmVwcmVzZW50KTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuVGltZVNldHRpbmdzQVBJLmdldCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEdldCh7fSwgY2FsbGJhY2spO1xufTtcblxuLy8gQWxpYXMgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcblRpbWVTZXR0aW5nc0FQSS5nZXRTZXR0aW5ncyA9IFRpbWVTZXR0aW5nc0FQSS5nZXQ7XG5cbi8qKlxuICogVXBkYXRlIFRpbWUgU2V0dGluZ3MgKFNpbmdsZXRvbiBQVVQpXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTZXR0aW5ncyBkYXRhIHRvIHVwZGF0ZVxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogVGltZVNldHRpbmdzQVBJLnVwZGF0ZSh7XG4gKiAgICAgUEJYVGltZXpvbmU6ICdFdXJvcGUvTW9zY293JyxcbiAqICAgICBOVFBTZXJ2ZXI6ICdwb29sLm50cC5vcmcnLFxuICogICAgIFBCWE1hbnVhbFRpbWVTZXR0aW5nczogJzAnLFxuICogICAgIE1hbnVhbERhdGVUaW1lOiAnMjAyNS0wMS0wMSAxMjowMDowMCdcbiAqIH0sIChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1NldHRpbmdzIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cblRpbWVTZXR0aW5nc0FQSS51cGRhdGUgPSBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxQdXQoZGF0YSwgY2FsbGJhY2spO1xufTtcblxuLy8gQWxpYXMgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcblRpbWVTZXR0aW5nc0FQSS51cGRhdGVTZXR0aW5ncyA9IFRpbWVTZXR0aW5nc0FQSS51cGRhdGU7XG5cbi8qKlxuICogUGFydGlhbGx5IHVwZGF0ZSBUaW1lIFNldHRpbmdzIChTaW5nbGV0b24gUEFUQ0gpXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTZXR0aW5ncyBkYXRhIHRvIHBhdGNoXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBUaW1lU2V0dGluZ3NBUEkucGF0Y2goe1xuICogICAgIFBCWFRpbWV6b25lOiAnQW1lcmljYS9OZXdfWW9yaydcbiAqIH0sIChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1RpbWV6b25lIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cblRpbWVTZXR0aW5nc0FQSS5wYXRjaCA9IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbFBhdGNoKGRhdGEsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogR2V0IGF2YWlsYWJsZSB0aW1lem9uZXMgZm9yIHNlbGVjdGlvbiAoQ3VzdG9tIG1ldGhvZClcbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBUaW1lU2V0dGluZ3NBUEkuZ2V0QXZhaWxhYmxlVGltZXpvbmVzKChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ0F2YWlsYWJsZSB0aW1lem9uZXM6JywgcmVzcG9uc2UuZGF0YSk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cblRpbWVTZXR0aW5nc0FQSS5nZXRBdmFpbGFibGVUaW1lem9uZXMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldEF2YWlsYWJsZVRpbWV6b25lcycsIHt9LCBjYWxsYmFjayk7XG59OyJdfQ==