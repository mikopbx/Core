"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
var clockWorker = {
  timeoutHandle: null,
  options: null,
  initialize: function () {
    function initialize() {
      clockWorker.restartWorker();
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(clockWorker.timeoutHandle);
      clockWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      PbxApi.GetDateTime(clockWorker.cbAfterReceiveDateTimeFromServer);
    }

    return worker;
  }(),
  cbAfterReceiveDateTimeFromServer: function () {
    function cbAfterReceiveDateTimeFromServer(response) {
      var options = {
        timeZone: timeSettings.$formObj.form('get value', 'PBXTimezone'),
        timeZoneName: 'short'
      };

      if (timeSettings.$formObj.form('get value', 'PBXManualTimeSettings') !== 'on') {
        clockWorker.timeoutHandle = window.setTimeout(clockWorker.worker, 1000);
      } else {
        options.timeZoneName = undefined;
      }

      if (response !== false) {
        var dateTime = new Date(response.timestamp * 1000);
        timeSettings.$formObj.form('set value', 'ManualDateTime', dateTime.toLocaleString(globalWebAdminLanguage, options));
      }
    }

    return cbAfterReceiveDateTimeFromServer;
  }()
};
$(document).ready(function () {
  clockWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9UaW1lU2V0dGluZ3MvdGltZS1zZXR0aW5ncy13b3JrZXIuanMiXSwibmFtZXMiOlsiY2xvY2tXb3JrZXIiLCJ0aW1lb3V0SGFuZGxlIiwib3B0aW9ucyIsImluaXRpYWxpemUiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiY2xlYXJUaW1lb3V0Iiwid29ya2VyIiwiUGJ4QXBpIiwiR2V0RGF0ZVRpbWUiLCJjYkFmdGVyUmVjZWl2ZURhdGVUaW1lRnJvbVNlcnZlciIsInJlc3BvbnNlIiwidGltZVpvbmUiLCJ0aW1lU2V0dGluZ3MiLCIkZm9ybU9iaiIsImZvcm0iLCJ0aW1lWm9uZU5hbWUiLCJzZXRUaW1lb3V0IiwidW5kZWZpbmVkIiwiZGF0ZVRpbWUiLCJEYXRlIiwidGltZXN0YW1wIiwidG9Mb2NhbGVTdHJpbmciLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwiJCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBLElBQU1BLFdBQVcsR0FBRztBQUNuQkMsRUFBQUEsYUFBYSxFQUFFLElBREk7QUFFbkJDLEVBQUFBLE9BQU8sRUFBRSxJQUZVO0FBR25CQyxFQUFBQSxVQUhtQjtBQUFBLDBCQUdOO0FBQ1pILE1BQUFBLFdBQVcsQ0FBQ0ksYUFBWjtBQUNBOztBQUxrQjtBQUFBO0FBTW5CQSxFQUFBQSxhQU5tQjtBQUFBLDZCQU1IO0FBQ2ZDLE1BQUFBLE1BQU0sQ0FBQ0MsWUFBUCxDQUFvQk4sV0FBVyxDQUFDQyxhQUFoQztBQUNBRCxNQUFBQSxXQUFXLENBQUNPLE1BQVo7QUFDQTs7QUFUa0I7QUFBQTtBQVVuQkEsRUFBQUEsTUFWbUI7QUFBQSxzQkFVVjtBQUNSQyxNQUFBQSxNQUFNLENBQUNDLFdBQVAsQ0FBbUJULFdBQVcsQ0FBQ1UsZ0NBQS9CO0FBQ0E7O0FBWmtCO0FBQUE7QUFjbkJBLEVBQUFBLGdDQWRtQjtBQUFBLDhDQWNjQyxRQWRkLEVBY3VCO0FBQ3pDLFVBQU1ULE9BQU8sR0FBRztBQUFFVSxRQUFBQSxRQUFRLEVBQUVDLFlBQVksQ0FBQ0MsUUFBYixDQUFzQkMsSUFBdEIsQ0FBMkIsV0FBM0IsRUFBd0MsYUFBeEMsQ0FBWjtBQUFvRUMsUUFBQUEsWUFBWSxFQUFHO0FBQW5GLE9BQWhCOztBQUNBLFVBQUlILFlBQVksQ0FBQ0MsUUFBYixDQUFzQkMsSUFBdEIsQ0FBMkIsV0FBM0IsRUFBd0MsdUJBQXhDLE1BQXFFLElBQXpFLEVBQStFO0FBQzlFZixRQUFBQSxXQUFXLENBQUNDLGFBQVosR0FBNEJJLE1BQU0sQ0FBQ1ksVUFBUCxDQUMzQmpCLFdBQVcsQ0FBQ08sTUFEZSxFQUUzQixJQUYyQixDQUE1QjtBQUlBLE9BTEQsTUFLTztBQUNOTCxRQUFBQSxPQUFPLENBQUNjLFlBQVIsR0FBdUJFLFNBQXZCO0FBQ0E7O0FBQ0QsVUFBSVAsUUFBUSxLQUFHLEtBQWYsRUFBcUI7QUFDcEIsWUFBTVEsUUFBUSxHQUFJLElBQUlDLElBQUosQ0FBU1QsUUFBUSxDQUFDVSxTQUFULEdBQW1CLElBQTVCLENBQWxCO0FBQ0FSLFFBQUFBLFlBQVksQ0FBQ0MsUUFBYixDQUFzQkMsSUFBdEIsQ0FBMkIsV0FBM0IsRUFBd0MsZ0JBQXhDLEVBQTBESSxRQUFRLENBQUNHLGNBQVQsQ0FBd0JDLHNCQUF4QixFQUFnRHJCLE9BQWhELENBQTFEO0FBQ0E7QUFDRDs7QUE1QmtCO0FBQUE7QUFBQSxDQUFwQjtBQStCQXNCLENBQUMsQ0FBQ0MsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjFCLEVBQUFBLFdBQVcsQ0FBQ0csVUFBWjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuY29uc3QgY2xvY2tXb3JrZXIgPSB7XG5cdHRpbWVvdXRIYW5kbGU6IG51bGwsXG5cdG9wdGlvbnM6IG51bGwsXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0Y2xvY2tXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoY2xvY2tXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0Y2xvY2tXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHRQYnhBcGkuR2V0RGF0ZVRpbWUoY2xvY2tXb3JrZXIuY2JBZnRlclJlY2VpdmVEYXRlVGltZUZyb21TZXJ2ZXIpO1xuXHR9LFxuXG5cdGNiQWZ0ZXJSZWNlaXZlRGF0ZVRpbWVGcm9tU2VydmVyKHJlc3BvbnNlKXtcblx0XHRjb25zdCBvcHRpb25zID0geyB0aW1lWm9uZTogdGltZVNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdQQlhUaW1lem9uZScpLCB0aW1lWm9uZU5hbWUgOiAnc2hvcnQnfTtcblx0XHRpZiAodGltZVNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdQQlhNYW51YWxUaW1lU2V0dGluZ3MnKSAhPT0gJ29uJykge1xuXHRcdFx0Y2xvY2tXb3JrZXIudGltZW91dEhhbmRsZSA9IHdpbmRvdy5zZXRUaW1lb3V0KFxuXHRcdFx0XHRjbG9ja1dvcmtlci53b3JrZXIsXG5cdFx0XHRcdDEwMDAsXG5cdFx0XHQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRvcHRpb25zLnRpbWVab25lTmFtZSA9IHVuZGVmaW5lZDtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlIT09ZmFsc2Upe1xuXHRcdFx0Y29uc3QgZGF0ZVRpbWUgPSAgbmV3IERhdGUocmVzcG9uc2UudGltZXN0YW1wKjEwMDApO1xuXHRcdFx0dGltZVNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdNYW51YWxEYXRlVGltZScsIGRhdGVUaW1lLnRvTG9jYWxlU3RyaW5nKGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIG9wdGlvbnMpKTtcblx0XHR9XG5cdH1cbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0Y2xvY2tXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=