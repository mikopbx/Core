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
// Polyfill for old browsers
if (typeof Number.isFinite !== 'function') {
  Number.isFinite = function isFinite(value) {
    // 1. If Type(number) is not Number, return false.
    if (typeof value !== 'number') {
      return false;
    } // 2. If number is NaN, +∞, or −∞, return false.


    if (value !== value || value === Infinity || value === -Infinity) {
      return false;
    } // 3. Otherwise, return true.


    return true;
  };
}

$(document).ready(function () {
  $('.popuped').popup();
  $('div[data-content], a[data-content]').popup();
  $('#loader').removeClass('active');
  $('#loader-row').hide();
  $('#content-frame').show();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvb3Rlci5qcyJdLCJuYW1lcyI6WyJOdW1iZXIiLCJpc0Zpbml0ZSIsInZhbHVlIiwiSW5maW5pdHkiLCIkIiwiZG9jdW1lbnQiLCJyZWFkeSIsInBvcHVwIiwicmVtb3ZlQ2xhc3MiLCJoaWRlIiwic2hvdyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQSxJQUFJLE9BQU9BLE1BQU0sQ0FBQ0MsUUFBZCxLQUEyQixVQUEvQixFQUEyQztBQUMxQ0QsRUFBQUEsTUFBTSxDQUFDQyxRQUFQLEdBQWtCLFNBQVNBLFFBQVQsQ0FBa0JDLEtBQWxCLEVBQXlCO0FBQzFDO0FBQ0EsUUFBSSxPQUFPQSxLQUFQLEtBQWlCLFFBQXJCLEVBQStCO0FBQzlCLGFBQU8sS0FBUDtBQUNBLEtBSnlDLENBSzFDOzs7QUFDQSxRQUFJQSxLQUFLLEtBQUtBLEtBQVYsSUFBbUJBLEtBQUssS0FBS0MsUUFBN0IsSUFBeUNELEtBQUssS0FBSyxDQUFDQyxRQUF4RCxFQUFrRTtBQUNqRSxhQUFPLEtBQVA7QUFDQSxLQVJ5QyxDQVMxQzs7O0FBQ0EsV0FBTyxJQUFQO0FBQ0EsR0FYRDtBQVlBOztBQUVEQyxDQUFDLENBQUNDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJGLEVBQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBY0csS0FBZDtBQUNBSCxFQUFBQSxDQUFDLENBQUMsb0NBQUQsQ0FBRCxDQUF3Q0csS0FBeEM7QUFDQUgsRUFBQUEsQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhSSxXQUFiLENBQXlCLFFBQXpCO0FBQ0FKLEVBQUFBLENBQUMsQ0FBQyxhQUFELENBQUQsQ0FBaUJLLElBQWpCO0FBQ0FMLEVBQUFBLENBQUMsQ0FBQyxnQkFBRCxDQUFELENBQW9CTSxJQUFwQjtBQUNBLENBTkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vLyBQb2x5ZmlsbCBmb3Igb2xkIGJyb3dzZXJzXG5pZiAodHlwZW9mIE51bWJlci5pc0Zpbml0ZSAhPT0gJ2Z1bmN0aW9uJykge1xuXHROdW1iZXIuaXNGaW5pdGUgPSBmdW5jdGlvbiBpc0Zpbml0ZSh2YWx1ZSkge1xuXHRcdC8vIDEuIElmIFR5cGUobnVtYmVyKSBpcyBub3QgTnVtYmVyLCByZXR1cm4gZmFsc2UuXG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ251bWJlcicpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0Ly8gMi4gSWYgbnVtYmVyIGlzIE5hTiwgK+KIniwgb3Ig4oiS4oieLCByZXR1cm4gZmFsc2UuXG5cdFx0aWYgKHZhbHVlICE9PSB2YWx1ZSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkgfHwgdmFsdWUgPT09IC1JbmZpbml0eSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHQvLyAzLiBPdGhlcndpc2UsIHJldHVybiB0cnVlLlxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xufVxuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdCQoJy5wb3B1cGVkJykucG9wdXAoKTtcblx0JCgnZGl2W2RhdGEtY29udGVudF0sIGFbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG5cdCQoJyNsb2FkZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cdCQoJyNsb2FkZXItcm93JykuaGlkZSgpO1xuXHQkKCcjY29udGVudC1mcmFtZScpLnNob3coKTtcbn0pO1xuIl19