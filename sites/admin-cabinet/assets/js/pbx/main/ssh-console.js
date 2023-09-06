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

/* global globalRootUrl */

/**
 * SSH Console object for managing SSH console functionality.
 * @module sshConsole
 */
var sshConsole = {
  /**
   * jQuery object for the SSH console menu link.
   * @type {jQuery}
   */
  $menuLink: $("a[href$=\"".concat(globalRootUrl, "console/index/\"]")),

  /**
   * SSH console link.
   * @type {?string}
   */
  link: null,

  /**
   * Target attribute for the SSH console link.
   * @type {?string}
   */
  target: null,

  /**
   * Flag indicating whether the SSH console should be hidden.
   * @type {boolean}
   */
  hide: false,

  /**
   * Initializes the SSH console functionality.
   */
  initialize: function initialize() {
    if (!sshConsole.$menuLink) {
      return;
    }

    var connectionAddress = sshConsole.$menuLink.attr('data-value');
    var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor) && !navigator.userAgent.match(/Opera|OPR\//);

    if (isChrome) {
      sshConsole.detect('chrome-extension://iodihamcpbpeioajjeobimgagajmlibd', function () {
        sshConsole.link = "chrome-extension://iodihamcpbpeioajjeobimgagajmlibd/html/nassh.html#".concat(connectionAddress);
        sshConsole.target = '_blank';
      }, function () {
        sshConsole.link = 'https://chrome.google.com/webstore/detail/iodihamcpbpeioajjeobimgagajmlibd';
        sshConsole.target = '_blank';
      });
      $('body').on('click', "a[href$=\"".concat(globalRootUrl, "console/index/\"]"), function (e) {
        e.preventDefault();
        window.open(sshConsole.link, sshConsole.target);
      });
    } else {
      sshConsole.$menuLink.hide();
    }
  },

  /**
   * Detects if the SSH console extension is installed.
   * @param {string} base - Base URL of the SSH console extension.
   * @param {Function} ifInstalled - Callback function to execute if the extension is installed.
   * @param {Function} ifNotInstalled - Callback function to execute if the extension is not installed.
   */
  detect: function detect(base, ifInstalled, ifNotInstalled) {
    $.get("".concat(base, "/html/nassh.html")).done(ifInstalled).fail(ifNotInstalled);
  }
};
/**
 *  Initialize menu item SSH console on document ready
 */

$(document).ready(function () {
  sshConsole.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3NzaC1jb25zb2xlLmpzIl0sIm5hbWVzIjpbInNzaENvbnNvbGUiLCIkbWVudUxpbmsiLCIkIiwiZ2xvYmFsUm9vdFVybCIsImxpbmsiLCJ0YXJnZXQiLCJoaWRlIiwiaW5pdGlhbGl6ZSIsImNvbm5lY3Rpb25BZGRyZXNzIiwiYXR0ciIsImlzQ2hyb21lIiwidGVzdCIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsInZlbmRvciIsIm1hdGNoIiwiZGV0ZWN0Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJ3aW5kb3ciLCJvcGVuIiwiYmFzZSIsImlmSW5zdGFsbGVkIiwiaWZOb3RJbnN0YWxsZWQiLCJnZXQiLCJkb25lIiwiZmFpbCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFVBQVUsR0FBRztBQUNmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRUMsQ0FBQyxxQkFBYUMsYUFBYix1QkFMRzs7QUFPZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxJQUFJLEVBQUUsSUFYUzs7QUFhZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxNQUFNLEVBQUUsSUFqQk87O0FBbUJmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLElBQUksRUFBRSxLQXZCUzs7QUF5QmY7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBNUJlLHdCQTRCRjtBQUNULFFBQUksQ0FBQ1AsVUFBVSxDQUFDQyxTQUFoQixFQUEyQjtBQUN2QjtBQUNIOztBQUNELFFBQUlPLGlCQUFpQixHQUFHUixVQUFVLENBQUNDLFNBQVgsQ0FBcUJRLElBQXJCLENBQTBCLFlBQTFCLENBQXhCO0FBQ0EsUUFBTUMsUUFBUSxHQUFHLFNBQVNDLElBQVQsQ0FBY0MsU0FBUyxDQUFDQyxTQUF4QixLQUFzQyxhQUFhRixJQUFiLENBQWtCQyxTQUFTLENBQUNFLE1BQTVCLENBQXRDLElBQTZFLENBQUVGLFNBQVMsQ0FBQ0MsU0FBVixDQUFvQkUsS0FBcEIsQ0FBMEIsYUFBMUIsQ0FBaEc7O0FBQ0EsUUFBSUwsUUFBSixFQUFjO0FBQ1ZWLE1BQUFBLFVBQVUsQ0FBQ2dCLE1BQVgsQ0FDSSxxREFESixFQUVJLFlBQU07QUFDRmhCLFFBQUFBLFVBQVUsQ0FBQ0ksSUFBWCxpRkFBeUZJLGlCQUF6RjtBQUNBUixRQUFBQSxVQUFVLENBQUNLLE1BQVgsR0FBb0IsUUFBcEI7QUFDSCxPQUxMLEVBTUksWUFBTTtBQUNGTCxRQUFBQSxVQUFVLENBQUNJLElBQVgsR0FBa0IsNEVBQWxCO0FBQ0FKLFFBQUFBLFVBQVUsQ0FBQ0ssTUFBWCxHQUFvQixRQUFwQjtBQUNILE9BVEw7QUFXQUgsTUFBQUEsQ0FBQyxDQUFDLE1BQUQsQ0FBRCxDQUFVZSxFQUFWLENBQWEsT0FBYixzQkFBa0NkLGFBQWxDLHdCQUFtRSxVQUFDZSxDQUFELEVBQU87QUFDdEVBLFFBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBQyxRQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWXJCLFVBQVUsQ0FBQ0ksSUFBdkIsRUFBNkJKLFVBQVUsQ0FBQ0ssTUFBeEM7QUFDSCxPQUhEO0FBSUgsS0FoQkQsTUFnQk87QUFDSEwsTUFBQUEsVUFBVSxDQUFDQyxTQUFYLENBQXFCSyxJQUFyQjtBQUNIO0FBQ0osR0FyRGM7O0FBdURmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJVSxFQUFBQSxNQTdEZSxrQkE2RFJNLElBN0RRLEVBNkRGQyxXQTdERSxFQTZEV0MsY0E3RFgsRUE2RDJCO0FBQ3RDdEIsSUFBQUEsQ0FBQyxDQUFDdUIsR0FBRixXQUFTSCxJQUFULHVCQUNLSSxJQURMLENBQ1VILFdBRFYsRUFFS0ksSUFGTCxDQUVVSCxjQUZWO0FBR0g7QUFqRWMsQ0FBbkI7QUFvRUE7QUFDQTtBQUNBOztBQUNBdEIsQ0FBQyxDQUFDMEIsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjdCLEVBQUFBLFVBQVUsQ0FBQ08sVUFBWDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwgKi9cblxuLyoqXG4gKiBTU0ggQ29uc29sZSBvYmplY3QgZm9yIG1hbmFnaW5nIFNTSCBjb25zb2xlIGZ1bmN0aW9uYWxpdHkuXG4gKiBAbW9kdWxlIHNzaENvbnNvbGVcbiAqL1xuY29uc3Qgc3NoQ29uc29sZSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgU1NIIGNvbnNvbGUgbWVudSBsaW5rLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1lbnVMaW5rOiAkKGBhW2hyZWYkPVwiJHtnbG9iYWxSb290VXJsfWNvbnNvbGUvaW5kZXgvXCJdYCksXG5cbiAgICAvKipcbiAgICAgKiBTU0ggY29uc29sZSBsaW5rLlxuICAgICAqIEB0eXBlIHs/c3RyaW5nfVxuICAgICAqL1xuICAgIGxpbms6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUYXJnZXQgYXR0cmlidXRlIGZvciB0aGUgU1NIIGNvbnNvbGUgbGluay5cbiAgICAgKiBAdHlwZSB7P3N0cmluZ31cbiAgICAgKi9cbiAgICB0YXJnZXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgd2hldGhlciB0aGUgU1NIIGNvbnNvbGUgc2hvdWxkIGJlIGhpZGRlbi5cbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBoaWRlOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBTU0ggY29uc29sZSBmdW5jdGlvbmFsaXR5LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGlmICghc3NoQ29uc29sZS4kbWVudUxpbmspIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBsZXQgY29ubmVjdGlvbkFkZHJlc3MgPSBzc2hDb25zb2xlLiRtZW51TGluay5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgIGNvbnN0IGlzQ2hyb21lID0gL0Nocm9tZS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSAmJiAvR29vZ2xlIEluYy8udGVzdChuYXZpZ2F0b3IudmVuZG9yKSAmJiAhKG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL09wZXJhfE9QUlxcLy8pKTtcbiAgICAgICAgaWYgKGlzQ2hyb21lKSB7XG4gICAgICAgICAgICBzc2hDb25zb2xlLmRldGVjdChcbiAgICAgICAgICAgICAgICAnY2hyb21lLWV4dGVuc2lvbjovL2lvZGloYW1jcGJwZWlvYWpqZW9iaW1nYWdham1saWJkJyxcbiAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHNzaENvbnNvbGUubGluayA9IGBjaHJvbWUtZXh0ZW5zaW9uOi8vaW9kaWhhbWNwYnBlaW9hamplb2JpbWdhZ2FqbWxpYmQvaHRtbC9uYXNzaC5odG1sIyR7Y29ubmVjdGlvbkFkZHJlc3N9YDtcbiAgICAgICAgICAgICAgICAgICAgc3NoQ29uc29sZS50YXJnZXQgPSAnX2JsYW5rJztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc3NoQ29uc29sZS5saW5rID0gJ2h0dHBzOi8vY2hyb21lLmdvb2dsZS5jb20vd2Vic3RvcmUvZGV0YWlsL2lvZGloYW1jcGJwZWlvYWpqZW9iaW1nYWdham1saWJkJztcbiAgICAgICAgICAgICAgICAgICAgc3NoQ29uc29sZS50YXJnZXQgPSAnX2JsYW5rJztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICQoJ2JvZHknKS5vbignY2xpY2snLCBgYVtocmVmJD1cIiR7Z2xvYmFsUm9vdFVybH1jb25zb2xlL2luZGV4L1wiXWAsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5vcGVuKHNzaENvbnNvbGUubGluaywgc3NoQ29uc29sZS50YXJnZXQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzc2hDb25zb2xlLiRtZW51TGluay5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGV0ZWN0cyBpZiB0aGUgU1NIIGNvbnNvbGUgZXh0ZW5zaW9uIGlzIGluc3RhbGxlZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYmFzZSAtIEJhc2UgVVJMIG9mIHRoZSBTU0ggY29uc29sZSBleHRlbnNpb24uXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gaWZJbnN0YWxsZWQgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBleGVjdXRlIGlmIHRoZSBleHRlbnNpb24gaXMgaW5zdGFsbGVkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGlmTm90SW5zdGFsbGVkIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBpZiB0aGUgZXh0ZW5zaW9uIGlzIG5vdCBpbnN0YWxsZWQuXG4gICAgICovXG4gICAgZGV0ZWN0KGJhc2UsIGlmSW5zdGFsbGVkLCBpZk5vdEluc3RhbGxlZCkge1xuICAgICAgICAkLmdldChgJHtiYXNlfS9odG1sL25hc3NoLmh0bWxgKVxuICAgICAgICAgICAgLmRvbmUoaWZJbnN0YWxsZWQpXG4gICAgICAgICAgICAuZmFpbChpZk5vdEluc3RhbGxlZCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgbWVudSBpdGVtIFNTSCBjb25zb2xlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzc2hDb25zb2xlLmluaXRpYWxpemUoKTtcbn0pO1xuIl19