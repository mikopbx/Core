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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9XaWtpTGlua3NSZXBsYWNlbWVudC93aWtpLWxpbmtzLXJlcGxhY2VtZW50LXdvcmtlci5qcyJdLCJuYW1lcyI6WyJXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiaW5pdGlhbGl6ZSIsInJlc3RhcnRXb3JrZXIiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsInNldFRpbWVvdXQiLCIkIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uIiwiZGF0YSIsImdsb2JhbE1vZHVsZVVuaXF1ZUlkIiwibWV0aG9kIiwib25TdWNjZXNzIiwiY2JBZnRlclJlc3BvbnNlIiwicmVzcG9uc2UiLCJhcnIiLCJPYmplY3QiLCJlbnRyaWVzIiwibWVzc2FnZSIsImZvckVhY2giLCJvbGRIcmVmIiwibmV3SHJlZiIsImF0dHIiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFFQSxJQUFNQSwwQkFBMEIsR0FBRztBQUNsQ0MsRUFBQUEsT0FBTyxFQUFFLE1BRHlCO0FBRWxDQyxFQUFBQSxhQUFhLEVBQUUsRUFGbUI7QUFHbENDLEVBQUFBLFVBSGtDLHdCQUdyQjtBQUNaSCxJQUFBQSwwQkFBMEIsQ0FBQ0ksYUFBM0I7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxnQkFBUCxDQUF3QixtQkFBeEIsRUFBNkNOLDBCQUEwQixDQUFDTyxlQUF4RTtBQUNBLEdBTmlDO0FBT2xDSCxFQUFBQSxhQVBrQywyQkFPbEI7QUFDZkMsSUFBQUEsTUFBTSxDQUFDRyxZQUFQLENBQW9CUiwwQkFBMEIsQ0FBQ1MsYUFBL0M7QUFDQVQsSUFBQUEsMEJBQTBCLENBQUNVLE1BQTNCO0FBQ0EsR0FWaUM7O0FBV2xDO0FBQ0Q7QUFDQTtBQUNDSCxFQUFBQSxlQWRrQyw2QkFjaEI7QUFDakJJLElBQUFBLFVBQVUsQ0FBQ1gsMEJBQTBCLENBQUNJLGFBQTVCLEVBQTBDLElBQTFDLENBQVY7QUFDQSxHQWhCaUM7QUFpQmxDTSxFQUFBQSxNQWpCa0Msb0JBaUJ6QjtBQUNSRSxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNMQyxNQUFBQSxHQUFHLFlBQUtDLGFBQUwsMENBREU7QUFFTEMsTUFBQUEsRUFBRSxFQUFFLEtBRkM7QUFHTEMsTUFBQUEsSUFBSSxFQUFFO0FBQUVDLFFBQUFBLG9CQUFvQixFQUFwQkE7QUFBRixPQUhEO0FBSUxDLE1BQUFBLE1BQU0sRUFBRSxNQUpIO0FBS0xDLE1BQUFBLFNBQVMsRUFBRXBCLDBCQUEwQixDQUFDcUI7QUFMakMsS0FBTjtBQU9BLEdBekJpQztBQTBCbENBLEVBQUFBLGVBMUJrQywyQkEwQmxCQyxRQTFCa0IsRUEwQlI7QUFDekIsUUFBSUEsUUFBUSxLQUFLLEtBQWpCLEVBQXdCO0FBQ3ZCO0FBQ0E7O0FBQ0QsUUFBTUMsR0FBRyxHQUFHQyxNQUFNLENBQUNDLE9BQVAsQ0FBZUgsUUFBUSxDQUFDSSxPQUF4QixDQUFaO0FBQ0FILElBQUFBLEdBQUcsQ0FBQ0ksT0FBSixDQUFZLGdCQUF5QjtBQUFBO0FBQUEsVUFBdkJDLE9BQXVCO0FBQUEsVUFBZEMsT0FBYzs7QUFDcENqQixNQUFBQSxDQUFDLG9CQUFZZ0IsT0FBWixTQUFELENBQTBCRSxJQUExQixDQUErQixNQUEvQixFQUF1Q0QsT0FBdkM7QUFDQSxLQUZEO0FBR0E3QixJQUFBQSwwQkFBMEIsQ0FBQ1MsYUFBM0IsR0FBMkNKLE1BQU0sQ0FBQ00sVUFBUCxDQUMxQ1gsMEJBQTBCLENBQUNVLE1BRGUsRUFFMUNWLDBCQUEwQixDQUFDQyxPQUZlLENBQTNDO0FBSUE7QUF0Q2lDLENBQW5DO0FBeUNBVyxDQUFDLENBQUNtQixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCaEMsRUFBQUEsMEJBQTBCLENBQUNHLFVBQTNCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxNb2R1bGVVbmlxdWVJZCwgJCAqL1xuXG5jb25zdCBXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlciA9IHtcblx0dGltZU91dDogMzAwMDAwLFxuXHR0aW1lT3V0SGFuZGxlOiAnJyxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgV2lraUxpbmtzUmVwbGFjZW1lbnRXb3JrZXIuY2JPbkRhdGFDaGFuZ2VkKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KFdpa2lMaW5rc1JlcGxhY2VtZW50V29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFdpa2lMaW5rc1JlcGxhY2VtZW50V29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHQvKipcblx0ICogSGFuZGxpbmcgdGhlIGV2ZW50IG9mIGxhbmd1YWdlIG9yIGRhdGEgY2hhbmdlLlxuXHQgKi9cblx0Y2JPbkRhdGFDaGFuZ2VkKCkge1xuXHRcdHNldFRpbWVvdXQoV2lraUxpbmtzUmVwbGFjZW1lbnRXb3JrZXIucmVzdGFydFdvcmtlciwzMDAwKTtcblx0fSxcblx0d29ya2VyKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH13aWtpLWxpbmtzL2dldC13aWtpLWxpbmtzLXJlcGxhY2VtZW50YCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdGRhdGE6IHsgZ2xvYmFsTW9kdWxlVW5pcXVlSWQgfSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0b25TdWNjZXNzOiBXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlci5jYkFmdGVyUmVzcG9uc2Vcblx0XHR9KTtcblx0fSxcblx0Y2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlID09PSBmYWxzZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjb25zdCBhcnIgPSBPYmplY3QuZW50cmllcyhyZXNwb25zZS5tZXNzYWdlKTtcblx0XHRhcnIuZm9yRWFjaCgoW29sZEhyZWYsIG5ld0hyZWZdKSAgPT4ge1xuXHRcdFx0JChgYVtocmVmPVwiJHtvbGRIcmVmfVwiXWApLmF0dHIoJ2hyZWYnLCBuZXdIcmVmKTtcblx0XHR9KTtcblx0XHRXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlci50aW1lb3V0SGFuZGxlID0gd2luZG93LnNldFRpbWVvdXQoXG5cdFx0XHRXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlci53b3JrZXIsXG5cdFx0XHRXaWtpTGlua3NSZXBsYWNlbWVudFdvcmtlci50aW1lT3V0LFxuXHRcdCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdFdpa2lMaW5rc1JlcGxhY2VtZW50V29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19