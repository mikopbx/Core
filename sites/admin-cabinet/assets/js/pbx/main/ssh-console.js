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
    if (!sshConsole.$menuLink.length) {
      return;
    }

    var connectionAddress = sshConsole.$menuLink.attr('data-value');
    var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor) && !navigator.userAgent.match(/Opera|OPR\//);

    if (isChrome) {
      // Extension ID for Secure Shell App
      var extensionId = 'iodihamcpbpeioajjeobimgagajmlibd'; // Configure links regardless of extension status
      // We'll just redirect to the appropriate place when clicked

      if (typeof chrome !== 'undefined' && chrome.runtime) {
        // Chrome with runtime API available - try to detect extension
        sshConsole.detectExtension(extensionId, function () {
          // Extension is installed
          sshConsole.link = "chrome-extension://".concat(extensionId, "/html/nassh.html#").concat(connectionAddress);
          sshConsole.target = '_blank';
        }, function () {
          // Extension is not installed, redirect to Chrome Web Store
          sshConsole.link = "https://chrome.google.com/webstore/detail/".concat(extensionId);
          sshConsole.target = '_blank';
        });
      } else {
        // Chrome runtime API not available, assume extension not installed
        sshConsole.link = "https://chrome.google.com/webstore/detail/".concat(extensionId);
        sshConsole.target = '_blank';
      }

      $('body').on('click', "a[href$=\"".concat(globalRootUrl, "console/index/\"]"), function (e) {
        e.preventDefault();
        window.open(sshConsole.link, sshConsole.target);
      });
    } else {
      // Not Chrome - hide the SSH console link
      sshConsole.$menuLink.hide();
    }
  },

  /**
   * Detects if the SSH console extension is installed using chrome.runtime API.
   * @param {string} extensionId - Extension ID to check
   * @param {Function} ifInstalled - Callback function to execute if the extension is installed
   * @param {Function} ifNotInstalled - Callback function to execute if the extension is not installed
   */
  detectExtension: function detectExtension(extensionId, ifInstalled, ifNotInstalled) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        // Try to communicate with the extension
        chrome.runtime.sendMessage(extensionId, {
          message: 'ping'
        }, function (response) {
          if (chrome.runtime.lastError) {
            // Extension is not installed or disabled
            ifNotInstalled();
          } else {
            // Extension is installed
            ifInstalled();
          }
        });
      } catch (e) {
        // Error occurred, assume extension is not installed
        ifNotInstalled();
      }
    } else {
      // Chrome runtime API not available, assume extension is not installed
      ifNotInstalled();
    }
  }
};
/**
 *  Initialize menu item SSH console on document ready
 */

$(document).ready(function () {
  sshConsole.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3NzaC1jb25zb2xlLmpzIl0sIm5hbWVzIjpbInNzaENvbnNvbGUiLCIkbWVudUxpbmsiLCIkIiwiZ2xvYmFsUm9vdFVybCIsImxpbmsiLCJ0YXJnZXQiLCJoaWRlIiwiaW5pdGlhbGl6ZSIsImxlbmd0aCIsImNvbm5lY3Rpb25BZGRyZXNzIiwiYXR0ciIsImlzQ2hyb21lIiwidGVzdCIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsInZlbmRvciIsIm1hdGNoIiwiZXh0ZW5zaW9uSWQiLCJjaHJvbWUiLCJydW50aW1lIiwiZGV0ZWN0RXh0ZW5zaW9uIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJ3aW5kb3ciLCJvcGVuIiwiaWZJbnN0YWxsZWQiLCJpZk5vdEluc3RhbGxlZCIsInNlbmRNZXNzYWdlIiwibWVzc2FnZSIsInJlc3BvbnNlIiwibGFzdEVycm9yIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsVUFBVSxHQUFHO0FBQ2Y7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFQyxDQUFDLHFCQUFhQyxhQUFiLHVCQUxHOztBQU9mO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLElBQUksRUFBRSxJQVhTOztBQWFmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE1BQU0sRUFBRSxJQWpCTzs7QUFtQmY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsSUFBSSxFQUFFLEtBdkJTOztBQXlCZjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUE1QmUsd0JBNEJGO0FBQ1QsUUFBSSxDQUFDUCxVQUFVLENBQUNDLFNBQVgsQ0FBcUJPLE1BQTFCLEVBQWtDO0FBQzlCO0FBQ0g7O0FBQ0QsUUFBSUMsaUJBQWlCLEdBQUdULFVBQVUsQ0FBQ0MsU0FBWCxDQUFxQlMsSUFBckIsQ0FBMEIsWUFBMUIsQ0FBeEI7QUFDQSxRQUFNQyxRQUFRLEdBQUcsU0FBU0MsSUFBVCxDQUFjQyxTQUFTLENBQUNDLFNBQXhCLEtBQXNDLGFBQWFGLElBQWIsQ0FBa0JDLFNBQVMsQ0FBQ0UsTUFBNUIsQ0FBdEMsSUFBNkUsQ0FBRUYsU0FBUyxDQUFDQyxTQUFWLENBQW9CRSxLQUFwQixDQUEwQixhQUExQixDQUFoRzs7QUFFQSxRQUFJTCxRQUFKLEVBQWM7QUFDVjtBQUNBLFVBQU1NLFdBQVcsR0FBRyxrQ0FBcEIsQ0FGVSxDQUlWO0FBQ0E7O0FBQ0EsVUFBSSxPQUFPQyxNQUFQLEtBQWtCLFdBQWxCLElBQWlDQSxNQUFNLENBQUNDLE9BQTVDLEVBQXFEO0FBQ2pEO0FBQ0FuQixRQUFBQSxVQUFVLENBQUNvQixlQUFYLENBQ0lILFdBREosRUFFSSxZQUFNO0FBQ0Y7QUFDQWpCLFVBQUFBLFVBQVUsQ0FBQ0ksSUFBWCxnQ0FBd0NhLFdBQXhDLDhCQUF1RVIsaUJBQXZFO0FBQ0FULFVBQUFBLFVBQVUsQ0FBQ0ssTUFBWCxHQUFvQixRQUFwQjtBQUNILFNBTkwsRUFPSSxZQUFNO0FBQ0Y7QUFDQUwsVUFBQUEsVUFBVSxDQUFDSSxJQUFYLHVEQUErRGEsV0FBL0Q7QUFDQWpCLFVBQUFBLFVBQVUsQ0FBQ0ssTUFBWCxHQUFvQixRQUFwQjtBQUNILFNBWEw7QUFhSCxPQWZELE1BZU87QUFDSDtBQUNBTCxRQUFBQSxVQUFVLENBQUNJLElBQVgsdURBQStEYSxXQUEvRDtBQUNBakIsUUFBQUEsVUFBVSxDQUFDSyxNQUFYLEdBQW9CLFFBQXBCO0FBQ0g7O0FBRURILE1BQUFBLENBQUMsQ0FBQyxNQUFELENBQUQsQ0FBVW1CLEVBQVYsQ0FBYSxPQUFiLHNCQUFrQ2xCLGFBQWxDLHdCQUFtRSxVQUFDbUIsQ0FBRCxFQUFPO0FBQ3RFQSxRQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQUMsUUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVl6QixVQUFVLENBQUNJLElBQXZCLEVBQTZCSixVQUFVLENBQUNLLE1BQXhDO0FBQ0gsT0FIRDtBQUlILEtBL0JELE1BK0JPO0FBQ0g7QUFDQUwsTUFBQUEsVUFBVSxDQUFDQyxTQUFYLENBQXFCSyxJQUFyQjtBQUNIO0FBQ0osR0F0RWM7O0FBd0VmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJYyxFQUFBQSxlQTlFZSwyQkE4RUNILFdBOUVELEVBOEVjUyxXQTlFZCxFQThFMkJDLGNBOUUzQixFQThFMkM7QUFDdEQsUUFBSSxPQUFPVCxNQUFQLEtBQWtCLFdBQWxCLElBQWlDQSxNQUFNLENBQUNDLE9BQXhDLElBQW1ERCxNQUFNLENBQUNDLE9BQVAsQ0FBZVMsV0FBdEUsRUFBbUY7QUFDL0UsVUFBSTtBQUNBO0FBQ0FWLFFBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxDQUFlUyxXQUFmLENBQ0lYLFdBREosRUFFSTtBQUFFWSxVQUFBQSxPQUFPLEVBQUU7QUFBWCxTQUZKLEVBR0ksVUFBQUMsUUFBUSxFQUFJO0FBQ1IsY0FBSVosTUFBTSxDQUFDQyxPQUFQLENBQWVZLFNBQW5CLEVBQThCO0FBQzFCO0FBQ0FKLFlBQUFBLGNBQWM7QUFDakIsV0FIRCxNQUdPO0FBQ0g7QUFDQUQsWUFBQUEsV0FBVztBQUNkO0FBQ0osU0FYTDtBQWFILE9BZkQsQ0FlRSxPQUFPSixDQUFQLEVBQVU7QUFDUjtBQUNBSyxRQUFBQSxjQUFjO0FBQ2pCO0FBQ0osS0FwQkQsTUFvQk87QUFDSDtBQUNBQSxNQUFBQSxjQUFjO0FBQ2pCO0FBQ0o7QUF2R2MsQ0FBbkI7QUEwR0E7QUFDQTtBQUNBOztBQUNBekIsQ0FBQyxDQUFDOEIsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmpDLEVBQUFBLFVBQVUsQ0FBQ08sVUFBWDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwgKi9cblxuLyoqXG4gKiBTU0ggQ29uc29sZSBvYmplY3QgZm9yIG1hbmFnaW5nIFNTSCBjb25zb2xlIGZ1bmN0aW9uYWxpdHkuXG4gKiBAbW9kdWxlIHNzaENvbnNvbGVcbiAqL1xuY29uc3Qgc3NoQ29uc29sZSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgU1NIIGNvbnNvbGUgbWVudSBsaW5rLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1lbnVMaW5rOiAkKGBhW2hyZWYkPVwiJHtnbG9iYWxSb290VXJsfWNvbnNvbGUvaW5kZXgvXCJdYCksXG5cbiAgICAvKipcbiAgICAgKiBTU0ggY29uc29sZSBsaW5rLlxuICAgICAqIEB0eXBlIHs/c3RyaW5nfVxuICAgICAqL1xuICAgIGxpbms6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUYXJnZXQgYXR0cmlidXRlIGZvciB0aGUgU1NIIGNvbnNvbGUgbGluay5cbiAgICAgKiBAdHlwZSB7P3N0cmluZ31cbiAgICAgKi9cbiAgICB0YXJnZXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgd2hldGhlciB0aGUgU1NIIGNvbnNvbGUgc2hvdWxkIGJlIGhpZGRlbi5cbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBoaWRlOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBTU0ggY29uc29sZSBmdW5jdGlvbmFsaXR5LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGlmICghc3NoQ29uc29sZS4kbWVudUxpbmsubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGNvbm5lY3Rpb25BZGRyZXNzID0gc3NoQ29uc29sZS4kbWVudUxpbmsuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICBjb25zdCBpc0Nocm9tZSA9IC9DaHJvbWUvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkgJiYgL0dvb2dsZSBJbmMvLnRlc3QobmF2aWdhdG9yLnZlbmRvcikgJiYgIShuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9PcGVyYXxPUFJcXC8vKSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNDaHJvbWUpIHtcbiAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBJRCBmb3IgU2VjdXJlIFNoZWxsIEFwcFxuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSAnaW9kaWhhbWNwYnBlaW9hamplb2JpbWdhZ2FqbWxpYmQnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDb25maWd1cmUgbGlua3MgcmVnYXJkbGVzcyBvZiBleHRlbnNpb24gc3RhdHVzXG4gICAgICAgICAgICAvLyBXZSdsbCBqdXN0IHJlZGlyZWN0IHRvIHRoZSBhcHByb3ByaWF0ZSBwbGFjZSB3aGVuIGNsaWNrZWRcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2hyb21lICE9PSAndW5kZWZpbmVkJyAmJiBjaHJvbWUucnVudGltZSkge1xuICAgICAgICAgICAgICAgIC8vIENocm9tZSB3aXRoIHJ1bnRpbWUgQVBJIGF2YWlsYWJsZSAtIHRyeSB0byBkZXRlY3QgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgc3NoQ29uc29sZS5kZXRlY3RFeHRlbnNpb24oXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbklkLFxuICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFeHRlbnNpb24gaXMgaW5zdGFsbGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBzc2hDb25zb2xlLmxpbmsgPSBgY2hyb21lLWV4dGVuc2lvbjovLyR7ZXh0ZW5zaW9uSWR9L2h0bWwvbmFzc2guaHRtbCMke2Nvbm5lY3Rpb25BZGRyZXNzfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICBzc2hDb25zb2xlLnRhcmdldCA9ICdfYmxhbmsnO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFeHRlbnNpb24gaXMgbm90IGluc3RhbGxlZCwgcmVkaXJlY3QgdG8gQ2hyb21lIFdlYiBTdG9yZVxuICAgICAgICAgICAgICAgICAgICAgICAgc3NoQ29uc29sZS5saW5rID0gYGh0dHBzOi8vY2hyb21lLmdvb2dsZS5jb20vd2Vic3RvcmUvZGV0YWlsLyR7ZXh0ZW5zaW9uSWR9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNzaENvbnNvbGUudGFyZ2V0ID0gJ19ibGFuayc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBDaHJvbWUgcnVudGltZSBBUEkgbm90IGF2YWlsYWJsZSwgYXNzdW1lIGV4dGVuc2lvbiBub3QgaW5zdGFsbGVkXG4gICAgICAgICAgICAgICAgc3NoQ29uc29sZS5saW5rID0gYGh0dHBzOi8vY2hyb21lLmdvb2dsZS5jb20vd2Vic3RvcmUvZGV0YWlsLyR7ZXh0ZW5zaW9uSWR9YDtcbiAgICAgICAgICAgICAgICBzc2hDb25zb2xlLnRhcmdldCA9ICdfYmxhbmsnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAkKCdib2R5Jykub24oJ2NsaWNrJywgYGFbaHJlZiQ9XCIke2dsb2JhbFJvb3RVcmx9Y29uc29sZS9pbmRleC9cIl1gLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cub3Blbihzc2hDb25zb2xlLmxpbmssIHNzaENvbnNvbGUudGFyZ2V0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm90IENocm9tZSAtIGhpZGUgdGhlIFNTSCBjb25zb2xlIGxpbmtcbiAgICAgICAgICAgIHNzaENvbnNvbGUuJG1lbnVMaW5rLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3RzIGlmIHRoZSBTU0ggY29uc29sZSBleHRlbnNpb24gaXMgaW5zdGFsbGVkIHVzaW5nIGNocm9tZS5ydW50aW1lIEFQSS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uSWQgLSBFeHRlbnNpb24gSUQgdG8gY2hlY2tcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpZkluc3RhbGxlZCAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgaWYgdGhlIGV4dGVuc2lvbiBpcyBpbnN0YWxsZWRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpZk5vdEluc3RhbGxlZCAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgaWYgdGhlIGV4dGVuc2lvbiBpcyBub3QgaW5zdGFsbGVkXG4gICAgICovXG4gICAgZGV0ZWN0RXh0ZW5zaW9uKGV4dGVuc2lvbklkLCBpZkluc3RhbGxlZCwgaWZOb3RJbnN0YWxsZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjaHJvbWUgIT09ICd1bmRlZmluZWQnICYmIGNocm9tZS5ydW50aW1lICYmIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSB0byBjb21tdW5pY2F0ZSB3aXRoIHRoZSBleHRlbnNpb25cbiAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uSWQsIFxuICAgICAgICAgICAgICAgICAgICB7IG1lc3NhZ2U6ICdwaW5nJyB9LCBcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBpcyBub3QgaW5zdGFsbGVkIG9yIGRpc2FibGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWZOb3RJbnN0YWxsZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXh0ZW5zaW9uIGlzIGluc3RhbGxlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmSW5zdGFsbGVkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIEVycm9yIG9jY3VycmVkLCBhc3N1bWUgZXh0ZW5zaW9uIGlzIG5vdCBpbnN0YWxsZWRcbiAgICAgICAgICAgICAgICBpZk5vdEluc3RhbGxlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2hyb21lIHJ1bnRpbWUgQVBJIG5vdCBhdmFpbGFibGUsIGFzc3VtZSBleHRlbnNpb24gaXMgbm90IGluc3RhbGxlZFxuICAgICAgICAgICAgaWZOb3RJbnN0YWxsZWQoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgbWVudSBpdGVtIFNTSCBjb25zb2xlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzc2hDb25zb2xlLmluaXRpYWxpemUoKTtcbn0pO1xuIl19