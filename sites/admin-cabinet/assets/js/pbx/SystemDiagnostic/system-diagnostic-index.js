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

/* global sessionStorage, ace, PbxApi */
var systemDiagnostic = {
  $tabMenuItems: $('#system-diagnostic-menu .item'),
  initialize: function () {
    function initialize() {
      systemDiagnostic.$tabMenuItems.tab();
      systemDiagnostic.$tabMenuItems.tab('change tab', 'show-log');
    }

    return initialize;
  }()
};
$(document).ready(function () {
  systemDiagnostic.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWMiLCIkdGFiTWVudUl0ZW1zIiwiJCIsImluaXRpYWxpemUiLCJ0YWIiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFpQkE7QUFFQSxJQUFNQSxnQkFBZ0IsR0FBRztBQUN4QkMsRUFBQUEsYUFBYSxFQUFFQyxDQUFDLENBQUMsK0JBQUQsQ0FEUTtBQUV4QkMsRUFBQUEsVUFGd0I7QUFBQSwwQkFFWDtBQUNaSCxNQUFBQSxnQkFBZ0IsQ0FBQ0MsYUFBakIsQ0FBK0JHLEdBQS9CO0FBQ0FKLE1BQUFBLGdCQUFnQixDQUFDQyxhQUFqQixDQUErQkcsR0FBL0IsQ0FBbUMsWUFBbkMsRUFBaUQsVUFBakQ7QUFDQTs7QUFMdUI7QUFBQTtBQUFBLENBQXpCO0FBUUFGLENBQUMsQ0FBQ0csUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2Qk4sRUFBQUEsZ0JBQWdCLENBQUNHLFVBQWpCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIHNlc3Npb25TdG9yYWdlLCBhY2UsIFBieEFwaSAqL1xuXG5jb25zdCBzeXN0ZW1EaWFnbm9zdGljID0ge1xuXHQkdGFiTWVudUl0ZW1zOiAkKCcjc3lzdGVtLWRpYWdub3N0aWMtbWVudSAuaXRlbScpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHN5c3RlbURpYWdub3N0aWMuJHRhYk1lbnVJdGVtcy50YWIoKTtcblx0XHRzeXN0ZW1EaWFnbm9zdGljLiR0YWJNZW51SXRlbXMudGFiKCdjaGFuZ2UgdGFiJywgJ3Nob3ctbG9nJyk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHN5c3RlbURpYWdub3N0aWMuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==