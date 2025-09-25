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
});
/**
 * Get default values for a new firewall rule
 * 
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.getDefault((response) => {
 *     if (response.result) {
 *         console.log('Default values:', response.data);
 *     }
 * });
 */

FirewallAPI.getDefault = function (callback) {
  return this.callCustomMethod('getDefault', {}, callback);
};
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZmlyZXdhbGwtYXBpLmpzIl0sIm5hbWVzIjpbIkZpcmV3YWxsQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiZ2V0RGVmYXVsdCIsImdldEJhbm5lZElwcyIsInVuYmFuSXAiLCJlbmFibGUiLCJkaXNhYmxlIiwiY2FsbGJhY2siLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaXAiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFdBQVcsR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQ2pDQyxFQUFBQSxRQUFRLEVBQUUsMEJBRHVCO0FBRWpDQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsVUFBVSxFQUFFLGFBREQ7QUFFWEMsSUFBQUEsWUFBWSxFQUFFLGVBRkg7QUFHWEMsSUFBQUEsT0FBTyxFQUFFLFVBSEU7QUFJWEMsSUFBQUEsTUFBTSxFQUFFLFNBSkc7QUFLWEMsSUFBQUEsT0FBTyxFQUFFO0FBTEU7QUFGa0IsQ0FBakIsQ0FBcEI7QUFXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBUixXQUFXLENBQUNJLFVBQVosR0FBeUIsVUFBU0ssUUFBVCxFQUFtQjtBQUN4QyxTQUFPLEtBQUtDLGdCQUFMLENBQXNCLFlBQXRCLEVBQW9DLEVBQXBDLEVBQXdDRCxRQUF4QyxDQUFQO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBVCxXQUFXLENBQUNLLFlBQVosR0FBMkIsVUFBU0ksUUFBVCxFQUFtQjtBQUMxQyxTQUFPLEtBQUtDLGdCQUFMLENBQXNCLGNBQXRCLEVBQXNDLEVBQXRDLEVBQTBDRCxRQUExQyxDQUFQO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FULFdBQVcsQ0FBQ00sT0FBWixHQUFzQixVQUFTSyxFQUFULEVBQWFGLFFBQWIsRUFBdUI7QUFDekMsU0FBTyxLQUFLQyxnQkFBTCxDQUFzQixTQUF0QixFQUFpQztBQUFFQyxJQUFBQSxFQUFFLEVBQUVBO0FBQU4sR0FBakMsRUFBNkNGLFFBQTdDLEVBQXVELE1BQXZELENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FULFdBQVcsQ0FBQ08sTUFBWixHQUFxQixVQUFTRSxRQUFULEVBQW1CO0FBQ3BDLFNBQU8sS0FBS0MsZ0JBQUwsQ0FBc0IsUUFBdEIsRUFBZ0MsRUFBaEMsRUFBb0NELFFBQXBDLEVBQThDLE1BQTlDLENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FULFdBQVcsQ0FBQ1EsT0FBWixHQUFzQixVQUFTQyxRQUFULEVBQW1CO0FBQ3JDLFNBQU8sS0FBS0MsZ0JBQUwsQ0FBc0IsU0FBdEIsRUFBaUMsRUFBakMsRUFBcUNELFFBQXJDLEVBQStDLE1BQS9DLENBQVA7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaUNsaWVudCwgJCAqLyBcblxuLyoqXG4gKiBGaXJld2FsbEFQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgZmlyZXdhbGwgbWFuYWdlbWVudFxuICogXG4gKiBQcm92aWRlcyBhIGNsZWFuIGludGVyZmFjZSBmb3IgZmlyZXdhbGwgb3BlcmF0aW9ucyB1c2luZyB0aGUgbmV3IFJFU1RmdWwgQVBJLlxuICogXG4gKiBAY2xhc3MgRmlyZXdhbGxBUElcbiAqL1xuY29uc3QgRmlyZXdhbGxBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9maXJld2FsbCcsXG4gICAgY3VzdG9tTWV0aG9kczoge1xuICAgICAgICBnZXREZWZhdWx0OiAnOmdldERlZmF1bHQnLFxuICAgICAgICBnZXRCYW5uZWRJcHM6ICc6Z2V0QmFubmVkSXBzJyxcbiAgICAgICAgdW5iYW5JcDogJzp1bmJhbklwJyxcbiAgICAgICAgZW5hYmxlOiAnOmVuYWJsZScsXG4gICAgICAgIGRpc2FibGU6ICc6ZGlzYWJsZSdcbiAgICB9XG59KTtcblxuLyoqXG4gKiBHZXQgZGVmYXVsdCB2YWx1ZXMgZm9yIGEgbmV3IGZpcmV3YWxsIHJ1bGVcbiAqIFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogRmlyZXdhbGxBUEkuZ2V0RGVmYXVsdCgocmVzcG9uc2UpID0+IHtcbiAqICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdEZWZhdWx0IHZhbHVlczonLCByZXNwb25zZS5kYXRhKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuRmlyZXdhbGxBUEkuZ2V0RGVmYXVsdCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0RGVmYXVsdCcsIHt9LCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIEdldCBsaXN0IG9mIGJhbm5lZCBJUCBhZGRyZXNzZXNcbiAqIFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogRmlyZXdhbGxBUEkuZ2V0QmFubmVkSXBzKChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ0Jhbm5lZCBJUHM6JywgcmVzcG9uc2UuZGF0YSk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cbkZpcmV3YWxsQVBJLmdldEJhbm5lZElwcyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0QmFubmVkSXBzJywge30sIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogVW5iYW4gYW4gSVAgYWRkcmVzc1xuICogXG4gKiBAcGFyYW0ge3N0cmluZ30gaXAgLSBJUCBhZGRyZXNzIHRvIHVuYmFuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBGaXJld2FsbEFQSS51bmJhbklwKCcxOTIuMTY4LjEuMTAwJywgKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnSVAgdW5iYW5uZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cbkZpcmV3YWxsQVBJLnVuYmFuSXAgPSBmdW5jdGlvbihpcCwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCd1bmJhbklwJywgeyBpcDogaXAgfSwgY2FsbGJhY2ssICdQT1NUJyk7XG59O1xuXG4vKipcbiAqIEVuYWJsZSBmaXJld2FsbCBhbmQgZmFpbDJiYW5cbiAqIFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogRmlyZXdhbGxBUEkuZW5hYmxlKChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ0ZpcmV3YWxsIGVuYWJsZWQnKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuRmlyZXdhbGxBUEkuZW5hYmxlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdlbmFibGUnLCB7fSwgY2FsbGJhY2ssICdQT1NUJyk7XG59O1xuXG4vKipcbiAqIERpc2FibGUgZmlyZXdhbGwgYW5kIGZhaWwyYmFuXG4gKiBcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICogQGV4YW1wbGVcbiAqIEZpcmV3YWxsQVBJLmRpc2FibGUoKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnRmlyZXdhbGwgZGlzYWJsZWQnKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuRmlyZXdhbGxBUEkuZGlzYWJsZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZGlzYWJsZScsIHt9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbn07Il19