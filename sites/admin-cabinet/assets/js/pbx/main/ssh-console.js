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
   * Resolved in initialize() — must not call $() at module-load time
   * because jQuery may not yet be bound to window.$.
   * @type {jQuery}
   */
  $menuLink: null,

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
    sshConsole.$menuLink = $("a[href$=\"".concat(globalRootUrl, "console/index/\"]"));

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3NzaC1jb25zb2xlLmpzIl0sIm5hbWVzIjpbInNzaENvbnNvbGUiLCIkbWVudUxpbmsiLCJsaW5rIiwidGFyZ2V0IiwiaGlkZSIsImluaXRpYWxpemUiLCIkIiwiZ2xvYmFsUm9vdFVybCIsImxlbmd0aCIsImNvbm5lY3Rpb25BZGRyZXNzIiwiYXR0ciIsImlzQ2hyb21lIiwidGVzdCIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsInZlbmRvciIsIm1hdGNoIiwiZXh0ZW5zaW9uSWQiLCJjaHJvbWUiLCJydW50aW1lIiwiZGV0ZWN0RXh0ZW5zaW9uIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJ3aW5kb3ciLCJvcGVuIiwiaWZJbnN0YWxsZWQiLCJpZk5vdEluc3RhbGxlZCIsInNlbmRNZXNzYWdlIiwibWVzc2FnZSIsInJlc3BvbnNlIiwibGFzdEVycm9yIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsVUFBVSxHQUFHO0FBQ2Y7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQVBJOztBQVNmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLElBQUksRUFBRSxJQWJTOztBQWVmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE1BQU0sRUFBRSxJQW5CTzs7QUFxQmY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsSUFBSSxFQUFFLEtBekJTOztBQTJCZjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUE5QmUsd0JBOEJGO0FBQ1RMLElBQUFBLFVBQVUsQ0FBQ0MsU0FBWCxHQUF1QkssQ0FBQyxxQkFBYUMsYUFBYix1QkFBeEI7O0FBQ0EsUUFBSSxDQUFD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IHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsICovXG5cbi8qKlxuICogU1NIIENvbnNvbGUgb2JqZWN0IGZvciBtYW5hZ2luZyBTU0ggY29uc29sZSBmdW5jdGlvbmFsaXR5LlxuICogQG1vZHVsZSBzc2hDb25zb2xlXG4gKi9cbmNvbnN0IHNzaENvbnNvbGUgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFNTSCBjb25zb2xlIG1lbnUgbGluay5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWVcbiAgICAgKiBiZWNhdXNlIGpRdWVyeSBtYXkgbm90IHlldCBiZSBib3VuZCB0byB3aW5kb3cuJC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtZW51TGluazogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFNTSCBjb25zb2xlIGxpbmsuXG4gICAgICogQHR5cGUgez9zdHJpbmd9XG4gICAgICovXG4gICAgbGluazogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRhcmdldCBhdHRyaWJ1dGUgZm9yIHRoZSBTU0ggY29uc29sZSBsaW5rLlxuICAgICAqIEB0eXBlIHs/c3RyaW5nfVxuICAgICAqL1xuICAgIHRhcmdldDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBTU0ggY29uc29sZSBzaG91bGQgYmUgaGlkZGVuLlxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGhpZGU6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIFNTSCBjb25zb2xlIGZ1bmN0aW9uYWxpdHkuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgc3NoQ29uc29sZS4kbWVudUxpbmsgPSAkKGBhW2hyZWYkPVwiJHtnbG9iYWxSb290VXJsfWNvbnNvbGUvaW5kZXgvXCJdYCk7XG4gICAgICAgIGlmICghc3NoQ29uc29sZS4kbWVudUxpbmsubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGNvbm5lY3Rpb25BZGRyZXNzID0gc3NoQ29uc29sZS4kbWVudUxpbmsuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICBjb25zdCBpc0Nocm9tZSA9IC9DaHJvbWUvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkgJiYgL0dvb2dsZSBJbmMvLnRlc3QobmF2aWdhdG9yLnZlbmRvcikgJiYgIShuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9PcGVyYXxPUFJcXC8vKSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNDaHJvbWUpIHtcbiAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBJRCBmb3IgU2VjdXJlIFNoZWxsIEFwcFxuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSAnaW9kaWhhbWNwYnBlaW9hamplb2JpbWdhZ2FqbWxpYmQnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDb25maWd1cmUgbGlua3MgcmVnYXJkbGVzcyBvZiBleHRlbnNpb24gc3RhdHVzXG4gICAgICAgICAgICAvLyBXZSdsbCBqdXN0IHJlZGlyZWN0IHRvIHRoZSBhcHByb3ByaWF0ZSBwbGFjZSB3aGVuIGNsaWNrZWRcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2hyb21lICE9PSAndW5kZWZpbmVkJyAmJiBjaHJvbWUucnVudGltZSkge1xuICAgICAgICAgICAgICAgIC8vIENocm9tZSB3aXRoIHJ1bnRpbWUgQVBJIGF2YWlsYWJsZSAtIHRyeSB0byBkZXRlY3QgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgc3NoQ29uc29sZS5kZXRlY3RFeHRlbnNpb24oXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbklkLFxuICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFeHRlbnNpb24gaXMgaW5zdGFsbGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBzc2hDb25zb2xlLmxpbmsgPSBgY2hyb21lLWV4dGVuc2lvbjovLyR7ZXh0ZW5zaW9uSWR9L2h0bWwvbmFzc2guaHRtbCMke2Nvbm5lY3Rpb25BZGRyZXNzfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICBzc2hDb25zb2xlLnRhcmdldCA9ICdfYmxhbmsnO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFeHRlbnNpb24gaXMgbm90IGluc3RhbGxlZCwgcmVkaXJlY3QgdG8gQ2hyb21lIFdlYiBTdG9yZVxuICAgICAgICAgICAgICAgICAgICAgICAgc3NoQ29uc29sZS5saW5rID0gYGh0dHBzOi8vY2hyb21lLmdvb2dsZS5jb20vd2Vic3RvcmUvZGV0YWlsLyR7ZXh0ZW5zaW9uSWR9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNzaENvbnNvbGUudGFyZ2V0ID0gJ19ibGFuayc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBDaHJvbWUgcnVudGltZSBBUEkgbm90IGF2YWlsYWJsZSwgYXNzdW1lIGV4dGVuc2lvbiBub3QgaW5zdGFsbGVkXG4gICAgICAgICAgICAgICAgc3NoQ29uc29sZS5saW5rID0gYGh0dHBzOi8vY2hyb21lLmdvb2dsZS5jb20vd2Vic3RvcmUvZGV0YWlsLyR7ZXh0ZW5zaW9uSWR9YDtcbiAgICAgICAgICAgICAgICBzc2hDb25zb2xlLnRhcmdldCA9ICdfYmxhbmsnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAkKCdib2R5Jykub24oJ2NsaWNrJywgYGFbaHJlZiQ9XCIke2dsb2JhbFJvb3RVcmx9Y29uc29sZS9pbmRleC9cIl1gLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cub3Blbihzc2hDb25zb2xlLmxpbmssIHNzaENvbnNvbGUudGFyZ2V0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm90IENocm9tZSAtIGhpZGUgdGhlIFNTSCBjb25zb2xlIGxpbmtcbiAgICAgICAgICAgIHNzaENvbnNvbGUuJG1lbnVMaW5rLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3RzIGlmIHRoZSBTU0ggY29uc29sZSBleHRlbnNpb24gaXMgaW5zdGFsbGVkIHVzaW5nIGNocm9tZS5ydW50aW1lIEFQSS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uSWQgLSBFeHRlbnNpb24gSUQgdG8gY2hlY2tcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpZkluc3RhbGxlZCAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgaWYgdGhlIGV4dGVuc2lvbiBpcyBpbnN0YWxsZWRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpZk5vdEluc3RhbGxlZCAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgaWYgdGhlIGV4dGVuc2lvbiBpcyBub3QgaW5zdGFsbGVkXG4gICAgICovXG4gICAgZGV0ZWN0RXh0ZW5zaW9uKGV4dGVuc2lvbklkLCBpZkluc3RhbGxlZCwgaWZOb3RJbnN0YWxsZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjaHJvbWUgIT09ICd1bmRlZmluZWQnICYmIGNocm9tZS5ydW50aW1lICYmIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSB0byBjb21tdW5pY2F0ZSB3aXRoIHRoZSBleHRlbnNpb25cbiAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uSWQsIFxuICAgICAgICAgICAgICAgICAgICB7IG1lc3NhZ2U6ICdwaW5nJyB9LCBcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBpcyBub3QgaW5zdGFsbGVkIG9yIGRpc2FibGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWZOb3RJbnN0YWxsZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXh0ZW5zaW9uIGlzIGluc3RhbGxlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmSW5zdGFsbGVkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIEVycm9yIG9jY3VycmVkLCBhc3N1bWUgZXh0ZW5zaW9uIGlzIG5vdCBpbnN0YWxsZWRcbiAgICAgICAgICAgICAgICBpZk5vdEluc3RhbGxlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2hyb21lIHJ1bnRpbWUgQVBJIG5vdCBhdmFpbGFibGUsIGFzc3VtZSBleHRlbnNpb24gaXMgbm90IGluc3RhbGxlZFxuICAgICAgICAgICAgaWZOb3RJbnN0YWxsZWQoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgbWVudSBpdGVtIFNTSCBjb25zb2xlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzc2hDb25zb2xlLmluaXRpYWxpemUoKTtcbn0pO1xuIl19