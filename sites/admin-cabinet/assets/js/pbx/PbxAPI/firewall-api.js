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
    disable: ':disable',
    changePriority: ':changePriority'
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
/**
 * Change priority of firewall network filter rules
 *
 * @param {object} priorityData - Object with filter IDs as keys and new priorities as values
 * @param {function} callback - Callback function to handle the response
 * @example
 * FirewallAPI.changePriority({'1': 1, '2': 2, '3': 3}, (response) => {
 *     if (response.result) {
 *         console.log('Priorities updated');
 *     }
 * });
 */


FirewallAPI.changePriority = function (priorityData, callback) {
  return this.callCustomMethod('changePriority', {
    priorities: priorityData
  }, callback, 'POST');
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZmlyZXdhbGwtYXBpLmpzIl0sIm5hbWVzIjpbIkZpcmV3YWxsQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiZ2V0RGVmYXVsdCIsImdldEJhbm5lZElwcyIsInVuYmFuSXAiLCJlbmFibGUiLCJkaXNhYmxlIiwiY2hhbmdlUHJpb3JpdHkiLCJjYWxsYmFjayIsImNhbGxDdXN0b21NZXRob2QiLCJpcCIsInByaW9yaXR5RGF0YSIsInByaW9yaXRpZXMiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFdBQVcsR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQ2pDQyxFQUFBQSxRQUFRLEVBQUUsMEJBRHVCO0FBRWpDQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsVUFBVSxFQUFFLGFBREQ7QUFFWEMsSUFBQUEsWUFBWSxFQUFFLGVBRkg7QUFHWEMsSUFBQUEsT0FBTyxFQUFFLFVBSEU7QUFJWEMsSUFBQUEsTUFBTSxFQUFFLFNBSkc7QUFLWEMsSUFBQUEsT0FBTyxFQUFFLFVBTEU7QUFNWEMsSUFBQUEsY0FBYyxFQUFFO0FBTkw7QUFGa0IsQ0FBakIsQ0FBcEIsQyxDQVlBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FULFdBQVcsQ0FBQ0ssWUFBWixHQUEyQixVQUFTSyxRQUFULEVBQW1CO0FBQzFDLFNBQU8sS0FBS0MsZ0JBQUwsQ0FBc0IsY0FBdEIsRUFBc0MsRUFBdEMsRUFBMENELFFBQTFDLENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQVYsV0FBVyxDQUFDTSxPQUFaLEdBQXNCLFVBQVNNLEVBQVQsRUFBYUYsUUFBYixFQUF1QjtBQUN6QyxTQUFPLEtBQUtDLGdCQUFMLENBQXNCLFNBQXRCLEVBQWlDO0FBQUVDLElBQUFBLEVBQUUsRUFBRUE7QUFBTixHQUFqQyxFQUE2Q0YsUUFBN0MsRUFBdUQsTUFBdkQsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQVYsV0FBVyxDQUFDTyxNQUFaLEdBQXFCLFVBQVNHLFFBQVQsRUFBbUI7QUFDcEMsU0FBTyxLQUFLQyxnQkFBTCxDQUFzQixRQUF0QixFQUFnQyxFQUFoQyxFQUFvQ0QsUUFBcEMsRUFBOEMsTUFBOUMsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQVYsV0FBVyxDQUFDUSxPQUFaLEdBQXNCLFVBQVNFLFFBQVQsRUFBbUI7QUFDckMsU0FBTyxLQUFLQyxnQkFBTCxDQUFzQixTQUF0QixFQUFpQyxFQUFqQyxFQUFxQ0QsUUFBckMsRUFBK0MsTUFBL0MsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBVixXQUFXLENBQUNTLGNBQVosR0FBNkIsVUFBU0ksWUFBVCxFQUF1QkgsUUFBdkIsRUFBaUM7QUFDMUQsU0FBTyxLQUFLQyxnQkFBTCxDQUFzQixnQkFBdEIsRUFBd0M7QUFBRUcsSUFBQUEsVUFBVSxFQUFFRDtBQUFkLEdBQXhDLEVBQXNFSCxRQUF0RSxFQUFnRixNQUFoRixDQUFQO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGlDbGllbnQsICQgKi8gXG5cbi8qKlxuICogRmlyZXdhbGxBUEkgLSBSRVNUIEFQSSB2MyBjbGllbnQgZm9yIGZpcmV3YWxsIG1hbmFnZW1lbnRcbiAqIFxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIGZpcmV3YWxsIG9wZXJhdGlvbnMgdXNpbmcgdGhlIG5ldyBSRVNUZnVsIEFQSS5cbiAqIFxuICogQGNsYXNzIEZpcmV3YWxsQVBJXG4gKi9cbmNvbnN0IEZpcmV3YWxsQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvZmlyZXdhbGwnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0RGVmYXVsdDogJzpnZXREZWZhdWx0JyxcbiAgICAgICAgZ2V0QmFubmVkSXBzOiAnOmdldEJhbm5lZElwcycsXG4gICAgICAgIHVuYmFuSXA6ICc6dW5iYW5JcCcsXG4gICAgICAgIGVuYWJsZTogJzplbmFibGUnLFxuICAgICAgICBkaXNhYmxlOiAnOmRpc2FibGUnLFxuICAgICAgICBjaGFuZ2VQcmlvcml0eTogJzpjaGFuZ2VQcmlvcml0eSdcbiAgICB9XG59KTtcblxuLy8gVXNlIEZpcmV3YWxsQVBJLmdldFJlY29yZCgnbmV3JywgY2FsbGJhY2spIGZvciBkZWZhdWx0IHZhbHVlc1xuXG4vKipcbiAqIEdldCBsaXN0IG9mIGJhbm5lZCBJUCBhZGRyZXNzZXNcbiAqIFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogRmlyZXdhbGxBUEkuZ2V0QmFubmVkSXBzKChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ0Jhbm5lZCBJUHM6JywgcmVzcG9uc2UuZGF0YSk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cbkZpcmV3YWxsQVBJLmdldEJhbm5lZElwcyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0QmFubmVkSXBzJywge30sIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogVW5iYW4gYW4gSVAgYWRkcmVzc1xuICogXG4gKiBAcGFyYW0ge3N0cmluZ30gaXAgLSBJUCBhZGRyZXNzIHRvIHVuYmFuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBGaXJld2FsbEFQSS51bmJhbklwKCcxOTIuMTY4LjEuMTAwJywgKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnSVAgdW5iYW5uZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cbkZpcmV3YWxsQVBJLnVuYmFuSXAgPSBmdW5jdGlvbihpcCwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCd1bmJhbklwJywgeyBpcDogaXAgfSwgY2FsbGJhY2ssICdQT1NUJyk7XG59O1xuXG4vKipcbiAqIEVuYWJsZSBmaXJld2FsbCBhbmQgZmFpbDJiYW5cbiAqIFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlXG4gKiBAZXhhbXBsZVxuICogRmlyZXdhbGxBUEkuZW5hYmxlKChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ0ZpcmV3YWxsIGVuYWJsZWQnKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuRmlyZXdhbGxBUEkuZW5hYmxlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdlbmFibGUnLCB7fSwgY2FsbGJhY2ssICdQT1NUJyk7XG59O1xuXG4vKipcbiAqIERpc2FibGUgZmlyZXdhbGwgYW5kIGZhaWwyYmFuXG4gKiBcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZVxuICogQGV4YW1wbGVcbiAqIEZpcmV3YWxsQVBJLmRpc2FibGUoKHJlc3BvbnNlKSA9PiB7XG4gKiAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICogICAgICAgICBjb25zb2xlLmxvZygnRmlyZXdhbGwgZGlzYWJsZWQnKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuRmlyZXdhbGxBUEkuZGlzYWJsZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZGlzYWJsZScsIHt9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbn07XG5cbi8qKlxuICogQ2hhbmdlIHByaW9yaXR5IG9mIGZpcmV3YWxsIG5ldHdvcmsgZmlsdGVyIHJ1bGVzXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IHByaW9yaXR5RGF0YSAtIE9iamVjdCB3aXRoIGZpbHRlciBJRHMgYXMga2V5cyBhbmQgbmV3IHByaW9yaXRpZXMgYXMgdmFsdWVzXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VcbiAqIEBleGFtcGxlXG4gKiBGaXJld2FsbEFQSS5jaGFuZ2VQcmlvcml0eSh7JzEnOiAxLCAnMic6IDIsICczJzogM30sIChyZXNwb25zZSkgPT4ge1xuICogICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ1ByaW9yaXRpZXMgdXBkYXRlZCcpO1xuICogICAgIH1cbiAqIH0pO1xuICovXG5GaXJld2FsbEFQSS5jaGFuZ2VQcmlvcml0eSA9IGZ1bmN0aW9uKHByaW9yaXR5RGF0YSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdjaGFuZ2VQcmlvcml0eScsIHsgcHJpb3JpdGllczogcHJpb3JpdHlEYXRhIH0sIGNhbGxiYWNrLCAnUE9TVCcpO1xufTsiXX0=