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

/* global sessionStorage, PbxApi */
var sendMetrics = {
  initialize: function () {
    function initialize() {
      var isMetricsSend = sessionStorage.getItem('MetricsAlreadySent');

      if (isMetricsSend === null) {
        PbxApi.LicenseSendPBXMetrics(sendMetrics.cbAfterMetricsSent);
      }
    }

    return initialize;
  }(),
  cbAfterMetricsSent: function () {
    function cbAfterMetricsSent(result) {
      if (result === true) {
        sessionStorage.setItem('MetricsAlreadySent', 'true');
      }
    }

    return cbAfterMetricsSent;
  }()
};
$(document).ready(function () {
  sendMetrics.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TZW5kTWV0cmljcy9zZW5kLW1ldHJpY3MtaW5kZXguanMiXSwibmFtZXMiOlsic2VuZE1ldHJpY3MiLCJpbml0aWFsaXplIiwiaXNNZXRyaWNzU2VuZCIsInNlc3Npb25TdG9yYWdlIiwiZ2V0SXRlbSIsIlBieEFwaSIsIkxpY2Vuc2VTZW5kUEJYTWV0cmljcyIsImNiQWZ0ZXJNZXRyaWNzU2VudCIsInJlc3VsdCIsInNldEl0ZW0iLCIkIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBO0FBQ0EsSUFBTUEsV0FBVyxHQUFHO0FBQ25CQyxFQUFBQSxVQURtQjtBQUFBLDBCQUNQO0FBQ1gsVUFBTUMsYUFBYSxHQUFHQyxjQUFjLENBQUNDLE9BQWYsQ0FBdUIsb0JBQXZCLENBQXRCOztBQUNBLFVBQUlGLGFBQWEsS0FBSyxJQUF0QixFQUE0QjtBQUMzQkcsUUFBQUEsTUFBTSxDQUFDQyxxQkFBUCxDQUE2Qk4sV0FBVyxDQUFDTyxrQkFBekM7QUFFQTtBQUNEOztBQVBrQjtBQUFBO0FBUW5CQSxFQUFBQSxrQkFSbUI7QUFBQSxnQ0FRQUMsTUFSQSxFQVFPO0FBQ3pCLFVBQUlBLE1BQU0sS0FBRyxJQUFiLEVBQWtCO0FBQ2pCTCxRQUFBQSxjQUFjLENBQUNNLE9BQWYsQ0FBdUIsb0JBQXZCLEVBQTZDLE1BQTdDO0FBQ0E7QUFDRDs7QUFaa0I7QUFBQTtBQUFBLENBQXBCO0FBY0FDLENBQUMsQ0FBQ0MsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QlosRUFBQUEsV0FBVyxDQUFDQyxVQUFaO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgc2Vzc2lvblN0b3JhZ2UsIFBieEFwaSAqL1xuY29uc3Qgc2VuZE1ldHJpY3MgPSB7XG5cdGluaXRpYWxpemUoKXtcblx0XHRjb25zdCBpc01ldHJpY3NTZW5kID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbSgnTWV0cmljc0FscmVhZHlTZW50Jyk7XG5cdFx0aWYgKGlzTWV0cmljc1NlbmQgPT09IG51bGwpIHtcblx0XHRcdFBieEFwaS5MaWNlbnNlU2VuZFBCWE1ldHJpY3Moc2VuZE1ldHJpY3MuY2JBZnRlck1ldHJpY3NTZW50KTtcblxuXHRcdH1cblx0fSxcblx0Y2JBZnRlck1ldHJpY3NTZW50KHJlc3VsdCl7XG5cdFx0aWYgKHJlc3VsdD09PXRydWUpe1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnTWV0cmljc0FscmVhZHlTZW50JywgJ3RydWUnKTtcblx0XHR9XG5cdH1cbn1cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0c2VuZE1ldHJpY3MuaW5pdGlhbGl6ZSgpO1xufSk7Il19