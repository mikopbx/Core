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

/* global SystemAPI */

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
      SystemAPI.reboot(function () {});
    });
    /**
     * Event listener for the shutdown button click event.
     * @param {Event} e - The click event.
     */

    $('#shutdown-button').on('click', function (e) {
      $(e.target).closest('button').addClass('loading');
      SystemAPI.shutdown(function () {});
    });
  }
}; // When the document is ready, initialize the reboot shutDown form

$(document).ready(function () {
  restart.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9SZXN0YXJ0L3Jlc3RhcnQtbWFuYWdlLmpzIl0sIm5hbWVzIjpbInJlc3RhcnQiLCJpbml0aWFsaXplIiwiJCIsIm9uIiwiZSIsInRhcmdldCIsImNsb3Nlc3QiLCJhZGRDbGFzcyIsIlN5c3RlbUFQSSIsInJlYm9vdCIsInNodXRkb3duIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxPQUFPLEdBQUc7QUFFWjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFMWSx3QkFLQztBQUVUO0FBQ1I7QUFDQTtBQUNBO0FBQ1FDLElBQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCQyxFQUFyQixDQUF3QixPQUF4QixFQUFpQyxVQUFDQyxDQUFELEVBQU87QUFDcENGLE1BQUFBLENBQUMsQ0FBQ0UsQ0FBQyxDQUFDQyxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixRQUFwQixFQUE4QkMsUUFBOUIsQ0FBdUMsU0FBdkM7QUFDQUMsTUFBQUEsU0FBUyxDQUFDQyxNQUFWLENBQWlCLFlBQU0sQ0FBRSxDQUF6QjtBQUNILEtBSEQ7QUFLQTtBQUNSO0FBQ0E7QUFDQTs7QUFDUVAsSUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0JDLEVBQXRCLENBQXlCLE9BQXpCLEVBQWtDLFVBQUNDLENBQUQsRUFBTztBQUNyQ0YsTUFBQUEsQ0FBQyxDQUFDRSxDQUFDLENBQUNDLE1BQUgsQ0FBRCxDQUFZQyxPQUFaLENBQW9CLFFBQXBCLEVBQThCQyxRQUE5QixDQUF1QyxTQUF2QztBQUNBQyxNQUFBQSxTQUFTLENBQUNFLFFBQVYsQ0FBbUIsWUFBTSxDQUFFLENBQTNCO0FBQ0gsS0FIRDtBQUlIO0FBeEJXLENBQWhCLEMsQ0EyQkE7O0FBQ0FSLENBQUMsQ0FBQ1MsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQlosRUFBQUEsT0FBTyxDQUFDQyxVQUFSO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBTeXN0ZW1BUEkgKi9cblxuLyoqXG4gKiBPYmplY3QgcmVzcG9uc2libGUgZm9yIGhhbmRsaW5nIHN5c3RlbSByZXN0YXJ0IGFuZCBzaHV0ZG93bi5cbiAqXG4gKiBAbW9kdWxlIHJlc3RhcnRcbiAqL1xuY29uc3QgcmVzdGFydCA9IHtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSByZXN0YXJ0IG9iamVjdCBieSBhdHRhY2hpbmcgZXZlbnQgbGlzdGVuZXJzIHRvIHRoZSByZXN0YXJ0IGFuZCBzaHV0ZG93biBidXR0b25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGxpc3RlbmVyIGZvciB0aGUgcmVzdGFydCBidXR0b24gY2xpY2sgZXZlbnQuXG4gICAgICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgLSBUaGUgY2xpY2sgZXZlbnQuXG4gICAgICAgICAqL1xuICAgICAgICAkKCcjcmVzdGFydC1idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgnYnV0dG9uJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFN5c3RlbUFQSS5yZWJvb3QoKCkgPT4ge30pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgbGlzdGVuZXIgZm9yIHRoZSBzaHV0ZG93biBidXR0b24gY2xpY2sgZXZlbnQuXG4gICAgICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgLSBUaGUgY2xpY2sgZXZlbnQuXG4gICAgICAgICAqL1xuICAgICAgICAkKCcjc2h1dGRvd24tYnV0dG9uJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2J1dHRvbicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBTeXN0ZW1BUEkuc2h1dGRvd24oKCkgPT4ge30pO1xuICAgICAgICB9KTtcbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHJlYm9vdCBzaHV0RG93biBmb3JtXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgcmVzdGFydC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19