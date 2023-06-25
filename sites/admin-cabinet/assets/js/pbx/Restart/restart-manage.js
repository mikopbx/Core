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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9SZXN0YXJ0L3Jlc3RhcnQtbWFuYWdlLmpzIl0sIm5hbWVzIjpbInJlc3RhcnQiLCJpbml0aWFsaXplIiwiJCIsIm9uIiwiZSIsInRhcmdldCIsImNsb3Nlc3QiLCJhZGRDbGFzcyIsIlBieEFwaSIsIlN5c3RlbVJlYm9vdCIsIlN5c3RlbVNodXREb3duIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxPQUFPLEdBQUc7QUFFWjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFMWSx3QkFLQztBQUVUO0FBQ1I7QUFDQTtBQUNBO0FBQ1FDLElBQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCQyxFQUFyQixDQUF3QixPQUF4QixFQUFpQyxVQUFDQyxDQUFELEVBQU87QUFDcENGLE1BQUFBLENBQUMsQ0FBQ0UsQ0FBQyxDQUFDQyxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixRQUFwQixFQUE4QkMsUUFBOUIsQ0FBdUMsU0FBdkM7QUFDQUMsTUFBQUEsTUFBTSxDQUFDQyxZQUFQO0FBQ0gsS0FIRDtBQUtBO0FBQ1I7QUFDQTtBQUNBOztBQUNRUCxJQUFBQSxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQkMsRUFBdEIsQ0FBeUIsT0FBekIsRUFBa0MsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3JDRixNQUFBQSxDQUFDLENBQUNFLENBQUMsQ0FBQ0MsTUFBSCxDQUFELENBQVlDLE9BQVosQ0FBb0IsUUFBcEIsRUFBOEJDLFFBQTlCLENBQXVDLFNBQXZDO0FBQ0FDLE1BQUFBLE1BQU0sQ0FBQ0UsY0FBUDtBQUNILEtBSEQ7QUFJSDtBQXhCVyxDQUFoQixDLENBMkJBOztBQUNBUixDQUFDLENBQUNTLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJaLEVBQUFBLE9BQU8sQ0FBQ0MsVUFBUjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpICovXG5cbi8qKlxuICogT2JqZWN0IHJlc3BvbnNpYmxlIGZvciBoYW5kbGluZyBzeXN0ZW0gcmVzdGFydCBhbmQgc2h1dGRvd24uXG4gKlxuICogQG1vZHVsZSByZXN0YXJ0XG4gKi9cbmNvbnN0IHJlc3RhcnQgPSB7XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgcmVzdGFydCBvYmplY3QgYnkgYXR0YWNoaW5nIGV2ZW50IGxpc3RlbmVycyB0byB0aGUgcmVzdGFydCBhbmQgc2h1dGRvd24gYnV0dG9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBsaXN0ZW5lciBmb3IgdGhlIHJlc3RhcnQgYnV0dG9uIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gVGhlIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKi9cbiAgICAgICAgJCgnI3Jlc3RhcnQtYnV0dG9uJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2J1dHRvbicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBQYnhBcGkuU3lzdGVtUmVib290KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBsaXN0ZW5lciBmb3IgdGhlIHNodXRkb3duIGJ1dHRvbiBjbGljayBldmVudC5cbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudC5cbiAgICAgICAgICovXG4gICAgICAgICQoJyNzaHV0ZG93bi1idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgnYnV0dG9uJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFBieEFwaS5TeXN0ZW1TaHV0RG93bigpO1xuICAgICAgICB9KTtcbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHJlYm9vdCBzaHV0RG93biBmb3JtXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgcmVzdGFydC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19