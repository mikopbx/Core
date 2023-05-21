"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

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

/* global globalRootUrl, globalModuleUniqueId, $ */

/**
 * Worker object for replacing dynamic wiki links.
 *
 * @module WikiLinksReplacementWorker
 */
var WikiLinksReplacementWorker = {
  /**
   * Time in milliseconds before fetching new wiki links request.
   * @type {number}
   */
  timeOut: 300000,

  /**
   * The id of the timer function for the worker.
   * @type {number}
   */
  timeOutHandle: 0,

  /**
   * Initializes the wiki links replacement worker.
   */
  initialize: function initialize() {
    WikiLinksReplacementWorker.restartWorker();
    window.addEventListener('ConfigDataChanged', WikiLinksReplacementWorker.cbOnDataChanged);
  },

  /**
   * Restarts the wiki links replacement worker.
   */
  restartWorker: function restartWorker() {
    window.clearTimeout(WikiLinksReplacementWorker.timeoutHandle);
    WikiLinksReplacementWorker.worker();
  },

  /**
   * Handles the event of language or data change.
   */
  cbOnDataChanged: function cbOnDataChanged() {
    setTimeout(WikiLinksReplacementWorker.restartWorker, 3000);
  },

  /**
   * Worker function for fetching wiki links replacement.
   */
  worker: function worker() {
    $.api({
      url: "".concat(globalRootUrl, "wiki-links/get-wiki-links-replacement"),
      on: 'now',
      data: {
        globalModuleUniqueId: globalModuleUniqueId
      },
      method: 'POST',
      onSuccess: WikiLinksReplacementWorker.cbAfterResponse
    });
  },

  /**
   * Callback function after receiving a response from the server.
   * @param {Object} response - The response object from the server.
   */
  cbAfterResponse: function cbAfterResponse(response) {
    if (response === false) {
      return;
    }

    var arr = Object.entries(response.message);
    arr.forEach(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          oldHref = _ref2[0],
          newHref = _ref2[1];

      $("a[href=\"".concat(oldHref, "\"]")).attr('href', newHref);
    });
    WikiLinksReplacementWorker.timeoutHandle = window.setTimeout(WikiLinksReplacementWorker.worker, WikiLinksReplacementWorker.timeOut);
  }
}; // When the document is ready, initialize the dynamic wiki links replacer

$(document).ready(function () {
  WikiLinksReplacementWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9XaWtpTGlua3NSZXBsYWNlbWVudC93aWtpLWxpbmtzLXJlcGxhY2VtZW50LXdvcmtlci5qcyJdLCJuYW1lcyI6WyJXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiaW5pdGlhbGl6ZSIsInJlc3RhcnRXb3JrZXIiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsInNldFRpbWVvdXQiLCIkIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uIiwiZGF0YSIsImdsb2JhbE1vZHVsZVVuaXF1ZUlkIiwibWV0aG9kIiwib25TdWNjZXNzIiwiY2JBZnRlclJlc3BvbnNlIiwicmVzcG9uc2UiLCJhcnIiLCJPYmplY3QiLCJlbnRyaWVzIiwibWVzc2FnZSIsImZvckVhY2giLCJvbGRIcmVmIiwibmV3SHJlZiIsImF0dHIiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLDBCQUEwQixHQUFHO0FBRS9CO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE9BQU8sRUFBRSxNQU5zQjs7QUFRL0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLENBWmdCOztBQWMvQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFqQitCLHdCQWlCbEI7QUFDVEgsSUFBQUEsMEJBQTBCLENBQUNJLGFBQTNCO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsZ0JBQVAsQ0FBd0IsbUJBQXhCLEVBQTZDTiwwQkFBMEIsQ0FBQ08sZUFBeEU7QUFDSCxHQXBCOEI7O0FBc0IvQjtBQUNKO0FBQ0E7QUFDSUgsRUFBQUEsYUF6QitCLDJCQXlCZjtBQUNaQyxJQUFBQSxNQUFNLENBQUNHLFlBQVAsQ0FBb0JSLDBCQUEwQixDQUFDUyxhQUEvQztBQUNBVCxJQUFBQSwwQkFBMEIsQ0FBQ1UsTUFBM0I7QUFDSCxHQTVCOEI7O0FBOEIvQjtBQUNKO0FBQ0E7QUFDSUgsRUFBQUEsZUFqQytCLDZCQWlDYjtBQUNkSSxJQUFBQSxVQUFVLENBQUNYLDBCQUEwQixDQUFDSSxhQUE1QixFQUEyQyxJQUEzQyxDQUFWO0FBQ0gsR0FuQzhCOztBQXFDL0I7QUFDSjtBQUNBO0FBQ0lNLEVBQUFBLE1BeEMrQixvQkF3Q3RCO0FBQ0xFLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsWUFBS0MsYUFBTCwwQ0FERDtBQUVGQyxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGQyxNQUFBQSxJQUFJLEVBQUU7QUFBQ0MsUUFBQUEsb0JBQW9CLEVBQXBCQTtBQUFELE9BSEo7QUFJRkMsTUFBQUEsTUFBTSxFQUFFLE1BSk47QUFLRkMsTUFBQUEsU0FBUyxFQUFFcEIsMEJBQTBCLENBQUNxQjtBQUxwQyxLQUFOO0FBT0gsR0FoRDhCOztBQWtEL0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUEsRUFBQUEsZUF0RCtCLDJCQXNEZkMsUUF0RGUsRUFzREw7QUFDdEIsUUFBSUEsUUFBUSxLQUFLLEtBQWpCLEVBQXdCO0FBQ3BCO0FBQ0g7O0FBQ0QsUUFBTUMsR0FBRyxHQUFHQyxNQUFNLENBQUNDLE9BQVAsQ0FBZUgsUUFBUSxDQUFDSSxPQUF4QixDQUFaO0FBQ0FILElBQUFBLEdBQUcsQ0FBQ0ksT0FBSixDQUFZLGdCQUF3QjtBQUFBO0FBQUEsVUFBdEJDLE9BQXNCO0FBQUEsVUFBYkMsT0FBYTs7QUFDaENqQixNQUFBQSxDQUFDLG9CQUFZZ0IsT0FBWixTQUFELENBQTBCRSxJQUExQixDQUErQixNQUEvQixFQUF1Q0QsT0FBdkM7QUFDSCxLQUZEO0FBR0E3QixJQUFBQSwwQkFBMEIsQ0FBQ1MsYUFBM0IsR0FBMkNKLE1BQU0sQ0FBQ00sVUFBUCxDQUN2Q1gsMEJBQTBCLENBQUNVLE1BRFksRUFFdkNWLDBCQUEwQixDQUFDQyxPQUZZLENBQTNDO0FBSUg7QUFsRThCLENBQW5DLEMsQ0FxRUE7O0FBQ0FXLENBQUMsQ0FBQ21CLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJoQyxFQUFBQSwwQkFBMEIsQ0FBQ0csVUFBM0I7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbE1vZHVsZVVuaXF1ZUlkLCAkICovXG5cbi8qKlxuICogV29ya2VyIG9iamVjdCBmb3IgcmVwbGFjaW5nIGR5bmFtaWMgd2lraSBsaW5rcy5cbiAqXG4gKiBAbW9kdWxlIFdpa2lMaW5rc1JlcGxhY2VtZW50V29ya2VyXG4gKi9cbmNvbnN0IFdpa2lMaW5rc1JlcGxhY2VtZW50V29ya2VyID0ge1xuXG4gICAgLyoqXG4gICAgICogVGltZSBpbiBtaWxsaXNlY29uZHMgYmVmb3JlIGZldGNoaW5nIG5ldyB3aWtpIGxpbmtzIHJlcXVlc3QuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICB0aW1lT3V0OiAzMDAwMDAsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgaWQgb2YgdGhlIHRpbWVyIGZ1bmN0aW9uIGZvciB0aGUgd29ya2VyLlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgdGltZU91dEhhbmRsZTogMCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSB3aWtpIGxpbmtzIHJlcGxhY2VtZW50IHdvcmtlci5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIFdpa2lMaW5rc1JlcGxhY2VtZW50V29ya2VyLmNiT25EYXRhQ2hhbmdlZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc3RhcnRzIHRoZSB3aWtpIGxpbmtzIHJlcGxhY2VtZW50IHdvcmtlci5cbiAgICAgKi9cbiAgICByZXN0YXJ0V29ya2VyKCkge1xuICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KFdpa2lMaW5rc1JlcGxhY2VtZW50V29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuICAgICAgICBXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlci53b3JrZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgZXZlbnQgb2YgbGFuZ3VhZ2Ugb3IgZGF0YSBjaGFuZ2UuXG4gICAgICovXG4gICAgY2JPbkRhdGFDaGFuZ2VkKCkge1xuICAgICAgICBzZXRUaW1lb3V0KFdpa2lMaW5rc1JlcGxhY2VtZW50V29ya2VyLnJlc3RhcnRXb3JrZXIsIDMwMDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBXb3JrZXIgZnVuY3Rpb24gZm9yIGZldGNoaW5nIHdpa2kgbGlua3MgcmVwbGFjZW1lbnQuXG4gICAgICovXG4gICAgd29ya2VyKCkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9d2lraS1saW5rcy9nZXQtd2lraS1saW5rcy1yZXBsYWNlbWVudGAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBkYXRhOiB7Z2xvYmFsTW9kdWxlVW5pcXVlSWR9LFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IFdpa2lMaW5rc1JlcGxhY2VtZW50V29ya2VyLmNiQWZ0ZXJSZXNwb25zZVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgcmVjZWl2aW5nIGEgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJSZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYXJyID0gT2JqZWN0LmVudHJpZXMocmVzcG9uc2UubWVzc2FnZSk7XG4gICAgICAgIGFyci5mb3JFYWNoKChbb2xkSHJlZiwgbmV3SHJlZl0pID0+IHtcbiAgICAgICAgICAgICQoYGFbaHJlZj1cIiR7b2xkSHJlZn1cIl1gKS5hdHRyKCdocmVmJywgbmV3SHJlZik7XG4gICAgICAgIH0pO1xuICAgICAgICBXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlci50aW1lb3V0SGFuZGxlID0gd2luZG93LnNldFRpbWVvdXQoXG4gICAgICAgICAgICBXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlci53b3JrZXIsXG4gICAgICAgICAgICBXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlci50aW1lT3V0LFxuICAgICAgICApO1xuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZHluYW1pYyB3aWtpIGxpbmtzIHJlcGxhY2VyXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgV2lraUxpbmtzUmVwbGFjZW1lbnRXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=