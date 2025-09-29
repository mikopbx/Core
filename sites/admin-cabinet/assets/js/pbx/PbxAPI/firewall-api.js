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
 * FirewallAPI - REST API v3 client for firewall management
 * 
 * Provides a clean interface for firewall operations using the new RESTful API.
 * 
 * @class FirewallAPI
 */
var FirewallAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/firewall',
  customMethods: {
    getDefault: ':getDefault',
    getBannedIps: ':getBannedIps',
    unbanIp: ':unbanIp',
    enable: ':enable',
    disable: ':disable'
  }
}); // Use FirewallAPI.getRecord('new', callback) for default values

/**
 * Get list of banned IP addresses
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.getBannedIps((response) => {
 *     if (response.result) {
 *         console.log('Banned IPs:', response.data);
 *     }
 * });
 */

FirewallAPI.getBannedIps = function (callback) {
  return this.callCustomMethod('getBannedIps', {}, callback);
};
/**
 * Unban an IP address
 * 
 * @param {string} ip - IP address to unban
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.unbanIp('192.168.1.100', (response) => {
 *     if (response.result) {
 *         console.log('IP unbanned successfully');
 *     }
 * });
 */


FirewallAPI.unbanIp = function (ip, callback) {
  return this.callCustomMethod('unbanIp', {
    ip: ip
  }, callback, 'POST');
};
/**
 * Enable firewall and fail2ban
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.enable((response) => {
 *     if (response.result) {
 *         console.log('Firewall enabled');
 *     }
 * });
 */


FirewallAPI.enable = function (callback) {
  return this.callCustomMethod('enable', {}, callback, 'POST');
};
/**
 * Disable firewall and fail2ban
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.disable((response) => {
 *     if (response.result) {
 *         console.log('Firewall disabled');
 *     }
 * });
 */


FirewallAPI.disable = function (callback) {
  return this.callCustomMethod('disable', {}, callback, 'POST');
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZmlyZXdhbGwtYXBpLmpzIl0sIm5hbWVzIjpbIkZpcmV3YWxsQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiZ2V0RGVmYXVsdCIsImdldEJhbm5lZElwcyIsInVuYmFuSXAiLCJlbmFibGUiLCJkaXNhYmxlIiwiY2FsbGJhY2siLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaXAiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFdBQVcsR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQ2pDQyxFQUFBQSxRQUFRLEVBQUUsMEJBRHVCO0FBRWpDQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsVUFBVSxFQUFFLGFBREQ7QUFFWEMsSUFBQUEsWUFBWSxFQUFFLGVBRkg7QUFHWEMsSUFBQUEsT0FBTyxFQUFFLFVBSEU7QUFJWEMsSUFBQUEsTUFBTSxFQUFFLFNBSkc7QUFLWEMsSUFBQUEsT0FBTyxFQUFFO0FBTEU7QUFGa0IsQ0FBakIsQ0FBcEIsQyxDQVdBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FSLFdBQVcsQ0FBQ0ssWUFBWixHQUEyQixVQUFTSSxRQUFULEVBQW1CO0FBQzFDLFNBQU8sS0FBS0MsZ0JBQUwsQ0FBc0IsY0FBdEIsRUFBc0MsRUFBdEMsRUFBMENELFFBQTFDLENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQVQsV0FBVyxDQUFDTSxPQUFaLEdBQXNCLFVBQVNLLEVBQVQsRUFBYUYsUUFBYixFQUF1QjtBQUN6QyxTQUFPLEtBQUtDLGdCQUFMLENBQXNCLFNBQXRCLEVBQWlDO0FBQUVDLElBQUFBLEVBQUUsRUFBRUE7QUFBTixHQUFqQyxFQUE2Q0YsUUFBN0MsRUFBdUQsTUFBdkQsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQVQsV0FBVyxDQUFDTyxNQUFaLEdBQXFCLFVBQVNFLFFBQVQsRUFBbUI7QUFDcEMsU0FBTyxLQUFLQyxnQkFBTCxDQUFzQixRQUF0QixFQUFnQyxFQUFoQyxFQUFvQ0QsUUFBcEMsRUFBOEMsTUFBOUMsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQVQsV0FBVyxDQUFDUSxPQUFaLEdBQXNCLFVBQVNDLFFBQVQsRUFBbUI7QUFDckMsU0FBTyxLQUFLQyxnQkFBTCxDQUFzQixTQUF0QixFQUFpQyxFQUFqQyxFQUFxQ0QsUUFBckMsRUFBK0MsTUFBL0MsQ0FBUDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpQ2xpZW50LCAkICovIFxuXG4vKipcbiAqIEZpcmV3YWxsQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBmaXJld2FsbCBtYW5hZ2VtZW50XG4gKiBcbiAqIFByb3ZpZGVzIGEgY2xlYW4gaW50ZXJmYWNlIGZvciBmaXJld2FsbCBvcGVyYXRpb25zIHVzaW5nIHRoZSBuZXcgUkVTVGZ1bCBBUEkuXG4gKiBcbiAqIEBjbGFzcyBGaXJld2FsbEFQSVxuICovXG5jb25zdCBGaXJld2FsbEFQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL2ZpcmV3YWxsJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIGdldERlZmF1bHQ6ICc6Z2V0RGVmYXVsdCcsXG4gICAgICAgIGdldEJhbm5lZElwczogJzpnZXRCYW5uZWRJcHMnLFxuICAgICAgICB1bmJhbklwOiAnOnVuYmFuSXAnLFxuICAgICAgICBlbmFibGU6ICc6ZW5hYmxlJyxcbiAgICAgICAgZGlzYWJsZTogJzpkaXNhYmxlJ1xuICAgIH1cbn0pO1xuXG4vLyBVc2UgRmlyZXdhbGxBUEkuZ2V0UmVjb3JkKCduZXcnLCBjYWxsYmFjaykgZm9yIGRlZmF1bHQgdmFsdWVzXG5cbi8qKlxuICogR2V0IGxpc3Qgb2YgYmFubmVkIElQIGFkZHJlc3Nlc1xuICogXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBGaXJld2FsbEFQSS5nZXRCYW5uZWRJcHMoKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnQmFubmVkIElQczonLCByZXNwb25zZS5kYXRhKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuRmlyZXdhbGxBUEkuZ2V0QmFubmVkSXBzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRCYW5uZWRJcHMnLCB7fSwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBVbmJhbiBhbiBJUCBhZGRyZXNzXG4gKiBcbiAqIEBwYXJhbSB7c3RyaW5nfSBpcCAtIElQIGFkZHJlc3MgdG8gdW5iYW5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICogQGV4YW1wbGVcbiAqIEZpcmV3YWxsQVBJLnVuYmFuSXAoJzE5Mi4xNjguMS4xMDAnLCAocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdJUCB1bmJhbm5lZCBzdWNjZXNzZnVsbHknKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuRmlyZXdhbGxBUEkudW5iYW5JcCA9IGZ1bmN0aW9uKGlwLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ3VuYmFuSXAnLCB7IGlwOiBpcCB9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbn07XG5cbi8qKlxuICogRW5hYmxlIGZpcmV3YWxsIGFuZCBmYWlsMmJhblxuICogXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBGaXJld2FsbEFQSS5lbmFibGUoKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnRmlyZXdhbGwgZW5hYmxlZCcpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5GaXJld2FsbEFQSS5lbmFibGUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2VuYWJsZScsIHt9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbn07XG5cbi8qKlxuICogRGlzYWJsZSBmaXJld2FsbCBhbmQgZmFpbDJiYW5cbiAqIFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogRmlyZXdhbGxBUEkuZGlzYWJsZSgocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdGaXJld2FsbCBkaXNhYmxlZCcpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5GaXJld2FsbEFQSS5kaXNhYmxlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdkaXNhYmxlJywge30sIGNhbGxiYWNrLCAnUE9TVCcpO1xufTsiXX0=