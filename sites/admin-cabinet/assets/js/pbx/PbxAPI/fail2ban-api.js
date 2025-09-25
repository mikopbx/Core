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
 * Fail2BanAPI - REST API v3 client for Fail2Ban management (Singleton resource)
 *
 * Provides a clean interface for Fail2Ban operations.
 * Fail2Ban is a singleton resource - there's only one configuration in the system.
 *
 * @class Fail2BanAPI
 */
var Fail2BanAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/fail2ban',
  singleton: true
});
/**
 * Get Fail2Ban settings (Singleton GET)
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * Fail2BanAPI.get((response) => {
 *     if (response.result) {
 *         console.log('Settings:', response.data);
 *     }
 * });
 */

Fail2BanAPI.get = function (callback) {
  return this.callGet({}, callback);
}; // Alias for backward compatibility


Fail2BanAPI.getSettings = Fail2BanAPI.get;
/**
 * Update Fail2Ban settings (Singleton PUT)
 *
 * @param {object} data - Settings data to update
 * @param {function} callback - Callback function to handle the response
 * @example
 * Fail2BanAPI.update({
 *     maxretry: 5,
 *     bantime: 86400,
 *     findtime: 1800,
 *     whitelist: '192.168.1.0/24'
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Settings updated successfully');
 *     }
 * });
 */

Fail2BanAPI.update = function (data, callback) {
  return this.callPut(data, callback);
}; // Alias for backward compatibility


Fail2BanAPI.updateSettings = Fail2BanAPI.update;
/**
 * Partially update Fail2Ban settings (Singleton PATCH)
 *
 * @param {object} data - Settings data to patch
 * @param {function} callback - Callback function to handle the response
 * @example
 * Fail2BanAPI.patch({
 *     maxretry: 10
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Settings patched successfully');
 *     }
 * });
 */

Fail2BanAPI.patch = function (data, callback) {
  return this.callPatch(data, callback);
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZmFpbDJiYW4tYXBpLmpzIl0sIm5hbWVzIjpbIkZhaWwyQmFuQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJzaW5nbGV0b24iLCJnZXQiLCJjYWxsYmFjayIsImNhbGxHZXQiLCJnZXRTZXR0aW5ncyIsInVwZGF0ZSIsImRhdGEiLCJjYWxsUHV0IiwidXBkYXRlU2V0dGluZ3MiLCJwYXRjaCIsImNhbGxQYXRjaCJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxXQUFXLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUNqQ0MsRUFBQUEsUUFBUSxFQUFFLDBCQUR1QjtBQUVqQ0MsRUFBQUEsU0FBUyxFQUFFO0FBRnNCLENBQWpCLENBQXBCO0FBS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQUgsV0FBVyxDQUFDSSxHQUFaLEdBQWtCLFVBQVNDLFFBQVQsRUFBbUI7QUFDakMsU0FBTyxLQUFLQyxPQUFMLENBQWEsRUFBYixFQUFpQkQsUUFBakIsQ0FBUDtBQUNILENBRkQsQyxDQUlBOzs7QUFDQUwsV0FBVyxDQUFDTyxXQUFaLEdBQTBCUCxXQUFXLENBQUNJLEdBQXRDO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQUosV0FBVyxDQUFDUSxNQUFaLEdBQXFCLFVBQVNDLElBQVQsRUFBZUosUUFBZixFQUF5QjtBQUMxQyxTQUFPLEtBQUtLLE9BQUwsQ0FBYUQsSUFBYixFQUFtQkosUUFBbkIsQ0FBUDtBQUNILENBRkQsQyxDQUlBOzs7QUFDQUwsV0FBVyxDQUFDVyxjQUFaLEdBQTZCWCxXQUFXLENBQUNRLE1BQXpDO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQVIsV0FBVyxDQUFDWSxLQUFaLEdBQW9CLFVBQVNILElBQVQsRUFBZUosUUFBZixFQUF5QjtBQUN6QyxTQUFPLEtBQUtRLFNBQUwsQ0FBZUosSUFBZixFQUFxQkosUUFBckIsQ0FBUDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpQ2xpZW50LCAkICovIFxuXG4vKipcbiAqIEZhaWwyQmFuQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBGYWlsMkJhbiBtYW5hZ2VtZW50IChTaW5nbGV0b24gcmVzb3VyY2UpXG4gKlxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIEZhaWwyQmFuIG9wZXJhdGlvbnMuXG4gKiBGYWlsMkJhbiBpcyBhIHNpbmdsZXRvbiByZXNvdXJjZSAtIHRoZXJlJ3Mgb25seSBvbmUgY29uZmlndXJhdGlvbiBpbiB0aGUgc3lzdGVtLlxuICpcbiAqIEBjbGFzcyBGYWlsMkJhbkFQSVxuICovXG5jb25zdCBGYWlsMkJhbkFQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL2ZhaWwyYmFuJyxcbiAgICBzaW5nbGV0b246IHRydWVcbn0pO1xuXG4vKipcbiAqIEdldCBGYWlsMkJhbiBzZXR0aW5ncyAoU2luZ2xldG9uIEdFVClcbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBGYWlsMkJhbkFQSS5nZXQoKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnU2V0dGluZ3M6JywgcmVzcG9uc2UuZGF0YSk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cbkZhaWwyQmFuQVBJLmdldCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEdldCh7fSwgY2FsbGJhY2spO1xufTtcblxuLy8gQWxpYXMgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbkZhaWwyQmFuQVBJLmdldFNldHRpbmdzID0gRmFpbDJCYW5BUEkuZ2V0O1xuXG4vKipcbiAqIFVwZGF0ZSBGYWlsMkJhbiBzZXR0aW5ncyAoU2luZ2xldG9uIFBVVClcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFNldHRpbmdzIGRhdGEgdG8gdXBkYXRlXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBGYWlsMkJhbkFQSS51cGRhdGUoe1xuICogICAgIG1heHJldHJ5OiA1LFxuICogICAgIGJhbnRpbWU6IDg2NDAwLFxuICogICAgIGZpbmR0aW1lOiAxODAwLFxuICogICAgIHdoaXRlbGlzdDogJzE5Mi4xNjguMS4wLzI0J1xuICogfSwgKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnU2V0dGluZ3MgdXBkYXRlZCBzdWNjZXNzZnVsbHknKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuRmFpbDJCYW5BUEkudXBkYXRlID0gZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsUHV0KGRhdGEsIGNhbGxiYWNrKTtcbn07XG5cbi8vIEFsaWFzIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG5GYWlsMkJhbkFQSS51cGRhdGVTZXR0aW5ncyA9IEZhaWwyQmFuQVBJLnVwZGF0ZTtcblxuLyoqXG4gKiBQYXJ0aWFsbHkgdXBkYXRlIEZhaWwyQmFuIHNldHRpbmdzIChTaW5nbGV0b24gUEFUQ0gpXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTZXR0aW5ncyBkYXRhIHRvIHBhdGNoXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBGYWlsMkJhbkFQSS5wYXRjaCh7XG4gKiAgICAgbWF4cmV0cnk6IDEwXG4gKiB9LCAocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdTZXR0aW5ncyBwYXRjaGVkIHN1Y2Nlc3NmdWxseScpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5GYWlsMkJhbkFQSS5wYXRjaCA9IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbFBhdGNoKGRhdGEsIGNhbGxiYWNrKTtcbn07Il19