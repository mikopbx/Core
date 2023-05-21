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

/* global PbxApi */

/**
 * Object responsible for handling system restart and shutdown.
 *
 * @module restart
 */
var restart = {
  /**
   * Initializes the restart object by attaching event listeners to the restart and shutdown buttons.
   */
  initialize: function initialize() {
    /**
     * Event listener for the restart button click event.
     * @param {Event} e - The click event.
     */
    $('#restart-button').on('click', function (e) {
      $(e.target).closest('button').addClass('loading');
      PbxApi.SystemReboot();
    });
    /**
     * Event listener for the shutdown button click event.
     * @param {Event} e - The click event.
     */

    $('#shutdown-button').on('click', function (e) {
      $(e.target).closest('button').addClass('loading');
      PbxApi.SystemShutDown();
    });
  }
}; // When the document is ready, initialize the reboot shutDown form

$(document).ready(function () {
  restart.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9SZXN0YXJ0L3Jlc3RhcnQtaW5kZXguanMiXSwibmFtZXMiOlsicmVzdGFydCIsImluaXRpYWxpemUiLCIkIiwib24iLCJlIiwidGFyZ2V0IiwiY2xvc2VzdCIsImFkZENsYXNzIiwiUGJ4QXBpIiwiU3lzdGVtUmVib290IiwiU3lzdGVtU2h1dERvd24iLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE9BQU8sR0FBRztBQUVaO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQUxZLHdCQUtDO0FBRVQ7QUFDUjtBQUNBO0FBQ0E7QUFDUUMsSUFBQUEsQ0FBQyxDQUFDLGlCQUFELENBQUQsQ0FBcUJDLEVBQXJCLENBQXdCLE9BQXhCLEVBQWlDLFVBQUNDLENBQUQsRUFBTztBQUNwQ0YsTUFBQUEsQ0FBQyxDQUFDRSxDQUFDLENBQUNDLE1BQUgsQ0FBRCxDQUFZQyxPQUFaLENBQW9CLFFBQXBCLEVBQThCQyxRQUE5QixDQUF1QyxTQUF2QztBQUNBQyxNQUFBQSxNQUFNLENBQUNDLFlBQVA7QUFDSCxLQUhEO0FBS0E7QUFDUjtBQUNBO0FBQ0E7O0FBQ1FQLElBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCQyxFQUF0QixDQUF5QixPQUF6QixFQUFrQyxVQUFDQyxDQUFELEVBQU87QUFDckNGLE1BQUFBLENBQUMsQ0FBQ0UsQ0FBQyxDQUFDQyxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixRQUFwQixFQUE4QkMsUUFBOUIsQ0FBdUMsU0FBdkM7QUFDQUMsTUFBQUEsTUFBTSxDQUFDRSxjQUFQO0FBQ0gsS0FIRDtBQUlIO0FBeEJXLENBQWhCLEMsQ0EyQkE7O0FBQ0FSLENBQUMsQ0FBQ1MsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQlosRUFBQUEsT0FBTyxDQUFDQyxVQUFSO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGkgKi9cblxuLyoqXG4gKiBPYmplY3QgcmVzcG9uc2libGUgZm9yIGhhbmRsaW5nIHN5c3RlbSByZXN0YXJ0IGFuZCBzaHV0ZG93bi5cbiAqXG4gKiBAbW9kdWxlIHJlc3RhcnRcbiAqL1xuY29uc3QgcmVzdGFydCA9IHtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSByZXN0YXJ0IG9iamVjdCBieSBhdHRhY2hpbmcgZXZlbnQgbGlzdGVuZXJzIHRvIHRoZSByZXN0YXJ0IGFuZCBzaHV0ZG93biBidXR0b25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGxpc3RlbmVyIGZvciB0aGUgcmVzdGFydCBidXR0b24gY2xpY2sgZXZlbnQuXG4gICAgICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgLSBUaGUgY2xpY2sgZXZlbnQuXG4gICAgICAgICAqL1xuICAgICAgICAkKCcjcmVzdGFydC1idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgnYnV0dG9uJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFBieEFwaS5TeXN0ZW1SZWJvb3QoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGxpc3RlbmVyIGZvciB0aGUgc2h1dGRvd24gYnV0dG9uIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gVGhlIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKi9cbiAgICAgICAgJCgnI3NodXRkb3duLWJ1dHRvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCdidXR0b24nKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgUGJ4QXBpLlN5c3RlbVNodXREb3duKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgcmVib290IHNodXREb3duIGZvcm1cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICByZXN0YXJ0LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=