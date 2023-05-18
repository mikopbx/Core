"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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
var WikiLinksReplacementWorker = {
  timeOut: 300000,
  timeOutHandle: '',
  initialize: function initialize() {
    WikiLinksReplacementWorker.restartWorker();
    window.addEventListener('ConfigDataChanged', WikiLinksReplacementWorker.cbOnDataChanged);
  },
  restartWorker: function restartWorker() {
    window.clearTimeout(WikiLinksReplacementWorker.timeoutHandle);
    WikiLinksReplacementWorker.worker();
  },

  /**
   * Handling the event of language or data change.
   */
  cbOnDataChanged: function cbOnDataChanged() {
    setTimeout(WikiLinksReplacementWorker.restartWorker, 3000);
  },
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
};
$(document).ready(function () {
  WikiLinksReplacementWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9XaWtpTGlua3NSZXBsYWNlbWVudC93aWtpLWxpbmtzLXJlcGxhY2VtZW50LXdvcmtlci5qcyJdLCJuYW1lcyI6WyJXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiaW5pdGlhbGl6ZSIsInJlc3RhcnRXb3JrZXIiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsInNldFRpbWVvdXQiLCIkIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uIiwiZGF0YSIsImdsb2JhbE1vZHVsZVVuaXF1ZUlkIiwibWV0aG9kIiwib25TdWNjZXNzIiwiY2JBZnRlclJlc3BvbnNlIiwicmVzcG9uc2UiLCJhcnIiLCJPYmplY3QiLCJlbnRyaWVzIiwibWVzc2FnZSIsImZvckVhY2giLCJvbGRIcmVmIiwibmV3SHJlZiIsImF0dHIiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFFQSxJQUFNQSwwQkFBMEIsR0FBRztBQUNsQ0MsRUFBQUEsT0FBTyxFQUFFLE1BRHlCO0FBRWxDQyxFQUFBQSxhQUFhLEVBQUUsRUFGbUI7QUFHbENDLEVBQUFBLFVBSGtDLHdCQUdyQjtBQUNaSCxJQUFBQSwwQkFBMEIsQ0FBQ0ksYUFBM0I7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxnQkFBUCxDQUF3QixtQkFBeEIsRUFBNkNOLDBCQUEwQixDQUFDTyxlQUF4RTtBQUNBLEdBTmlDO0FBT2xDSCxFQUFBQSxhQVBrQywyQkFPbEI7QUFDZkMsSUFBQUEsTUFBTSxDQUFDRyxZQUFQLENBQW9CUiwwQkFBMEIsQ0FBQ1MsYUFBL0M7QUFDQVQsSUFBQUEsMEJBQTBCLENBQUNVLE1BQTNCO0FBQ0EsR0FWaUM7O0FBV2xDO0FBQ0Q7QUFDQTtBQUNDSCxFQUFBQSxlQWRrQyw2QkFjaEI7QUFDakJJLElBQUFBLFVBQVUsQ0FBQ1gsMEJBQTBCLENBQUNJLGFBQTVCLEVBQTBDLElBQTFDLENBQVY7QUFDQSxHQWhCaUM7QUFpQmxDTSxFQUFBQSxNQWpCa0Msb0JBaUJ6QjtBQUNSRSxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNMQyxNQUFBQSxHQUFHLFlBQUtDLGFBQUwsMENBREU7QUFFTEMsTUFBQUEsRUFBRSxFQUFFLEtBRkM7QUFHTEMsTUFBQUEsSUFBSSxFQUFFO0FBQUVDLFFBQUFBLG9CQUFvQixFQUFwQkE7QUFBRixPQUhEO0FBSUxDLE1BQUFBLE1BQU0sRUFBRSxNQUpIO0FBS0xDLE1BQUFBLFNBQVMsRUFBRXBCLDBCQUEwQixDQUFDcUI7QUFMakMsS0FBTjtBQU9BLEdBekJpQztBQTBCbENBLEVBQUFBLGVBMUJrQywyQkEwQmxCQyxRQTFCa0IsRUEwQlI7QUFDekIsUUFBSUEsUUFBUSxLQUFLLEtBQWpCLEVBQXdCO0FBQ3ZCO0FBQ0E7O0FBQ0QsUUFBTUMsR0FBRyxHQUFHQyxNQUFNLENBQUNDLE9BQVAsQ0FBZUgsUUFBUSxDQUFDSSxPQUF4QixDQUFaO0FBQ0FILElBQUFBLEdBQUcsQ0FBQ0ksT0FBSixDQUFZLGdCQUF5QjtBQUFBO0FBQUEsVUFBdkJDLE9BQXVCO0FBQUEsVUFBZEMsT0FBYzs7QUFDcENqQixNQUFBQSxDQUFDLG9CQUFZZ0IsT0FBWixTQUFELENBQTBCRSxJQUExQixDQUErQixNQUEvQixFQUF1Q0QsT0FBdkM7QUFDQSxLQUZEO0FBR0E3QixJQUFBQSwwQkFBMEIsQ0FBQ1MsYUFBM0IsR0FBMkNKLE1BQU0sQ0FBQ00sVUFBUCxDQUMxQ1gsMEJBQTBCLENBQUNVLE1BRGUsRUFFMUNWLDBCQUEwQixDQUFDQyxPQUZlLENBQTNDO0FBSUE7QUF0Q2lDLENBQW5DO0FBeUNBVyxDQUFDLENBQUNtQixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCaEMsRUFBQUEsMEJBQTBCLENBQUNHLFVBQTNCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsTW9kdWxlVW5pcXVlSWQsICQgKi9cblxuY29uc3QgV2lraUxpbmtzUmVwbGFjZW1lbnRXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0V2lraUxpbmtzUmVwbGFjZW1lbnRXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIFdpa2lMaW5rc1JlcGxhY2VtZW50V29ya2VyLmNiT25EYXRhQ2hhbmdlZCk7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlci53b3JrZXIoKTtcblx0fSxcblx0LyoqXG5cdCAqIEhhbmRsaW5nIHRoZSBldmVudCBvZiBsYW5ndWFnZSBvciBkYXRhIGNoYW5nZS5cblx0ICovXG5cdGNiT25EYXRhQ2hhbmdlZCgpIHtcblx0XHRzZXRUaW1lb3V0KFdpa2lMaW5rc1JlcGxhY2VtZW50V29ya2VyLnJlc3RhcnRXb3JrZXIsMzAwMCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9d2lraS1saW5rcy9nZXQtd2lraS1saW5rcy1yZXBsYWNlbWVudGAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRkYXRhOiB7IGdsb2JhbE1vZHVsZVVuaXF1ZUlkIH0sXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdG9uU3VjY2VzczogV2lraUxpbmtzUmVwbGFjZW1lbnRXb3JrZXIuY2JBZnRlclJlc3BvbnNlXG5cdFx0fSk7XG5cdH0sXG5cdGNiQWZ0ZXJSZXNwb25zZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSA9PT0gZmFsc2UpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3QgYXJyID0gT2JqZWN0LmVudHJpZXMocmVzcG9uc2UubWVzc2FnZSk7XG5cdFx0YXJyLmZvckVhY2goKFtvbGRIcmVmLCBuZXdIcmVmXSkgID0+IHtcblx0XHRcdCQoYGFbaHJlZj1cIiR7b2xkSHJlZn1cIl1gKS5hdHRyKCdocmVmJywgbmV3SHJlZik7XG5cdFx0fSk7XG5cdFx0V2lraUxpbmtzUmVwbGFjZW1lbnRXb3JrZXIudGltZW91dEhhbmRsZSA9IHdpbmRvdy5zZXRUaW1lb3V0KFxuXHRcdFx0V2lraUxpbmtzUmVwbGFjZW1lbnRXb3JrZXIud29ya2VyLFxuXHRcdFx0V2lraUxpbmtzUmVwbGFjZW1lbnRXb3JrZXIudGltZU91dCxcblx0XHQpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==